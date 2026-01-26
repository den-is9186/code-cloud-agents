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
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
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

