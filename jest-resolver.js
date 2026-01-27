/**
 * Jest Module Resolver
 * 
 * Custom resolver to map dist/ imports to src/ during testing.
 * Handles Windows path separators for cross-platform compatibility.
 */

module.exports = (request, options) => {
  // Normalize path separators - replace backslashes with forward slashes
  const modifiedRequest = request.replace(/\\/g, '/');
  
  // Only modify requests that include '/dist/'
  if (modifiedRequest.includes('/dist/')) {
    // Replace /dist/ with /src/
    const srcRequest = modifiedRequest.replace('/dist/', '/src/');
    
    // Try with .ts extension first
    try {
      return options.defaultResolver(srcRequest.replace(/\.js$/, '.ts'), options);
    } catch (e) {
      // Fall through to try other extensions
    }
    
    // Try with .js extension
    try {
      return options.defaultResolver(srcRequest, options);
    } catch (e) {
      // Fall through to original request
    }
  }
  
  // Use default resolver for all other requests
  return options.defaultResolver(request, options);
};
