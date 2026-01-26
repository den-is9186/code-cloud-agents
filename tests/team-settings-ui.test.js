/**
 * Team Settings UI Tests
 *
 * Tests for the Team Settings page components
 */

const fs = require('fs');
const path = require('path');

describe('Team Settings UI', () => {
  let htmlContent;
  let cssContent;
  let jsContent;

  beforeAll(() => {
    // Read the settings HTML file
    const htmlPath = path.join(__dirname, '../public/team-settings.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Read the settings CSS file
    const cssPath = path.join(__dirname, '../public/css/team-settings.css');
    cssContent = fs.readFileSync(cssPath, 'utf8');

    // Read the settings JS file
    const jsPath = path.join(__dirname, '../public/js/team-settings.js');
    jsContent = fs.readFileSync(jsPath, 'utf8');
  });

  describe('HTML Structure', () => {
    test('should have correct DOCTYPE', () => {
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
    });

    test('should have viewport meta tag', () => {
      expect(htmlContent).toMatch(/<meta name="viewport"/);
    });

    test('should have settings title', () => {
      expect(htmlContent).toMatch(/Team Einstellungen/);
    });

    test('should link to dashboard CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/dashboard.css"/);
    });

    test('should link to team-settings CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/team-settings.css"/);
    });

    test('should link to team-settings JS module', () => {
      expect(htmlContent).toMatch(/src="\/js\/team-settings.js"/);
      expect(htmlContent).toMatch(/type="module"/);
    });
  });

  describe('Header Components', () => {
    test('should have back link to dashboard', () => {
      expect(htmlContent).toMatch(/href="\/index.html"/);
      expect(htmlContent).toMatch(/Zurück zum Dashboard/);
    });

    test('should have save settings button', () => {
      expect(htmlContent).toMatch(/id="saveSettingsBtn"/);
      expect(htmlContent).toMatch(/Änderungen speichern/);
    });
  });

  describe('Team Info Card', () => {
    test('should have team info section', () => {
      expect(htmlContent).toMatch(/Team Information/);
    });

    test('should have team info fields', () => {
      expect(htmlContent).toMatch(/id="teamName"/);
      expect(htmlContent).toMatch(/id="teamRepo"/);
      expect(htmlContent).toMatch(/id="teamStatus"/);
      expect(htmlContent).toMatch(/id="teamCreated"/);
    });
  });

  describe('Preset Selector', () => {
    test('should have preset selection section', () => {
      expect(htmlContent).toMatch(/Preset Auswahl/);
    });

    test('should have 3 preset options (A, B, C)', () => {
      expect(htmlContent).toMatch(/id="presetA"/);
      expect(htmlContent).toMatch(/id="presetB"/);
      expect(htmlContent).toMatch(/id="presetC"/);
      expect(htmlContent).toMatch(/name="preset"/);
    });

    test('preset A should have correct info', () => {
      expect(htmlContent).toMatch(/Preset A/);
      expect(htmlContent).toMatch(/Budget/);
      expect(htmlContent).toMatch(/~\$8/);
    });

    test('preset B should have correct info', () => {
      expect(htmlContent).toMatch(/Preset B/);
      expect(htmlContent).toMatch(/Optimal/);
      expect(htmlContent).toMatch(/~\$25/);
    });

    test('preset C should have correct info', () => {
      expect(htmlContent).toMatch(/Preset C/);
      expect(htmlContent).toMatch(/Premium/);
      expect(htmlContent).toMatch(/~\$130/);
    });

    test('preset B should be checked by default', () => {
      expect(htmlContent).toMatch(/id="presetB" checked/);
    });

    test('each preset should have features list', () => {
      expect(htmlContent).toMatch(/preset-features/);
      expect(htmlContent).toMatch(/DeepSeek/);
      expect(htmlContent).toMatch(/Claude/);
    });
  });

  describe('Agent Configuration', () => {
    test('should have agent configuration section', () => {
      expect(htmlContent).toMatch(/Agent Konfiguration/);
    });

    test('should have agent config list', () => {
      expect(htmlContent).toMatch(/id="agentConfigList"/);
    });

    test('should have toggle advanced settings button', () => {
      expect(htmlContent).toMatch(/id="toggleAdvancedBtn"/);
      expect(htmlContent).toMatch(/Erweiterte Einstellungen/);
    });

    test('should have advanced settings section', () => {
      expect(htmlContent).toMatch(/id="advancedSettings"/);
      expect(htmlContent).toMatch(/style="display: none;"/);
    });

    test('should have max iterations input', () => {
      expect(htmlContent).toMatch(/id="maxIterations"/);
      expect(htmlContent).toMatch(/type="number"/);
    });

    test('should have parallel execution select', () => {
      expect(htmlContent).toMatch(/id="parallelExecution"/);
      expect(htmlContent).toMatch(/<select/);
    });
  });

  describe('Cost Estimate', () => {
    test('should have cost estimate section', () => {
      expect(htmlContent).toMatch(/Kostenschätzung/);
    });

    test('should have total estimate', () => {
      expect(htmlContent).toMatch(/id="totalEstimate"/);
      expect(htmlContent).toMatch(/Geschätzte Gesamtkosten/);
    });

    test('should have prototype estimate', () => {
      expect(htmlContent).toMatch(/id="prototypeEstimate"/);
      expect(htmlContent).toMatch(/Prototyp Phase/);
    });

    test('should have premium estimate', () => {
      expect(htmlContent).toMatch(/id="premiumEstimate"/);
      expect(htmlContent).toMatch(/Premium Phase/);
    });

    test('should have agent cost list', () => {
      expect(htmlContent).toMatch(/id="agentCostList"/);
      expect(htmlContent).toMatch(/Kosten pro Agent/);
    });

    test('should have preset comparison', () => {
      expect(htmlContent).toMatch(/id="presetComparison"/);
      expect(htmlContent).toMatch(/Vergleich mit anderen Presets/);
    });
  });

  describe('Danger Zone', () => {
    test('should have danger zone section', () => {
      expect(htmlContent).toMatch(/Gefahrenzone/);
      expect(htmlContent).toMatch(/danger-card/);
    });

    test('should have reset team button', () => {
      expect(htmlContent).toMatch(/id="resetTeamBtn"/);
      expect(htmlContent).toMatch(/Team zurücksetzen/);
    });

    test('should have delete team button', () => {
      expect(htmlContent).toMatch(/id="deleteTeamBtn"/);
      expect(htmlContent).toMatch(/Team löschen/);
    });

    test('danger actions should have warnings', () => {
      expect(htmlContent).toMatch(/Löscht das Team permanent/);
      expect(htmlContent).toMatch(/Setzt alle Builds und Konfigurationen zurück/);
    });
  });

  describe('Loading Overlay', () => {
    test('should have loading overlay', () => {
      expect(htmlContent).toMatch(/id="loadingOverlay"/);
      expect(htmlContent).toMatch(/loading-overlay/);
    });

    test('loading overlay should be hidden by default', () => {
      expect(htmlContent).toMatch(/loadingOverlay.*style="display: none;"/);
    });
  });

  describe('CSS Styles', () => {
    test('CSS file should exist', () => {
      const cssPath = path.join(__dirname, '../public/css/team-settings.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    test('CSS should contain settings-specific styles', () => {
      expect(cssContent).toMatch(/\.settings-container/);
      expect(cssContent).toMatch(/\.preset-selector-grid/);
      expect(cssContent).toMatch(/\.agent-config-list/);
      expect(cssContent).toMatch(/\.cost-estimate/);
      expect(cssContent).toMatch(/\.danger-actions/);
    });

    test('CSS should have preset card styles', () => {
      expect(cssContent).toMatch(/\.preset-card-large/);
      expect(cssContent).toMatch(/\.preset-features/);
      expect(cssContent).toMatch(/\.preset-cost-large/);
    });

    test('CSS should have responsive styles', () => {
      expect(cssContent).toMatch(/@media.*max-width/);
    });
  });

  describe('JavaScript Functionality', () => {
    test('JS file should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/team-settings.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('JS should import API', () => {
      expect(jsContent).toMatch(/import.*API.*from/);
    });

    test('JS should have state management', () => {
      expect(jsContent).toMatch(/let teamId/);
      expect(jsContent).toMatch(/let team/);
      expect(jsContent).toMatch(/let currentPreset/);
    });

    test('JS should have initialization', () => {
      expect(jsContent).toMatch(/DOMContentLoaded/);
      expect(jsContent).toMatch(/initializeEventListeners/);
      expect(jsContent).toMatch(/loadTeamSettings/);
    });

    test('JS should have event handlers', () => {
      expect(jsContent).toMatch(/handleSaveSettings/);
      expect(jsContent).toMatch(/handlePresetChange/);
      expect(jsContent).toMatch(/handleResetTeam/);
      expect(jsContent).toMatch(/handleDeleteTeam/);
    });

    test('JS should have cost estimation functions', () => {
      expect(jsContent).toMatch(/updateCostEstimate/);
      expect(jsContent).toMatch(/estimateAgentCost/);
      expect(jsContent).toMatch(/updatePresetComparison/);
    });

    test('JS should have UI helper functions', () => {
      expect(jsContent).toMatch(/formatRepo/);
      expect(jsContent).toMatch(/formatStatus/);
      expect(jsContent).toMatch(/formatDate/);
      expect(jsContent).toMatch(/getAgentIcon/);
    });

    test('JS should handle loading state', () => {
      expect(jsContent).toMatch(/showLoading/);
    });
  });

  describe('Form Validation', () => {
    test('max iterations should have min and max constraints', () => {
      expect(htmlContent).toMatch(/min="1"/);
      expect(htmlContent).toMatch(/max="10"/);
    });

    test('preset radio buttons should be required', () => {
      // Radio groups are implicitly required when one is checked by default
      expect(htmlContent).toMatch(/type="radio"/);
    });
  });

  describe('Accessibility', () => {
    test('form inputs should have labels', () => {
      expect(htmlContent).toMatch(/<label for="maxIterations"/);
      expect(htmlContent).toMatch(/<label for="parallelExecution"/);
    });

    test('buttons should have descriptive text', () => {
      expect(htmlContent).toMatch(/Änderungen speichern/);
      expect(htmlContent).toMatch(/Zurücksetzen/);
      expect(htmlContent).toMatch(/Löschen/);
    });

    test('form inputs should have help text', () => {
      expect(htmlContent).toMatch(/form-help/);
      expect(htmlContent).toMatch(/Maximale Anzahl/);
      expect(htmlContent).toMatch(/Wie Agents ausgeführt werden/);
    });
  });

  describe('Integration', () => {
    test('should get team ID from URL parameter', () => {
      expect(jsContent).toMatch(/URLSearchParams/);
      expect(jsContent).toMatch(/params\.get\('id'\)/);
    });

    test('should redirect if no team ID', () => {
      expect(jsContent).toMatch(/window\.location\.href.*index\.html/);
    });

    test('should call API methods', () => {
      expect(jsContent).toMatch(/API\.getTeam/);
      expect(jsContent).toMatch(/API\.getPresets/);
      expect(jsContent).toMatch(/API\.updateTeam/);
      expect(jsContent).toMatch(/API\.deleteTeam/);
    });
  });
});
