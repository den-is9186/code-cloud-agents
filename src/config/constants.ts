export const SUPERVISOR_CONFIG = {
  MAX_REVIEW_ITERATIONS: 3,
  MAX_TEST_RETRIES: 2,
  TASK_TIMEOUT_MS: 300000, // 5 minutes
} as const;

export const LLM_CONFIG = {
  DEFAULT_TIMEOUT_MS: 60000,
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
} as const;

export const CHAT_CONFIG = {
  MAX_HISTORY_LENGTH: 50,
} as const;

export const FILE_CONFIG = {
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  ALLOWED_EXTENSIONS: ['.ts', '.js', '.json', '.md', '.txt', '.yaml', '.yml'],
} as const;
