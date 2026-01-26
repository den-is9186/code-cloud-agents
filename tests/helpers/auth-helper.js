/**
 * Test Authentication Helper
 *
 * Provides authentication utilities for tests
 */

const { generateToken, Roles } = require('../../src/services/auth-service');

/**
 * Generate a test token for a specific role
 */
function getTestToken(role = Roles.DEVELOPER) {
  return generateToken({
    userId: 'test-user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    role,
  }, '1h');
}

/**
 * Get admin token
 */
function getAdminToken() {
  return getTestToken(Roles.ADMIN);
}

/**
 * Get manager token
 */
function getManagerToken() {
  return getTestToken(Roles.MANAGER);
}

/**
 * Get developer token
 */
function getDeveloperToken() {
  return getTestToken(Roles.DEVELOPER);
}

/**
 * Create authenticated request helper
 */
function createAuthRequest(request, app) {
  return {
    get: (url, role = Roles.DEVELOPER) =>
      request(app).get(url).set('Authorization', `Bearer ${getTestToken(role)}`),
    post: (url, role = Roles.MANAGER) =>
      request(app).post(url).set('Authorization', `Bearer ${getTestToken(role)}`),
    put: (url, role = Roles.DEVELOPER) =>
      request(app).put(url).set('Authorization', `Bearer ${getTestToken(role)}`),
    delete: (url, role = Roles.DEVELOPER) =>
      request(app).delete(url).set('Authorization', `Bearer ${getTestToken(role)}`),
  };
}

module.exports = {
  getTestToken,
  getAdminToken,
  getManagerToken,
  getDeveloperToken,
  createAuthRequest,
  Roles,
};
