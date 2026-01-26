const request = require('supertest');
const Redis = require('ioredis');

// Mock Redis before requiring the app
jest.mock('ioredis');

const app = require('../src/api-server');
const { States } = require('../src/workflow/state-machine');
const { generateToken, Roles } = require('../dist/services/auth-service');

// Helper to generate test auth token
function getTestToken(role = Roles.MANAGER) {
  return generateToken({
    userId: 'test-user',
    email: 'test@example.com',
    role,
  }, '1h');
}

// Extend request with authentication helper
const authRequest = {
  get: (url, role = Roles.MANAGER) =>
    request(app).get(url).set('Authorization', `Bearer ${getTestToken(role)}`),
  post: (url, role = Roles.MANAGER) =>
    request(app).post(url).set('Authorization', `Bearer ${getTestToken(role)}`),
  put: (url, role = Roles.MANAGER) =>
    request(app).put(url).set('Authorization', `Bearer ${getTestToken(role)}`),
  delete: (url, role = Roles.ADMIN) =>
    request(app).delete(url).set('Authorization', `Bearer ${getTestToken(role)}`),
};

describe('Integration Tests - Team Approval/Reject API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
  });

  // Helper to create a team in AWAITING_APPROVAL state
  async function createTeamAwaitingApproval() {
    // Create team
    const createResponse = await authRequest.post('/api/v1/teams').send({
      name: 'Test Team',
      repo: 'github.com/test/repo',
      preset: 'IQ',
      task: 'Test task description',
    });

    const teamId = createResponse.body.team.id;

    // Manually construct team data in AWAITING_APPROVAL state
    const teamKey = `team:${teamId}`;
    const teamData = {
      id: teamId,
      name: 'Test Team',
      repo: 'github.com/test/repo',
      preset: 'IQ',
      task: 'Test task description',
      status: 'awaiting_approval',
      workflowState: States.AWAITING_APPROVAL,
      currentPhase: States.AWAITING_APPROVAL,
      workflowHistory: JSON.stringify([
        { state: States.TEAM_CREATED, timestamp: new Date().toISOString(), event: null },
        {
          state: States.PROTOTYPE_RUNNING,
          previousState: States.TEAM_CREATED,
          event: 'START_PROTOTYPE',
          timestamp: new Date().toISOString(),
        },
        {
          state: States.AWAITING_APPROVAL,
          previousState: States.PROTOTYPE_RUNNING,
          event: 'PROTOTYPE_COMPLETE',
          timestamp: new Date().toISOString(),
        },
      ]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    Redis.mockStore.set(teamKey, JSON.stringify(teamData));

    return teamId;
  }

  describe('POST /api/v1/teams/:id/approve - Approve prototype', () => {
    test('should approve team prototype', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/approve`).send({
        userId: 'test-user-123',
        reason: 'Looks good',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('team');
      expect(response.body).toHaveProperty('transition');
      expect(response.body).toHaveProperty('message');
      expect(response.body.team.workflowState).toBe(States.APPROVED);
      expect(response.body.team.status).toBe('approved');
      expect(response.body.transition.event).toBe('APPROVE');
      expect(response.body.transition.previousState).toBe(States.AWAITING_APPROVAL);
      expect(response.body.transition.currentState).toBe(States.APPROVED);
    });

    test('should include metadata in transition history', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/approve`).send({
        userId: 'test-user-456',
        reason: 'Excellent prototype',
      });

      expect(response.status).toBe(200);
      const history = JSON.parse(response.body.team.workflowHistory);
      const lastEntry = history[history.length - 1];
      expect(lastEntry.metadata.userId).toBe('test-user-456');
      expect(lastEntry.metadata.reason).toBe('Excellent prototype');
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authRequest.post(`/api/v1/teams/${fakeId}/approve`).send();

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await authRequest.post('/api/v1/teams/invalid-id/approve').send();

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid team ID format');
    });

    test('should return 400 when team not in AWAITING_APPROVAL state', async () => {
      // Create team (will be in TEAM_CREATED state)
      const createResponse = await authRequest.post('/api/v1/teams').send({
        name: 'Test Team',
        repo: 'github.com/test/repo',
        preset: 'A',
        task: 'Test task description',
      });
      const teamId = createResponse.body.team.id;

      const response = await authRequest.post(`/api/v1/teams/${teamId}/approve`).send();

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_STATE_TRANSITION');
      expect(response.body.error.message).toContain('Cannot approve');
      expect(response.body.error).toHaveProperty('currentState');
      expect(response.body.error).toHaveProperty('availableActions');
    });
  });

  describe('POST /api/v1/teams/:id/reject - Reject prototype', () => {
    test('should reject team prototype', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/reject`).send({
        userId: 'test-user-789',
        reason: 'Does not meet requirements',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('team');
      expect(response.body).toHaveProperty('transition');
      expect(response.body.team.workflowState).toBe(States.REJECTED);
      expect(response.body.team.status).toBe('rejected');
      expect(response.body.team.rejectionReason).toBe('Does not meet requirements');
      expect(response.body.transition.event).toBe('REJECT');
    });

    test('should require reason for rejection', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/reject`).send({
        userId: 'test-user',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Reason is required');
    });

    test('should not accept empty reason', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/reject`).send({
        userId: 'test-user',
        reason: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Reason is required');
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authRequest.post(`/api/v1/teams/${fakeId}/reject`)
        .send({ reason: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 when team not in AWAITING_APPROVAL state', async () => {
      const createResponse = await authRequest.post('/api/v1/teams').send({
        name: 'Test Team',
        repo: 'github.com/test/repo',
        preset: 'B',
        task: 'Test task description',
      });
      const teamId = createResponse.body.team.id;

      const response = await authRequest.post(`/api/v1/teams/${teamId}/reject`)
        .send({ reason: 'Not ready' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_STATE_TRANSITION');
      expect(response.body.error.message).toContain('Cannot reject');
    });
  });

  describe('POST /api/v1/teams/:id/skip-premium - Skip premium phase', () => {
    test('should skip premium phase', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/skip-premium`).send({
        userId: 'test-user-999',
        reason: 'Prototype is sufficient',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('team');
      expect(response.body).toHaveProperty('transition');
      expect(response.body.team.workflowState).toBe(States.PARTIAL);
      expect(response.body.team.status).toBe('partial');
      expect(response.body.transition.event).toBe('SKIP_PREMIUM');
      expect(response.body.message).toContain('prototype only');
    });

    test('should use default reason if not provided', async () => {
      const teamId = await createTeamAwaitingApproval();

      const response = await authRequest.post(`/api/v1/teams/${teamId}/skip-premium`).send({
        userId: 'test-user',
      });

      expect(response.status).toBe(200);
      const history = JSON.parse(response.body.team.workflowHistory);
      const lastEntry = history[history.length - 1];
      expect(lastEntry.metadata.reason).toContain('prototype sufficient');
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await authRequest.post(`/api/v1/teams/${fakeId}/skip-premium`).send();

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await authRequest.post('/api/v1/teams/invalid-id/skip-premium').send();

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    test('should return 400 when team not in AWAITING_APPROVAL state', async () => {
      const createResponse = await authRequest.post('/api/v1/teams').send({
        name: 'Test Team',
        repo: 'github.com/test/repo',
        preset: 'C',
        task: 'Test task description',
      });
      const teamId = createResponse.body.team.id;

      const response = await authRequest.post(`/api/v1/teams/${teamId}/skip-premium`).send();

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_STATE_TRANSITION');
      expect(response.body.error.message).toContain('Cannot skip');
    });
  });

  describe('Complete Approval Workflows', () => {
    test('should complete approve workflow and allow premium phase', async () => {
      const teamId = await createTeamAwaitingApproval();

      // 1. Approve
      const approveResponse = await authRequest.post(`/api/v1/teams/${teamId}/approve`)
        .send({ userId: 'user-1', reason: 'Good work' });

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.team.workflowState).toBe(States.APPROVED);

      // 2. Get team to verify state
      const getResponse = await authRequest.get(`/api/v1/teams/${teamId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.team.workflowState).toBe(States.APPROVED);
      expect(getResponse.body.team.status).toBe('approved');
    });

    test('should complete reject workflow and prevent further actions', async () => {
      const teamId = await createTeamAwaitingApproval();

      // 1. Reject
      const rejectResponse = await authRequest.post(`/api/v1/teams/${teamId}/reject`)
        .send({ userId: 'user-2', reason: 'Not good enough' });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.team.workflowState).toBe(States.REJECTED);

      // 2. Try to approve (should fail - terminal state)
      const approveResponse = await authRequest.post(`/api/v1/teams/${teamId}/approve`)
        .send();

      expect(approveResponse.status).toBe(400);
      expect(approveResponse.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    test('should complete skip-premium workflow', async () => {
      const teamId = await createTeamAwaitingApproval();

      // 1. Skip premium
      const skipResponse = await authRequest.post(`/api/v1/teams/${teamId}/skip-premium`)
        .send({ userId: 'user-3', reason: 'Prototype sufficient' });

      expect(skipResponse.status).toBe(200);
      expect(skipResponse.body.team.workflowState).toBe(States.PARTIAL);

      // 2. Verify terminal state - cannot approve after skip
      const approveResponse = await authRequest.post(`/api/v1/teams/${teamId}/approve`)
        .send();

      expect(approveResponse.status).toBe(400);
      expect(approveResponse.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    test('should track complete workflow history', async () => {
      const teamId = await createTeamAwaitingApproval();

      const approveResponse = await authRequest.post(`/api/v1/teams/${teamId}/approve`)
        .send({ userId: 'user-final', reason: 'Approved for premium' });

      const history = JSON.parse(approveResponse.body.team.workflowHistory);

      // Should have: TEAM_CREATED -> PROTOTYPE_RUNNING -> AWAITING_APPROVAL -> APPROVED
      expect(history).toHaveLength(4);
      expect(history[0].state).toBe(States.TEAM_CREATED);
      expect(history[1].state).toBe(States.PROTOTYPE_RUNNING);
      expect(history[2].state).toBe(States.AWAITING_APPROVAL);
      expect(history[3].state).toBe(States.APPROVED);
      expect(history[3].metadata.userId).toBe('user-final');
      expect(history[3].metadata.reason).toBe('Approved for premium');
    });
  });
});
