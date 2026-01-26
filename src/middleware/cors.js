/**
 * CORS Middleware
 *
 * Implements Cross-Origin Resource Sharing with configurable whitelist
 */

// Allowed origins from environment or defaults
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

// Allow all origins in development (not recommended for production)
const ALLOW_ALL_ORIGINS = process.env.CORS_ALLOW_ALL === 'true';

/**
 * CORS middleware with whitelist validation
 */
function cors(options = {}) {
  const {
    allowedOrigins = ALLOWED_ORIGINS,
    allowCredentials = true,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-CSRF-Token',
      'X-Requested-With',
    ],
    exposedHeaders = ['X-Total-Count', 'X-Page-Count'],
    maxAge = 86400, // 24 hours
  } = options;

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      // Check if origin is allowed
      if (ALLOW_ALL_ORIGINS) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      } else if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        // Origin not allowed, reject preflight
        return res.status(403).json({
          error: {
            code: 'CORS_NOT_ALLOWED',
            message: 'Origin not allowed',
          },
        });
      }

      // Set other CORS headers for preflight
      if (allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      return res.status(204).end();
    }

    // Handle actual request
    if (ALLOW_ALL_ORIGINS) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
      // Origin provided but not allowed
      return res.status(403).json({
        error: {
          code: 'CORS_NOT_ALLOWED',
          message: 'Origin not allowed',
        },
      });
    }
    // If no origin header, allow (same-origin request or non-browser client)

    if (allowCredentials && origin) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    next();
  };
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin) {
  if (ALLOW_ALL_ORIGINS) {
    return true;
  }
  return ALLOWED_ORIGINS.includes(origin);
}

module.exports = {
  cors,
  isOriginAllowed,
  ALLOWED_ORIGINS,
};
