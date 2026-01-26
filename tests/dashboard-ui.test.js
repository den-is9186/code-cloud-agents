/**
 * Dashboard UI Tests
 *
 * Tests for the Team Dashboard UI components
 */

const fs = require('fs');
const path = require('path');

describe('Dashboard UI', () => {
  let htmlContent;

  beforeAll(() => {
    // Read the dashboard HTML file
    const htmlPath = path.join(__dirname, '../public/index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  describe('HTML Structure', () => {
    test('should have correct DOCTYPE', () => {
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
    });

    test('should have viewport meta tag', () => {
      expect(htmlContent).toMatch(/<meta name="viewport"/);
    });

    test('should have dashboard title', () => {
      expect(htmlContent).toMatch(/Multi-Agent Dashboard/);
    });

    test('should link to dashboard CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/dashboard.css"/);
    });

    test('should link to dashboard JS module', () => {
      expect(htmlContent).toMatch(/src="\/js\/dashboard.js"/);
      expect(htmlContent).toMatch(/type="module"/);
    });
  });

  describe('Dashboard Components', () => {
    test('should have header with create team button', () => {
      expect(htmlContent).toMatch(/id="createTeamBtn"/);
      expect(htmlContent).toMatch(/Neues Team erstellen/);
    });

    test('should have stats section with 4 stat cards', () => {
      expect(htmlContent).toMatch(/stats-section/);
      expect(htmlContent).toMatch(/id="totalTeams"/);
      expect(htmlContent).toMatch(/id="activeBuilds"/);
      expect(htmlContent).toMatch(/id="completedBuilds"/);
      expect(htmlContent).toMatch(/id="totalCost"/);
    });

    test('should have teams section with search and filter', () => {
      expect(htmlContent).toMatch(/teams-section/);
      expect(htmlContent).toMatch(/id="searchInput"/);
      expect(htmlContent).toMatch(/id="statusFilter"/);
    });

    test('should have teams grid', () => {
      expect(htmlContent).toMatch(/id="teamsGrid"/);
    });

    test('should have loading state', () => {
      expect(htmlContent).toMatch(/id="loadingState"/);
    });

    test('should have empty state', () => {
      expect(htmlContent).toMatch(/id="emptyState"/);
      expect(htmlContent).toMatch(/Keine Teams vorhanden/);
    });
  });

  describe('Create Team Modal', () => {
    test('should have create team modal', () => {
      expect(htmlContent).toMatch(/id="createTeamModal"/);
    });

    test('should have create team form', () => {
      expect(htmlContent).toMatch(/id="createTeamForm"/);
    });

    test('should have team name input', () => {
      expect(htmlContent).toMatch(/id="teamName"/);
      expect(htmlContent).toMatch(/name="name"/);
    });

    test('should have team repo input', () => {
      expect(htmlContent).toMatch(/id="teamRepo"/);
      expect(htmlContent).toMatch(/name="repo"/);
    });

    test('should have preset selector with 3 presets', () => {
      expect(htmlContent).toMatch(/name="preset"/);
      expect(htmlContent).toMatch(/value="A"/);
      expect(htmlContent).toMatch(/value="B"/);
      expect(htmlContent).toMatch(/value="C"/);
    });

    test('should have task textarea', () => {
      expect(htmlContent).toMatch(/id="teamTask"/);
      expect(htmlContent).toMatch(/name="task"/);
    });

    test('should have submit button', () => {
      expect(htmlContent).toMatch(/type="submit"/);
      expect(htmlContent).toMatch(/Team erstellen/);
    });
  });

  describe('CSS Files', () => {
    test('dashboard CSS should exist', () => {
      const cssPath = path.join(__dirname, '../public/css/dashboard.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    test('dashboard CSS should contain expected styles', () => {
      const cssPath = path.join(__dirname, '../public/css/dashboard.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toMatch(/\.dashboard-container/);
      expect(cssContent).toMatch(/\.modal/);
      expect(cssContent).toMatch(/\.btn-primary/);
      expect(cssContent).toMatch(/\.stats-section/);
    });

    test('TeamCard component should contain team-card styles', () => {
      const jsPath = path.join(__dirname, '../public/js/components/TeamCard.js');
      const jsContent = fs.readFileSync(jsPath, 'utf8');

      // Team card styles are defined in the component itself
      expect(jsContent).toMatch(/\.team-card/);
      expect(jsContent).toMatch(/\.status-badge/);
      expect(jsContent).toMatch(/\.progress-bar/);
    });
  });

  describe('JavaScript Files', () => {
    test('dashboard.js should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/dashboard.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('api.js should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/api.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('TeamCard.js component should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/components/TeamCard.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('api.js should export API class', () => {
      const jsPath = path.join(__dirname, '../public/js/api.js');
      const jsContent = fs.readFileSync(jsPath, 'utf8');

      expect(jsContent).toMatch(/export class API/);
      expect(jsContent).toMatch(/static async getTeams/);
      expect(jsContent).toMatch(/static async createTeam/);
    });

    test('TeamCard.js should export TeamCard class', () => {
      const jsPath = path.join(__dirname, '../public/js/components/TeamCard.js');
      const jsContent = fs.readFileSync(jsPath, 'utf8');

      expect(jsContent).toMatch(/export class TeamCard/);
      expect(jsContent).toMatch(/static render/);
    });

    test('dashboard.js should import modules correctly', () => {
      const jsPath = path.join(__dirname, '../public/js/dashboard.js');
      const jsContent = fs.readFileSync(jsPath, 'utf8');

      expect(jsContent).toMatch(/import.*TeamCard.*from/);
      expect(jsContent).toMatch(/import.*API.*from/);
    });
  });

  describe('Responsive Design', () => {
    test('CSS should have responsive media queries', () => {
      const cssPath = path.join(__dirname, '../public/css/dashboard.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toMatch(/@media.*max-width/);
    });
  });
});
