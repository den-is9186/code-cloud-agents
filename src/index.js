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
