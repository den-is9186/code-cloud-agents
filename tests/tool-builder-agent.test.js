/**
 * Tool Builder Agent Tests
 *
 * Tests for the Tool Builder Agent that dynamically creates tool definitions
 */

const { ToolBuilderAgent } = require('../dist/agents/tool-builder');
const { llmClient } = require('../dist/llm/client');
const { executeTool } = require('../dist/tools');

jest.mock('../dist/llm/client');
jest.mock('../dist/tools');

describe('ToolBuilderAgent', () => {
  let agent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ToolBuilderAgent('claude-sonnet-4');
  });

  describe('Agent Properties', () => {
    test('should have correct role', () => {
      expect(agent.role).toBe('tool-builder');
    });

    test('should have correct model', () => {
      expect(agent.model).toBe('claude-sonnet-4');
    });

    test('should have idle status', () => {
      expect(agent.status).toBe('idle');
    });
  });

  describe('execute()', () => {
    test('should create tool definition without files', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'calculate_sum',
              description: 'Calculate sum of two numbers',
              parameters: {
                a: { type: 'number', required: true },
                b: { type: 'number', required: true },
              },
              implementation: 'return { result: params.a + params.b };',
              validation: ['Input must be numbers'],
              testCases: [
                {
                  input: { a: 1, b: 2 },
                  expectedOutput: { result: 3 },
                },
              ],
            },
          ],
          warnings: [],
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create calculator tool',
        toolRequirements: 'Need a tool to add two numbers',
      });

      expect(result.toolsCreated).toHaveLength(1);
      expect(result.toolsCreated[0].name).toBe('calculate_sum');
      expect(result.filesChanged).toHaveLength(0);
      expect(result.summary).toContain('calculate_sum');
    });

    test('should create tool with file output', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'string_reverse',
              description: 'Reverse a string',
              parameters: {
                text: { type: 'string', required: true },
              },
              implementation: 'return { reversed: params.text.split("").reverse().join("") };',
              testCases: [
                {
                  input: { text: 'hello' },
                  expectedOutput: { reversed: 'olleh' },
                },
              ],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Create string manipulation tool',
        toolRequirements: 'Need a tool to reverse strings',
        outputPath: 'src/tools/custom',
      });

      expect(result.toolsCreated).toHaveLength(1);
      expect(result.filesChanged).toHaveLength(2); // tool file + test file
      expect(result.filesChanged[0].path).toBe('src/tools/custom/string_reverse.ts');
      expect(result.filesChanged[0].action).toBe('create');
      expect(result.filesChanged[1].path).toBe('src/tools/custom/../tests/string_reverse.test.ts');
    });

    test('should create multiple tools', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'tool_one',
              description: 'First tool description',
              parameters: {
                param: { type: 'string', required: true },
              },
              implementation: 'return { success: true };',
            },
            {
              name: 'tool_two',
              description: 'Second tool description',
              parameters: {
                value: { type: 'number', required: true },
              },
              implementation: 'return { result: params.value * 2 };',
            },
          ],
        }),
        usage: { inputTokens: 150, outputTokens: 200, totalTokens: 350, cost: 0.002 },
      });

      const result = await agent.execute({
        task: 'Create utility tools',
        toolRequirements: 'Need multiple utility tools',
      });

      expect(result.toolsCreated).toHaveLength(2);
      expect(result.toolsCreated[0].name).toBe('tool_one');
      expect(result.toolsCreated[1].name).toBe('tool_two');
    });

    test('should validate tool names (snake_case)', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'InvalidToolName', // Not snake_case
              description: 'Invalid tool name format',
              parameters: {
                param: { type: 'string' },
              },
              implementation: 'return {};',
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool with invalid name',
        toolRequirements: 'Tool with bad naming',
      });

      expect(result.toolsCreated).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('snake_case');
    });

    test('should validate tool description length', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'short_desc',
              description: 'Too short', // Less than 10 characters
              parameters: {
                param: { type: 'string' },
              },
              implementation: 'return {};',
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool with short description',
        toolRequirements: 'Tool with minimal description',
      });

      expect(result.toolsCreated).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('at least 10 characters');
    });

    test('should validate parameter types', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'invalid_params',
              description: 'Tool with invalid parameter types',
              parameters: {
                badParam: { type: 'invalid_type', required: true },
              },
              implementation: 'return {};',
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool with invalid params',
        toolRequirements: 'Tool with bad parameter types',
      });

      expect(result.toolsCreated).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('invalid type');
    });

    test('should validate implementation length', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'short_impl',
              description: 'Tool with short implementation',
              parameters: {
                param: { type: 'string' },
              },
              implementation: 'return', // Too short
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool with short implementation',
        toolRequirements: 'Tool with minimal code',
      });

      expect(result.toolsCreated).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('too short');
    });

    test('should handle JSON parsing errors', async () => {
      llmClient.chat.mockResolvedValue({
        content: 'Invalid JSON response',
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool',
        toolRequirements: 'Some requirements',
      });

      expect(result.toolsCreated).toHaveLength(0);
      expect(result.summary).toContain('Failed to parse');
      expect(result.warnings).toContain('JSON parsing failed');
    });

    test('should include existing tools in prompt', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      await agent.execute({
        task: 'Create tool',
        toolRequirements: 'Requirements',
        existingTools: ['file_read', 'file_write', 'git_commit'],
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('file_read, file_write, git_commit'),
          }),
        ])
      );
    });

    test('should generate valid TypeScript code', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'sample_tool',
              description: 'A sample tool for testing',
              parameters: {
                inputValue: { type: 'string', required: true },
                optionalParam: { type: 'number', required: false },
              },
              implementation: 'return { processed: params.inputValue.toUpperCase() };',
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Create sample tool',
        toolRequirements: 'Sample requirements',
        outputPath: 'src/tools',
      });

      expect(executeTool).toHaveBeenCalledWith('file_write', expect.any(Object));

      const writeCall = executeTool.mock.calls[0][1];
      expect(writeCall.content).toContain('export interface SampleToolParams');
      expect(writeCall.content).toContain('inputValue: string;');
      expect(writeCall.content).toContain('optionalParam?: number;');
      expect(writeCall.content).toContain('export const sample_tool');
    });

    test('should generate test code with test cases', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'test_tool',
              description: 'Tool with test cases',
              parameters: {
                value: { type: 'number', required: true },
              },
              implementation: 'return { doubled: params.value * 2 };',
              testCases: [
                {
                  input: { value: 5 },
                  expectedOutput: { doubled: 10 },
                },
                {
                  input: { value: -1 },
                  shouldFail: true,
                },
              ],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Create tool with tests',
        toolRequirements: 'Tool with test coverage',
        outputPath: 'src/tools',
      });

      expect(executeTool).toHaveBeenCalledTimes(2); // tool + test file

      const testWriteCall = executeTool.mock.calls[1][1];
      expect(testWriteCall.content).toContain("describe('test_tool'");
      expect(testWriteCall.content).toContain('should execute successfully case 1');
      expect(testWriteCall.content).toContain('should handle error case 2');
    });

    test('should skip test generation if no test cases', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'no_tests',
              description: 'Tool without test cases',
              parameters: {
                param: { type: 'string', required: true },
              },
              implementation: 'return { success: true };',
              testCases: [],
            },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      executeTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Create tool',
        toolRequirements: 'Requirements',
        outputPath: 'src/tools',
      });

      expect(executeTool).toHaveBeenCalledTimes(1); // Only tool file, no test file
      expect(result.filesChanged).toHaveLength(1);
      expect(result.toolsCreated).toHaveLength(1);
    });

    test('should use different models', async () => {
      const haiku = new ToolBuilderAgent('claude-haiku-3-5');

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [],
        }),
        usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100, cost: 0.0005 },
      });

      await haiku.execute({
        task: 'Create tool',
        toolRequirements: 'Requirements',
      });

      expect(llmClient.chat).toHaveBeenCalledWith('claude-haiku-3-5', expect.any(Array));
    });

    test('should include warnings from LLM', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'valid_tool',
              description: 'A valid tool definition',
              parameters: {
                param: { type: 'string' },
              },
              implementation: 'return { success: true };',
            },
          ],
          warnings: ['Consider adding input validation', 'Tool might need error handling'],
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Create tool',
        toolRequirements: 'Requirements',
      });

      expect(result.warnings).toContain('Consider adding input validation');
      expect(result.warnings).toContain('Tool might need error handling');
    });

    test('should handle mixed valid and invalid tools', async () => {
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          tools: [
            {
              name: 'valid_tool',
              description: 'This is a valid tool with proper definition',
              parameters: {
                param: { type: 'string', required: true },
              },
              implementation: 'return { result: params.param };',
            },
            {
              name: 'InvalidName',
              description: 'Invalid tool name format',
              parameters: {
                param: { type: 'string' },
              },
              implementation: 'return {};',
            },
          ],
        }),
        usage: { inputTokens: 150, outputTokens: 200, totalTokens: 350, cost: 0.002 },
      });

      const result = await agent.execute({
        task: 'Create tools',
        toolRequirements: 'Mix of valid and invalid',
      });

      expect(result.toolsCreated).toHaveLength(1);
      expect(result.toolsCreated[0].name).toBe('valid_tool');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
