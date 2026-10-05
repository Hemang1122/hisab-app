// ========== REVENUE DASHBOARD (Enhanced) ==========

function showRevenue() {
  if (!checkRevAccess()) return;
  let from = document.getElementById('revFrom').value, to = document.getElementById('revTo').value;
  if (!from || !to) return alert('Date range select karo!');

  // Keep entries in sync with current master rate list (custom shares, prices)
  if (typeof syncEntriesToRateList === 'function') {
    let updated = syncEntriesToRateList();
    if (updated > 0 && typeof toast === 'function') {
      toast('🔄 ' + updated + ' ' + (updated === 1 ? 'entry' : 'entries') + ' updated to latest rates');
    }
  }

  let filtered = entries.filter(e => e.date >= from && e.date <= to);

  if (!filtered.length) {
    document.getElementById('revenueResult').innerHTML = '<div class="card"><div class="empty">Is date range mein koi entry nahi mili.</div></div>';
    return;
  }

  // Totals — extras are tracked SEPARATELY
  let totalRevenue = 0, totalLabShare = 0, totalDocShare = 0, totalDisc = 0, totalPaid = 0, totalBal = 0;
  let totalExtras = 0;
  let extraEntries = [];
  let byDoctor = {}, byPayMode = {}, byCollector = {}, byDate = {}, byOperator = {};
  let totalTests = 0;

  filtered.forEach(e => {
    let rawLabS = 0, rawDocS = 0;
    e.tests.forEach(t => { rawLabS += (t.labShare || 0); rawDocS += (t.docShare || 0); });
    // Apply discount proportionally — so Lab + Doc shares sum to the discounted test total
    let rawSubtotal = e.subtotal || (rawLabS + rawDocS);
    let labS = rawLabS, docS = rawDocS;
    let testTotal = rawSubtotal - (e.discount || 0); // = total minus extra
    if (rawSubtotal > 0 && (e.discount || 0) > 0) {
      let scale = testTotal / rawSubtotal;
      docS = Math.round(rawDocS * scale);
      labS = Math.round(rawLabS * scale);
      let drift = testTotal - (docS + labS);
      if (drift !== 0) labS += drift;
    }
    totalRevenue += e.total; totalLabShare += labS; totalDocShare += docS;
    totalDisc += e.discount; totalPaid += e.paid; totalBal += e.balance;
    totalTests += e.tests.length;

    // Resolve current doctor name from live list (so renames reflect)
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(d => d.id === e.doctorId) : null;
    let currentDocName = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : 'Unknown'));

    // Track extras separately
    if (e.extra && e.extra > 0) {
      totalExtras += e.extra;
      extraEntries.push({
        date: e.date, name: e.name, doctorName: currentDocName,
        tests: e.tests.map(t => t.name).join(', '),
        extra: e.extra, reason: e.extraReason || '',
        subtotal: e.subtotal, total: e.total
      });
    }

    // By Doctor
    let dName = currentDocName;
    if (!byDoctor[dName]) byDoctor[dName] = { revenue: 0, lab: 0, doc: 0, count: 0, paid: 0, balance: 0, tests: 0 };
    byDoctor[dName].revenue += e.total; byDoctor[dName].lab += labS;
    byDoctor[dName].doc += docS; byDoctor[dName].count++;
    byDoctor[dName].paid += e.paid; byDoctor[dName].balance += e.balance;
    byDoctor[dName].tests += e.tests.length;

    // By Payment Mode
    if (e.paid > 0) byPayMode[e.paymentMode] = (byPayMode[e.paymentMode] || 0) + e.paid;

    // By Collector — always use CURRENT name from collectors list (not stored snapshot)
    let cName = '';
    if (e.collectorId) {
      let liveColl = collectors.find(c => c.id === e.collectorId);
      cName = liveColl ? liveColl.name : (e.collectorName || '');
    }
    if (cName) {
      if (!byCollector[cName]) byCollector[cName] = { samples: 0, revenue: 0, paid: 0, balance: 0, tests: 0 };
      byCollector[cName].samples++; byCollector[cName].revenue += e.total;
      byCollector[cName].paid += e.paid; byCollector[cName].balance += e.balance;
      byCollector[cName].tests += e.tests.length;
    }

    // By Date
    if (!byDate[e.date]) byDate[e.date] = { count: 0, revenue: 0, paid: 0 };
    byDate[e.date].count++; byDate[e.date].revenue += e.total; byDate[e.date].paid += e.paid;

    // By Operator (who filled the entry)
    let op = e.filledBy || 'Unknown';
    if (!byOperator[op]) byOperator[op] = { count: 0, revenue: 0, paid: 0, tests: 0, dates: new Set(), byDate: {} };
    byOperator[op].count++;
    byOperator[op].revenue += e.total;
    byOperator[op].paid += e.paid;
    byOperator[op].tests += (e.tests || []).length;
    byOperator[op].dates.add(e.date);
    if (!byOperator[op].byDate[e.date]) byOperator[op].byDate[e.date] = { count: 0, revenue: 0 };
    byOperator[op].byDate[e.date].count++;
    byOperator[op].byDate[e.date].revenue += e.total;
  });

  let cashCollected = byPayMode['Cash'] || 0;

  // Build HTML
  let html = '';

  // === OVERVIEW STATS ===
  html += '<div class="stat-grid">';
  html += statCard('blue', 'Total Revenue', totalRevenue);
  html += statCard('green', 'Lab Share', totalLabShare);
  html += statCard('purple', 'Doctor Share', totalDocShare);
  html += statCard('yellow', 'Cash Collected', cashCollected);
  html += statCard('green', 'Total Paid', totalPaid);
  html += statCard('red', 'Balance Due', totalBal);
  html += '</div>';

  // Sub stats
  html += '<div class="stat-grid">';
  html += statCard('blue', 'Total Patients', filtered.length, true);
  html += statCard('purple', 'Total Tests', totalTests, true);
  html += statCard('red', 'Total Discount', totalDisc);
  html += statCard('yellow', 'Doctors/Hospitals', Object.keys(byDoctor).length, true);
  html += '</div>';

  // === EXTRA COLLECTIONS (not in hisab print) ===
  if (extraEntries.length) {
    html += '<div class="card" style="border-left:4px solid var(--accent);background:#fffbf3">';
    html += '<h3 style="font-size:15px;margin-bottom:6px;color:var(--accent)">💵 Extra Collections <small style="color:#888;font-weight:normal">(Hisab print mein nahi aata — lab ki extra income)</small></h3>';
    html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">';
    html += '<div style="background:#fff;padding:8px 14px;border-radius:6px;border:1px solid #e8d3a8"><small style="color:#888">Total Extra Collected</small><div style="font-size:22px;font-weight:700;color:var(--accent)">₹' + totalExtras + '</div></div>';
    html += '<div style="background:#fff;padding:8px 14px;border-radius:6px;border:1px solid #e8d3a8"><small style="color:#888">Number of Entries</small><div style="font-size:22px;font-weight:700">' + extraEntries.length + '</div></div>';
    html += '</div>';
    html += '<div style="overflow-x:auto"><table style="font-size:12px"><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th style="text-align:right">Test Total</th><th style="text-align:right;color:var(--accent)">Extra ₹</th><th>Reason</th></tr>';
    extraEntries.forEach(x => {
      html += '<tr>' +
        '<td>' + x.date + '</td>' +
        '<td><b>' + x.name + '</b></td>' +
        '<td style="font-size:11px">' + (x.doctorName || '-') + '</td>' +
        '<td style="font-size:11px;max-width:180px">' + x.tests + '</td>' +
        '<td style="text-align:right">₹' + x.subtotal + '</td>' +
        '<td style="text-align:right;color:var(--accent);font-weight:700">₹' + x.extra + '</td>' +
        '<td style="font-size:11px;color:#666">' + (x.reason || '-') + '</td>' +
        '</tr>';
    });
    html += '</table></div></div>';
  }

  // === DOCTOR / HOSPITAL REVENUE ===
  html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">&#129658; Doctor / Hospital Revenue</h3>';
  let docEntries = Object.entries(byDoctor).sort((a, b) => b[1].revenue - a[1].revenue);
  html += '<div style="overflow-x:auto"><table><tr><th>Doctor / Hospital</th><th>Patients</th><th>Tests</th><th>Revenue</th><th>Lab Share</th><th>Doc Share</th><th>Paid</th><th>Balance</th></tr>';
  docEntries.forEach(([n, d]) => {
    let balClass = d.balance > 0 ? 'color:var(--danger);font-weight:700' : 'color:var(--success)';
    html += '<tr><td><b>' + n + '</b></td><td>' + d.count + '</td><td>' + d.tests + '</td><td>&#8377;' + d.revenue + '</td><td>&#8377;' + d.lab + '</td><td>&#8377;' + d.doc + '</td><td>&#8377;' + d.paid + '</td><td style="' + balClass + '">&#8377;' + d.balance + '</td></tr>';
  });
  html += '</table></div></div>';

  // === COLLECTION BOY TRACKING ===
  let collEntries = Object.entries(byCollector);
  if (collEntries.length) {
    collEntries.sort((a, b) => b[1].samples - a[1].samples);
    html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">&#128666; Collection Boy Tracking</h3>';
    html += '<div class="stat-grid" style="margin-bottom:12px">';
    collEntries.forEach(([name, c]) => {
      html += '<div class="stat-card blue" style="text-align:left;padding:14px">' +
        '<div style="font-weight:700;font-size:14px;margin-bottom:6px">' + name + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">' +
        '<span>Samples: <b>' + c.samples + '</b></span>' +
        '<span>Tests: <b>' + c.tests + '</b></span>' +
        '<span>Revenue: <b>&#8377;' + c.revenue + '</b></span>' +
        '<span>Paid: <b>&#8377;' + c.paid + '</b></span>' +
        '<span>Balance: <b style="color:var(--danger)">&#8377;' + c.balance + '</b></span>' +
        '</div></div>';
    });
    html += '</div>';
    html += '<table><tr><th>Collection Boy</th><th>Samples</th><th>Tests</th><th>Revenue</th><th>Paid</th><th>Balance</th></tr>';
    collEntries.forEach(([n, c]) => {
      html += '<tr><td><b>' + n + '</b></td><td>' + c.samples + '</td><td>' + c.tests + '</td><td>&#8377;' + c.revenue + '</td><td>&#8377;' + c.paid + '</td><td style="color:var(--danger)">&#8377;' + c.balance + '</td></tr>';
    });
    html += '</table></div>';
  }

  // === OPERATOR ACTIVITY ===
  let opEntries = Object.entries(byOperator).filter(([n]) => n && n !== 'Unknown');
  if (opEntries.length || byOperator['Unknown']) {
    opEntries = Object.entries(byOperator).sort((a, b) => b[1].revenue - a[1].revenue);
    html += '<div class="card" style="border-left:4px solid var(--brand-light)"><h3 style="font-size:15px;margin-bottom:10px">👤 Operator Activity <small style="color:#888;font-weight:normal">(kaun kitna kaam kiya)</small></h3>';
    // Summary cards
    html += '<div class="stat-grid" style="margin-bottom:12px">';
    opEntries.forEach(([name, o]) => {
      html += '<div class="stat-card blue" style="text-align:left;padding:14px">' +
        '<div style="font-weight:700;font-size:14px;margin-bottom:6px;color:var(--brand)">' + name + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">' +
        '<span>Entries: <b>' + o.count + '</b></span>' +
        '<span>Days: <b>' + o.dates.size + '</b></span>' +
        '<span>Revenue: <b>₹' + o.revenue + '</b></span>' +
        '<span>Tests: <b>' + o.tests + '</b></span>' +
        '<span>Paid: <b style="color:var(--paid)">₹' + o.paid + '</b></span>' +
        '<span>Avg: <b>₹' + (o.count > 0 ? Math.round(o.revenue / o.count) : 0) + '</b></span>' +
        '</div></div>';
    });
    html += '</div>';
    // Day-by-day per operator
    html += '<h4 style="font-size:13px;margin:10px 0 6px">Day-by-day by Operator</h4>';
    html += '<div style="overflow-x:auto"><table style="font-size:12px"><tr><th>Operator</th><th>Date</th><th style="text-align:right">Entries</th><th style="text-align:right">Revenue</th></tr>';
    opEntries.forEach(([name, o]) => {
      let dateList = Object.entries(o.byDate).sort((a, b) => a[0].localeCompare(b[0]));
      dateList.forEach(([date, d], i) => {
        html += '<tr>' + (i === 0 ? '<td rowspan="' + dateList.length + '"><b>' + name + '</b></td>' : '') +
          '<td>' + date + '</td><td style="text-align:right">' + d.count + '</td><td style="text-align:right">₹' + d.revenue + '</td></tr>';
      });
    });
    html += '</table></div></div>';
  }

  // === PAYMENT MODE BREAKDOWN ===
  html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">&#128179; Payment Mode Breakdown</h3>';
  let payEntries = Object.entries(byPayMode).sort((a, b) => b[1] - a[1]);
  if (payEntries.length) {
    html += '<div class="stat-grid" style="margin-bottom:10px">';
    payEntries.forEach(([mode, amt]) => {
      let pct = totalPaid > 0 ? Math.round(amt / totalPaid * 100) : 0;
      html += '<div class="stat-card green" style="text-align:center"><div class="stat-label">' + mode + '</div><div class="stat-value" style="font-size:18px">&#8377;' + amt + '</div><div style="font-size:11px;color:var(--gray-400)">' + pct + '% of paid</div></div>';
    });
    html += '</div>';
  } else {
    html += '<div class="empty" style="padding:10px">Koi payment nahi mila.</div>';
  }
  html += '</div>';

  // === DAILY TIMELINE (bar chart) + BREAKDOWN ===
  let dateEntries = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  if (dateEntries.length >= 1) {
    // Fill in missing dates in range with 0
    let allDates = [];
    let cur = new Date(from + 'T00:00:00'), endD = new Date(to + 'T00:00:00');
    while (cur <= endD) {
      let s = cur.toISOString().slice(0, 10);
      allDates.push([s, byDate[s] || { count: 0, revenue: 0, paid: 0 }]);
      cur.setDate(cur.getDate() + 1);
    }

    html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">📈 Revenue Timeline</h3>';
    let maxRev = Math.max(...allDates.map(d => d[1].revenue), 1);
    html += '<div style="display:flex;align-items:flex-end;gap:3px;overflow-x:auto;padding:10px 0;min-height:150px;border-bottom:1px solid var(--n200)">';
    allDates.forEach(([date, d]) => {
      let hPct = maxRev > 0 ? Math.max(2, Math.round(d.revenue / maxRev * 130)) : 2;
      let label = date.slice(5); // MM-DD
      let color = d.revenue > 0 ? 'var(--brand)' : 'var(--n200)';
      html += '<div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;min-width:26px" title="' + date + ': ₹' + d.revenue + ' (' + d.count + ' patients)">' +
        '<div style="font-size:9px;color:#666;margin-bottom:2px;white-space:nowrap">' + (d.revenue > 0 ? '₹' + d.revenue : '') + '</div>' +
        '<div style="width:20px;height:' + hPct + 'px;background:' + color + ';border-radius:3px 3px 0 0"></div>' +
        '<div style="font-size:9px;color:#888;margin-top:3px;transform:rotate(-45deg);transform-origin:top left;white-space:nowrap">' + label + '</div>' +
        '</div>';
    });
    html += '</div>';

    html += '<h4 style="font-size:13px;margin:14px 0 8px">Daily Breakdown</h4>';
    html += '<div style="overflow-x:auto"><table style="font-size:12px"><tr><th>Date</th><th>Patients</th><th>Tests</th><th>Revenue</th><th>Paid</th><th>Balance</th></tr>';
    dateEntries.forEach(([date, d]) => {
      // Count tests for this date
      let dayTests = filtered.filter(e => e.date === date).reduce((s, e) => s + e.tests.length, 0);
      html += '<tr><td>' + formatDate(date) + '</td><td>' + d.count + '</td><td>' + dayTests + '</td><td>₹' + d.revenue + '</td><td>₹' + d.paid + '</td><td style="color:var(--danger)">₹' + (d.revenue - d.paid) + '</td></tr>';
    });
    html += '</table></div></div>';
  }

  // Store the current data for the print report
  window._lastRevenueData = {
    from, to, filtered, totalRevenue, totalLabShare, totalDocShare, totalDisc,
    totalPaid, totalBal, totalTests, totalExtras, extraEntries,
    byDoctor, byPayMode, byCollector, byDate, byOperator, cashCollected: byPayMode['Cash'] || 0
  };

  document.getElementById('revenueResult').innerHTML = html;
}

function statCard(color, label, value, isCount) {
  let prefix = isCount ? '' : '&#8377;';
  return '<div class="stat-card ' + color + '"><div class="stat-label">' + label + '</div><div class="stat-value">' + prefix + value + '</div></div>';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  let d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ========== REVENUE TIMELINE PRESETS ==========
function setRevenuePreset(preset) {
  let today = new Date();
  let from, to = today.toISOString().slice(0, 10);
  if (preset === 'today') { from = to; }
  else if (preset === 'yesterday') {
    let y = new Date(today); y.setDate(y.getDate() - 1);
    from = to = y.toISOString().slice(0, 10);
  }
  else if (preset === 'last7') {
    let d = new Date(today); d.setDate(d.getDate() - 6);
    from = d.toISOString().slice(0, 10);
  }
  else if (preset === 'last30') {
    let d = new Date(today); d.setDate(d.getDate() - 29);
    from = d.toISOString().slice(0, 10);
  }
  else if (preset === 'thisMonth') {
    let d = new Date(today.getFullYear(), today.getMonth(), 1);
    from = d.toISOString().slice(0, 10);
  }
  else if (preset === 'lastMonth') {
    let d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    let d2 = new Date(today.getFullYear(), today.getMonth(), 0);
    from = d1.toISOString().slice(0, 10);
    to = d2.toISOString().slice(0, 10);
  }
  else if (preset === 'thisYear') {
    from = today.getFullYear() + '-01-01';
  }
  else if (preset === 'all') {
    // find earliest entry date
    if (entries.length) {
      let dates = entries.map(e => e.date).sort();
      from = dates[0];
    } else {
      from = to;
    }
  }
  document.getElementById('revFrom').value = from;
  document.getElementById('revTo').value = to;
  showRevenue();
}

// ========== DETAILED PRINT REPORT ==========
function printRevenueReport() {
  if (!window._lastRevenueData) { alert('Pehle "Show Revenue" click karo!'); return; }
  let d = window._lastRevenueData;
  let today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let html = '<div class="rev-report">';

  // HEADER
  html += '<div class="rr-header">';
  html += '<div class="rr-header-left">';
  html += '<div class="rr-logo">श्री</div>';
  html += '<div><div class="rr-lab-name">Shree Balaji Clinical Laboratory</div><div class="rr-tagline">Revenue & Analytics Report</div></div>';
  html += '</div>';
  html += '<div class="rr-header-right">';
  html += '<div class="rr-doc-type">REVENUE REPORT</div>';
  html += '<div class="rr-meta"><span>Period:</span> ' + formatDate(d.from) + ' — ' + formatDate(d.to) + '</div>';
  html += '<div class="rr-meta"><span>Generated:</span> ' + today + '</div>';
  html += '</div></div>';

  // KEY METRICS
  html += '<div class="rr-section"><h2>Key Metrics</h2>';
  html += '<div class="rr-metrics">';
  html += metricBox('Total Revenue', '₹' + d.totalRevenue.toLocaleString('en-IN'));
  html += metricBox('Lab Share', '₹' + d.totalLabShare.toLocaleString('en-IN'));
  html += metricBox('Doctor Share', '₹' + d.totalDocShare.toLocaleString('en-IN'));
  html += metricBox('Total Paid', '₹' + d.totalPaid.toLocaleString('en-IN'));
  html += metricBox('Balance Due', '₹' + d.totalBal.toLocaleString('en-IN'));
  html += metricBox('Cash Collected', '₹' + d.cashCollected.toLocaleString('en-IN'));
  html += metricBox('Total Discount', '₹' + d.totalDisc.toLocaleString('en-IN'));
  html += metricBox('Extra Collections', '₹' + d.totalExtras.toLocaleString('en-IN'));
  html += metricBox('Total Patients', d.filtered.length);
  html += metricBox('Total Tests', d.totalTests);
  html += metricBox('Doctors/Hospitals', Object.keys(d.byDoctor).length);
  html += metricBox('Avg Ticket', '₹' + (d.filtered.length ? Math.round(d.totalRevenue / d.filtered.length) : 0));
  html += '</div></div>';

  // DOCTOR / HOSPITAL BREAKDOWN
  let docList = Object.entries(d.byDoctor).sort((a, b) => b[1].revenue - a[1].revenue);
  if (docList.length) {
    html += '<div class="rr-section"><h2>Doctor / Hospital Revenue</h2>';
    html += '<table class="rr-table"><thead><tr><th>#</th><th>Doctor / Hospital</th><th class="rr-right">Patients</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Lab ₹</th><th class="rr-right">Doc ₹</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    docList.forEach(([n, x], i) => {
      html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + x.count + '</td><td class="rr-right">' + x.tests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + x.lab + '</td><td class="rr-right">₹' + x.doc + '</td><td class="rr-right">₹' + x.paid + '</td><td class="rr-right" style="color:#c44536">₹' + x.balance + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // COLLECTION BOY TRACKING
  let collList = Object.entries(d.byCollector).sort((a, b) => b[1].samples - a[1].samples);
  if (collList.length) {
    html += '<div class="rr-section"><h2>Collection Boy Tracking</h2>';
    html += '<table class="rr-table"><thead><tr><th>#</th><th>Collection Boy</th><th class="rr-right">Samples</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    collList.forEach(([n, x], i) => {
      html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + x.samples + '</td><td class="rr-right">' + x.tests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + x.paid + '</td><td class="rr-right" style="color:#c44536">₹' + x.balance + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // OPERATOR ACTIVITY (print)
  if (d.byOperator) {
    let opList = Object.entries(d.byOperator).sort((a, b) => b[1].revenue - a[1].revenue);
    if (opList.length) {
      html += '<div class="rr-section"><h2>Operator Activity</h2>';
      html += '<table class="rr-table"><thead><tr><th>#</th><th>Operator</th><th class="rr-right">Days</th><th class="rr-right">Entries</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Paid</th><th class="rr-right">Avg Ticket</th></tr></thead><tbody>';
      opList.forEach(([n, o], i) => {
        html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + o.dates.size + '</td><td class="rr-right">' + o.count + '</td><td class="rr-right">' + o.tests + '</td><td class="rr-right">₹' + o.revenue + '</td><td class="rr-right">₹' + o.paid + '</td><td class="rr-right">₹' + (o.count > 0 ? Math.round(o.revenue / o.count) : 0) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
  }

  // PAYMENT MODES
  let payList = Object.entries(d.byPayMode).sort((a, b) => b[1] - a[1]);
  if (payList.length) {
    html += '<div class="rr-section"><h2>Payment Mode Breakdown</h2>';
    html += '<table class="rr-table"><thead><tr><th>Mode</th><th class="rr-right">Amount</th><th class="rr-right">% of Paid</th></tr></thead><tbody>';
    payList.forEach(([m, a]) => {
      let pct = d.totalPaid > 0 ? Math.round(a / d.totalPaid * 100) : 0;
      html += '<tr><td><b>' + m + '</b></td><td class="rr-right">₹' + a + '</td><td class="rr-right">' + pct + '%</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // EXTRA COLLECTIONS
  if (d.extraEntries.length) {
    html += '<div class="rr-section"><h2>Extra Collections (Not in Hisab)</h2>';
    html += '<div style="margin-bottom:8px;font-size:12px"><b>Total Extra: ₹' + d.totalExtras + '</b> across ' + d.extraEntries.length + ' entries</div>';
    html += '<table class="rr-table"><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th class="rr-right">Test Total</th><th class="rr-right">Extra</th><th>Reason</th></tr></thead><tbody>';
    d.extraEntries.forEach(x => {
      html += '<tr><td>' + formatDate(x.date) + '</td><td><b>' + x.name + '</b></td><td>' + (x.doctorName || '-') + '</td><td style="font-size:10px">' + x.tests + '</td><td class="rr-right">₹' + x.subtotal + '</td><td class="rr-right" style="color:#c8843c;font-weight:700">₹' + x.extra + '</td><td style="font-size:10px">' + (x.reason || '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // DAILY BREAKDOWN
  let dateList = Object.entries(d.byDate).sort((a, b) => a[0].localeCompare(b[0]));
  if (dateList.length) {
    html += '<div class="rr-section"><h2>Daily Breakdown</h2>';
    html += '<table class="rr-table"><thead><tr><th>Date</th><th class="rr-right">Patients</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    dateList.forEach(([date, x]) => {
      let dayTests = d.filtered.filter(e => e.date === date).reduce((s, e) => s + e.tests.length, 0);
      html += '<tr><td>' + formatDate(date) + '</td><td class="rr-right">' + x.count + '</td><td class="rr-right">' + dayTests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + x.paid + '</td><td class="rr-right" style="color:#c44536">₹' + (x.revenue - x.paid) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  // ALL ENTRIES (Ledger)
  html += '<div class="rr-section rr-page-break"><h2>Full Ledger — All Entries</h2>';
  html += '<table class="rr-table"><thead><tr><th>#</th><th>Date</th><th>Operator</th><th>Patient</th><th>Doctor</th><th>Tests</th><th class="rr-right">Total</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th><th>Mode</th></tr></thead><tbody>';
  d.filtered.sort((a, b) => a.date.localeCompare(b.date)).forEach((e, i) => {
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(dc => dc.id === e.doctorId) : null;
    let dn = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : '-'));
    let tn = e.tests.map(t => t.name).join(', ');
    html += '<tr><td class="rr-center">' + (i + 1) + '</td><td>' + formatDate(e.date) + '</td><td style="font-size:10px">' + (e.filledBy || '-') + '</td><td><b>' + e.name + '</b></td><td style="font-size:10px">' + dn + '</td><td style="font-size:10px">' + tn + '</td><td class="rr-right"><b>₹' + e.total + '</b></td><td class="rr-right">₹' + e.paid + '</td><td class="rr-right" style="color:' + (e.balance > 0 ? '#c44536' : '#1b874b') + '">₹' + e.balance + '</td><td style="font-size:10px">' + e.paymentMode + '</td></tr>';
  });
  html += '</tbody></table></div>';

  // FOOTER
  html += '<div class="rr-footer">Shree Balaji Clinical Laboratory · Confidential · Generated ' + today + '</div>';

  html += '</div>';

  document.getElementById('printArea').innerHTML = html;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function metricBox(label, value) {
  return '<div class="rr-metric"><div class="rr-metric-label">' + label + '</div><div class="rr-metric-value">' + value + '</div></div>';
}
