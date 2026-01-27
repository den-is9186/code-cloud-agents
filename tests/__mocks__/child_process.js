// Mock child_process module for tests
const child_process = {
  exec: jest.fn(),
  execFile: jest.fn(),
  spawn: jest.fn(),
  fork: jest.fn(),
  execSync: jest.fn(),
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
};

module.exports = child_process;
