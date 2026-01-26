/**
 * Export API Tests
 *
 * Tests for export/reports API endpoints
 */

const request = require('supertest');
const app = require('../src/api-server');
const {
  exportBuildReport,
  exportCostReport,
  exportAgentPerformanceReport,
  exportBudgetReport,
} = require('../src/services/export-service');
const { getTestToken, Roles } = require('./helpers/auth-helper');

jest.mock('../src/services/export-service');

// Helper to create authenticated request (MANAGER role for team ownership endpoints)
const authGet = (url) =>
  request(app).get(url).set('Authorization', `Bearer ${getTestToken(Roles.MANAGER)}`);

describe('Export API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/export/builds', () => {
    test('should export builds in JSON format', async () => {
      const mockBuilds = [
        {
          id: 'build-1',
          teamId: 'team-1',
          status: 'completed',
          totalCost: 0.5,
        },
      ];

      exportBuildReport.mockResolvedValue(JSON.stringify(mockBuilds, null, 2));

      const response = await authGet('/api/v1/export/builds')
        .query({ teamId: 'team-1', format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(exportBuildReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teamId: 'team-1',
          format: 'json',
        })
      );
    });

    test('should export builds in CSV format', async () => {
      const mockCSV = 'id,teamId,status,totalCost\nbuild-1,team-1,completed,0.5';

      exportBuildReport.mockResolvedValue(mockCSV);

      const response = await authGet('/api/v1/export/builds')
        .query({ teamId: 'team-1', format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('builds-');
    });

    test('should filter by buildId', async () => {
      exportBuildReport.mockResolvedValue('[]');

      await authGet('/api/v1/export/builds').query({ buildId: 'build-123' });

      expect(exportBuildReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          buildId: 'build-123',
        })
      );
    });

    test('should filter by date range', async () => {
      exportBuildReport.mockResolvedValue('[]');

      await authGet('/api/v1/export/builds').query({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(exportBuildReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    test('should reject invalid format', async () => {
      const response = await authGet('/api/v1/export/builds')
        .query({ format: 'xml' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    test('should handle export errors', async () => {
      exportBuildReport.mockRejectedValue(new Error('Export failed'));

      const response = await authGet('/api/v1/export/builds');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('EXPORT_FAILED');
    });
  });

  describe('GET /api/v1/export/costs', () => {
    test('should export costs for team', async () => {
      const mockCosts = {
        teamId: 'team-1',
        totalCost: 10.5,
        totalBuilds: 5,
      };

      exportCostReport.mockResolvedValue(JSON.stringify(mockCosts, null, 2));

      const response = await authGet('/api/v1/export/costs')
        .query({ teamId: 'team-1' });

      expect(response.status).toBe(200);
      expect(exportCostReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teamId: 'team-1',
        })
      );
    });

    test('should require teamId', async () => {
      const response = await authGet('/api/v1/export/costs');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_TEAM_ID');
    });

    test('should support different periods', async () => {
      exportCostReport.mockResolvedValue('{}');

      await authGet('/api/v1/export/costs').query({
        teamId: 'team-1',
        period: 'quarter',
      });

      expect(exportCostReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          period: 'quarter',
        })
      );
    });

    test('should reject invalid period', async () => {
      const response = await authGet('/api/v1/export/costs').query({
        teamId: 'team-1',
        period: 'decade',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PERIOD');
    });

    test('should export costs in CSV format', async () => {
      const mockCSV = 'teamId,totalCost,totalBuilds\nteam-1,10.5,5';

      exportCostReport.mockResolvedValue(mockCSV);

      const response = await authGet('/api/v1/export/costs').query({
        teamId: 'team-1',
        format: 'csv',
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('costs-team-1-');
    });

    test('should support custom date ranges', async () => {
      exportCostReport.mockResolvedValue('{}');

      await authGet('/api/v1/export/costs').query({
        teamId: 'team-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(exportCostReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('GET /api/v1/export/agents', () => {
    test('should export agent performance', async () => {
      const mockPerformance = {
        agentStats: {
          code: {
            totalRuns: 10,
            successRate: 90,
          },
        },
      };

      exportAgentPerformanceReport.mockResolvedValue(JSON.stringify(mockPerformance, null, 2));

      const response = await authGet('/api/v1/export/agents');

      expect(response.status).toBe(200);
      expect(exportAgentPerformanceReport).toHaveBeenCalled();
    });

    test('should filter by teamId', async () => {
      exportAgentPerformanceReport.mockResolvedValue('{}');

      await authGet('/api/v1/export/agents').query({ teamId: 'team-1' });

      expect(exportAgentPerformanceReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          teamId: 'team-1',
        })
      );
    });

    test('should filter by agentName', async () => {
      exportAgentPerformanceReport.mockResolvedValue('{}');

      await authGet('/api/v1/export/agents').query({ agentName: 'code' });

      expect(exportAgentPerformanceReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          agentName: 'code',
        })
      );
    });

    test('should export in CSV format', async () => {
      const mockCSV = 'agent,totalRuns,successRate\ncode,10,90';

      exportAgentPerformanceReport.mockResolvedValue(mockCSV);

      const response = await authGet('/api/v1/export/agents').query({
        format: 'csv',
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('agents-');
    });

    test('should handle date range filters', async () => {
      exportAgentPerformanceReport.mockResolvedValue('{}');

      await authGet('/api/v1/export/agents').query({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(exportAgentPerformanceReport).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('GET /api/v1/export/budget/:teamId', () => {
    test('should export budget report', async () => {
      const mockBudget = {
        teamId: 'team-1',
        monthlySpending: 50,
        percentage: 50,
        remaining: 50,
      };

      exportBudgetReport.mockResolvedValue(JSON.stringify(mockBudget, null, 2));

      const response = await authGet('/api/v1/export/budget/team-1');

      expect(response.status).toBe(200);
      expect(exportBudgetReport).toHaveBeenCalledWith(expect.anything(), 'team-1', 'json');
    });

    test('should export in CSV format', async () => {
      const mockCSV = 'teamId,monthlySpending,percentage,remaining\nteam-1,50,50%,50';

      exportBudgetReport.mockResolvedValue(mockCSV);

      const response = await authGet('/api/v1/export/budget/team-1')
        .query({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('budget-team-1-');
    });

    test('should reject invalid format', async () => {
      const response = await authGet('/api/v1/export/budget/team-1')
        .query({ format: 'pdf' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_FORMAT');
    });

    test('should handle export errors', async () => {
      exportBudgetReport.mockRejectedValue(new Error('Budget not found'));

      const response = await authGet('/api/v1/export/budget/team-1');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('EXPORT_FAILED');
    });
  });
});
