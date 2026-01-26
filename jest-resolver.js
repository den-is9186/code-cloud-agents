/**
 * Custom Jest Resolver
 *
 * Resolves:
 * 1. ../dist/* -> ../src/* (for JS files importing from dist)
 * 2. .js extensions to .ts when .ts file exists (only for src files)
 */
const path = require('path');
const fs = require('fs');

module.exports = (request, options) => {
  // Skip node_modules - use default resolution
  if (request.includes('node_modules') || options.basedir.includes('node_modules')) {
    return options.defaultResolver(request, options);
  }

  // Skip non-relative imports (packages)
  if (!request.startsWith('.') && !request.startsWith('/')) {
    return options.defaultResolver(request, options);
  }

  let modifiedRequest = request;

  // Handle dist -> src mapping
  if (request.includes('/dist/')) {
    modifiedRequest = request.replace('/dist/', '/src/');
  }

  // Try to resolve the file with different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
  const basePath = modifiedRequest.replace(/\.(js|ts|tsx|jsx)$/, '');

  for (const ext of extensions) {
    const fullPath = path.resolve(options.basedir, basePath + ext);
    if (fs.existsSync(fullPath)) {
      try {
        return options.defaultResolver(basePath + ext, options);
      } catch {
        continue;
      }
    }
  }

  // Fallback: try original request
  try {
    return options.defaultResolver(modifiedRequest, options);
  } catch {
    // Try without extension
    const noExt = modifiedRequest.replace(/\.js$/, '');
    return options.defaultResolver(noExt, options);
  }
};
