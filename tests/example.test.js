const request = require('supertest');
const Redis = require('ioredis');

// Mock Redis before requiring the app
jest.mock('ioredis');

const app = require('../src/index');

describe('Example test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
});

describe('GET /health', () => {
  let mockRedis;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked Redis constructor
    const RedisMock = Redis;
    mockRedis = RedisMock.mock.instances[0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and healthy status when Redis is connected', async () => {
    // Mock successful Redis ping
    mockRedis.ping.mockResolvedValue('PONG');

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      redis: 'connected'
    });
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  test('should return 503 and unhealthy status when Redis is disconnected', async () => {
    // Mock failed Redis ping
    const errorMessage = 'Connection refused';
    mockRedis.ping.mockRejectedValue(new Error(errorMessage));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      redis: 'disconnected',
      error: errorMessage
    });
    expect(mockRedis.ping).toHaveBeenCalled();
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
