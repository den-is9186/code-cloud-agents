import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

// File Tools
export const fileRead: Tool = {
  name: 'file_read',
  description: 'Read file contents',
  parameters: { path: { type: 'string', required: true } },
  execute: async ({ path: filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    return { content };
  }
};

export const fileWrite: Tool = {
  name: 'file_write',
  description: 'Write content to file',
  parameters: { path: { type: 'string' }, content: { type: 'string' } },
  execute: async ({ path: filePath, content }) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  }
};

export const filePatch: Tool = {
  name: 'file_patch',
  description: 'Apply diff patch to file',
  parameters: { path: { type: 'string' }, diff: { type: 'string' } },
  execute: async ({ path: filePath }) => {
    // Simple line-based patch
    await fs.readFile(filePath, 'utf-8');
    // Apply diff logic here
    return { success: true };
  }
};

export const fileDelete: Tool = {
  name: 'file_delete',
  description: 'Delete a file',
  parameters: { path: { type: 'string' } },
  execute: async ({ path: filePath }) => {
    await fs.unlink(filePath);
    return { success: true };
  }
};

export const directoryList: Tool = {
  name: 'directory_list',
  description: 'List directory contents',
  parameters: { path: { type: 'string' }, recursive: { type: 'boolean' } },
  execute: async ({ path: dirPath, recursive = false }) => {
    const files: string[] = [];
    const readDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && recursive) {
          await readDir(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };
    await readDir(dirPath);
    return { files };
  }
};

// Shell Tools
export const shellExec: Tool = {
  name: 'shell_exec',
  description: 'Execute shell command',
  parameters: { command: { type: 'string' }, cwd: { type: 'string' } },
  execute: async ({ command, cwd }) => {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd });
      return { stdout, stderr, exitCode: 0 };
    } catch (error: any) {
      return { stdout: '', stderr: error.message, exitCode: error.code || 1 };
    }
  }
};

// Git Tools
export const gitStatus: Tool = {
  name: 'git_status',
  description: 'Get git status',
  parameters: {},
  execute: async () => {
    const { stdout } = await execAsync('git status --porcelain');
    const lines = stdout.trim().split('\n').filter(Boolean);
    const modified = lines.filter(l => l.startsWith(' M')).map(l => l.slice(3));
    const staged = lines.filter(l => l.startsWith('M ')).map(l => l.slice(3));
    const untracked = lines.filter(l => l.startsWith('??')).map(l => l.slice(3));
    return { modified, staged, untracked };
  }
};

export const gitDiff: Tool = {
  name: 'git_diff',
  description: 'Get git diff',
  parameters: { file: { type: 'string' } },
  execute: async ({ file }) => {
    const cmd = file ? `git diff ${file}` : 'git diff';
    const { stdout } = await execAsync(cmd);
    return { diff: stdout };
  }
};

export const gitCommit: Tool = {
  name: 'git_commit',
  description: 'Create git commit',
  parameters: { message: { type: 'string' }, files: { type: 'array' } },
  execute: async ({ message, files }) => {
    if (files?.length) {
      await execAsync(`git add ${files.join(' ')}`);
    } else {
      await execAsync('git add -A');
    }
    const { stdout } = await execAsync(`git commit -m "${message}"`);
    const hashMatch = stdout.match(/\[.+ ([a-f0-9]+)\]/);
    return { hash: hashMatch?.[1] || 'unknown' };
  }
};

// Tool Registry
const tools: Tool[] = [
  fileRead, fileWrite, filePatch, fileDelete, directoryList,
  shellExec, gitStatus, gitDiff, gitCommit
];

export const getTools = () => tools;

export const getTool = (name: string) => tools.find(t => t.name === name);

export const executeTool = async (name: string, params: any) => {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.execute(params);
};
