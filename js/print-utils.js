// ========== PRINT UTILITIES ==========
// Professional letterhead-style print template for all reports

function getPrintStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', system-ui, sans-serif; color: #222; margin: 0; padding: 0; font-size: 12px; }

    /* ===== HEADER / LETTERHEAD ===== */
    .report-header {
      background: linear-gradient(135deg, #f9a825 0%, #ff8f00 100%);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      color: #fff;
    }
    .report-header .logo {
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      background: rgba(255,255,255,0.2);
      width: 56px; height: 56px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .report-header .lab-info { flex: 1; }
    .report-header .lab-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .report-header .lab-tagline {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 2px;
    }
    .report-header .lab-contact {
      text-align: right;
      font-size: 10px;
      line-height: 1.6;
      opacity: 0.9;
    }

    /* ===== REPORT TITLE BAR ===== */
    .report-title-bar {
      background: #fff8e1;
      border-bottom: 2px solid #f9a825;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .report-title-bar .report-type {
      font-size: 15px;
      font-weight: 700;
      color: #e65100;
    }
    .report-title-bar .report-meta {
      font-size: 11px;
      color: #555;
      text-align: right;
      line-height: 1.5;
    }

    /* ===== CONTENT ===== */
    .content-area {
      padding: 16px 24px 20px;
    }

    /* ===== FOOTER ===== */
    .report-footer {
      background: linear-gradient(135deg, #f9a825 0%, #ff8f00 100%);
      padding: 8px 24px;
      text-align: center;
      font-size: 10px;
      color: #fff;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }
    .report-footer-spacer { height: 50px; }

    /* ===== TABLES ===== */
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th, td { padding: 5px 8px; border: 1px solid #ccc; text-align: left; }
    th { background: #fff8e1; font-weight: 600; color: #e65100; font-size: 10px; text-transform: uppercase; }
    tr:nth-child(even) { background: #fafafa; }

    /* ===== STAT CARDS (for revenue sections) ===== */
    .stat-grid, .stats-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .stat-card { padding: 10px 14px; border-radius: 6px; min-width: 110px; flex: 1; background: #f8f9fa; border: 1px solid #e0e0e0; }
    .stat-label { font-size: 10px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .stat-value { font-size: 17px; font-weight: 700; }

    /* ===== BADGES ===== */
    .badge, .badge-green, .badge-red, .inv-status-hold { font-size: 9px; padding: 2px 6px; border-radius: 4px; display: inline-block; }
    .badge-green { background: #e8f5e9; color: #2e7d32; }
    .badge-red { background: #fbe9e7; color: #c62828; }
    .inv-status-hold { background: #fff3e0; color: #e65100; }

    /* ===== SUMMARY CHIPS ===== */
    .reg-chip { font-size: 10px; padding: 3px 8px; border-radius: 12px; display: inline-block; margin: 2px; }
    .reg-chip-green { background: #e8f5e9; color: #2e7d32; }
    .reg-chip-red { background: #fbe9e7; color: #c62828; }
    .reg-chip-orange { background: #fff3e0; color: #e65100; }
    .reg-chip-teal { background: #e0f2f1; color: #00695c; }
    .reg-chip-purple { background: #f3e5f5; color: #6a1b9a; }
    .reg-chip-blue { background: #e3f2fd; color: #1565c0; }
    .reg-chip-gray { background: #f5f5f5; color: #555; }

    /* ===== MISC ===== */
    .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
    .total-bar { display: flex; gap: 16px; padding: 8px 12px; background: #fff8e1; border: 1px solid #f9a825; border-radius: 6px; font-size: 12px; margin-top: 10px; font-weight: 600; }
    h3, h4 { margin: 8px 0; color: #e65100; }
    .section-title { font-size: 14px; font-weight: 700; color: #e65100; margin: 12px 0 6px; border-bottom: 1px solid #ffe082; padding-bottom: 4px; }
    .no-print, .btn, input[type="checkbox"], button { display: none !important; }

    /* ===== COVER PAGE ===== */
    .cover-page {
      page-break-after: always;
      min-height: 95vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 40px;
      background: #fff;
    }
    .cover-page .cover-logo {
      font-size: 64px;
      color: #f9a825;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #f9a825 0%, #ff8f00 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-page h1 {
      font-size: 32px;
      font-weight: 700;
      color: #e65100;
      margin: 0 0 4px;
    }
    .cover-page .cover-sub {
      font-size: 16px;
      color: #888;
      margin-bottom: 30px;
    }
    .cover-page .cover-divider {
      width: 180px;
      height: 3px;
      background: linear-gradient(90deg, #f9a825, #ff8f00);
      border: none;
      margin: 0 auto 30px;
      border-radius: 2px;
    }
    .cover-page .cover-report-title {
      font-size: 26px;
      font-weight: 700;
      color: #1565c0;
      margin-bottom: 24px;
    }
    .cover-page .cover-info {
      font-size: 14px;
      color: #555;
      line-height: 2;
    }
    .cover-page .cover-info b { color: #333; }
    .cover-page .cover-address {
      margin-top: 40px;
      font-size: 12px;
      color: #999;
      line-height: 1.6;
    }

    @media print {
      .report-footer { position: fixed; bottom: 0; }
      .cover-page { page-break-after: always; }
      @page { margin: 8mm 6mm 14mm 6mm; }
    }
  `;
}

function getReportHeader() {
  return '<div class="report-header">' +
    '<div class="logo">श्री</div>' +
    '<div class="lab-info">' +
      '<div class="lab-name">Shree Balaji Clinical Laboratory</div>' +
      '<div class="lab-tagline">Pathology & Diagnostic Services</div>' +
    '</div>' +
    '<div class="lab-contact">' +
      'Shop No.39, Gagan Solitaire Building<br>' +
      'Viva Janjld Complex, Manvelpada<br>' +
      'Virar (East), Maharashtra 401305<br>' +
      'Ph: +91 97664 94833' +
    '</div>' +
  '</div>';
}

function getReportTitleBar(reportType, metaLines) {
  let metaHtml = metaLines.map(l => '<div>' + l + '</div>').join('');
  return '<div class="report-title-bar">' +
    '<div class="report-type">' + reportType + '</div>' +
    '<div class="report-meta">' + metaHtml + '</div>' +
  '</div>';
}

function getReportFooter() {
  return '<div class="report-footer-spacer"></div>' +
    '<div class="report-footer">' +
      'This is a computer-generated report from Shree Balaji Clinical Laboratory. ' +
      'For queries, contact: +91 97664 94833 · Virar (East), Maharashtra' +
    '</div>';
}

function getCoverPage(reportType, metaLines) {
  let infoHtml = metaLines.map(l => '<div>' + l + '</div>').join('');
  return '<div class="cover-page">' +
    '<div class="cover-logo">श्री</div>' +
    '<h1>Shree Balaji Clinical Laboratory</h1>' +
    '<div class="cover-sub">Pathology & Diagnostic Services</div>' +
    '<div class="cover-divider"></div>' +
    '<div class="cover-report-title">' + reportType + '</div>' +
    '<div class="cover-info">' + infoHtml + '</div>' +
    '<div class="cover-address">' +
      'Shop No.39, Gagan Solitaire Building, Viva Janjld Complex, Manvelpada<br>' +
      'Virar (East), Maharashtra 401305 · Ph: +91 97664 94833' +
    '</div>' +
  '</div>';
}

function openPrintWindow(title, reportType, metaLines, contentHtml) {
  let printWin = window.open('', '_blank');
  printWin.document.write('<!DOCTYPE html><html><head>');
  printWin.document.write('<meta charset="utf-8">');
  printWin.document.write('<title>' + title + ' — SBCL</title>');
  printWin.document.write('<style>' + getPrintStyles() + '</style>');
  printWin.document.write('</head><body>');
  // Page 1: Cover page
  printWin.document.write(getCoverPage(reportType, metaLines));
  // Page 2+: Letterhead + content
  printWin.document.write(getReportHeader());
  printWin.document.write(getReportTitleBar(reportType, metaLines));
  printWin.document.write('<div class="content-area">' + contentHtml + '</div>');
  printWin.document.write(getReportFooter());
  printWin.document.write('</body></html>');
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 300);
}
