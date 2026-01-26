const request = require('supertest');
const Redis = require('ioredis');

// Mock Redis before requiring the app
jest.mock('ioredis');

const app = require('../src/api-server');

describe('Example test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('GET /health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and healthy status when Redis is connected', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      redis: 'connected'
    });
  });
});

describe('GET /', () => {
  test('should return Hello World message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Hello World'
    });
  });

  test('should return JSON content type', async () => {
    const response = await request(app).get('/');

    expect(response.headers['content-type']).toMatch(/json/);
  });
});

describe('Error handling', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
  });
});
