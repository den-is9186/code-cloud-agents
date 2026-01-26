/**
 * Tool Builder Agent
 *
 * Dynamically creates and defines new tools based on requirements.
 * Generates tool definitions, implementation code, and validation tests.
 */

import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import type { Agent, AgentRole, FileChange } from './types';
import { logger } from '../utils/logger';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<
    string,
    {
      type: string;
      required?: boolean;
      description?: string;
    }
  >;
  implementation: string;
  validation?: string[];
  testCases?: Array<{
    input: Record<string, any>;
    expectedOutput?: any;
    shouldFail?: boolean;
  }>;
}

export interface ToolBuilderInput {
  task: string;
  toolRequirements: string;
  existingTools?: string[];
  outputPath?: string;
}

export interface ToolBuilderOutput {
  toolsCreated: ToolDefinition[];
  filesChanged: FileChange[];
  summary: string;
  warnings: string[];
}

export class ToolBuilderAgent implements Agent {
  role: AgentRole = 'tool-builder';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: ToolBuilderInput): Promise<ToolBuilderOutput> {
    const { task, toolRequirements, existingTools = [], outputPath } = input;

    // Prepare context for LLM
    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt(task, toolRequirements, existingTools);

    // Call LLM to generate tool definitions
    const response = await llmClient.chat(this.model, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // Parse response
    let toolDefinitions: ToolDefinition[];
    let warnings: string[] = [];

    try {
      const parsed = JSON.parse(response.content);
      toolDefinitions = parsed.tools || [];
      warnings = parsed.warnings || [];
    } catch (error) {
      logger.error('Failed to parse LLM response', {
        agent: 'tool-builder',
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        toolsCreated: [],
        filesChanged: [],
        summary: 'Failed to parse tool definitions from LLM response',
        warnings: ['JSON parsing failed'],
      };
    }

    // Validate tool definitions
    const validatedTools: ToolDefinition[] = [];
    const validationWarnings: string[] = [];

    for (const tool of toolDefinitions) {
      const validation = this.validateToolDefinition(tool);
      if (validation.valid) {
        validatedTools.push(tool);
      } else {
        validationWarnings.push(`Tool ${tool.name}: ${validation.errors.join(', ')}`);
      }
    }

    // Generate files if output path provided
    const filesChanged: FileChange[] = [];

    if (outputPath && validatedTools.length > 0) {
      for (const tool of validatedTools) {
        const toolCode = this.generateToolCode(tool);
        const testCode = this.generateTestCode(tool);

        // Write tool implementation
        const toolFilePath = `${outputPath}/${tool.name}.ts`;
        await executeTool('file_write', {
          path: toolFilePath,
          content: toolCode,
        });

        filesChanged.push({
          path: toolFilePath,
          action: 'create',
          content: toolCode,
        });

        // Write tests if test cases exist
        if (tool.testCases && tool.testCases.length > 0) {
          const testFilePath = `${outputPath}/../tests/${tool.name}.test.ts`;
          await executeTool('file_write', {
            path: testFilePath,
            content: testCode,
          });

          filesChanged.push({
            path: testFilePath,
            action: 'create',
            content: testCode,
          });
        }
      }
    }

    return {
      toolsCreated: validatedTools,
      filesChanged,
      summary: `Created ${validatedTools.length} tool(s): ${validatedTools.map((t) => t.name).join(', ')}`,
      warnings: [...warnings, ...validationWarnings],
    };
  }

  private getSystemPrompt(): string {
    return `You are a Tool Builder Agent that creates tool definitions for a multi-agent system.

Your job is to:
1. Analyze the requirements and determine what tools are needed
2. Create well-defined tool specifications with clear interfaces
3. Generate TypeScript implementation code for each tool
4. Include validation rules and test cases

Tool Definition Format:
{
  "tools": [
    {
      "name": "tool_name",
      "description": "Clear description of what the tool does",
      "parameters": {
        "param_name": {
          "type": "string | number | boolean | array | object",
          "required": true,
          "description": "Parameter description"
        }
      },
      "implementation": "TypeScript code implementing the tool's execute function",
      "validation": ["Validation rule 1", "Validation rule 2"],
      "testCases": [
        {
          "input": { "param": "value" },
          "expectedOutput": { "result": "expected" },
          "shouldFail": false
        }
      ]
    }
  ],
  "warnings": ["Warning message if any"]
}

Guidelines:
- Tool names should be snake_case
- Keep tools focused and single-purpose
- Include proper error handling in implementation
- Validate all inputs before processing
- Use TypeScript types properly
- Include at least 2 test cases per tool
- Consider security (path traversal, command injection, etc.)

Return ONLY valid JSON, no markdown or explanations.`;
  }

  private getUserPrompt(task: string, requirements: string, existingTools: string[]): string {
    let prompt = `Task: ${task}\n\nTool Requirements:\n${requirements}\n\n`;

    if (existingTools.length > 0) {
      prompt += `Existing Tools (avoid duplicating):\n${existingTools.join(', ')}\n\n`;
    }

    prompt += `Please create tool definitions for the requirements above.`;

    return prompt;
  }

  private validateToolDefinition(tool: ToolDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate name
    if (!tool.name || typeof tool.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    } else if (!/^[a-z][a-z0-9_]*$/.test(tool.name)) {
      errors.push('Tool name must be snake_case');
    }

    // Validate description
    if (!tool.description || typeof tool.description !== 'string') {
      errors.push('Tool description is required');
    } else if (tool.description.length < 10) {
      errors.push('Tool description must be at least 10 characters');
    }

    // Validate parameters
    if (!tool.parameters || typeof tool.parameters !== 'object') {
      errors.push('Tool parameters must be an object');
    } else {
      for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
        if (!paramDef.type) {
          errors.push(`Parameter ${paramName} missing type`);
        }
        const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
        if (!validTypes.includes(paramDef.type)) {
          errors.push(`Parameter ${paramName} has invalid type: ${paramDef.type}`);
        }
      }
    }

    // Validate implementation
    if (!tool.implementation || typeof tool.implementation !== 'string') {
      errors.push('Tool implementation is required');
    } else if (tool.implementation.length < 20) {
      errors.push('Tool implementation seems too short');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateToolCode(tool: ToolDefinition): string {
    // Generate parameter interface
    const paramInterfaceName = this.toPascalCase(tool.name) + 'Params';
    const paramProps = Object.entries(tool.parameters)
      .map(([name, def]) => {
        const optional = def.required === false ? '?' : '';
        return `  ${name}${optional}: ${this.mapTypeToTS(def.type)};`;
      })
      .join('\n');

    return `/**
 * ${tool.description}
 *
 * Auto-generated by Tool Builder Agent
 */

import type { Tool } from './index';

export interface ${paramInterfaceName} {
${paramProps}
}

export const ${tool.name}: Tool<${paramInterfaceName}, any> = {
  name: '${tool.name}',
  description: '${tool.description}',
  parameters: ${JSON.stringify(tool.parameters, null, 2)},
  execute: async (params: ${paramInterfaceName}) => {
${this.indentCode(tool.implementation, 4)}
  },
};
`;
  }

  private generateTestCode(tool: ToolDefinition): string {
    if (!tool.testCases || tool.testCases.length === 0) {
      return `// No test cases defined for ${tool.name}`;
    }

    const testCases = tool.testCases
      .map((testCase, index) => {
        const testName = testCase.shouldFail
          ? `should handle error case ${index + 1}`
          : `should execute successfully case ${index + 1}`;

        return `  test('${testName}', async () => {
    const params = ${JSON.stringify(testCase.input, null, 4)};

    ${
      testCase.shouldFail
        ? `await expect(${tool.name}.execute(params)).rejects.toThrow();`
        : testCase.expectedOutput
          ? `const result = await ${tool.name}.execute(params);
    expect(result).toEqual(${JSON.stringify(testCase.expectedOutput, null, 4)});`
          : `const result = await ${tool.name}.execute(params);
    expect(result).toBeDefined();`
    }
  });`;
      })
      .join('\n\n');

    return `/**
 * Tests for ${tool.name}
 *
 * Auto-generated by Tool Builder Agent
 */

import { ${tool.name} } from '../src/tools/${tool.name}';

describe('${tool.name}', () => {
${testCases}
});
`;
  }

  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private mapTypeToTS(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      array: 'any[]',
      object: 'Record<string, any>',
    };
    return typeMap[type] || 'any';
  }

  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code
      .split('\n')
      .map((line) => indent + line)
      .join('\n');
  }
}
