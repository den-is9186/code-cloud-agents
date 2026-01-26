const express = require('express');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Redis configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

const redis = new Redis(redisConfig);

// Handle Redis connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

app.use(express.json({ limit: '10mb' }));

// Add request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Security: Validate and sanitize file paths
const PROJECT_ROOT = process.cwd();
const ALLOWED_DIRS = ['src', 'tests', 'CONTRACTS', 'ops'];

function validatePath(requestedPath) {
  if (!requestedPath) {
    throw new Error('Path is required');
  }

  // Normalize the path and resolve it relative to project root
  const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(PROJECT_ROOT, normalizedPath);

  // Ensure the path is within project root
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error('Path traversal not allowed');
  }

  // Check if path is in allowed directories
  const relativePath = path.relative(PROJECT_ROOT, fullPath);
  const topLevelDir = relativePath.split(path.sep)[0];
  
  if (topLevelDir && !ALLOWED_DIRS.includes(topLevelDir) && topLevelDir !== '.') {
    throw new Error(`Access to directory '${topLevelDir}' not allowed`);
  }

  return fullPath;
}

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.status(200).json({
      status: 'healthy',
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'disconnected',
      error: error.message
    });
  }
});

// Agent State Management API

const AGENT_STATE_PREFIX = 'agent:state:';
const AGENT_STATE_INDEX = 'agent:states:index';
const DEFAULT_TTL = 86400; // 24 hours in seconds
const MAX_RETRIES = 3; // Maximum number of retries for failed tasks

// Helper function to validate agent ID
function validateAgentId(agentId) {
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Agent ID must be a non-empty string');
  }
  if (agentId.length > 256) {
    throw new Error('Agent ID must be 256 characters or less');
  }
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(agentId)) {
    throw new Error('Agent ID contains invalid characters. Only alphanumeric, underscore, hyphen, colon, and period are allowed');
  }
  return agentId;
}

// Create or update agent execution state
app.post('/api/v1/agent/state', async (req, res) => {
  try {
    const { agentId, status, progress, metadata, ttl, error } = req.body;

    if (!agentId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'agentId is required'
        }
      });
    }

    validateAgentId(agentId);

    if (status && !['pending', 'running', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'status must be one of: pending, running, completed, failed, cancelled'
        }
      });
    }

    if (progress !== undefined && (typeof progress !== 'number' || progress < 0 || progress > 100)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'progress must be a number between 0 and 100'
        }
      });
    }

    const key = `${AGENT_STATE_PREFIX}${agentId}`;
    const now = new Date().toISOString();

    // Check if state already exists
    const existingState = await redis.get(key);
    let state;

    if (existingState) {
      // Update existing state
      state = JSON.parse(existingState);
      
      // Handle retry logic when status changes to failed
      if (status === 'failed' && state.status !== 'failed') {
        // First time failing
        state.retryCount = state.retryCount || 0;
        state.lastError = error || 'Unknown error';
        state.failedAt = now;
      } else if (status === 'failed' && state.status === 'failed') {
        // Already failed, update error info
        state.lastError = error || state.lastError;
      } else if (status && status !== 'failed') {
        // Status changed to non-failed state
        if (status) state.status = status;
      }
      
      if (status) state.status = status;
      if (progress !== undefined) state.progress = progress;
      if (metadata) state.metadata = { ...state.metadata, ...metadata };
      state.updatedAt = now;
    } else {
      // Create new state
      state = {
        agentId,
        status: status || 'pending',
        progress: progress !== undefined ? progress : 0,
        metadata: metadata || {},
        retryCount: 0,
        maxRetries: MAX_RETRIES,
        createdAt: now,
        updatedAt: now
      };
      
      if (status === 'failed') {
        state.lastError = error || 'Unknown error';
        state.failedAt = now;
      }
      
      // Add to index
      await redis.sadd(AGENT_STATE_INDEX, agentId);
    }

    // Save state to Redis
    const stateTTL = ttl || DEFAULT_TTL;
    await redis.setex(key, stateTTL, JSON.stringify(state));

    res.json({
      agentId,
      state,
      ttl: stateTTL
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: error.message
      }
    });
  }
});

// Get agent execution state
app.get('/api/v1/agent/state/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    validateAgentId(agentId);

    const key = `${AGENT_STATE_PREFIX}${agentId}`;
    const stateData = await redis.get(key);

    if (!stateData) {
      return res.status(404).json({
        error: {
          code: 'STATE_NOT_FOUND',
          message: `Agent state not found for agentId: ${agentId}`
        }
      });
    }

    const state = JSON.parse(stateData);
    const ttl = await redis.ttl(key);

    res.json({
      agentId,
      state,
      ttl: ttl > 0 ? ttl : null
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: error.message
      }
    });
  }
});

// Retry a failed agent task
app.post('/api/v1/agent/state/:agentId/retry', async (req, res) => {
  try {
    const { agentId } = req.params;
    validateAgentId(agentId);

    const key = `${AGENT_STATE_PREFIX}${agentId}`;
    const stateData = await redis.get(key);

    if (!stateData) {
      return res.status(404).json({
        error: {
          code: 'STATE_NOT_FOUND',
          message: `Agent state not found for agentId: ${agentId}`
        }
      });
    }

    const state = JSON.parse(stateData);

    // Check if task is in a failed state
    if (state.status !== 'failed') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot retry task with status: ${state.status}. Only failed tasks can be retried.`
        }
      });
    }

    // Check if retry limit has been reached
    const retryCount = state.retryCount || 0;
    const maxRetries = state.maxRetries || MAX_RETRIES;

    if (retryCount >= maxRetries) {
      return res.status(400).json({
        error: {
          code: 'MAX_RETRIES_EXCEEDED',
          message: `Maximum retry limit (${maxRetries}) has been reached for this task.`
        }
      });
    }

    // Update state for retry
    const now = new Date().toISOString();
    state.status = 'pending';
    state.retryCount = retryCount + 1;
    state.progress = 0;
    state.retriedAt = now;
    state.updatedAt = now;

    // Preserve error history
    if (!state.errorHistory) {
      state.errorHistory = [];
    }
    state.errorHistory.push({
      error: state.lastError,
      failedAt: state.failedAt,
      retryNumber: retryCount
    });

    // Save updated state
    const ttl = await redis.ttl(key);
    const stateTTL = ttl > 0 ? ttl : DEFAULT_TTL;
    await redis.setex(key, stateTTL, JSON.stringify(state));

    res.json({
      agentId,
      state,
      retryCount: state.retryCount,
      maxRetries: state.maxRetries,
      retriesRemaining: maxRetries - state.retryCount
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: error.message
      }
    });
  }
});

// List all agent states
app.get('/api/v1/agent/states', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    // Get all agent IDs from index
    const agentIds = await redis.smembers(AGENT_STATE_INDEX);

    if (agentIds.length === 0) {
      return res.json({
        states: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    // Fetch all states
    const pipeline = redis.pipeline();
    agentIds.forEach(agentId => {
      pipeline.get(`${AGENT_STATE_PREFIX}${agentId}`);
    });
    const results = await pipeline.exec();

    // Parse and filter states
    let states = [];
    for (let i = 0; i < results.length; i++) {
      const [err, stateData] = results[i];
      if (!err && stateData) {
        const state = JSON.parse(stateData);
        
        // Filter by status if provided
        if (!status || state.status === status) {
          states.push(state);
        }
      } else if (!stateData) {
        // Remove from index if state no longer exists
        await redis.srem(AGENT_STATE_INDEX, agentIds[i]);
      }
    }

    // Sort by updatedAt descending
    states.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    // Apply pagination
    const total = states.length;
    const paginatedStates = states.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      states: paginatedStates,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Delete agent execution state
app.delete('/api/v1/agent/state/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    validateAgentId(agentId);

    const key = `${AGENT_STATE_PREFIX}${agentId}`;
    
    // Check if state exists
    const exists = await redis.exists(key);
    if (!exists) {
      return res.status(404).json({
        error: {
          code: 'STATE_NOT_FOUND',
          message: `Agent state not found for agentId: ${agentId}`
        }
      });
    }

    // Delete state and remove from index
    await redis.del(key);
    await redis.srem(AGENT_STATE_INDEX, agentId);

    res.json({
      agentId,
      deleted: true
    });
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: error.message
      }
    });
  }
});

// Task Queue Management API

const TASK_QUEUE_FILE = path.join(PROJECT_ROOT, 'task-queue.txt');
const TASK_QUEUE_PREFIX = 'task:queue:';

// Helper function to read task queue
async function readTaskQueue() {
  try {
    const content = await fs.readFile(TASK_QUEUE_FILE, 'utf8');
    const lines = content.split('\n');
    const tasks = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        tasks.push(trimmed);
      }
    }
    
    return tasks;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper function to write task queue
async function writeTaskQueue(tasks) {
  const header = [
    '# Task Queue',
    '# Eine Task pro Zeile',
    '# GitHub Actions arbeitet alle 4h die nächste Task ab',
    `# Queue processing started - ${new Date().toUTCString()}`,
    ''
  ];
  
  const content = header.join('\n') + tasks.join('\n') + '\n';
  await fs.writeFile(TASK_QUEUE_FILE, content, 'utf8');
}

// Get all tasks in the queue
app.get('/api/v1/supervisor/queue', async (req, res) => {
  try {
    const tasks = await readTaskQueue();
    
    // Get status for each task from Redis
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task, index) => {
        const taskId = `queue:${index}:${Buffer.from(task).toString('base64').substring(0, 16)}`;
        const stateKey = `${AGENT_STATE_PREFIX}${taskId}`;
        const stateData = await redis.get(stateKey);
        
        return {
          index,
          task,
          taskId,
          state: stateData ? JSON.parse(stateData) : null
        };
      })
    );
    
    res.json({
      tasks: tasksWithStatus,
      total: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Add a task to the queue
app.post('/api/v1/supervisor/queue', async (req, res) => {
  try {
    const { task, position } = req.body;
    
    if (!task || typeof task !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Task must be a non-empty string'
        }
      });
    }
    
    const trimmedTask = task.trim();
    if (!trimmedTask) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Task cannot be empty or whitespace only'
        }
      });
    }
    
    const tasks = await readTaskQueue();
    
    // Add task at specified position or at the end
    if (position !== undefined) {
      const pos = parseInt(position);
      if (isNaN(pos) || pos < 0 || pos > tasks.length) {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: `Position must be between 0 and ${tasks.length}`
          }
        });
      }
      tasks.splice(pos, 0, trimmedTask);
    } else {
      tasks.push(trimmedTask);
    }
    
    await writeTaskQueue(tasks);
    
    res.json({
      task: trimmedTask,
      position: position !== undefined ? parseInt(position) : tasks.length - 1,
      total: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Remove a task from the queue
app.delete('/api/v1/supervisor/queue/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    
    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Index must be a non-negative number'
        }
      });
    }
    
    const tasks = await readTaskQueue();
    
    if (index >= tasks.length) {
      return res.status(404).json({
        error: {
          code: 'TASK_NOT_FOUND',
          message: `No task at index ${index}`
        }
      });
    }
    
    const removedTask = tasks[index];
    tasks.splice(index, 1);
    
    await writeTaskQueue(tasks);
    
    // Clean up any associated state
    const taskId = `queue:${index}:${Buffer.from(removedTask).toString('base64').substring(0, 16)}`;
    const stateKey = `${AGENT_STATE_PREFIX}${taskId}`;
    await redis.del(stateKey);
    await redis.srem(AGENT_STATE_INDEX, taskId);
    
    res.json({
      task: removedTask,
      index,
      total: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Process next task in the queue
app.post('/api/v1/supervisor/queue/process', async (req, res) => {
  try {
    const tasks = await readTaskQueue();
    
    if (tasks.length === 0) {
      return res.status(404).json({
        error: {
          code: 'QUEUE_EMPTY',
          message: 'No tasks in queue'
        }
      });
    }
    
    const task = tasks[0];
    const taskId = `queue:0:${Buffer.from(task).toString('base64').substring(0, 16)}`;
    
    // Create agent state for this task
    const now = new Date().toISOString();
    const state = {
      agentId: taskId,
      status: 'running',
      progress: 0,
      metadata: {
        task,
        queueIndex: 0,
        processedAt: now
      },
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: now,
      updatedAt: now
    };
    
    const stateKey = `${AGENT_STATE_PREFIX}${taskId}`;
    await redis.setex(stateKey, DEFAULT_TTL, JSON.stringify(state));
    await redis.sadd(AGENT_STATE_INDEX, taskId);
    
    res.json({
      task,
      taskId,
      state,
      message: 'Task marked as running. Call completion endpoint when done.'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Complete a task and remove it from queue
app.post('/api/v1/supervisor/queue/complete', async (req, res) => {
  try {
    const { taskId, status, error: taskError } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'taskId is required'
        }
      });
    }
    
    if (!status || !['completed', 'failed'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'status must be either "completed" or "failed"'
        }
      });
    }
    
    // Update task state
    const stateKey = `${AGENT_STATE_PREFIX}${taskId}`;
    const stateData = await redis.get(stateKey);
    
    if (!stateData) {
      return res.status(404).json({
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task not found: ${taskId}`
        }
      });
    }
    
    const state = JSON.parse(stateData);
    const now = new Date().toISOString();
    
    state.status = status;
    state.progress = status === 'completed' ? 100 : state.progress;
    state.updatedAt = now;
    
    if (status === 'completed') {
      state.completedAt = now;
    } else if (status === 'failed') {
      state.failedAt = now;
      state.lastError = taskError || 'Task failed';
    }
    
    await redis.setex(stateKey, DEFAULT_TTL, JSON.stringify(state));
    
    // Remove from queue if completed
    if (status === 'completed') {
      const tasks = await readTaskQueue();
      if (tasks.length > 0) {
        tasks.shift(); // Remove first task
        await writeTaskQueue(tasks);
      }
    }
    
    res.json({
      taskId,
      state,
      queueLength: status === 'completed' ? (await readTaskQueue()).length : null
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// Get supervisor status
app.get('/api/v1/supervisor/status', async (req, res) => {
  try {
    const tasks = await readTaskQueue();
    
    // Get all running tasks
    const agentIds = await redis.smembers(AGENT_STATE_INDEX);
    const runningTasks = [];
    
    for (const agentId of agentIds) {
      if (agentId.startsWith('queue:')) {
        const stateKey = `${AGENT_STATE_PREFIX}${agentId}`;
        const stateData = await redis.get(stateKey);
        if (stateData) {
          const state = JSON.parse(stateData);
          if (state.status === 'running') {
            runningTasks.push(state);
          }
        }
      }
    }
    
    res.json({
      queueLength: tasks.length,
      runningTasks: runningTasks.length,
      tasks: runningTasks
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// File Operations API

// List files in a directory
app.get('/api/v1/files', async (req, res) => {
  try {
    const requestedPath = req.query.path || '.';
    const recursive = req.query.recursive === 'true';
    
    const fullPath = validatePath(requestedPath);
    
    // Check if path exists and is a directory
    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PATH',
          message: 'Path must be a directory'
        }
      });
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(entryPath);
        
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString()
        };
      })
    );

    res.json({
      path: requestedPath,
      files: files
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: `Directory not found: ${req.query.path}`
        }
      });
    }
    
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: error.message
      }
    });
  }
});

// Read file content
app.get('/api/v1/files/content', async (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Path parameter is required'
        }
      });
    }

    const fullPath = validatePath(requestedPath);
    
    // Check if file exists and is a file
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PATH',
          message: 'Path must be a file'
        }
      });
    }

    // Check file size limit (10MB)
    if (stats.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        }
      });
    }

    const content = await fs.readFile(fullPath, 'utf8');

    res.json({
      path: requestedPath,
      content: content,
      encoding: 'utf8',
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${req.query.path}`
        }
      });
    }
    
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: error.message
      }
    });
  }
});

// Write file content
app.post('/api/v1/files/content', async (req, res) => {
  try {
    const { path: requestedPath, content, createDirs } = req.body;
    
    if (!requestedPath) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Path is required'
        }
      });
    }

    if (content === undefined || content === null) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Content is required'
        }
      });
    }

    const fullPath = validatePath(requestedPath);
    
    // Check if we need to create directories
    if (createDirs) {
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(fullPath);
      fileExists = true;
    } catch (error) {
      // File doesn't exist, which is fine
    }

    // Write the file
    await fs.writeFile(fullPath, content, 'utf8');
    
    const stats = await fs.stat(fullPath);

    res.json({
      path: requestedPath,
      size: stats.size,
      created: !fileExists,
      modified: stats.mtime.toISOString()
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(400).json({
        error: {
          code: 'DIRECTORY_NOT_FOUND',
          message: 'Parent directory does not exist. Set createDirs: true to create it.'
        }
      });
    }
    
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: error.message
      }
    });
  }
});

// Delete file
app.delete('/api/v1/files/content', async (req, res) => {
  try {
    const requestedPath = req.query.path;
    if (!requestedPath) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Path parameter is required'
        }
      });
    }

    const fullPath = validatePath(requestedPath);
    
    // Check if file exists and is a file
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PATH',
          message: 'Path must be a file'
        }
      });
    }

    await fs.unlink(fullPath);

    res.json({
      path: requestedPath,
      deleted: true
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: `File not found: ${req.query.path}`
        }
      });
    }
    
    res.status(400).json({
      error: {
        code: 'INVALID_PATH',
        message: error.message
      }
    });
  }
});

// Declare server at module level for graceful shutdown
let server = null;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, starting graceful shutdown`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  try {
    await redis.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export app for testing
module.exports = app;

// Only start server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}

// Export server and redis for graceful shutdown in tests
module.exports.server = server;
module.exports.redis = redis;
