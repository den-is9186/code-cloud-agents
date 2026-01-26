/**
 * Build Progress UI Tests
 *
 * Tests for the Build Progress page components
 */

const fs = require('fs');
const path = require('path');

describe('Build Progress UI', () => {
  let htmlContent;
  let cssContent;
  let jsContent;

  beforeAll(() => {
    // Read the build progress HTML file
    const htmlPath = path.join(__dirname, '../public/build-progress.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Read the build progress CSS file
    const cssPath = path.join(__dirname, '../public/css/build-progress.css');
    cssContent = fs.readFileSync(cssPath, 'utf8');

    // Read the build progress JS file
    const jsPath = path.join(__dirname, '../public/js/build-progress.js');
    jsContent = fs.readFileSync(jsPath, 'utf8');
  });

  describe('HTML Structure', () => {
    test('should have correct DOCTYPE', () => {
      expect(htmlContent).toMatch(/<!DOCTYPE html>/i);
    });

    test('should have viewport meta tag', () => {
      expect(htmlContent).toMatch(/<meta name="viewport"/);
    });

    test('should have build progress title', () => {
      expect(htmlContent).toMatch(/Build Progress/);
    });

    test('should link to dashboard CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/dashboard.css"/);
    });

    test('should link to build-progress CSS', () => {
      expect(htmlContent).toMatch(/href="\/css\/build-progress.css"/);
    });

    test('should link to build-progress JS module', () => {
      expect(htmlContent).toMatch(/src="\/js\/build-progress.js"/);
      expect(htmlContent).toMatch(/type="module"/);
    });
  });

  describe('Header Components', () => {
    test('should have back link to dashboard', () => {
      expect(htmlContent).toMatch(/href="\/index.html"/);
      expect(htmlContent).toMatch(/Zurück zum Dashboard/);
    });

    test('should have live indicator', () => {
      expect(htmlContent).toMatch(/id="liveIndicator"/);
      expect(htmlContent).toMatch(/Live/);
    });

    test('should have pulse animation element', () => {
      expect(htmlContent).toMatch(/class="pulse"/);
    });
  });

  describe('Build Info Card', () => {
    test('should have build info section', () => {
      expect(htmlContent).toMatch(/Build Information/);
    });

    test('should have build info fields', () => {
      expect(htmlContent).toMatch(/id="buildId"/);
      expect(htmlContent).toMatch(/id="teamName"/);
      expect(htmlContent).toMatch(/id="buildPhase"/);
      expect(htmlContent).toMatch(/id="buildPreset"/);
      expect(htmlContent).toMatch(/id="buildStarted"/);
      expect(htmlContent).toMatch(/id="buildDuration"/);
    });

    test('should have build status badge', () => {
      expect(htmlContent).toMatch(/id="buildStatus"/);
    });
  });

  describe('Overall Progress Card', () => {
    test('should have overall progress section', () => {
      expect(htmlContent).toMatch(/Gesamtfortschritt/);
    });

    test('should have progress bar', () => {
      expect(htmlContent).toMatch(/class="progress-bar-container"/);
      expect(htmlContent).toMatch(/class="progress-bar"/);
      expect(htmlContent).toMatch(/id="overallProgressFill"/);
    });

    test('should have percent badge', () => {
      expect(htmlContent).toMatch(/id="overallPercent"/);
    });

    test('should have current agent info', () => {
      expect(htmlContent).toMatch(/id="currentAgentInfo"/);
      expect(htmlContent).toMatch(/id="estimatedTime"/);
    });
  });

  describe('Agent Progress Card', () => {
    test('should have agent progress section', () => {
      expect(htmlContent).toMatch(/Agent Ausführung/);
    });

    test('should have agent progress list', () => {
      expect(htmlContent).toMatch(/id="agentProgressList"/);
    });

    test('should have agent count badge', () => {
      expect(htmlContent).toMatch(/id="agentCount"/);
    });
  });

  describe('Live Logs Card', () => {
    test('should have live logs section', () => {
      expect(htmlContent).toMatch(/Live Logs/);
    });

    test('should have log controls', () => {
      expect(htmlContent).toMatch(/id="pauseLogsBtn"/);
      expect(htmlContent).toMatch(/id="clearLogsBtn"/);
      expect(htmlContent).toMatch(/id="downloadLogsBtn"/);
    });

    test('should have log container', () => {
      expect(htmlContent).toMatch(/id="logContainer"/);
    });

    test('log controls should have correct labels', () => {
      expect(htmlContent).toMatch(/Pause/);
      expect(htmlContent).toMatch(/Clear/);
      expect(htmlContent).toMatch(/Download/);
    });
  });

  describe('Cost Tracking Card', () => {
    test('should have cost tracking section', () => {
      expect(htmlContent).toMatch(/Kosten/);
    });

    test('should have cost stats', () => {
      expect(htmlContent).toMatch(/id="totalTokens"/);
      expect(htmlContent).toMatch(/id="totalCost"/);
    });

    test('should have agent cost breakdown', () => {
      expect(htmlContent).toMatch(/id="agentCostList"/);
    });
  });

  describe('Actions Card', () => {
    test('should have actions card', () => {
      expect(htmlContent).toMatch(/id="actionsCard"/);
    });

    test('actions card should be hidden by default', () => {
      expect(htmlContent).toMatch(/actionsCard.*style="display: none;"/);
    });

    test('should have view results button', () => {
      expect(htmlContent).toMatch(/id="viewResultsBtn"/);
      expect(htmlContent).toMatch(/Ergebnisse anzeigen/);
    });

    test('should have back to dashboard button', () => {
      expect(htmlContent).toMatch(/id="backToDashboardBtn"/);
      expect(htmlContent).toMatch(/Zurück zum Dashboard/);
    });
  });

  describe('Error Modal', () => {
    test('should have error modal', () => {
      expect(htmlContent).toMatch(/id="errorModal"/);
    });

    test('error modal should be hidden by default', () => {
      expect(htmlContent).toMatch(/errorModal.*style="display: none;"/);
    });

    test('should have error message', () => {
      expect(htmlContent).toMatch(/id="errorMessage"/);
    });

    test('should have error ok button', () => {
      expect(htmlContent).toMatch(/id="errorOkBtn"/);
    });
  });

  describe('CSS Styles', () => {
    test('CSS file should exist', () => {
      const cssPath = path.join(__dirname, '../public/css/build-progress.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });

    test('CSS should contain progress-specific styles', () => {
      expect(cssContent).toMatch(/\.progress-container/);
      expect(cssContent).toMatch(/\.progress-header/);
      expect(cssContent).toMatch(/\.progress-main/);
    });

    test('CSS should have live indicator styles', () => {
      expect(cssContent).toMatch(/\.live-indicator/);
      expect(cssContent).toMatch(/\.pulse/);
      expect(cssContent).toMatch(/@keyframes pulse/);
    });

    test('CSS should have progress bar styles', () => {
      expect(cssContent).toMatch(/\.progress-bar-container/);
      expect(cssContent).toMatch(/\.progress-bar/);
      expect(cssContent).toMatch(/\.progress-fill/);
      expect(cssContent).toMatch(/@keyframes shimmer/);
    });

    test('CSS should have agent progress styles', () => {
      expect(cssContent).toMatch(/\.agent-progress-list/);
      expect(cssContent).toMatch(/\.agent-progress-item/);
      expect(cssContent).toMatch(/\.agent-progress-item\.completed/);
      expect(cssContent).toMatch(/\.agent-progress-item\.running/);
      expect(cssContent).toMatch(/\.agent-progress-item\.failed/);
    });

    test('CSS should have agent spinner animation', () => {
      expect(cssContent).toMatch(/\.agent-spinner/);
      expect(cssContent).toMatch(/@keyframes spin/);
    });

    test('CSS should have log container styles', () => {
      expect(cssContent).toMatch(/\.log-container/);
      expect(cssContent).toMatch(/\.log-entry/);
      expect(cssContent).toMatch(/\.log-timestamp/);
      expect(cssContent).toMatch(/\.log-level/);
      expect(cssContent).toMatch(/\.log-message/);
    });

    test('CSS should have log level variant styles', () => {
      expect(cssContent).toMatch(/\.log-level\.info/);
      expect(cssContent).toMatch(/\.log-level\.success/);
      expect(cssContent).toMatch(/\.log-level\.warning/);
      expect(cssContent).toMatch(/\.log-level\.error/);
    });

    test('CSS should have cost tracking styles', () => {
      expect(cssContent).toMatch(/\.cost-grid/);
      expect(cssContent).toMatch(/\.cost-stat/);
      expect(cssContent).toMatch(/\.cost-value/);
      expect(cssContent).toMatch(/\.agent-cost-breakdown/);
    });

    test('CSS should have modal styles', () => {
      expect(cssContent).toMatch(/\.modal/);
      expect(cssContent).toMatch(/\.modal-content/);
      expect(cssContent).toMatch(/\.modal-header\.error/);
    });

    test('CSS should have responsive styles', () => {
      expect(cssContent).toMatch(/@media.*max-width/);
    });
  });

  describe('JavaScript Functionality', () => {
    test('JS file should exist', () => {
      const jsPath = path.join(__dirname, '../public/js/build-progress.js');
      expect(fs.existsSync(jsPath)).toBe(true);
    });

    test('JS should import API', () => {
      expect(jsContent).toMatch(/import.*API.*from/);
    });

    test('JS should have state management', () => {
      expect(jsContent).toMatch(/let buildId/);
      expect(jsContent).toMatch(/let teamId/);
      expect(jsContent).toMatch(/let buildData/);
      expect(jsContent).toMatch(/let pollInterval/);
      expect(jsContent).toMatch(/let logsPaused/);
      expect(jsContent).toMatch(/let logs/);
    });

    test('JS should have polling constant', () => {
      expect(jsContent).toMatch(/POLL_INTERVAL_MS/);
    });

    test('JS should have agent sequence', () => {
      expect(jsContent).toMatch(/AGENT_SEQUENCE/);
      expect(jsContent).toMatch(/supervisor/);
      expect(jsContent).toMatch(/architect/);
      expect(jsContent).toMatch(/coach/);
      expect(jsContent).toMatch(/code/);
      expect(jsContent).toMatch(/review/);
      expect(jsContent).toMatch(/test/);
      expect(jsContent).toMatch(/docs/);
    });

    test('JS should have initialization', () => {
      expect(jsContent).toMatch(/DOMContentLoaded/);
      expect(jsContent).toMatch(/initializeEventListeners/);
      expect(jsContent).toMatch(/startPolling/);
    });

    test('JS should have polling functions', () => {
      expect(jsContent).toMatch(/startPolling/);
      expect(jsContent).toMatch(/stopPolling/);
      expect(jsContent).toMatch(/updateBuildStatus/);
    });

    test('JS should have completion handlers', () => {
      expect(jsContent).toMatch(/handleBuildComplete/);
      expect(jsContent).toMatch(/handleBuildFailed/);
    });

    test('JS should have update functions', () => {
      expect(jsContent).toMatch(/updateBuildInfo/);
      expect(jsContent).toMatch(/updateOverallProgress/);
      expect(jsContent).toMatch(/updateAgentProgress/);
      expect(jsContent).toMatch(/updateCostTracking/);
      expect(jsContent).toMatch(/updateLogs/);
    });

    test('JS should have log management functions', () => {
      expect(jsContent).toMatch(/addLog/);
      expect(jsContent).toMatch(/renderLogs/);
      expect(jsContent).toMatch(/toggleLogsPause/);
      expect(jsContent).toMatch(/clearLogs/);
      expect(jsContent).toMatch(/downloadLogs/);
    });

    test('JS should have helper functions', () => {
      expect(jsContent).toMatch(/formatDate/);
      expect(jsContent).toMatch(/formatDuration/);
      expect(jsContent).toMatch(/formatLogTime/);
      expect(jsContent).toMatch(/formatAgentName/);
      expect(jsContent).toMatch(/formatAgentStatus/);
      expect(jsContent).toMatch(/getAgentIcon/);
    });
  });

  describe('Integration', () => {
    test('should get build ID from URL parameter', () => {
      expect(jsContent).toMatch(/URLSearchParams/);
      expect(jsContent).toMatch(/params\.get\('id'\)/);
    });

    test('should redirect if no build ID', () => {
      expect(jsContent).toMatch(/window\.location\.href.*index\.html/);
    });

    test('should call API methods', () => {
      expect(jsContent).toMatch(/API\.getBuildStatus/);
    });

    test('should poll at regular intervals', () => {
      expect(jsContent).toMatch(/setInterval/);
      expect(jsContent).toMatch(/POLL_INTERVAL_MS/);
    });

    test('should stop polling on completion', () => {
      expect(jsContent).toMatch(/clearInterval/);
    });

    test('should handle different build statuses', () => {
      expect(jsContent).toMatch(/buildData\.status === 'completed'/);
      expect(jsContent).toMatch(/buildData\.status === 'failed'/);
    });

    test('should track different agent statuses', () => {
      expect(jsContent).toMatch(/'pending'/);
      expect(jsContent).toMatch(/'running'/);
      expect(jsContent).toMatch(/'completed'/);
      expect(jsContent).toMatch(/'failed'/);
    });
  });

  describe('Real-time Features', () => {
    test('should support log pausing', () => {
      expect(jsContent).toMatch(/logsPaused/);
      expect(jsContent).toMatch(/toggleLogsPause/);
    });

    test('should support log clearing', () => {
      expect(jsContent).toMatch(/clearLogs/);
      expect(jsContent).toMatch(/logs = \[\]/);
    });

    test('should support log downloading', () => {
      expect(jsContent).toMatch(/downloadLogs/);
      expect(jsContent).toMatch(/Blob/);
      expect(jsContent).toMatch(/build-.*-logs\.txt/);
    });

    test('should auto-scroll logs', () => {
      expect(jsContent).toMatch(/scrollTop/);
      expect(jsContent).toMatch(/scrollHeight/);
    });

    test('should calculate estimated time', () => {
      expect(jsContent).toMatch(/estimated/);
      expect(jsContent).toMatch(/remaining/);
    });

    test('should track total cost', () => {
      expect(jsContent).toMatch(/totalCost/);
      expect(jsContent).toMatch(/reduce/);
    });

    test('should track total tokens', () => {
      expect(jsContent).toMatch(/totalTokens/);
      expect(jsContent).toMatch(/tokensUsed/);
    });
  });
});
