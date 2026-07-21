/**
 * generateHtmlReport.js
 * Generates a styled dark-themed HTML execution report for mobile E2E tests (ES Module format).
 */
import fs from 'fs';

export function generateHtmlReport(results, outputPath) {
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

  const catRows = Object.entries(categories)
    .map(
      ([cat, s]) => `
      <tr>
        <td>${cat}</td>
        <td>${s.total}</td>
        <td class="pass">${s.passed}</td>
        <td class="fail">${s.failed}</td>
        <td>${((s.passed / s.total) * 100).toFixed(1)}%</td>
      </tr>`
    )
    .join('');

  const testRows = results
    .map(
      (r, i) => `
      <tr class="${r.passed ? 'row-pass' : 'row-fail'}">
        <td>${i + 1}</td>
        <td>${r.id}</td>
        <td>${r.category}</td>
        <td>${r.title}</td>
        <td class="${r.passed ? 'pass' : 'fail'}">${r.passed ? '✅ PASS' : '❌ FAIL'}</td>
        <td>${r.duration}ms</td>
        <td>${r.error || ''}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OrthoCare AI — Mobile E2E Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0a0a1a; color: #e0e0e0; padding: 2rem; }
    h1 { text-align: center; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { text-align: center; color: #888; margin-bottom: 2rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; text-align: center; }
    .card .value { font-size: 2rem; font-weight: bold; }
    .card .label { font-size: 0.85rem; color: #888; margin-top: 0.5rem; }
    .pass { color: #10b981; } .fail { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { background: #16213e; color: #fff; padding: 0.75rem; text-align: left; position: sticky; top: 0; }
    td { padding: 0.6rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .row-pass:hover { background: rgba(16,185,129,0.05); } .row-fail { background: rgba(239,68,68,0.05); } .row-fail:hover { background: rgba(239,68,68,0.1); }
    .section-title { font-size: 1.3rem; margin: 1.5rem 0 1rem; color: #667eea; }
    .search-box { width: 100%; padding: 0.75rem 1rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.05); color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>📱 OrthoCare AI — Mobile E2E Execution Report</h1>
  <p class="subtitle">1,111 Appium Tests · ${new Date().toISOString()}</p>

  <div class="cards">
    <div class="card"><div class="value">${totalTests}</div><div class="label">Total Tests</div></div>
    <div class="card"><div class="value pass">${passed}</div><div class="label">Passed</div></div>
    <div class="card"><div class="value fail">${failed}</div><div class="label">Failed</div></div>
    <div class="card"><div class="value">${passRate}%</div><div class="label">Pass Rate</div></div>
    <div class="card"><div class="value">${(totalDuration / 1000).toFixed(2)}s</div><div class="label">Duration</div></div>
  </div>

  <h2 class="section-title">📊 Results by Category</h2>
  <table>
    <thead><tr><th>Category</th><th>Total</th><th>Passed</th><th>Failed</th><th>Pass Rate</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>

  <h2 class="section-title">📝 All Test Cases</h2>
  <input type="text" class="search-box" placeholder="🔍 Filter tests..." onkeyup="filterTests(this.value)" />
  <table id="testTable">
    <thead><tr><th>#</th><th>ID</th><th>Category</th><th>Title</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
    <tbody>${testRows}</tbody>
  </table>

  <script>
    function filterTests(q) {
      const rows = document.querySelectorAll('#testTable tbody tr');
      rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`HTML report generated: ${outputPath}`);
}
