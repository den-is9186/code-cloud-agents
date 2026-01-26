/**
 * Approval Dialog UI Tests
 *
 * Tests for the Approval Dialog page components
 */

const fs = require('fs');
const path = require('path');

describe('Approval Dialog UI', () => {
  let htmlContent;
  let cssContent;
  let jsContent;

  beforeAll(() => {
    // Read the approval dialog HTML file
    const htmlPath = path.join(__dirname, '../public/approval-dialog.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Read the approval dialog CSS file
    const cssPath = path.join(__dirname, '../public/css/approval-dialog.css');
    cssContent = fs.readFileSync(cssPath, 'utf8');

    // Read the approval dialog JS file
    const jsPath = path.join(__dirname, '../public/js/approval-dialog.js');
    jsContent = fs.readFileSync(jsPath, 'utf8');
  });

  describe('HTML Structure', () => {
    test('should have correct DOCTYPE', () => {
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
    });

    test('should have viewport meta tag', () => {
      expect(htmlContent).toMatch(/<meta name="viewport"/);
    });

    test('should have approval title', () => {
      expect(htmlContent).toMatch(/Prototyp Freigabe/);
    });

    test('should link to dashboard CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/dashboard.css"/);
    });

    test('should link to approval-dialog CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/approval-dialog.css"/);
    });

    test('should link to approval-dialog JS module', () => {
      expect(htmlContent).toMatch(/src="\/js\/approval-dialog.js"/);
      expect(htmlContent).toMatch(/type="module"/);
    });
  });

  describe('Header Components', () => {
    test('should have back link to dashboard', () => {
      expect(htmlContent).toMatch(/href="\/index.html"/);
      expect(htmlContent).toMatch(/Zurück zum Dashboard/);
    });

    test('should have approval header', () => {
      expect(htmlContent).toMatch(/class="approval-header"/);
    });
  });

  describe('Team Info Card', () => {
    test('should have team info section', () => {
      expect(htmlContent).toMatch(/Team Information/);
    });

    test('should have team info fields', () => {
      expect(htmlContent).toMatch(/id="teamName"/);
      expect(htmlContent).toMatch(/id="teamRepo"/);
      expect(htmlContent).toMatch(/id="teamPreset"/);
      expect(htmlContent).toMatch(/id="teamPhase"/);
      expect(htmlContent).toMatch(/id="teamTask"/);
      expect(htmlContent).toMatch(/id="teamStatus"/);
    });
  });

  describe('Prototype Results Card', () => {
    test('should have prototype results section', () => {
      expect(htmlContent).toMatch(/Prototyp Ergebnisse/);
    });

    test('should have results grid', () => {
      expect(htmlContent).toMatch(/class="results-grid"/);
    });

    test('should have result stats', () => {
      expect(htmlContent).toMatch(/id="filesChanged"/);
      expect(htmlContent).toMatch(/id="testsWritten"/);
      expect(htmlContent).toMatch(/id="docsUpdated"/);
      expect(htmlContent).toMatch(/id="buildCost"/);
    });

    test('should have build duration', () => {
      expect(htmlContent).toMatch(/id="buildDuration"/);
    });

    test('should have build summary', () => {
      expect(htmlContent).toMatch(/id="buildSummary"/);
      expect(htmlContent).toMatch(/Build Zusammenfassung/);
    });
  });

  describe('Agent Execution Card', () => {
    test('should have agent execution section', () => {
      expect(htmlContent).toMatch(/Agent Ausführung/);
    });

    test('should have agent execution list', () => {
      expect(htmlContent).toMatch(/id="agentExecutionList"/);
    });
  });

  describe('File Changes Card', () => {
    test('should have file changes section', () => {
      expect(htmlContent).toMatch(/Dateiänderungen/);
    });

    test('should have file changes list', () => {
      expect(htmlContent).toMatch(/id="fileChangesList"/);
    });

    test('should have file changes count badge', () => {
      expect(htmlContent).toMatch(/id="fileChangesCount"/);
    });
  });

  describe('Decision Card', () => {
    test('should have decision card section', () => {
      expect(htmlContent).toMatch(/Entscheidung treffen/);
      expect(htmlContent).toMatch(/decision-card/);
    });

    test('should have comment field', () => {
      expect(htmlContent).toMatch(/id="decisionComment"/);
      expect(htmlContent).toMatch(/Kommentar \/ Begründung/);
    });

    test('should have 4 action buttons', () => {
      expect(htmlContent).toMatch(/id="approveBtn"/);
      expect(htmlContent).toMatch(/id="partialBtn"/);
      expect(htmlContent).toMatch(/id="rejectBtn"/);
      expect(htmlContent).toMatch(/id="skipBtn"/);
    });

    test('approve button should have correct info', () => {
      expect(htmlContent).toMatch(/data-action="approve"/);
      expect(htmlContent).toMatch(/Freigeben/);
      expect(htmlContent).toMatch(/Premium-Phase starten/);
    });

    test('partial button should have correct info', () => {
      expect(htmlContent).toMatch(/data-action="partial"/);
      expect(htmlContent).toMatch(/Teilweise freigeben/);
      expect(htmlContent).toMatch(/Änderungswünschen/);
    });

    test('reject button should have correct info', () => {
      expect(htmlContent).toMatch(/data-action="reject"/);
      expect(htmlContent).toMatch(/Ablehnen/);
      expect(htmlContent).toMatch(/Workflow beenden/);
    });

    test('skip button should have correct info', () => {
      expect(htmlContent).toMatch(/data-action="skip"/);
      expect(htmlContent).toMatch(/Überspringen/);
      expect(htmlContent).toMatch(/Später entscheiden/);
    });
  });

  describe('Modifications Section', () => {
    test('should have modifications section', () => {
      expect(htmlContent).toMatch(/id="modificationsSection"/);
      expect(htmlContent).toMatch(/Änderungen anfordern/);
    });

    test('modifications section should be hidden by default', () => {
      expect(htmlContent).toMatch(/modificationsSection.*style="display: none;"/);
    });

    test('should have modifications list', () => {
      expect(htmlContent).toMatch(/id="modificationsList"/);
    });

    test('should have modifications text field', () => {
      expect(htmlContent).toMatch(/id="modificationsText"/);
      expect(htmlContent).toMatch(/Zusätzliche Änderungswünsche/);
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

  describe('Confirmation Modal', () => {
    test('should have confirmation modal', () => {
      expect(htmlContent).toMatch(/id="confirmModal"/);
    });

    test('confirmation modal should be hidden by default', () => {
      expect(htmlContent).toMatch(/confirmModal.*style="display: none;"/);
    });

    test('should have confirm title and message', () => {
      expect(htmlContent).toMatch(/id="confirmTitle"/);
      expect(htmlContent).toMatch(/id="confirmMessage"/);
    });

    test('should have confirm buttons', () => {
      expect(htmlContent).toMatch(/id="confirmCancelBtn"/);
      expect(htmlContent).toMatch(/id="confirmOkBtn"/);
    });
  });

  describe('CSS Styles', () => {
    test('CSS file should exist', () => {
      const cssPath = path.join(__dirname, '../public/css/approval-dialog.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    test('CSS should contain approval-specific styles', () => {
      expect(cssContent).toMatch(/\.approval-container/);
      expect(cssContent).toMatch(/\.approval-header/);
      expect(cssContent).toMatch(/\.approval-main/);
    });

    test('CSS should have results grid styles', () => {
      expect(cssContent).toMatch(/\.results-grid/);
      expect(cssContent).toMatch(/\.result-stat/);
      expect(cssContent).toMatch(/\.result-icon/);
      expect(cssContent).toMatch(/\.result-info/);
    });

    test('CSS should have agent execution styles', () => {
      expect(cssContent).toMatch(/\.agent-execution-list/);
      expect(cssContent).toMatch(/\.agent-execution-item/);
      expect(cssContent).toMatch(/\.agent-execution-status/);
    });

    test('CSS should have file changes styles', () => {
      expect(cssContent).toMatch(/\.file-changes-list/);
      expect(cssContent).toMatch(/\.file-change-item/);
      expect(cssContent).toMatch(/\.file-change-badge/);
    });

    test('CSS should have decision card styles', () => {
      expect(cssContent).toMatch(/\.decision-card/);
      expect(cssContent).toMatch(/\.action-buttons/);
      expect(cssContent).toMatch(/\.btn-large/);
    });

    test('CSS should have modifications section styles', () => {
      expect(cssContent).toMatch(/\.modifications-section/);
      expect(cssContent).toMatch(/\.modifications-list/);
      expect(cssContent).toMatch(/\.modification-item/);
    });

    test('CSS should have button variant styles', () => {
      expect(cssContent).toMatch(/\.btn-success/);
      expect(cssContent).toMatch(/\.btn-warning/);
      expect(cssContent).toMatch(/\.btn-danger/);
      expect(cssContent).toMatch(/\.btn-secondary/);
    });

    test('CSS should have modal styles', () => {
      expect(cssContent).toMatch(/\.modal/);
      expect(cssContent).toMatch(/\.modal-content/);
      expect(cssContent).toMatch(/\.modal-header/);
      expect(cssContent).toMatch(/\.modal-body/);
      expect(cssContent).toMatch(/\.modal-footer/);
    });

    test('CSS should have responsive styles', () => {
      expect(cssContent).toMatch(/@media.*max-width/);
    });
  });

  describe('JavaScript Functionality', () => {
    test('JS file should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/approval-dialog.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('JS should import API', () => {
      expect(jsContent).toMatch(/import.*API.*from/);
    });

    test('JS should have state management', () => {
      expect(jsContent).toMatch(/let teamId/);
      expect(jsContent).toMatch(/let team/);
      expect(jsContent).toMatch(/let buildId/);
      expect(jsContent).toMatch(/let buildData/);
      expect(jsContent).toMatch(/let fileChanges/);
      expect(jsContent).toMatch(/let selectedAction/);
    });

    test('JS should have initialization', () => {
      expect(jsContent).toMatch(/DOMContentLoaded/);
      expect(jsContent).toMatch(/initializeEventListeners/);
      expect(jsContent).toMatch(/loadApprovalData/);
    });

    test('JS should have action handlers', () => {
      expect(jsContent).toMatch(/handleAction/);
      expect(jsContent).toMatch(/handleApprove/);
      expect(jsContent).toMatch(/handleReject/);
      expect(jsContent).toMatch(/handlePartial/);
      expect(jsContent).toMatch(/handleSkip/);
    });

    test('JS should have modal functions', () => {
      expect(jsContent).toMatch(/showConfirmModal/);
      expect(jsContent).toMatch(/hideConfirmModal/);
      expect(jsContent).toMatch(/executeAction/);
    });

    test('JS should have update functions', () => {
      expect(jsContent).toMatch(/updateTeamInfo/);
      expect(jsContent).toMatch(/updatePrototypeResults/);
      expect(jsContent).toMatch(/updateAgentExecution/);
      expect(jsContent).toMatch(/updateFileChanges/);
      expect(jsContent).toMatch(/updateModificationsList/);
    });

    test('JS should have UI helper functions', () => {
      expect(jsContent).toMatch(/formatRepo/);
      expect(jsContent).toMatch(/formatStatus/);
      expect(jsContent).toMatch(/formatDuration/);
      expect(jsContent).toMatch(/formatAgentName/);
      expect(jsContent).toMatch(/getAgentIcon/);
      expect(jsContent).toMatch(/formatChangeType/);
    });

    test('JS should handle loading state', () => {
      expect(jsContent).toMatch(/showLoading/);
    });
  });

  describe('Form Validation', () => {
    test('comment field should be a textarea', () => {
      expect(htmlContent).toMatch(/<textarea[^>]*id="decisionComment"/);
    });

    test('modifications text should be a textarea', () => {
      expect(htmlContent).toMatch(/<textarea[^>]*id="modificationsText"/);
    });
  });

  describe('Accessibility', () => {
    test('form inputs should have labels', () => {
      expect(htmlContent).toMatch(/<label[^>]*for="decisionComment"/);
      expect(htmlContent).toMatch(/<label[^>]*for="modificationsText"/);
    });

    test('buttons should have descriptive text', () => {
      expect(htmlContent).toMatch(/Freigeben/);
      expect(htmlContent).toMatch(/Teilweise freigeben/);
      expect(htmlContent).toMatch(/Ablehnen/);
      expect(htmlContent).toMatch(/Überspringen/);
    });

    test('form inputs should have help text', () => {
      expect(htmlContent).toMatch(/form-help/);
      expect(htmlContent).toMatch(/Workflow-Historie gespeichert/);
    });

    test('action buttons should have icons', () => {
      expect(htmlContent).toMatch(/btn-icon/);
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

    test('should validate team status', () => {
      expect(jsContent).toMatch(/awaiting_approval/);
      expect(jsContent).toMatch(/team\.status/);
    });

    test('should call API methods', () => {
      expect(jsContent).toMatch(/API\.getTeam/);
      expect(jsContent).toMatch(/API\.getBuildStatus/);
      expect(jsContent).toMatch(/API\.approvePrototype/);
      expect(jsContent).toMatch(/API\.rejectPrototype/);
      expect(jsContent).toMatch(/API\.updateTeam/);
    });

    test('should handle modifications for partial approval', () => {
      expect(jsContent).toMatch(/partial: true/);
      expect(jsContent).toMatch(/modifications:/);
    });

    test('should include userId in approval/reject', () => {
      expect(jsContent).toMatch(/userId:/);
    });

    test('should include buildId in approval/reject', () => {
      expect(jsContent).toMatch(/buildId:/);
    });
  });
});
