/**
 * Multi-Repo Agent
 *
 * Coordinates changes across multiple repositories.
 * Supports two tiers:
 * - Budget: DeepSeek R1 for simple pattern updates (2-3 repos)
 * - Premium: Claude Opus for complex cross-repo refactoring (many repos)
 */

import { llmClient } from '../llm/client';
import type {
  Agent,
  AgentRole,
  MultiRepoOperation,
  MultiRepoResult,
  MultiRepoChange,
  RepositoryConfig,
  FileChange,
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface MultiRepoInput extends MultiRepoOperation {
  tier?: 'budget' | 'premium';
}

export class MultiRepoAgent implements Agent<MultiRepoInput, MultiRepoResult> {
  role: AgentRole = 'multi-repo';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: MultiRepoInput): Promise<MultiRepoResult> {
    const startTime = Date.now();
    const { repos, task, changes, createPRs, baseBranch = 'main', targetBranch } = input;

    const repoChanges: MultiRepoChange[] = [];
    const errors: Array<{ repo: string; error: string }> = [];
    let totalCost = 0;
    let totalTokens = 0;

    // Validate repositories exist
    await this.validateRepositories(repos);

    // Create target branch name if not provided
    const branchName = targetBranch || `multi-repo/${Date.now()}`;

    // Process each repository
    for (const repo of repos) {
      try {
        logger.info('Processing repository', { agent: 'multi-repo', repo: repo.name });

        // Change to repo directory
        const repoPath = repo.path;

        // Analyze repository
        const repoContext = await this.analyzeRepository(repoPath);

        // Generate changes using LLM
        const prompt = this.buildPrompt(task, changes, repoContext);
        const response = await llmClient.chat(this.model, [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt },
        ]);

        totalCost += response.usage.cost;
        totalTokens += response.usage.totalTokens;

        // Parse response to get file changes
        const fileChanges = this.parseChanges(response.content);

        // Create branch
        await this.createBranch(repoPath, branchName, baseBranch);

        // Apply changes
        await this.applyChanges(repoPath, fileChanges);

        // Commit changes
        const commitHash = await this.commitChanges(
          repoPath,
          `${task}\n\nMulti-repo change applied by Multi-Repo Agent`
        );

        // Push to remote if configured
        if (repo.remote) {
          await this.pushBranch(repoPath, branchName, repo.remote);
        }

        // Create PR if requested
        let prUrl: string | undefined;
        if (createPRs && repo.remote) {
          prUrl = await this.createPullRequest(repoPath, branchName, baseBranch, task, changes);
        }

        repoChanges.push({
          repo: repo.name,
          filesChanged: fileChanges,
          branch: branchName,
          commitHash,
          prUrl,
        });

        logger.info('Repository processing completed', {
          agent: 'multi-repo',
          repo: repo.name,
          filesChanged: fileChanges.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        logger.error('Repository processing failed', {
          agent: 'multi-repo',
          repo: repo.name,
          error: errorMessage,
          stack,
        });
        errors.push({
          repo: repo.name,
          error: errorMessage,
        });
      }
    }

    const duration = Date.now() - startTime;
    const success = errors.length === 0;

    return {
      success,
      reposProcessed: repoChanges.length,
      reposFailed: errors.length,
      changes: repoChanges,
      errors,
      summary: this.buildSummary(repoChanges, errors),
      totalCost,
      totalTokens,
      duration,
    };
  }

  private async validateRepositories(repos: RepositoryConfig[]): Promise<void> {
    for (const repo of repos) {
      try {
        await fs.access(repo.path);
        const stats = await fs.stat(repo.path);
        if (!stats.isDirectory()) {
          throw new Error(`${repo.path} is not a directory`);
        }

        // Check if it's a git repository
        const gitPath = path.join(repo.path, '.git');
        await fs.access(gitPath);
      } catch (error) {
        throw new Error(
          `Repository validation failed for ${repo.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  private async analyzeRepository(repoPath: string): Promise<{
    language: string;
    framework?: string;
    fileCount: number;
    structure: string[];
  }> {
    // Get repository structure (limited depth to avoid memory issues)
    const files: string[] = [];
    const maxFiles = 100; // Limit to prevent memory issues
    const maxDepth = 3;

    const walk = async (dir: string, relativePath = '', depth = 0) => {
      if (depth > maxDepth || files.length >= maxFiles) {
        return;
      }

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= maxFiles) break;

          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const entryPath = path.join(dir, entry.name);
          const relPath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            await walk(entryPath, relPath, depth + 1);
          } else {
            files.push(relPath);
          }
        }
      } catch (error) {
        logger.error('Error walking directory', {
          agent: 'multi-repo',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    try {
      await walk(repoPath);
    } catch (error) {
      logger.error('Error walking directory', {
        agent: 'multi-repo',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Detect language and framework
    let language = 'unknown';
    let framework: string | undefined;

    if (files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      language = 'typescript';
    } else if (files.some((f) => f.endsWith('.js') || f.endsWith('.jsx'))) {
      language = 'javascript';
    } else if (files.some((f) => f.endsWith('.py'))) {
      language = 'python';
    }

    if (files.includes('package.json')) {
      const packageJsonPath = path.join(repoPath, 'package.json');
      try {
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.dependencies?.react) framework = 'react';
        else if (pkg.dependencies?.vue) framework = 'vue';
        else if (pkg.dependencies?.express) framework = 'express';
      } catch {
        // Ignore parsing errors
      }
    }

    return {
      language,
      framework,
      fileCount: files.length,
      structure: files.slice(0, 50), // First 50 files
    };
  }

  private getSystemPrompt(): string {
    return `You are a Multi-Repo Agent that applies consistent changes across multiple repositories.

Your job is to:
1. Understand the requested change
2. Generate appropriate file modifications for the current repository
3. Ensure consistency with the overall task
4. Handle edge cases specific to each repository

Return your response as JSON with the following structure:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "action": "create" | "modify" | "delete",
      "content": "full file content (for create/modify)"
    }
  ],
  "explanation": "Brief explanation of changes made"
}

Guidelines:
- Respect existing code style and conventions
- Don't break existing functionality
- Include proper error handling
- Add comments where necessary
- Consider repository-specific differences

Return ONLY valid JSON, no markdown or explanations outside the JSON.`;
  }

  private buildPrompt(task: string, changes: string, repoContext: any): string {
    return `Task: ${task}

Changes to apply:
${changes}

Repository Context:
- Language: ${repoContext.language}
- Framework: ${repoContext.framework || 'none'}
- File Count: ${repoContext.fileCount}
- Structure (sample): ${repoContext.structure.slice(0, 10).join(', ')}

Please generate the necessary file changes for this repository.`;
  }

  private parseChanges(response: string): FileChange[] {
    try {
      const parsed = JSON.parse(response);
      return parsed.files || [];
    } catch (error) {
      logger.error('Failed to parse LLM response', {
        agent: 'multi-repo',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async createBranch(repoPath: string, branchName: string, baseBranch: string) {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    // Fetch latest changes
    await execFileAsync('git', ['fetch', 'origin'], { cwd: repoPath });

    // Checkout base branch
    await execFileAsync('git', ['checkout', baseBranch], { cwd: repoPath });

    // Pull latest changes
    await execFileAsync('git', ['pull', 'origin', baseBranch], { cwd: repoPath });

    // Create and checkout new branch
    await execFileAsync('git', ['checkout', '-b', branchName], { cwd: repoPath });
  }

  private async applyChanges(repoPath: string, changes: FileChange[]) {
    for (const change of changes) {
      const filePath = path.join(repoPath, change.path);

      if (change.action === 'delete') {
        await fs.unlink(filePath);
      } else if (change.action === 'create' || change.action === 'modify') {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(filePath, change.content || '', 'utf-8');
      }
    }
  }

  private async commitChanges(repoPath: string, message: string): Promise<string> {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    // Stage all changes
    await execFileAsync('git', ['add', '-A'], { cwd: repoPath });

    // Commit
    await execFileAsync('git', ['commit', '-m', message], { cwd: repoPath });

    // Get commit hash
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoPath });
    return stdout.trim();
  }

  private async pushBranch(repoPath: string, branchName: string, remote: string) {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    await execFileAsync('git', ['push', '-u', remote, branchName], { cwd: repoPath });
  }

  private async createPullRequest(
    repoPath: string,
    branchName: string,
    baseBranch: string,
    title: string,
    body: string
  ): Promise<string> {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout } = await execFileAsync(
        'gh',
        [
          'pr',
          'create',
          '--title',
          title,
          '--body',
          body,
          '--base',
          baseBranch,
          '--head',
          branchName,
        ],
        { cwd: repoPath }
      );

      return stdout.trim();
    } catch (error) {
      logger.error('Failed to create PR', {
        agent: 'multi-repo',
        error: error instanceof Error ? error.message : String(error),
      });
      return 'PR creation failed';
    }
  }

  private buildSummary(
    changes: MultiRepoChange[],
    errors: Array<{ repo: string; error: string }>
  ): string {
    const lines: string[] = [];

    lines.push(`Multi-Repo Operation Complete`);
    lines.push(`Successfully processed: ${changes.length} repositories`);
    lines.push(`Failed: ${errors.length} repositories`);
    lines.push('');

    if (changes.length > 0) {
      lines.push('Changes:');
      for (const change of changes) {
        lines.push(`  - ${change.repo}: ${change.filesChanged.length} files changed`);
        if (change.prUrl) {
          lines.push(`    PR: ${change.prUrl}`);
        }
      }
    }

    if (errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      for (const error of errors) {
        lines.push(`  - ${error.repo}: ${error.error}`);
      }
    }

    return lines.join('\n');
  }
}
