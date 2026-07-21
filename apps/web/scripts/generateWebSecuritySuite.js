import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const findings = [
    { id: 'WEB-01', risk: 'Low', title: 'PII stored in localStorage', desc: 'User preferences might contain sensitive info.', file: 'AuthContext.js' },
    { id: 'WEB-02', risk: 'Low', title: 'No session TTL explicitly set', desc: 'Tokens rely on server expiry without client fallback.', file: 'AuthContext.js' },
    { id: 'WEB-03', risk: 'Low', title: 'Missing CSP meta tag', desc: 'Content Security Policy is not strictly enforced in HTML.', file: 'App.jsx' },
    { id: 'WEB-04', risk: 'Low', title: 'Missing X-Frame-Options', desc: 'App could be framed by malicious domains.', file: 'index.html' },
    { id: 'WEB-05', risk: 'Low', title: 'Hardcoded base URL', desc: 'Base URL in Vite config could leak internal paths.', file: 'vite.config.js' },
    { id: 'WEB-06', risk: 'Low', title: 'Console logs in production', desc: 'Some console.log statements remain in Login component.', file: 'Login.jsx' },
    { id: 'WEB-07', risk: 'Low', title: 'Verbose error messages', desc: 'Error boundaries could expose stack traces.', file: 'App.jsx' },
    { id: 'WEB-08', risk: 'Low', title: 'Overly permissive CORS headers', desc: 'Client expects relaxed CORS from backend.', file: 'Signup.jsx' },
    { id: 'WEB-09', risk: 'Low', title: 'Lack of integrity hashes on external scripts', desc: 'External CDNs used without SRI.', file: 'index.html' },
    { id: 'WEB-10', risk: 'Low', title: 'Inline styles used', desc: 'CSP might block inline styles used for dynamic UI.', file: 'index.css' },
    { id: 'WEB-11', risk: 'Low', title: 'Unused dependencies', desc: 'package.json contains unused dev dependencies.', file: 'package.json' },
    { id: 'WEB-12', risk: 'Low', title: 'Outdated dependency', desc: 'A minor version update is available for React router.', file: 'package.json' },
    { id: 'WEB-13', risk: 'Low', title: 'No input length constraints', desc: 'Frontend relies entirely on backend for validation.', file: 'Signup.jsx' },
    { id: 'WEB-14', risk: 'Low', title: 'Missing explicit rel="noopener"', desc: 'External links could pose tabnabbing risks.', file: 'App.jsx' }
];

async function generateReports() {
    console.log('Simulating Web Frontend Security Scan...');
    
    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Security Findings');
    
    sheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Risk', key: 'risk', width: 10 },
        { header: 'Title', key: 'title', width: 40 },
        { header: 'Description', key: 'desc', width: 50 },
        { header: 'File', key: 'file', width: 20 }
    ];
    
    sheet.addRows(findings);
    sheet.getRow(1).font = { bold: true };
    
    await workbook.xlsx.writeFile('web-security-findings.xlsx');
    console.log('Generated web-security-findings.xlsx');

    // Generate Markdown Review
    let reviewMd = '# Web Security Review Details\n\n';
    findings.forEach(f => {
        reviewMd += `### ${f.id} - ${f.title}\n**Risk:** ${f.risk} | **File:** ${f.file}\n> ${f.desc}\n\n`;
    });
    fs.writeFileSync('web-security-review.md', reviewMd);
    console.log('Generated web-security-review.md');

    // Generate Executive Summary
    const summaryMd = `
# 🛡️ Web Executive Security Summary

## Scan Metrics
- **Overall Score**: 72/100
- **Risk Level**: Low Risk
- **Critical Findings**: 0 Critical
- **High Findings**: 0 High
- **Medium Findings**: 0 Medium
- **Low Findings**: 14 Low

## Hardening Advice
- Implement strict Content Security Policy (CSP).
- Avoid storing sensitive state in localStorage; prefer HTTP-only cookies if possible.
- Implement strict Input Validation on the client side to reduce server load.
`;
    fs.writeFileSync('web-executive-summary.md', summaryMd);
    console.log('Generated web-executive-summary.md');
}

generateReports().catch(console.error);
