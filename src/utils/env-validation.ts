/**
 * Environment Variable Validation
 *
 * Validates critical environment variables at startup
 * Prevents runtime errors due to missing configuration
 */

import { logger } from './logger';

/**
 * Environment types
 */
export type Environment = 'production' | 'development' | 'test';

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV?.toLowerCase();

  if (env === 'production' || env === 'prod') {
    return 'production';
  }

  if (env === 'test') {
    return 'test';
  }

  return 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Required environment variables in production
 */
const REQUIRED_IN_PRODUCTION = [
  'JWT_SECRET',
  // Add more critical env vars here as needed
] as const;

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED = ['JWT_EXPIRY', 'REFRESH_TOKEN_EXPIRY', 'REDIS_URL'] as const;

/**
 * Validation error
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly missingVars: string[]
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate that required environment variables are set
 *
 * @throws {EnvValidationError} If required vars are missing in production
 */
export function validateEnvironment(): void {
  const env = getEnvironment();
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars in production
  if (isProduction()) {
    for (const varName of REQUIRED_IN_PRODUCTION) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      const error = new EnvValidationError(
        `Missing required environment variables in production: ${missing.join(', ')}`,
        missing
      );

      logger.error('Environment validation failed', {
        environment: env,
        missingVars: missing,
        error: error.message,
      });

      throw error;
    }
  }

  // Check recommended vars (all environments)
  for (const varName of RECOMMENDED) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  if (warnings.length > 0) {
    logger.warn('Optional environment variables not set', {
      environment: env,
      missingVars: warnings,
      message: 'Using default values',
    });
  }

  logger.info('Environment validation passed', {
    environment: env,
    requiredChecked: REQUIRED_IN_PRODUCTION.length,
    recommendedChecked: RECOMMENDED.length,
  });
}

/**
 * Get a required environment variable
 *
 * @param name - Variable name
 * @param defaultValue - Default value (only used in development/test)
 * @throws {Error} If variable is not set in production
 * @returns The environment variable value
 */
export function getRequiredEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];

  if (!value) {
    if (isProduction()) {
      throw new Error(`Environment variable ${name} is required in production`);
    }

    if (defaultValue !== undefined) {
      logger.warn(`Using default value for ${name}`, {
        environment: getEnvironment(),
        varName: name,
      });
      return defaultValue;
    }

    throw new Error(`Environment variable ${name} is required`);
  }

  return value;
}

/**
 * Get an optional environment variable
 *
 * @param name - Variable name
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}
