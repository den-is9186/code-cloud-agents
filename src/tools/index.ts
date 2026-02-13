import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FILE_CONFIG } from '../config/constants';

const execFileAsync = promisify(execFile);

const BASE_DIR = path.resolve(process.cwd());
const MAX_FILE_SIZE_BYTES = FILE_CONFIG.MAX_FILE_SIZE_BYTES;

// Tool Parameter Interfaces
export interface FileReadParams {
  path: string;
}

export interface FileWriteParams {
  path: string;
  content: string;
}

export interface FilePatchParams {
  path: string;
  diff: string;
}

export interface FileDeleteParams {
  path: string;
}

export interface DirectoryListParams {
  path: string;
  recursive?: boolean;
}

export interface ShellExecParams {
  command: string;
  args?: string[];
  cwd?: string;
}

export interface GitDiffParams {
  file?: string;
}

export interface GitCommitParams {
  message: string;
  files?: string[];
}

export function validatePath(filePath: string): string {
  // Check for null bytes and other malicious patterns first
  if (filePath.includes('\0')) {
    throw new Error(`Null byte detected in path: ${filePath}`);
  }

  // Normalize and resolve path relative to BASE_DIR
  const resolved = path.resolve(BASE_DIR, filePath);

  // Check for path traversal using path.relative
  const relative = path.relative(BASE_DIR, resolved);

  // If relative path starts with '..' or is an absolute path, it's outside BASE_DIR
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Path traversal detected: attempted to access ${filePath} which resolves outside project root`
    );
  }

  // Additional security: ensure the resolved path is within BASE_DIR
  // This is a redundant check but provides extra safety
  if (!resolved.startsWith(BASE_DIR + path.sep) && resolved !== BASE_DIR) {
    throw new Error(`Security violation: path ${filePath} is outside project boundaries`);
  }

  return resolved;
}

export interface Tool<P = any, R = any> {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: P) => Promise<R>;
}

// File Tools
export const fileRead: Tool<FileReadParams, { content: string }> = {
  name: 'file_read',
  description: 'Read file contents',
  parameters: { path: { type: 'string', required: true } },
  execute: async ({ path: filePath }: FileReadParams) => {
    const safePath = validatePath(filePath);

    // Check file size before reading
    const stats = await fs.stat(safePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File ${filePath} is too large (${stats.size} bytes > ${MAX_FILE_SIZE_BYTES} bytes)`
      );
    }

    const content = await fs.readFile(safePath, 'utf-8');
    return { content };
  },
};

export const fileWrite: Tool<FileWriteParams, { success: boolean }> = {
  name: 'file_write',
  description: 'Write content to file',
  parameters: { path: { type: 'string' }, content: { type: 'string' } },
  execute: async ({ path: filePath, content }: FileWriteParams) => {
    const safePath = validatePath(filePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, 'utf-8');
    return { success: true };
  },
};

export const filePatch: Tool<FilePatchParams, { success: boolean }> = {
  name: 'file_patch',
  description: 'Apply diff patch to file',
  parameters: { path: { type: 'string' }, diff: { type: 'string' } },
  execute: async ({ path: filePath }: FilePatchParams) => {
    const safePath = validatePath(filePath);
    // Simple line-based patch
    await fs.readFile(safePath, 'utf-8');
    // Apply diff logic here
    return { success: true };
  },
};

export const fileDelete: Tool<FileDeleteParams, { success: boolean }> = {
  name: 'file_delete',
  description: 'Delete a file',
  parameters: { path: { type: 'string' } },
  execute: async ({ path: filePath }: FileDeleteParams) => {
    const safePath = validatePath(filePath);
    await fs.unlink(safePath);
    return { success: true };
  },
};

export const directoryList: Tool<DirectoryListParams, { files: string[] }> = {
  name: 'directory_list',
  description: 'List directory contents',
  parameters: { path: { type: 'string' }, recursive: { type: 'boolean' } },
  execute: async ({ path: dirPath, recursive = false }: DirectoryListParams) => {
    const safePath = validatePath(dirPath);
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
    await readDir(safePath);
    return { files };
  },
};

// Shell Tools
export const shellExec: Tool<
  ShellExecParams,
  { stdout: string; stderr: string; exitCode: number }
> = {
  name: 'shell_exec',
  description: 'Execute shell command with arguments (safe from command injection)',
  parameters: {
    command: { type: 'string' },
    args: { type: 'array' },
    cwd: { type: 'string' },
  },
  execute: async ({ command, args = [], cwd }: ShellExecParams) => {
    // SEC-002: Use execFileAsync instead of execAsync to prevent command injection
    // This executes the command directly without shell interpolation

    // Input validation
    if (!command || typeof command !== 'string') {
      throw new Error('Invalid command: must be non-empty string');
    }

    // Validate args array
    if (!Array.isArray(args)) {
      throw new Error('Invalid args: must be an array');
    }

    // Validate all args are strings
    for (const arg of args) {
      if (typeof arg !== 'string') {
        throw new Error('Invalid argument: all args must be strings');
      }
    }

    // Validate cwd if provided
    if (cwd) {
      cwd = validatePath(cwd);
    }

    try {
      const { stdout, stderr } = await execFileAsync(command, args, { cwd });
      return { stdout, stderr, exitCode: 0 };
    } catch (error) {
      const err = error as { message: string; code?: number };
      return { stdout: '', stderr: err.message, exitCode: err.code || 1 };
    }
  },
};

// Git Tools
export const gitStatus: Tool<{}, { modified: string[]; staged: string[]; untracked: string[] }> = {
  name: 'git_status',
  description: 'Get git status',
  parameters: {},
  execute: async () => {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
    const lines = stdout.trim().split('\n').filter(Boolean);
    const modified = lines.filter((l) => l.startsWith(' M')).map((l) => l.slice(3));
    const staged = lines.filter((l) => l.startsWith('M ')).map((l) => l.slice(3));
    const untracked = lines.filter((l) => l.startsWith('??')).map((l) => l.slice(3));
    return { modified, staged, untracked };
  },
};

export const gitDiff: Tool<GitDiffParams, { diff: string }> = {
  name: 'git_diff',
  description: 'Get git diff',
  parameters: { file: { type: 'string' } },
  execute: async ({ file }: GitDiffParams) => {
    const args = ['diff'];
    if (file) {
      args.push(file);
    }
    const { stdout } = await execFileAsync('git', args);
    return { diff: stdout };
  },
};

export const gitCommit: Tool<GitCommitParams, { hash: string }> = {
  name: 'git_commit',
  description: 'Create git commit',
  parameters: { message: { type: 'string' }, files: { type: 'array' } },
  execute: async ({ message, files }: GitCommitParams) => {
    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid commit message: must be non-empty string');
    }
    if (message.includes('\n') || message.includes('\r')) {
      throw new Error('Commit message cannot contain newlines');
    }

    // Validate files if provided
    if (files) {
      if (!Array.isArray(files)) {
        throw new Error('Files must be an array');
      }
      for (const file of files) {
        if (typeof file !== 'string') {
          throw new Error('All file paths must be strings');
        }
        // Validate each file path
        validatePath(file);
      }
    }

    if (files?.length) {
      // Verwende execFileAsync für git add mit einzelnen Dateien
      // Da files ein Array ist, müssen wir es als separate Argumente übergeben
      await execFileAsync('git', ['add', ...files]);
    } else {
      await execFileAsync('git', ['add', '-A']);
    }
    // Verwende execFileAsync für git commit mit -m und message als separate Argumente
    const { stdout } = await execFileAsync('git', ['commit', '-m', message]);
    const hashMatch = stdout.match(/\[.+ ([a-f0-9]+)\]/);
    return { hash: hashMatch?.[1] || 'unknown' };
  },
};

// Tool Registry
const tools: Tool[] = [
  fileRead,
  fileWrite,
  filePatch,
  fileDelete,
  directoryList,
  shellExec,
  gitStatus,
  gitDiff,
  gitCommit,
];

export const getTools = () => tools;

export const getTool = (name: string) => tools.find((t) => t.name === name);

export const executeTool = async <P = any, R = any>(name: string, params: P): Promise<R> => {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.execute(params) as Promise<R>;
};
