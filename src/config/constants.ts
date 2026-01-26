export const SUPERVISOR_CONFIG = {
  MAX_REVIEW_ITERATIONS: 3,
  MAX_TEST_RETRIES: 2,
  TASK_TIMEOUT_MS: 300000, // 5 minutes
  MAX_ITERATIONS: 3,
} as const;

export const LLM_CONFIG = {
  DEFAULT_TIMEOUT_MS: 60000,
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
  MAX_REQUESTS_PER_MINUTE: 60,
} as const;

export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  TOKEN_BUCKET_MAX_TOKENS: 60,
  TOKEN_BUCKET_REFILL_RATE: 60, // tokens per minute
} as const;

export const CHAT_CONFIG = {
  MAX_HISTORY_LENGTH: 50,
} as const;

export const FILE_CONFIG = {
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  ALLOWED_EXTENSIONS: ['.ts', '.js', '.json', '.md', '.txt', '.yaml', '.yml'],
} as const;

export const AGENT_CONFIG = {
  MAX_FILE_READ_SIZE: 1024 * 1024, // 1MB
  MAX_CONTEXT_FILES: 10,
  MAX_CONTENT_LENGTH: 1000,
} as const;
