/**
 * wdio.conf.js
 * WebDriverIO configuration for OrthoCare AI Mobile E2E tests (ES Module format).
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { startRun, recordTest, generateReport } from './utils/xlsxReporter.js';
import { generateHtmlReport } from './utils/generateHtmlReport.js';
import { generateSummary } from './utils/generateSummary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, '.wdio-results.jsonl');
const REPORTS_DIR = path.join(__dirname, 'reports');

export const config = {
  runner: 'local',
  
  specs: [
    process.env.WDIO_CI_SPEC || './tests/12_e2e/mega_android_1100.test.js',
  ],

  maxInstances: 1,
  
  capabilities: [
    {
      platformName: 'Android',
      'appium:deviceName': process.env.DEVICE_NAME || 'emulator-5554',
      'appium:app': process.env.APK_PATH || './android/app/build/outputs/apk/debug/app-debug.apk',
      'appium:automationName': 'UiAutomator2',
      'appium:newCommandTimeout': 240,
      'appium:noReset': false,
    },
  ],

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['appium'],
  port: 4723,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  reporters: ['spec'],

  // Hooks
  onPrepare: function () {
    console.log('📱 Initializing Mobile E2E Test Run...');
    startRun();

    if (fs.existsSync(RESULTS_FILE)) {
      fs.unlinkSync(RESULTS_FILE);
    }

    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
  },

  afterTest: function (test, context, { error, result, duration, passed, retries }) {
    const titleParts = test.title.split(':');
    const id = titleParts[0]?.trim() || 'UNKNOWN';
    const title = titleParts.slice(1).join(':').trim() || test.title;

    const parentMatch = test.parent?.match(/\[(.+?)\]/);
    const category = parentMatch ? parentMatch[1] : 'Unknown';

    const record = {
      id,
      title,
      category,
      passed: !!passed,
      duration: duration || 0,
      error: error ? error.message : '',
    };

    fs.appendFileSync(RESULTS_FILE, JSON.stringify(record) + '\n');
  },

  after: function (result, capabilities, specs) {
    if (result !== 0) {
      console.warn('⚠️ WDIO exited with non-zero result. Recording fallback error.');
      const fallbackRecord = {
        id: 'CRASH-001',
        title: 'Appium/WDIO Setup Failed',
        category: 'System',
        passed: false,
        duration: 0,
        error: 'Test runner encountered a fatal error.',
      };
      fs.appendFileSync(RESULTS_FILE, JSON.stringify(fallbackRecord) + '\n');
    }
  },

  onComplete: function () {
    console.log('📊 Generating reports...');

    let results = [];
    if (fs.existsSync(RESULTS_FILE)) {
      const lines = fs.readFileSync(RESULTS_FILE, 'utf-8').trim().split('\n');
      results = lines.filter(Boolean).map((line) => JSON.parse(line));
    }

    if (results.length === 0) {
      console.warn('No test results found. Skipping report generation.');
      return;
    }

    results.forEach((r) => recordTest(r));

    const excelPath = path.join(REPORTS_DIR, 'appium-report.xlsx');
    generateReport(excelPath)
      .then(() => {
        const htmlPath = path.join(REPORTS_DIR, 'execution-report.html');
        generateHtmlReport(results, htmlPath);

        generateSummary(results, process.env.GITHUB_RUN_NUMBER || 'local');

        console.log('✅ All reports generated successfully!');
      })
      .catch((err) => {
        console.error('Report generation failed:', err);
      });
  },
};
