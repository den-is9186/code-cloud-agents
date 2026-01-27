/**
 * Jest Setup File
 * Runs after the test framework has been installed in the environment
 */

// Enable automocking for specific modules that need it
// This ensures that jest.mock() calls work properly with TypeScript compiled modules

// Mock factory for tools module
jest.mock('../src/tools/index.ts', () => ({
  executeTool: jest.fn(),
  registerTool: jest.fn(),
  getTool: jest.fn(),
  listTools: jest.fn(),
}), { virtual: false });

// Mock factory for export-service
jest.mock('../src/services/export-service.ts', () => ({
  ExportFormat: {
    JSON: 'json',
    CSV: 'csv',
    YAML: 'yaml',
  },
  exportBuildReport: jest.fn(),
  exportCostReport: jest.fn(),
  exportAgentPerformanceReport: jest.fn(),
  exportBudgetReport: jest.fn(),
}), { virtual: false });

// Mock factory for LLM client
jest.mock('../src/llm/client.ts', () => ({
  llmClient: {
    chat: jest.fn(),
    streamChat: jest.fn(),
  },
  createLLMClient: jest.fn(),
}), { virtual: false });
