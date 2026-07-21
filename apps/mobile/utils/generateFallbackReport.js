/**
 * generateFallbackReport.js
 * Creates a failure report Excel file when WDIO/Appium crashes (ES Module format).
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateFallbackReport() {
  const outputDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'appium-report.xlsx');

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  summarySheet.addRows([
    { metric: 'Status', value: 'FAILED — Appium/WDIO crashed before tests ran' },
    { metric: 'Total Tests', value: 0 },
    { metric: 'Passed', value: 0 },
    { metric: 'Failed', value: 0 },
    { metric: 'Pass Rate', value: '0.00%' },
    { metric: 'Error', value: 'Appium server or emulator connection failed. Check CI logs.' },
    { metric: 'Timestamp', value: new Date().toISOString() },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const catSheet = workbook.addWorksheet('By Category');
  catSheet.columns = [
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Passed', key: 'passed', width: 10 },
    { header: 'Failed', key: 'failed', width: 10 },
  ];
  catSheet.getRow(1).font = { bold: true };

  const testSheet = workbook.addWorksheet('Test Cases');
  testSheet.columns = [
    { header: '#', key: 'num', width: 6 },
    { header: 'ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Title', key: 'title', width: 55 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Error', key: 'error', width: 50 },
  ];
  testSheet.addRow({
    num: 1,
    id: 'CRASH-001',
    category: 'System',
    title: 'Appium/WDIO Setup Failed',
    status: 'FAIL',
    error: 'Test runner crashed before any test specs executed.',
  });
  testSheet.getRow(1).font = { bold: true };

  await workbook.xlsx.writeFile(outputPath);
  console.log(`Fallback report generated: ${outputPath}`);

  const htmlPath = path.join(outputDir, 'execution-report.html');
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Mobile E2E — FAILED</title>
<style>body{font-family:system-ui;background:#0a0a1a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;}
.box{background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:16px;padding:3rem;text-align:center;max-width:500px;}
h1{color:#ef4444;margin-bottom:1rem;}p{color:#888;}</style></head>
<body><div class="box"><h1>❌ Appium E2E Failed</h1><p>The Appium server or emulator connection failed before tests could run. Check the CI logs for details.</p><p style="margin-top:1rem;font-size:0.8rem;">Generated: ${new Date().toISOString()}</p></div></body></html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`Fallback HTML report generated: ${htmlPath}`);
}

generateFallbackReport().catch((err) => {
  console.error('Fallback report generation failed:', err);
  process.exit(1);
});
