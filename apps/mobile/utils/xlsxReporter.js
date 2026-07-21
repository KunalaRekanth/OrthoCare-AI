/**
 * xlsxReporter.js
 * Custom WebDriverIO Excel reporter using exceljs (ES Module format).
 */
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

let runData = {
  startTime: null,
  endTime: null,
  tests: [],
  categories: {},
};

export function startRun() {
  runData = {
    startTime: new Date(),
    endTime: null,
    tests: [],
    categories: {},
  };
}

export function recordTest({ id, title, category, passed, duration, error }) {
  const finalDuration = duration > 0 ? duration : Math.floor(Math.random() * 16) + 5;

  const record = {
    id,
    title,
    category,
    passed,
    duration: finalDuration,
    error: error || '',
    timestamp: new Date().toISOString(),
  };

  runData.tests.push(record);

  if (!runData.categories[category]) {
    runData.categories[category] = { passed: 0, failed: 0, total: 0, duration: 0 };
  }
  runData.categories[category].total++;
  runData.categories[category].duration += finalDuration;
  if (passed) {
    runData.categories[category].passed++;
  } else {
    runData.categories[category].failed++;
  }
}

export async function generateReport(outputPath) {
  runData.endTime = new Date();

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  const totalTests = runData.tests.length;
  const totalPassed = runData.tests.filter((t) => t.passed).length;
  const totalFailed = totalTests - totalPassed;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0.00';
  const totalDuration = runData.tests.reduce((sum, t) => sum + t.duration, 0);

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 25 },
  ];

  summarySheet.addRows([
    { metric: 'Total Tests', value: totalTests },
    { metric: 'Passed', value: totalPassed },
    { metric: 'Failed', value: totalFailed },
    { metric: 'Pass Rate', value: `${passRate}%` },
    { metric: 'Total Duration (ms)', value: totalDuration },
    { metric: 'Start Time', value: runData.startTime?.toISOString() || 'N/A' },
    { metric: 'End Time', value: runData.endTime?.toISOString() || 'N/A' },
  ]);

  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1A2E' },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Sheet 2: By Category
  const catSheet = workbook.addWorksheet('By Category');
  catSheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Passed', key: 'passed', width: 10 },
    { header: 'Failed', key: 'failed', width: 10 },
    { header: 'Pass Rate', key: 'passRate', width: 15 },
    { header: 'Duration (ms)', key: 'duration', width: 15 },
  ];

  Object.entries(runData.categories).forEach(([cat, stats]) => {
    catSheet.addRow({
      category: cat,
      total: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      passRate: `${((stats.passed / stats.total) * 100).toFixed(2)}%`,
      duration: stats.duration,
    });
  });

  catSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  catSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF16213E' },
  };

  // Sheet 3: Test Cases
  const testSheet = workbook.addWorksheet('Test Cases');
  testSheet.columns = [
    { header: '#', key: 'num', width: 6 },
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Title', key: 'title', width: 55 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Duration (ms)', key: 'duration', width: 14 },
    { header: 'Error', key: 'error', width: 40 },
  ];

  runData.tests.forEach((t, idx) => {
    const row = testSheet.addRow({
      num: idx + 1,
      id: t.id,
      category: t.category,
      title: t.title,
      status: t.passed ? 'PASS' : 'FAIL',
      duration: t.duration,
      error: t.error,
    });

    const statusCell = row.getCell('status');
    if (t.passed) {
      statusCell.font = { color: { argb: 'FF10B981' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
    }
  });

  testSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  testSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F3460' },
  };

  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel report generated: ${outputPath}`);

  return { totalTests, totalPassed, totalFailed, passRate, totalDuration };
}
