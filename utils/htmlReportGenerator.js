const fs = require('fs');
const path = require('path');

function generateHtmlReport(results, stats) {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.join(process.cwd(), 'Test_Results', 'HTML');
      fs.mkdirSync(outputDir, { recursive: true });

      const outputPath = path.join(outputDir, 'execution-report.html');
      
      const reportDate = new Date().toLocaleString();
      const passPercentage = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : '0.00';

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OrthoCare AI - Web E2E Test Execution Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0f172a;
      --bg-surface: #1e293b;
      --bg-panel: rgba(30, 41, 59, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      
      --color-pass: #10b981;
      --color-pass-bg: rgba(16, 185, 129, 0.1);
      --color-fail: #ef4444;
      --color-fail-bg: rgba(239, 68, 68, 0.1);
      --color-info: #3b82f6;
      --color-warn: #f59e0b;
      
      --glow-pass: 0 0 15px rgba(16, 185, 129, 0.35);
      --glow-fail: 0 0 15px rgba(239, 68, 68, 0.35);
      
      --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      --font-primary: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-primary);
      line-height: 1.5;
      padding: 2rem 1rem;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header styling */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      box-shadow: var(--glass-shadow);
    }

    .brand h1 {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.2rem;
    }

    .brand p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .meta-info {
      text-align: right;
    }

    .timestamp {
      font-family: var(--font-mono);
      color: #60a5fa;
      font-size: 0.9rem;
      background: rgba(96, 165, 250, 0.1);
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      border: 1px solid rgba(96, 165, 250, 0.2);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--glass-shadow);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--color-info);
    }

    .stat-card.passed::before { background: var(--color-pass); }
    .stat-card.failed::before { background: var(--color-fail); }
    .stat-card.pass-rate::before { background: var(--color-warn); }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2.2rem;
      font-weight: 700;
    }

    .stat-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.3rem;
    }

    /* Dashboard Layout */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1024px) {
      .dashboard-layout {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--glass-shadow);
    }

    .card h2 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.5rem;
      color: #cbd5e1;
    }

    /* SVG Chart */
    .chart-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 250px;
      position: relative;
    }

    .donut-chart {
      transform: rotate(-90deg);
    }

    .donut-circle-bg {
      fill: none;
      stroke: #334155;
      stroke-width: 20;
    }

    .donut-circle-pass {
      fill: none;
      stroke: var(--color-pass);
      stroke-width: 20;
      transition: stroke-dasharray 0.5s ease-in-out;
    }

    .donut-circle-fail {
      fill: none;
      stroke: var(--color-fail);
      stroke-width: 20;
      transition: stroke-dasharray 0.5s ease-in-out;
    }

    .chart-label {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .chart-label-val {
      font-size: 2rem;
      font-weight: 700;
    }

    .chart-label-lbl {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .legend {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      margin-right: 0.5rem;
    }

    /* Category bar charts */
    .bars-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      height: 250px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .bar-row {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
    }

    .bar-label {
      width: 110px;
      font-weight: 500;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bar-track {
      flex: 1;
      height: 12px;
      background: #334155;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      margin: 0 1rem;
    }

    .bar-fill {
      height: 100%;
      border-radius: 6px;
    }

    .bar-fill-pass {
      background: var(--color-pass);
    }

    .bar-fill-fail {
      background: var(--color-fail);
      float: right;
    }

    .bar-value {
      width: 60px;
      text-align: right;
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }

    /* Controls Panel */
    .controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 2rem;
      background: var(--bg-panel);
      padding: 1.2rem;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      background: #0f172a;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-family: var(--font-primary);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.3s;
    }

    .search-input:focus {
      border-color: #60a5fa;
    }

    .filter-group {
      display: flex;
      gap: 0.5rem;
    }

    .filter-btn {
      background: #334155;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      font-family: var(--font-primary);
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: #475569;
      color: var(--text-main);
    }

    .filter-btn.active {
      background: var(--color-info);
      color: white;
    }

    .filter-btn.active.pass-filter {
      background: var(--color-pass);
      box-shadow: var(--glow-pass);
    }

    .filter-btn.active.fail-filter {
      background: var(--color-fail);
      box-shadow: var(--glow-fail);
    }

    .select-dropdown {
      background: #334155;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-family: var(--font-primary);
      font-size: 0.9rem;
      cursor: pointer;
      outline: none;
    }

    /* Test Cases Accordion */
    .accordion-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .category-group {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--glass-shadow);
      transition: border-color 0.3s;
    }

    .category-group.has-fail {
      border-color: rgba(239, 68, 68, 0.25);
    }

    .category-header {
      background: rgba(30, 41, 59, 0.4);
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }

    .category-header:hover {
      background: rgba(30, 41, 59, 0.7);
    }

    .category-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
    }

    .category-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
    }

    .category-badge.badge-pass {
      background: var(--color-pass-bg);
      color: var(--color-pass);
    }

    .category-badge.badge-fail {
      background: var(--color-fail-bg);
      color: var(--color-fail);
      animation: pulse-fail 2s infinite;
    }

    @keyframes pulse-fail {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    .category-body {
      display: none;
      padding: 0 1.5rem 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      background: rgba(15, 23, 42, 0.3);
    }

    .category-body.expanded {
      display: block;
    }

    .test-case-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.8rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .test-case-row:last-child {
      border-bottom: none;
    }

    .tc-details {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .tc-badge-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .tc-badge-status.pass {
      background: var(--color-pass-bg);
      color: var(--color-pass);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .tc-badge-status.fail {
      background: var(--color-fail-bg);
      color: var(--color-fail);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .tc-name {
      font-weight: 400;
      font-size: 0.95rem;
    }

    .tc-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .tc-duration {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .tc-expand-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      transition: all 0.2s;
    }

    .tc-expand-btn:hover {
      background: var(--bg-surface);
      color: var(--text-main);
    }

    /* Error Details Panel */
    .error-panel {
      display: none;
      grid-column: 1 / -1;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.5rem;
      width: 100%;
    }

    .error-panel.visible {
      display: block;
    }

    .error-message {
      font-weight: 600;
      color: #fca5a5;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .error-stack {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: #fda4af;
      white-space: pre-wrap;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.8rem;
      border-radius: 6px;
      border-left: 3px solid var(--color-fail);
      overflow-x: auto;
      max-height: 250px;
    }

    /* No results message */
    .no-results {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
      font-size: 1.1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1>OrthoCare AI</h1>
        <p>Web E2E Testing Automation Report (1,100 Assertions)</p>
      </div>
      <div class="meta-info">
        <div class="timestamp">Executed: ${reportDate}</div>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Test Cases</div>
        <div class="stat-value" id="stats-total">${stats.total}</div>
        <div class="stat-subtext">Across 110 categories</div>
      </div>
      <div class="stat-card passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value" id="stats-passed" style="color: var(--color-pass); text-shadow: var(--glow-pass);">${stats.passed}</div>
        <div class="stat-subtext">Programmatic & Selenium checks</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value" id="stats-failed" style="color: var(--color-fail); text-shadow: ${stats.failed > 0 ? 'var(--glow-fail)' : 'none'};">${stats.failed}</div>
        <div class="stat-subtext">Errors & assertion failures</div>
      </div>
      <div class="stat-card pass-rate">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value" id="stats-rate" style="color: var(--color-warn);">${passPercentage}%</div>
        <div class="stat-subtext">Target: 100.00%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Duration</div>
        <div class="stat-value" id="stats-duration" style="color: #60a5fa;">${(stats.duration / 1000).toFixed(2)}s</div>
        <div class="stat-subtext">Avg: ${(stats.duration / stats.total).toFixed(1)}ms / test</div>
      </div>
    </div>

    <div class="dashboard-layout">
      <!-- Donut Chart Card -->
      <div class="card">
        <h2>Overall Success Rate</h2>
        <div class="chart-container">
          <svg class="donut-chart" width="220" height="220" viewBox="0 0 220 220">
            <circle class="donut-circle-bg" cx="110" cy="110" r="80"></circle>
            <circle class="donut-circle-pass" cx="110" cy="110" r="80" id="chart-pass-circle"></circle>
            <circle class="donut-circle-fail" cx="110" cy="110" r="80" id="chart-fail-circle"></circle>
          </svg>
          <div class="chart-label">
            <span class="chart-label-val">${passPercentage}%</span>
            <span class="chart-label-lbl">Passed</span>
          </div>
        </div>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-color" style="background: var(--color-pass);"></div>
            <span>Passed (${stats.passed})</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: var(--color-fail);"></div>
            <span>Failed (${stats.failed})</span>
          </div>
        </div>
      </div>

      <!-- Categories Performance Card -->
      <div class="card">
        <h2>Testing Type Breakdown</h2>
        <div class="bars-container" id="bars-container">
          <!-- Dynamically populated via JS -->
        </div>
      </div>
    </div>

    <!-- Interactive Filters -->
    <div class="controls">
      <input type="text" class="search-input" id="search-input" placeholder="Search test cases, categories, or keywords...">
      <div class="filter-group">
        <button class="filter-btn active" id="btn-filter-all" onclick="setFilter('all')">All Tests</button>
        <button class="filter-btn" id="btn-filter-pass" onclick="setFilter('pass')">Passed</button>
        <button class="filter-btn" id="btn-filter-fail" onclick="setFilter('fail')">Failed</button>
      </div>
      <select class="select-dropdown" id="type-select" onchange="handleTypeFilter(this.value)">
        <option value="all">All Types</option>
        <option value="Functional">Functional</option>
        <option value="UI/UX">UI/UX</option>
        <option value="Compatibility">Compatibility</option>
        <option value="Performance">Performance</option>
        <option value="Security">Security</option>
        <option value="API">API</option>
        <option value="Database">Database</option>
        <option value="Accessibility">Accessibility</option>
        <option value="Mobile">Mobile</option>
        <option value="Regression">Regression</option>
        <option value="End-to-End">End-to-End</option>
      </select>
    </div>

    <!-- Test List -->
    <div class="accordion-list" id="accordion-list">
      <!-- Populated via JS -->
    </div>
  </div>

  <script>
    // Injected test results
    const results = ${JSON.stringify(results)};
    const stats = ${JSON.stringify(stats)};

    // State
    let currentFilter = 'all'; // all, pass, fail
    let currentSearch = '';
    let currentTypeFilter = 'all';

    // Grouping helper
    const getCoreType = (cat) => {
      if (cat.includes('Functional')) return 'Functional';
      if (cat.includes('UI/UX')) return 'UI/UX';
      if (cat.includes('Compatibility')) return 'Compatibility';
      if (cat.includes('Performance')) return 'Performance';
      if (cat.includes('Security')) return 'Security';
      if (cat.includes('API')) return 'API';
      if (cat.includes('Database')) return 'Database';
      if (cat.includes('Accessibility')) return 'Accessibility';
      if (cat.includes('Mobile')) return 'Mobile';
      if (cat.includes('Regression')) return 'Regression';
      if (cat.includes('End-to-End')) return 'End-to-End';
      return 'Other';
    };

    // Calculate chart stroke-dasharrays
    function initCharts() {
      const radius = 80;
      const circumference = 2 * Math.PI * radius;
      
      const passRatio = stats.passed / stats.total;
      const failRatio = stats.failed / stats.total;

      const passStroke = circumference * passRatio;
      const failStroke = circumference * failRatio;

      const passCircle = document.getElementById('chart-pass-circle');
      const failCircle = document.getElementById('chart-fail-circle');

      passCircle.style.strokeDasharray = \`\${passStroke} \${circumference}\`;
      
      failCircle.style.strokeDasharray = \`\${failStroke} \${circumference}\`;
      failCircle.style.strokeDashoffset = \`-\${passStroke}\`;

      // Render category horizontal bar charts
      const typesMap = {};
      results.forEach(res => {
        const type = getCoreType(res.parent);
        if (!typesMap[type]) {
          typesMap[type] = { total: 0, passed: 0, failed: 0 };
        }
        typesMap[type].total++;
        if (res.status === 'Pass') typesMap[type].passed++;
        else typesMap[type].failed++;
      });

      const barsContainer = document.getElementById('bars-container');
      barsContainer.innerHTML = '';

      Object.keys(typesMap).forEach(type => {
        const data = typesMap[type];
        const passPercent = ((data.passed / data.total) * 100).toFixed(0);
        
        const row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML = \`
          <div class="bar-label" title="\${type}">\${type}</div>
          <div class="bar-track">
            <div class="bar-fill bar-fill-pass" style="width: \${passPercent}%"></div>
          </div>
          <div class="bar-value">\${data.passed}/\${data.total} (\${passPercent}%)</div>
        \`;
        barsContainer.appendChild(row);
      });
    }

    // Toggle categories list expansion
    function toggleCategory(catId) {
      const body = document.getElementById(\`body-\${catId}\`);
      if (body) {
        body.classList.toggle('expanded');
      }
    }

    // Toggle error message visibility
    function toggleError(tcId) {
      const panel = document.getElementById(\`error-\${tcId}\`);
      if (panel) {
        panel.classList.toggle('visible');
      }
    }

    // Set Status filter
    function setFilter(filter) {
      currentFilter = filter;
      
      // Update active button state
      document.getElementById('btn-filter-all').className = 'filter-btn' + (filter === 'all' ? ' active' : '');
      document.getElementById('btn-filter-pass').className = 'filter-btn' + (filter === 'pass' ? ' active pass-filter' : '');
      document.getElementById('btn-filter-fail').className = 'filter-btn' + (filter === 'fail' ? ' active fail-filter' : '');
      
      renderTestCases();
    }

    // Handle search
    document.getElementById('search-input').addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderTestCases();
    });

    // Handle core type selection
    function handleTypeFilter(value) {
      currentTypeFilter = value;
      renderTestCases();
    }

    // Render test cases according to search & filter criteria
    function renderTestCases() {
      const listContainer = document.getElementById('accordion-list');
      listContainer.innerHTML = '';

      // Group test cases by category
      const categoriesMap = {};
      
      results.forEach((res, index) => {
        const coreType = getCoreType(res.parent);
        
        // Apply status filters
        if (currentFilter === 'pass' && res.status !== 'Pass') return;
        if (currentFilter === 'fail' && res.status !== 'Fail') return;

        // Apply type filters
        if (currentTypeFilter !== 'all' && coreType !== currentTypeFilter) return;

        // Apply search query
        const matchesSearch = res.name.toLowerCase().includes(currentSearch) || 
                              res.parent.toLowerCase().includes(currentSearch);
        if (currentSearch && !matchesSearch) return;

        if (!categoriesMap[res.parent]) {
          categoriesMap[res.parent] = {
            name: res.parent,
            cases: [],
            passed: 0,
            failed: 0
          };
        }
        
        categoriesMap[res.parent].cases.push({ ...res, index });
        if (res.status === 'Pass') categoriesMap[res.parent].passed++;
        else categoriesMap[res.parent].failed++;
      });

      const matchedCategories = Object.values(categoriesMap);
      if (matchedCategories.length === 0) {
        listContainer.innerHTML = '<div class="no-results">No test cases match the active filter criteria.</div>';
        return;
      }

      matchedCategories.forEach((cat, catIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'category-group' + (cat.failed > 0 ? ' has-fail' : '');
        
        const catId = \`cat-\${catIdx}\`;
        const badgeClass = cat.failed > 0 ? 'badge-fail' : 'badge-pass';
        const badgeLabel = cat.failed > 0 ? \`\${cat.failed} Failed\` : 'All Passed';
        
        // Auto-expand categories if we are viewing failures or performing a search
        const isAutoExpanded = currentFilter === 'fail' || currentSearch.length > 0;

        groupEl.innerHTML = \`
          <div class="category-header" onclick="toggleCategory('\${catId}')">
            <div class="category-title">
              <span class="category-name">\${cat.name}</span>
              <span class="category-badge">\${cat.cases.length} Tests</span>
            </div>
            <span class="category-badge \${badgeClass}">\${badgeLabel}</span>
          </div>
          <div class="category-body \${isAutoExpanded ? 'expanded' : ''}" id="body-\${catId}">
            <div class="category-rows-container"></div>
          </div>
        \`;

        const rowsContainer = groupEl.querySelector('.category-rows-container');

        cat.cases.forEach((tc) => {
          const rowEl = document.createElement('div');
          rowEl.style.display = 'grid';
          rowEl.style.gridTemplateColumns = '1fr auto';
          rowEl.style.alignItems = 'center';
          rowEl.style.gap = '0.5rem';
          rowEl.style.padding = '0.6rem 0';
          rowEl.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';

          const statusIcon = tc.status === 'Pass' ? '✓' : '✗';
          const isFailed = tc.status === 'Fail';

          rowEl.innerHTML = \`
            <div class="tc-details">
              <span class="tc-badge-status \${tc.status.toLowerCase()}">\${statusIcon}</span>
              <span class="tc-name" style="\${isFailed ? 'color: #fca5a5;' : ''}">\${tc.name}</span>
            </div>
            <div class="tc-meta">
              <span class="tc-duration">\${tc.duration}ms</span>
              \${isFailed ? \`<button class="tc-expand-btn" onclick="event.stopPropagation(); toggleError('\${tc.index}')">View Error</button>\` : ''}
            </div>
            \${isFailed ? \`
              <div class="error-panel" id="error-\${tc.index}">
                <div class="error-message">Error: \${tc.error ? tc.error.message : 'Unknown assertion failure'}</div>
                <pre class="error-stack">\${tc.error ? tc.error.stack : 'No stacktrace available'}</pre>
              </div>
            \` : ''}
          \`;
          rowsContainer.appendChild(rowEl);
        });

        listContainer.appendChild(groupEl);
      });
    }

    // Init everything on load
    window.onload = function() {
      initCharts();
      renderTestCases();
    };
  </script>
</body>
</html>`;

      fs.writeFileSync(outputPath, htmlContent, 'utf8');
      fs.writeFileSync(path.join(outputDir, 'stats.json'), JSON.stringify(stats, null, 2), 'utf8');
      resolve(outputPath);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateHtmlReport;
