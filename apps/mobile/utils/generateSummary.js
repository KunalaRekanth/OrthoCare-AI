/**
 * generateSummary.js
 * Appends summary statistics directly to GHA step summaries (ES Module format).
 */
import fs from 'fs';
import path from 'path';

export function generateSummary(results, buildNumber) {
  const totalTests = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = totalTests - passed;
  const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(2) : '0.00';
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  const categories = {};
  results.forEach((r) => {
    if (!categories[r.category]) categories[r.category] = { passed: 0, failed: 0, total: 0 };
    categories[r.category].total++;
    if (r.passed) categories[r.category].passed++;
    else categories[r.category].failed++;
  });

  const catTable = Object.entries(categories)
    .map(
      ([cat, s]) =>
        `| ${cat} | ${s.total} | ${s.passed} | ${s.failed} | ${((s.passed / s.total) * 100).toFixed(1)}% |`
    )
    .join('\n');

  const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || 'KunalaRekanth';
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'OrthoCare-AI';
  const runNum = buildNumber || '1';
  const pagesUrl = `https://${repoOwner}.github.io/${repoName}`;

  const summary = `# 📱 Mobile E2E Test Execution Summary (Build #${runNum})

| Metric | Value | Status |
| :--- | :---: | :---: |
| **Total Tests** | ${totalTests} | 📋 |
| **Passed** | ${passed} | ✅ |
| **Failed** | ${failed} | ${failed > 0 ? '❌' : '➖'} |
| **Pass Rate** | **${passRate}%** | ${failed === 0 ? '🏆' : '⚠️'} |
| **Duration** | ${(totalDuration / 1000).toFixed(2)}s | ⏱️ |

## 📊 Results by Category

| Category | Total | Passed | Failed | Pass Rate |
| :--- | :---: | :---: | :---: | :---: |
${catTable}

## 🌐 Native GitHub Pages Deployment
The Mobile Appium E2E test report bundle has been published directly to GitHub Pages:
- 📊 **[Live Latest HTML Execution Report](${pagesUrl}/reports/mobile/execution-report.html)**
- 📁 **[Live Build-Specific Execution Report](${pagesUrl}/reports/mobile/history/build-${runNum}/execution-report.html)**
- 📥 **[Download Latest Excel Report (xlsx)](${pagesUrl}/reports/mobile/appium-report.xlsx)**
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log('Summary appended to GITHUB_STEP_SUMMARY.');
  }

  const localPath = path.join(process.cwd(), 'mobile-test-summary.md');
  fs.writeFileSync(localPath, summary);
  console.log(`Summary written to ${localPath}`);

  return summary;
}
