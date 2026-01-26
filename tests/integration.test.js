const request = require('supertest');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

// Mock Redis before requiring the app
jest.mock('ioredis');

const app = require('../src/api-server');

describe('Integration Tests - File Operations API', () => {
  const testDir = path.join(process.cwd(), 'tests', 'test-files');
  const testFile = path.join(testDir, 'test.txt');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();

    if (false) {
      mockRedis.once = jest.fn();
    }
    if (!mockRedis.ping) {
      mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    if (mockRedis && mockRedis.quit) {
      mockRedis.quit.mockResolvedValue('OK');
    }
  });

  describe('GET /api/v1/files - List files', () => {
    beforeEach(async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    });

    afterEach(async () => {
      // Clean up test files
      try {
        await fs.rm(path.join(testDir, 'file1.txt'), { force: true });
        await fs.rm(path.join(testDir, 'file2.txt'), { force: true });
        await fs.rm(path.join(testDir, 'subdir'), { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should list files in tests directory', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/test-files' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('path', 'tests/test-files');
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBeGreaterThanOrEqual(2);
      
      const fileNames = response.body.files.map(f => f.name);
      expect(fileNames).toContain('file1.txt');
      expect(fileNames).toContain('file2.txt');
      expect(fileNames).toContain('subdir');
    });

    test('should return file metadata', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/test-files' });

      expect(response.status).toBe(200);
      const file = response.body.files.find(f => f.name === 'file1.txt');
      expect(file).toBeDefined();
      expect(file).toHaveProperty('type', 'file');
      expect(file).toHaveProperty('size');
      expect(file).toHaveProperty('modified');
      expect(file.size).toBeGreaterThan(0);
    });

    test('should distinguish between files and directories', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/test-files' });

      expect(response.status).toBe(200);
      const file = response.body.files.find(f => f.name === 'file1.txt');
      const dir = response.body.files.find(f => f.name === 'subdir');
      
      expect(file.type).toBe('file');
      expect(dir.type).toBe('directory');
      expect(file.size).toBeDefined();
      expect(dir.size).toBeUndefined();
    });

    test('should return 404 for non-existent directory', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/non-existent-dir' });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'FILE_NOT_FOUND');
    });

    test('should reject path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: '../../../etc' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
    });

    test('should reject access to disallowed directories', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'node_modules' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
      expect(response.body.error.message).toContain('not allowed');
    });

    test('should return 400 when path is a file not a directory', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/test-files/file1.txt' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
      expect(response.body.error.message).toContain('directory');
    });
  });

  describe('GET /api/v1/files/content - Read file', () => {
    const testContent = 'This is test content\nWith multiple lines\n';

    beforeEach(async () => {
      await fs.writeFile(testFile, testContent, 'utf8');
    });

    afterEach(async () => {
      try {
        await fs.unlink(testFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should read file content', async () => {
      const response = await request(app)
        .get('/api/v1/files/content')
        .query({ path: 'tests/test-files/test.txt' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('path', 'tests/test-files/test.txt');
      expect(response.body).toHaveProperty('content', testContent);
      expect(response.body).toHaveProperty('encoding', 'utf8');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('modified');
    });

    test('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/v1/files/content')
        .query({ path: 'tests/test-files/non-existent.txt' });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'FILE_NOT_FOUND');
    });

    test('should return 400 when path parameter is missing', async () => {
      const response = await request(app)
        .get('/api/v1/files/content');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('required');
    });

    test('should return 400 when path is a directory', async () => {
      const response = await request(app)
        .get('/api/v1/files/content')
        .query({ path: 'tests/test-files' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
      expect(response.body.error.message).toContain('file');
    });

    test('should reject path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/v1/files/content')
        .query({ path: '../../../etc/passwd' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
    });
  });

  describe('POST /api/v1/files/content - Write file', () => {
    const newFilePath = 'tests/test-files/new-file.txt';
    const newFileContent = 'New file content';

    afterEach(async () => {
      try {
        await fs.unlink(path.join(process.cwd(), newFilePath));
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should create a new file', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: newFilePath,
          content: newFileContent
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('path', newFilePath);
      expect(response.body).toHaveProperty('created', true);
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('modified');

      // Verify file was actually created
      const content = await fs.readFile(path.join(process.cwd(), newFilePath), 'utf8');
      expect(content).toBe(newFileContent);
    });

    test('should update an existing file', async () => {
      // Create initial file
      await fs.writeFile(path.join(process.cwd(), newFilePath), 'Initial content', 'utf8');

      const updatedContent = 'Updated content';
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: newFilePath,
          content: updatedContent
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('created', false);

      // Verify file was updated
      const content = await fs.readFile(path.join(process.cwd(), newFilePath), 'utf8');
      expect(content).toBe(updatedContent);
    });

    test('should create directories when createDirs is true', async () => {
      const deepPath = 'tests/test-files/deep/nested/dir/file.txt';
      
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: deepPath,
          content: 'Deep file content',
          createDirs: true
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('created', true);

      // Verify file was created
      const content = await fs.readFile(path.join(process.cwd(), deepPath), 'utf8');
      expect(content).toBe('Deep file content');

      // Cleanup
      await fs.rm(path.join(process.cwd(), 'tests/test-files/deep'), { recursive: true, force: true });
    });

    test('should return 400 when parent directory does not exist and createDirs is false', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: 'tests/test-files/non-existent-dir/file.txt',
          content: 'Content'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'DIRECTORY_NOT_FOUND');
      expect(response.body.error.message).toContain('createDirs');
    });

    test('should return 400 when path is missing', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          content: 'Content'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Path is required');
    });

    test('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: newFilePath
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Content is required');
    });

    test('should accept empty string as content', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: newFilePath,
          content: ''
        });

      expect(response.status).toBe(200);
      
      const content = await fs.readFile(path.join(process.cwd(), newFilePath), 'utf8');
      expect(content).toBe('');
    });

    test('should reject path traversal attempts', async () => {
      const response = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: '../../../tmp/malicious.txt',
          content: 'Malicious content'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
    });
  });

  describe('DELETE /api/v1/files/content - Delete file', () => {
    const deleteFilePath = 'tests/test-files/delete-me.txt';

    beforeEach(async () => {
      await fs.writeFile(path.join(process.cwd(), deleteFilePath), 'Delete this', 'utf8');
    });

    afterEach(async () => {
      try {
        await fs.unlink(path.join(process.cwd(), deleteFilePath));
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should delete a file', async () => {
      const response = await request(app)
        .delete('/api/v1/files/content')
        .query({ path: deleteFilePath });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('path', deleteFilePath);
      expect(response.body).toHaveProperty('deleted', true);

      // Verify file was deleted
      await expect(fs.access(path.join(process.cwd(), deleteFilePath))).rejects.toThrow();
    });

    test('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .delete('/api/v1/files/content')
        .query({ path: 'tests/test-files/non-existent.txt' });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'FILE_NOT_FOUND');
    });

    test('should return 400 when path parameter is missing', async () => {
      const response = await request(app)
        .delete('/api/v1/files/content');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('required');
    });

    test('should return 400 when trying to delete a directory', async () => {
      const response = await request(app)
        .delete('/api/v1/files/content')
        .query({ path: 'tests/test-files' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
      expect(response.body.error.message).toContain('file');
    });

    test('should reject path traversal attempts', async () => {
      const response = await request(app)
        .delete('/api/v1/files/content')
        .query({ path: '../../../tmp/important.txt' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_PATH');
    });
  });

  describe('End-to-end file workflow', () => {
    const workflowFile = 'tests/test-files/workflow.txt';

    afterEach(async () => {
      try {
        await fs.unlink(path.join(process.cwd(), workflowFile));
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    test('should complete full CRUD workflow', async () => {
      // 1. Create file
      const createResponse = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: workflowFile,
          content: 'Initial content'
        });
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.created).toBe(true);

      // 2. Read file
      const readResponse = await request(app)
        .get('/api/v1/files/content')
        .query({ path: workflowFile });
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.content).toBe('Initial content');

      // 3. Update file
      const updateResponse = await request(app)
        .post('/api/v1/files/content')
        .send({
          path: workflowFile,
          content: 'Updated content'
        });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.created).toBe(false);

      // 4. Read updated file
      const readUpdatedResponse = await request(app)
        .get('/api/v1/files/content')
        .query({ path: workflowFile });
      expect(readUpdatedResponse.status).toBe(200);
      expect(readUpdatedResponse.body.content).toBe('Updated content');

      // 5. List directory to verify file exists
      const listResponse = await request(app)
        .get('/api/v1/files')
        .query({ path: 'tests/test-files' });
      expect(listResponse.status).toBe(200);
      const fileNames = listResponse.body.files.map(f => f.name);
      expect(fileNames).toContain('workflow.txt');

      // 6. Delete file
      const deleteResponse = await request(app)
        .delete('/api/v1/files/content')
        .query({ path: workflowFile });
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.deleted).toBe(true);

      // 7. Verify file is deleted
      const readDeletedResponse = await request(app)
        .get('/api/v1/files/content')
        .query({ path: workflowFile });
      expect(readDeletedResponse.status).toBe(404);
    });
  });
});

describe('Integration Tests - Agent State Management API', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
    
    // Mock Redis methods
    mockRedis.on = jest.fn();
    mockRedis.once = jest.fn();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    
    mockRedis.get = jest.fn((key) => {
      return Promise.resolve(Redis.mockStore.get(key) || null);
    });
    
    mockRedis.setex = jest.fn((key, ttl, value) => {
      Redis.mockStore.set(key, value);
      return Promise.resolve('OK');
    });
    
    mockRedis.del = jest.fn((key) => {
      const existed = Redis.mockStore.has(key);
      Redis.mockStore.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    });
    
    mockRedis.exists = jest.fn((key) => {
      return Promise.resolve(Redis.mockStore.has(key) ? 1 : 0);
    });
    
    mockRedis.ttl = jest.fn(() => {
      return Promise.resolve(86400);
    });
    
    mockRedis.sadd = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        if (!parsed.includes(member)) {
          parsed.push(member);
          Redis.mockStore.set(key, JSON.stringify(parsed));
        }
      } else {
        Redis.mockStore.set(key, JSON.stringify([member]));
      }
      return Promise.resolve(1);
    });
    
    mockRedis.srem = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        const filtered = parsed.filter(m => m !== member);
        Redis.mockStore.set(key, JSON.stringify(filtered));
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    });
    
    mockRedis.smembers = jest.fn((key) => {
      const set = Redis.mockStore.get(key);
      return Promise.resolve(set ? JSON.parse(set) : []);
    });
    
    mockRedis.pipeline = jest.fn(() => {
      const commands = [];
      return {
        get: (key) => {
          commands.push({ cmd: 'get', key });
          return this;
        },
        exec: async () => {
          return commands.map(({ cmd, key }) => {
            if (cmd === 'get') {
              return [null, Redis.mockStore.get(key) || null];
            }
            return [null, null];
          });
        }
      };
    });
  });

  describe('POST /api/v1/agent/state - Create/Update agent state', () => {
    test('should create a new agent state', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-1',
          status: 'running',
          progress: 50,
          metadata: { task: 'test task' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agentId', 'test-agent-1');
      expect(response.body.state).toHaveProperty('status', 'running');
      expect(response.body.state).toHaveProperty('progress', 50);
      expect(response.body.state).toHaveProperty('metadata');
      expect(response.body.state.metadata).toHaveProperty('task', 'test task');
      expect(response.body.state).toHaveProperty('createdAt');
      expect(response.body.state).toHaveProperty('updatedAt');
      expect(response.body.state).toHaveProperty('retryCount', 0);
      expect(response.body.state).toHaveProperty('maxRetries', 3);
    });

    test('should update an existing agent state', async () => {
      // Create initial state
      await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-2',
          status: 'pending',
          progress: 0
        });

      // Update state
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-2',
          status: 'running',
          progress: 75
        });

      expect(response.status).toBe(200);
      expect(response.body.state).toHaveProperty('status', 'running');
      expect(response.body.state).toHaveProperty('progress', 75);
    });

    test('should handle failed status with error message', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-3',
          status: 'failed',
          error: 'Connection timeout'
        });

      expect(response.status).toBe(200);
      expect(response.body.state).toHaveProperty('status', 'failed');
      expect(response.body.state).toHaveProperty('lastError', 'Connection timeout');
      expect(response.body.state).toHaveProperty('failedAt');
    });

    test('should return 400 for invalid agentId', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          status: 'running'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('agentId is required');
    });

    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-4',
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('status must be one of');
    });

    test('should return 400 for invalid progress value', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-5',
          progress: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('progress must be a number between 0 and 100');
    });

    test('should validate agentId format', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'invalid agent id with spaces',
          status: 'running'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('invalid characters');
    });

    test('should accept custom TTL', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-6',
          status: 'running',
          ttl: 3600
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ttl', 3600);
    });
  });

  describe('GET /api/v1/agent/state/:agentId - Get agent state', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-get',
          status: 'running',
          progress: 60,
          metadata: { info: 'test' }
        });
    });

    test('should retrieve agent state', async () => {
      const response = await request(app)
        .get('/api/v1/agent/state/test-agent-get');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agentId', 'test-agent-get');
      expect(response.body.state).toHaveProperty('status', 'running');
      expect(response.body.state).toHaveProperty('progress', 60);
      expect(response.body).toHaveProperty('ttl');
    });

    test('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/v1/agent/state/non-existent-agent');

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'STATE_NOT_FOUND');
    });

    test('should return 400 for invalid agentId format', async () => {
      const response = await request(app)
        .get('/api/v1/agent/state/invalid agent');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('POST /api/v1/agent/state/:agentId/retry - Retry failed agent', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-retry',
          status: 'failed',
          error: 'Initial failure'
        });
    });

    test('should retry a failed task', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state/test-agent-retry/retry');

      expect(response.status).toBe(200);
      expect(response.body.state).toHaveProperty('status', 'pending');
      expect(response.body.state).toHaveProperty('retryCount', 1);
      expect(response.body.state).toHaveProperty('progress', 0);
      expect(response.body).toHaveProperty('retriesRemaining', 2);
      expect(response.body.state).toHaveProperty('errorHistory');
      expect(response.body.state.errorHistory).toHaveLength(1);
    });

    test('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .post('/api/v1/agent/state/non-existent/retry');

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'STATE_NOT_FOUND');
    });

    test('should return 400 when retrying non-failed task', async () => {
      await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-running',
          status: 'running'
        });

      const response = await request(app)
        .post('/api/v1/agent/state/test-agent-running/retry');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_STATE');
      expect(response.body.error.message).toContain('Only failed tasks can be retried');
    });

    test('should return 400 when max retries exceeded', async () => {
      // Retry 3 times to reach the limit
      await request(app).post('/api/v1/agent/state/test-agent-retry/retry');
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'test-agent-retry',
        status: 'failed'
      });
      await request(app).post('/api/v1/agent/state/test-agent-retry/retry');
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'test-agent-retry',
        status: 'failed'
      });
      await request(app).post('/api/v1/agent/state/test-agent-retry/retry');
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'test-agent-retry',
        status: 'failed'
      });

      const response = await request(app)
        .post('/api/v1/agent/state/test-agent-retry/retry');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'MAX_RETRIES_EXCEEDED');
    });
  });

  describe('GET /api/v1/agent/states - List all agent states', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'agent-1',
        status: 'running',
        progress: 50
      });
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'agent-2',
        status: 'completed',
        progress: 100
      });
      await request(app).post('/api/v1/agent/state').send({
        agentId: 'agent-3',
        status: 'failed'
      });
    });

    test('should list all agent states', async () => {
      const response = await request(app)
        .get('/api/v1/agent/states');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('states');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 100);
      expect(response.body).toHaveProperty('offset', 0);
      expect(response.body.states.length).toBe(3);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/agent/states')
        .query({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.states.length).toBe(1);
      expect(response.body.states[0]).toHaveProperty('status', 'completed');
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/agent/states')
        .query({ limit: 2, offset: 1 });

      expect(response.status).toBe(200);
      expect(response.body.states.length).toBe(2);
      expect(response.body).toHaveProperty('limit', 2);
      expect(response.body).toHaveProperty('offset', 1);
      expect(response.body).toHaveProperty('total', 3);
    });

    test('should return empty array when no states exist', async () => {
      Redis.mockStore.clear();
      
      const response = await request(app)
        .get('/api/v1/agent/states');

      expect(response.status).toBe(200);
      expect(response.body.states).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('DELETE /api/v1/agent/state/:agentId - Delete agent state', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/agent/state')
        .send({
          agentId: 'test-agent-delete',
          status: 'completed'
        });
    });

    test('should delete agent state', async () => {
      const response = await request(app)
        .delete('/api/v1/agent/state/test-agent-delete');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('agentId', 'test-agent-delete');
      expect(response.body).toHaveProperty('deleted', true);

      // Verify state is deleted
      const getResponse = await request(app)
        .get('/api/v1/agent/state/test-agent-delete');
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .delete('/api/v1/agent/state/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'STATE_NOT_FOUND');
    });
  });
});

describe('Integration Tests - Task Queue Management API', () => {
  let mockRedis;
  const TASK_QUEUE_FILE = path.join(process.cwd(), 'task-queue.txt');

  beforeEach(async () => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
    
    // Mock Redis methods
    mockRedis.on = jest.fn();
    mockRedis.once = jest.fn();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.get = jest.fn((key) => Promise.resolve(Redis.mockStore.get(key) || null));
    mockRedis.setex = jest.fn((key, ttl, value) => {
      Redis.mockStore.set(key, value);
      return Promise.resolve('OK');
    });
    mockRedis.del = jest.fn((key) => {
      const existed = Redis.mockStore.has(key);
      Redis.mockStore.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    });
    mockRedis.sadd = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        if (!parsed.includes(member)) {
          parsed.push(member);
          Redis.mockStore.set(key, JSON.stringify(parsed));
        }
      } else {
        Redis.mockStore.set(key, JSON.stringify([member]));
      }
      return Promise.resolve(1);
    });
    mockRedis.srem = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        const filtered = parsed.filter(m => m !== member);
        Redis.mockStore.set(key, JSON.stringify(filtered));
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    });
    mockRedis.smembers = jest.fn((key) => {
      const set = Redis.mockStore.get(key);
      return Promise.resolve(set ? JSON.parse(set) : []);
    });
    mockRedis.pipeline = jest.fn(() => {
      const commands = [];
      return {
        get: (key) => {
          commands.push({ cmd: 'get', key });
          return this;
        },
        exec: async () => {
          return commands.map(({ cmd, key }) => {
            if (cmd === 'get') {
              return [null, Redis.mockStore.get(key) || null];
            }
            return [null, null];
          });
        }
      };
    });

    // Create empty task queue file
    await fs.writeFile(TASK_QUEUE_FILE, '# Task Queue\n# Eine Task pro Zeile\n# GitHub Actions arbeitet alle 4h die nächste Task ab\n\n', 'utf8');
  });

  afterEach(async () => {
    try {
      await fs.unlink(TASK_QUEUE_FILE);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /api/v1/supervisor/queue - Get task queue', () => {
    test('should return empty queue', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/queue');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('total', 0);
      expect(response.body.tasks).toEqual([]);
    });

    test('should return tasks in queue', async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 1' });
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 2' });

      const response = await request(app)
        .get('/api/v1/supervisor/queue');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks[0]).toHaveProperty('task', 'Task 1');
      expect(response.body.tasks[0]).toHaveProperty('index', 0);
      expect(response.body.tasks[0]).toHaveProperty('taskId');
      expect(response.body.tasks[1]).toHaveProperty('task', 'Task 2');
    });
  });

  describe('POST /api/v1/supervisor/queue - Add task to queue', () => {
    test('should add task to end of queue', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue')
        .send({ task: 'New task' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('task', 'New task');
      expect(response.body).toHaveProperty('position', 0);
      expect(response.body).toHaveProperty('total', 1);
    });

    test('should add task at specific position', async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 1' });
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 2' });

      const response = await request(app)
        .post('/api/v1/supervisor/queue')
        .send({ task: 'Inserted task', position: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('position', 1);
      expect(response.body).toHaveProperty('total', 3);

      const queueResponse = await request(app).get('/api/v1/supervisor/queue');
      expect(queueResponse.body.tasks[1].task).toBe('Inserted task');
    });

    test('should return 400 for empty task', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue')
        .send({ task: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('cannot be empty');
    });

    test('should return 400 for invalid position', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue')
        .send({ task: 'Task', position: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Position must be between');
    });
  });

  describe('DELETE /api/v1/supervisor/queue/:index - Remove task from queue', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 1' });
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 2' });
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 3' });
    });

    test('should remove task at index', async () => {
      const response = await request(app)
        .delete('/api/v1/supervisor/queue/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('task', 'Task 2');
      expect(response.body).toHaveProperty('index', 1);
      expect(response.body).toHaveProperty('total', 2);

      const queueResponse = await request(app).get('/api/v1/supervisor/queue');
      expect(queueResponse.body.total).toBe(2);
      expect(queueResponse.body.tasks[0].task).toBe('Task 1');
      expect(queueResponse.body.tasks[1].task).toBe('Task 3');
    });

    test('should return 404 for invalid index', async () => {
      const response = await request(app)
        .delete('/api/v1/supervisor/queue/10');

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
    });

    test('should return 400 for negative index', async () => {
      const response = await request(app)
        .delete('/api/v1/supervisor/queue/-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('POST /api/v1/supervisor/queue/process - Process next task', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Process this task' });
    });

    test('should mark first task as running', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue/process');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('task', 'Process this task');
      expect(response.body).toHaveProperty('taskId');
      expect(response.body.state).toHaveProperty('status', 'running');
      expect(response.body.state).toHaveProperty('progress', 0);
      expect(response.body.state.metadata).toHaveProperty('task', 'Process this task');
    });

    test('should return 404 for empty queue', async () => {
      await request(app).delete('/api/v1/supervisor/queue/0');

      const response = await request(app)
        .post('/api/v1/supervisor/queue/process');

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'QUEUE_EMPTY');
    });
  });

  describe('POST /api/v1/supervisor/queue/complete - Complete task', () => {
    let taskId;

    beforeEach(async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Complete this task' });
      const processResponse = await request(app).post('/api/v1/supervisor/queue/process');
      taskId = processResponse.body.taskId;
    });

    test('should complete task and remove from queue', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue/complete')
        .send({ taskId, status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.state).toHaveProperty('status', 'completed');
      expect(response.body.state).toHaveProperty('progress', 100);
      expect(response.body.state).toHaveProperty('completedAt');
      expect(response.body).toHaveProperty('queueLength', 0);

      const queueResponse = await request(app).get('/api/v1/supervisor/queue');
      expect(queueResponse.body.total).toBe(0);
    });

    test('should mark task as failed without removing from queue', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue/complete')
        .send({ taskId, status: 'failed', error: 'Task failed' });

      expect(response.status).toBe(200);
      expect(response.body.state).toHaveProperty('status', 'failed');
      expect(response.body.state).toHaveProperty('lastError', 'Task failed');
      expect(response.body.state).toHaveProperty('failedAt');
      expect(response.body).toHaveProperty('queueLength', null);

      const queueResponse = await request(app).get('/api/v1/supervisor/queue');
      expect(queueResponse.body.total).toBe(1);
    });

    test('should return 404 for non-existent taskId', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue/complete')
        .send({ taskId: 'non-existent', status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TASK_NOT_FOUND');
    });

    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/supervisor/queue/complete')
        .send({ taskId, status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });
  });

  describe('GET /api/v1/supervisor/status - Get supervisor status', () => {
    test('should return supervisor status', async () => {
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 1' });
      await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 2' });
      await request(app).post('/api/v1/supervisor/queue/process');

      const response = await request(app)
        .get('/api/v1/supervisor/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('queueLength', 2);
      expect(response.body).toHaveProperty('runningTasks', 1);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0]).toHaveProperty('status', 'running');
    });

    test('should return zero counts for empty system', async () => {
      const response = await request(app)
        .get('/api/v1/supervisor/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('queueLength', 0);
      expect(response.body).toHaveProperty('runningTasks', 0);
      expect(response.body.tasks).toEqual([]);
    });
  });
});

describe('End-to-end Agent Orchestration Workflows', () => {
  let mockRedis;
  const TASK_QUEUE_FILE = path.join(process.cwd(), 'task-queue.txt');

  beforeEach(async () => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
    
    // Mock Redis methods
    mockRedis.on = jest.fn();
    mockRedis.once = jest.fn();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.get = jest.fn((key) => Promise.resolve(Redis.mockStore.get(key) || null));
    mockRedis.setex = jest.fn((key, ttl, value) => {
      Redis.mockStore.set(key, value);
      return Promise.resolve('OK');
    });
    mockRedis.del = jest.fn((key) => {
      const existed = Redis.mockStore.has(key);
      Redis.mockStore.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    });
    mockRedis.exists = jest.fn((key) => Promise.resolve(Redis.mockStore.has(key) ? 1 : 0));
    mockRedis.ttl = jest.fn(() => Promise.resolve(86400));
    mockRedis.sadd = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        if (!parsed.includes(member)) {
          parsed.push(member);
          Redis.mockStore.set(key, JSON.stringify(parsed));
        }
      } else {
        Redis.mockStore.set(key, JSON.stringify([member]));
      }
      return Promise.resolve(1);
    });
    mockRedis.srem = jest.fn((key, member) => {
      const set = Redis.mockStore.get(key);
      if (set) {
        const parsed = JSON.parse(set);
        const filtered = parsed.filter(m => m !== member);
        Redis.mockStore.set(key, JSON.stringify(filtered));
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    });
    mockRedis.smembers = jest.fn((key) => {
      const set = Redis.mockStore.get(key);
      return Promise.resolve(set ? JSON.parse(set) : []);
    });
    mockRedis.pipeline = jest.fn(() => {
      const commands = [];
      return {
        get: (key) => {
          commands.push({ cmd: 'get', key });
          return this;
        },
        exec: async () => {
          return commands.map(({ cmd, key }) => {
            if (cmd === 'get') {
              return [null, Redis.mockStore.get(key) || null];
            }
            return [null, null];
          });
        }
      };
    });

    await fs.writeFile(TASK_QUEUE_FILE, '# Task Queue\n# Eine Task pro Zeile\n# GitHub Actions arbeitet alle 4h die nächste Task ab\n\n', 'utf8');
  });

  afterEach(async () => {
    try {
      await fs.unlink(TASK_QUEUE_FILE);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('Complete task queue workflow: add, process, complete', async () => {
    // 1. Add tasks to queue
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 1: Setup environment' });
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 2: Run tests' });
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Task 3: Deploy' });

    // 2. Check initial queue status
    let statusResponse = await request(app).get('/api/v1/supervisor/status');
    expect(statusResponse.body.queueLength).toBe(3);
    expect(statusResponse.body.runningTasks).toBe(0);

    // 3. Process first task
    const processResponse = await request(app).post('/api/v1/supervisor/queue/process');
    expect(processResponse.body.task).toBe('Task 1: Setup environment');
    const taskId = processResponse.body.taskId;

    // 4. Check status shows running task
    statusResponse = await request(app).get('/api/v1/supervisor/status');
    expect(statusResponse.body.queueLength).toBe(3);
    expect(statusResponse.body.runningTasks).toBe(1);

    // 5. Update task progress
    await request(app).post('/api/v1/agent/state').send({
      agentId: taskId,
      progress: 50,
      metadata: { step: 'Installing dependencies' }
    });

    // 6. Get task state
    const stateResponse = await request(app).get(`/api/v1/agent/state/${taskId}`);
    expect(stateResponse.body.state.progress).toBe(50);
    expect(stateResponse.body.state.metadata.step).toBe('Installing dependencies');

    // 7. Complete task
    const completeResponse = await request(app)
      .post('/api/v1/supervisor/queue/complete')
      .send({ taskId, status: 'completed' });
    expect(completeResponse.body.state.status).toBe('completed');
    expect(completeResponse.body.queueLength).toBe(2);

    // 8. Verify task removed from queue
    const queueResponse = await request(app).get('/api/v1/supervisor/queue');
    expect(queueResponse.body.total).toBe(2);
    expect(queueResponse.body.tasks[0].task).toBe('Task 2: Run tests');
  });

  test('Task failure and retry workflow', async () => {
    // 1. Add task
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Flaky task' });

    // 2. Process task
    const processResponse = await request(app).post('/api/v1/supervisor/queue/process');
    const taskId = processResponse.body.taskId;

    // 3. Mark as failed
    await request(app)
      .post('/api/v1/supervisor/queue/complete')
      .send({ taskId, status: 'failed', error: 'Network timeout' });

    // 4. Verify task still in queue
    let queueResponse = await request(app).get('/api/v1/supervisor/queue');
    expect(queueResponse.body.total).toBe(1);

    // 5. Check failed state
    let stateResponse = await request(app).get(`/api/v1/agent/state/${taskId}`);
    expect(stateResponse.body.state.status).toBe('failed');
    expect(stateResponse.body.state.lastError).toBe('Network timeout');
    expect(stateResponse.body.state.retryCount).toBe(0);

    // 6. Retry task
    const retryResponse = await request(app).post(`/api/v1/agent/state/${taskId}/retry`);
    expect(retryResponse.body.state.status).toBe('pending');
    expect(retryResponse.body.state.retryCount).toBe(1);
    expect(retryResponse.body.retriesRemaining).toBe(2);
    expect(retryResponse.body.state.errorHistory).toHaveLength(1);

    // 7. Process again
    const processAgainResponse = await request(app).post('/api/v1/supervisor/queue/process');
    expect(processAgainResponse.body.task).toBe('Flaky task');

    // 8. Complete successfully this time
    await request(app)
      .post('/api/v1/supervisor/queue/complete')
      .send({ taskId: processAgainResponse.body.taskId, status: 'completed' });

    // 9. Verify queue is empty
    queueResponse = await request(app).get('/api/v1/supervisor/queue');
    expect(queueResponse.body.total).toBe(0);
  });

  test('Multiple agents working in parallel', async () => {
    // 1. Create multiple agent states
    await request(app).post('/api/v1/agent/state').send({
      agentId: 'agent-1',
      status: 'running',
      progress: 25,
      metadata: { task: 'Processing data batch 1' }
    });
    await request(app).post('/api/v1/agent/state').send({
      agentId: 'agent-2',
      status: 'running',
      progress: 50,
      metadata: { task: 'Processing data batch 2' }
    });
    await request(app).post('/api/v1/agent/state').send({
      agentId: 'agent-3',
      status: 'completed',
      progress: 100,
      metadata: { task: 'Processing data batch 3' }
    });

    // 2. List all agents
    const listResponse = await request(app).get('/api/v1/agent/states');
    expect(listResponse.body.total).toBe(3);

    // 3. Filter running agents
    const runningResponse = await request(app)
      .get('/api/v1/agent/states')
      .query({ status: 'running' });
    expect(runningResponse.body.states.length).toBe(2);

    // 4. Update agent progress
    await request(app).post('/api/v1/agent/state').send({
      agentId: 'agent-1',
      progress: 75
    });

    // 5. Verify update
    const agent1Response = await request(app).get('/api/v1/agent/state/agent-1');
    expect(agent1Response.body.state.progress).toBe(75);

    // 6. Complete agent-2
    await request(app).post('/api/v1/agent/state').send({
      agentId: 'agent-2',
      status: 'completed',
      progress: 100
    });

    // 7. Check running agents again
    const runningResponse2 = await request(app)
      .get('/api/v1/agent/states')
      .query({ status: 'running' });
    expect(runningResponse2.body.states.length).toBe(1);
    expect(runningResponse2.body.states[0].agentId).toBe('agent-1');
  });

  test('Task queue with priority insertion', async () => {
    // 1. Add normal priority tasks
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Normal task 1' });
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Normal task 2' });
    await request(app).post('/api/v1/supervisor/queue').send({ task: 'Normal task 3' });

    // 2. Insert high priority task at position 0
    await request(app).post('/api/v1/supervisor/queue').send({
      task: 'URGENT: Critical fix',
      position: 0
    });

    // 3. Verify order
    const queueResponse = await request(app).get('/api/v1/supervisor/queue');
    expect(queueResponse.body.tasks[0].task).toBe('URGENT: Critical fix');
    expect(queueResponse.body.tasks[1].task).toBe('Normal task 1');

    // 4. Process urgent task first
    const processResponse = await request(app).post('/api/v1/supervisor/queue/process');
    expect(processResponse.body.task).toBe('URGENT: Critical fix');

    // 5. Complete it
    await request(app).post('/api/v1/supervisor/queue/complete').send({
      taskId: processResponse.body.taskId,
      status: 'completed'
    });

    // 6. Verify normal tasks remain
    const queueResponse2 = await request(app).get('/api/v1/supervisor/queue');
    expect(queueResponse2.body.total).toBe(3);
    expect(queueResponse2.body.tasks[0].task).toBe('Normal task 1');
  });

  test('Agent state lifecycle with metadata updates', async () => {
    const agentId = 'lifecycle-agent';

    // 1. Create pending agent
    await request(app).post('/api/v1/agent/state').send({
      agentId,
      status: 'pending',
      metadata: { phase: 'initialization' }
    });

    // 2. Start running
    await request(app).post('/api/v1/agent/state').send({
      agentId,
      status: 'running',
      progress: 10,
      metadata: { phase: 'data loading', recordsLoaded: 1000 }
    });

    // 3. Update progress multiple times
    await request(app).post('/api/v1/agent/state').send({
      agentId,
      progress: 30,
      metadata: { phase: 'processing', recordsProcessed: 3000 }
    });

    await request(app).post('/api/v1/agent/state').send({
      agentId,
      progress: 60,
      metadata: { phase: 'validation', recordsValidated: 6000 }
    });

    await request(app).post('/api/v1/agent/state').send({
      agentId,
      progress: 90,
      metadata: { phase: 'saving', recordsSaved: 9000 }
    });

    // 4. Complete
    await request(app).post('/api/v1/agent/state').send({
      agentId,
      status: 'completed',
      progress: 100,
      metadata: { phase: 'done', totalRecords: 10000 }
    });

    // 5. Verify final state
    const finalState = await request(app).get(`/api/v1/agent/state/${agentId}`);
    expect(finalState.body.state.status).toBe('completed');
    expect(finalState.body.state.progress).toBe(100);
    expect(finalState.body.state.metadata.phase).toBe('done');
    expect(finalState.body.state.metadata.totalRecords).toBe(10000);
    expect(finalState.body.state).toHaveProperty('completedAt');

    // 6. Delete state
    await request(app).delete(`/api/v1/agent/state/${agentId}`);

    // 7. Verify deleted
    const deletedResponse = await request(app).get(`/api/v1/agent/state/${agentId}`);
    expect(deletedResponse.status).toBe(404);
  });
});
