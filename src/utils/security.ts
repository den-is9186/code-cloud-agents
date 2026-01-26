/**
 * Sanitize log messages to prevent secrets from being exposed
 * Removes API keys, tokens, passwords, etc.
 */
export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return message;
  }

  const patterns = [
    // API keys
    /api[_-]?key[=:\s]+[a-zA-Z0-9_-]+/gi,
    // Bearer tokens
    /bearer\s+[a-zA-Z0-9_-]+/gi,
    // Passwords
    /password[=:\s]+[^\s]+/gi,
    // General tokens
    /token[=:\s]+[a-zA-Z0-9_-]+/gi,
    // Novita API key
    /novita[_-]?api[_-]?key[=:\s]+[a-zA-Z0-9_-]+/gi,
    // Anthropic API key
    /anthropic[_-]?api[_-]?key[=:\s]+[a-zA-Z0-9_-]+/gi,
  ];

  let sanitized = message;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '***REDACTED***');
  }

  return sanitized;
}
