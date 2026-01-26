import {
  LLM_CONFIG,
  SUPERVISOR_CONFIG,
  CHAT_CONFIG,
  FILE_CONFIG,
  RATE_LIMIT_CONFIG,
} from './constants';

/**
 * Central configuration object for the entire application
 * All configuration values should be accessed through this object
 */
export const config = {
  // LLM Configuration
  llm: LLM_CONFIG,

  // Supervisor Configuration
  supervisor: SUPERVISOR_CONFIG,

  // Chat Configuration
  chat: CHAT_CONFIG,

  // File Configuration
  file: FILE_CONFIG,

  // Rate Limiting Configuration
  rateLimit: RATE_LIMIT_CONFIG,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // API Keys (read from environment)
  apiKeys: {
    novita: process.env.NOVITA_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
  },

  // Paths
  paths: {
    logs: process.env.LOGS_DIR || 'logs',
    temp: process.env.TEMP_DIR || '.tmp',
  },
} as const;

// Type-safe config accessor
export type Config = typeof config;

// Export for backward compatibility
export * from './constants';
