/**
 * Jest test setup file
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.CONSOLE_LOGGING = 'false';
process.env.FILE_LOGGING = 'false';

// Mock audio APIs that aren't available in Node.js test environment
(global as any).AudioContext = jest.fn().mockImplementation(() => ({
  createMediaStreamSource: jest.fn(),
  createScriptProcessor: jest.fn(),
  createAnalyser: jest.fn(),
  close: jest.fn()
}));

(global as any).navigator = {
  ...(global as any).navigator,
  mediaDevices: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([{
        stop: jest.fn()
      }])
    })
  }
};

// Increase timeout for async operations
jest.setTimeout(10000);