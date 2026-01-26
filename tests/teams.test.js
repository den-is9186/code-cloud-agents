const request = require('supertest');
const Redis = require('ioredis');

// Mock Redis before requiring the app
jest.mock('ioredis');

const app = require('../src/api-server');

describe('Integration Tests - Team Management API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
  });

  describe('POST /api/v1/teams - Create team', () => {
    test('should create a new team', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Test Team',
          repo: 'github.com/test-user/test-repo',
          preset: 'IQ',
          task: 'Implement user authentication system',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('team');
      expect(response.body.team).toHaveProperty('id');
      expect(response.body.team).toHaveProperty('name', 'Test Team');
      expect(response.body.team).toHaveProperty('repo', 'github.com/test-user/test-repo');
      expect(response.body.team).toHaveProperty('preset', 'IQ');
      expect(response.body.team).toHaveProperty('task', 'Implement user authentication system');
      expect(response.body.team).toHaveProperty('ownerId', 'anonymous');
      expect(response.body.team).toHaveProperty('currentPhase', 'TEAM_CREATED');
      expect(response.body.team).toHaveProperty('status', 'pending');
      expect(response.body.team).toHaveProperty('totalCost', 0);
      expect(response.body.team).toHaveProperty('createdAt');
      expect(response.body.team).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('message', 'Team created successfully');
    });

    test('should create team with ownerId', async () => {
      const ownerId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Owned Team',
          repo: 'github.com/owner/repo',
          preset: 'A',
          task: 'Build a dashboard for analytics',
          ownerId: ownerId,
        });

      expect(response.status).toBe(201);
      expect(response.body.team).toHaveProperty('ownerId', ownerId);
    });

    test('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          repo: 'github.com/test/repo',
          preset: 'B',
          task: 'Some task description',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('name');
    });

    test('should return 400 for invalid repo format', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Team',
          repo: 'invalid-repo-format',
          preset: 'C',
          task: 'Task description here',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('github.com');
    });

    test('should return 400 for invalid preset', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Team',
          repo: 'github.com/user/repo',
          preset: 'INVALID',
          task: 'Task description here',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('preset');
    });

    test('should return 400 for task too short', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Team',
          repo: 'github.com/user/repo',
          preset: 'D',
          task: 'Short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('at least 10 characters');
    });

    test('should return 400 for invalid ownerId format', async () => {
      const response = await request(app)
        .post('/api/v1/teams')
        .send({
          name: 'Team',
          repo: 'github.com/user/repo',
          preset: 'A',
          task: 'Task description here',
          ownerId: 'invalid-uuid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('UUID');
    });
  });

  describe('GET /api/v1/teams - List teams', () => {
    beforeEach(async () => {
      // Create test teams
      await request(app).post('/api/v1/teams').send({
        name: 'Team 1',
        repo: 'github.com/user/repo1',
        preset: 'A',
        task: 'Task description one',
      });
      await request(app).post('/api/v1/teams').send({
        name: 'Team 2',
        repo: 'github.com/user/repo2',
        preset: 'B',
        task: 'Task description two',
      });
      await request(app).post('/api/v1/teams').send({
        name: 'Team 3',
        repo: 'github.com/user/repo3',
        preset: 'IQ',
        task: 'Task description three',
      });
    });

    test('should list all teams', async () => {
      const response = await request(app).get('/api/v1/teams');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('teams');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit', 50);
      expect(response.body).toHaveProperty('offset', 0);
      expect(response.body.teams.length).toBe(3);
    });

    test('should support pagination', async () => {
      const response = await request(app).get('/api/v1/teams').query({ limit: 2, offset: 1 });

      expect(response.status).toBe(200);
      expect(response.body.teams.length).toBe(2);
      expect(response.body).toHaveProperty('limit', 2);
      expect(response.body).toHaveProperty('offset', 1);
      expect(response.body).toHaveProperty('total', 3);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/teams')
        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body.teams.length).toBe(3);
      expect(response.body.teams.every((t) => t.status === 'pending')).toBe(true);
    });

    test('should return empty array when no teams exist', async () => {
      Redis.mockStore.clear();

      const response = await request(app).get('/api/v1/teams');

      expect(response.status).toBe(200);
      expect(response.body.teams).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    test('should filter by ownerId', async () => {
      const ownerId = '123e4567-e89b-12d3-a456-426614174001';
      await request(app).post('/api/v1/teams').send({
        name: 'Owned Team',
        repo: 'github.com/owner/owned-repo',
        preset: 'C',
        task: 'Task for specific owner',
        ownerId: ownerId,
      });

      const response = await request(app)
        .get('/api/v1/teams')
        .query({ ownerId: ownerId });

      expect(response.status).toBe(200);
      expect(response.body.teams.length).toBe(1);
      expect(response.body.teams[0]).toHaveProperty('ownerId', ownerId);
    });
  });

  describe('GET /api/v1/teams/:id - Get team by ID', () => {
    let teamId;

    beforeEach(async () => {
      const createResponse = await request(app).post('/api/v1/teams').send({
        name: 'Test Team',
        repo: 'github.com/test/repo',
        preset: 'A',
        task: 'Test task description',
      });
      teamId = createResponse.body.team.id;
    });

    test('should get team by ID', async () => {
      const response = await request(app).get(`/api/v1/teams/${teamId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('team');
      expect(response.body.team).toHaveProperty('id', teamId);
      expect(response.body.team).toHaveProperty('name', 'Test Team');
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/v1/teams/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await request(app).get('/api/v1/teams/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid team ID format');
    });
  });

  describe('PUT /api/v1/teams/:id - Update team', () => {
    let teamId;

    beforeEach(async () => {
      const createResponse = await request(app).post('/api/v1/teams').send({
        name: 'Original Team',
        repo: 'github.com/original/repo',
        preset: 'A',
        task: 'Original task description',
      });
      teamId = createResponse.body.team.id;
    });

    test('should update team name', async () => {
      const response = await request(app).put(`/api/v1/teams/${teamId}`).send({
        name: 'Updated Team Name',
      });

      expect(response.status).toBe(200);
      expect(response.body.team).toHaveProperty('name', 'Updated Team Name');
      expect(response.body.team).toHaveProperty('repo', 'github.com/original/repo'); // unchanged
      expect(response.body).toHaveProperty('message', 'Team updated successfully');
    });

    test('should update multiple fields', async () => {
      const response = await request(app).put(`/api/v1/teams/${teamId}`).send({
        name: 'New Name',
        preset: 'IQ',
        task: 'Updated task description here',
      });

      expect(response.status).toBe(200);
      expect(response.body.team).toHaveProperty('name', 'New Name');
      expect(response.body.team).toHaveProperty('preset', 'IQ');
      expect(response.body.team).toHaveProperty('task', 'Updated task description here');
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).put(`/api/v1/teams/${fakeId}`).send({
        name: 'Updated',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 for invalid data', async () => {
      const response = await request(app).put(`/api/v1/teams/${teamId}`).send({
        preset: 'INVALID_PRESET',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await request(app).put('/api/v1/teams/invalid-id').send({
        name: 'Updated',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid team ID format');
    });
  });

  describe('DELETE /api/v1/teams/:id - Delete team', () => {
    let teamId;

    beforeEach(async () => {
      const createResponse = await request(app).post('/api/v1/teams').send({
        name: 'Team to Delete',
        repo: 'github.com/delete/repo',
        preset: 'B',
        task: 'This team will be deleted',
      });
      teamId = createResponse.body.team.id;
    });

    test('should delete team', async () => {
      const response = await request(app).delete(`/api/v1/teams/${teamId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('teamId', teamId);
      expect(response.body).toHaveProperty('deleted', true);
      expect(response.body).toHaveProperty('message', 'Team deleted successfully');

      // Verify team is deleted
      const getResponse = await request(app).get(`/api/v1/teams/${teamId}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 for non-existent team', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).delete(`/api/v1/teams/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'TEAM_NOT_FOUND');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await request(app).delete('/api/v1/teams/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(response.body.error.message).toContain('Invalid team ID format');
    });
  });

  describe('End-to-end Team workflow', () => {
    test('should complete full CRUD workflow', async () => {
      // 1. Create team
      const createResponse = await request(app).post('/api/v1/teams').send({
        name: 'Workflow Team',
        repo: 'github.com/workflow/test-repo',
        preset: 'IQ',
        task: 'Complete workflow test task',
      });
      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body.team.id;

      // 2. Get team
      const getResponse = await request(app).get(`/api/v1/teams/${teamId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.team.name).toBe('Workflow Team');

      // 3. Update team
      const updateResponse = await request(app).put(`/api/v1/teams/${teamId}`).send({
        name: 'Updated Workflow Team',
        preset: 'A',
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.team.name).toBe('Updated Workflow Team');
      expect(updateResponse.body.team.preset).toBe('A');

      // 4. List teams to verify it's there
      const listResponse = await request(app).get('/api/v1/teams');
      expect(listResponse.status).toBe(200);
      const teamIds = listResponse.body.teams.map((t) => t.id);
      expect(teamIds).toContain(teamId);

      // 5. Delete team
      const deleteResponse = await request(app).delete(`/api/v1/teams/${teamId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.deleted).toBe(true);

      // 6. Verify team is deleted
      const getDeletedResponse = await request(app).get(`/api/v1/teams/${teamId}`);
      expect(getDeletedResponse.status).toBe(404);
    });

    test('should handle team lifecycle with owner', async () => {
      const ownerId = '123e4567-e89b-12d3-a456-426614174000';

      // 1. Create team with owner
      const createResponse = await request(app).post('/api/v1/teams').send({
        name: 'Owner Team',
        repo: 'github.com/owner/lifecycle-repo',
        preset: 'C',
        task: 'Team with owner lifecycle test',
        ownerId: ownerId,
      });
      expect(createResponse.status).toBe(201);
      const teamId = createResponse.body.team.id;

      // 2. List teams by owner
      const listByOwnerResponse = await request(app)
        .get('/api/v1/teams')
        .query({ ownerId: ownerId });
      expect(listByOwnerResponse.status).toBe(200);
      expect(listByOwnerResponse.body.teams.length).toBe(1);
      expect(listByOwnerResponse.body.teams[0].id).toBe(teamId);

      // 3. Delete team
      await request(app).delete(`/api/v1/teams/${teamId}`);

      // 4. Verify team removed from owner's list
      const listAfterDeleteResponse = await request(app)
        .get('/api/v1/teams')
        .query({ ownerId: ownerId });
      expect(listAfterDeleteResponse.body.teams.length).toBe(0);
    });
  });
});
