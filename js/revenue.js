// ========== REVENUE DASHBOARD (Enhanced) ==========

function showRevenue() {
  if (!checkRevAccess()) return;
  let from = document.getElementById('revFrom').value, to = document.getElementById('revTo').value;
  if (!from || !to) return alert('Date range select karo!');
  let filtered = entries.filter(e => e.date >= from && e.date <= to);

  if (!filtered.length) {
    document.getElementById('revenueResult').innerHTML = '<div class="card"><div class="empty">Is date range mein koi entry nahi mili.</div></div>';
    return;
  }

  // Totals
  let totalRevenue = 0, totalLabShare = 0, totalDocShare = 0, totalDisc = 0, totalPaid = 0, totalBal = 0;
  let byDoctor = {}, byPayMode = {}, byCollector = {}, byDate = {};
  let totalTests = 0;

  filtered.forEach(e => {
    let labS = 0, docS = 0;
    e.tests.forEach(t => { labS += (t.labShare || 0); docS += (t.docShare || 0); });
    totalRevenue += e.total; totalLabShare += labS; totalDocShare += docS;
    totalDisc += e.discount; totalPaid += e.paid; totalBal += e.balance;
    totalTests += e.tests.length;

    // By Doctor
    let dName = e.doctorName || 'Unknown';
    if (!byDoctor[dName]) byDoctor[dName] = { revenue: 0, lab: 0, doc: 0, count: 0, paid: 0, balance: 0, tests: 0 };
    byDoctor[dName].revenue += e.total; byDoctor[dName].lab += labS;
    byDoctor[dName].doc += docS; byDoctor[dName].count++;
    byDoctor[dName].paid += e.paid; byDoctor[dName].balance += e.balance;
    byDoctor[dName].tests += e.tests.length;

    // By Payment Mode
    if (e.paid > 0) byPayMode[e.paymentMode] = (byPayMode[e.paymentMode] || 0) + e.paid;

    // By Collector
    let cName = e.collectorName || '';
    if (cName) {
      if (!byCollector[cName]) byCollector[cName] = { samples: 0, revenue: 0, paid: 0, balance: 0, tests: 0 };
      byCollector[cName].samples++; byCollector[cName].revenue += e.total;
      byCollector[cName].paid += e.paid; byCollector[cName].balance += e.balance;
      byCollector[cName].tests += e.tests.length;
    }

    // By Date
    if (!byDate[e.date]) byDate[e.date] = { count: 0, revenue: 0, paid: 0 };
    byDate[e.date].count++; byDate[e.date].revenue += e.total; byDate[e.date].paid += e.paid;
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

  // === DAILY BREAKDOWN ===
  let dateEntries = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  if (dateEntries.length > 1) {
    html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">&#128197; Daily Breakdown</h3>';
    html += '<table><tr><th>Date</th><th>Patients</th><th>Revenue</th><th>Paid</th><th>Balance</th></tr>';
    dateEntries.forEach(([date, d]) => {
      html += '<tr><td>' + date + '</td><td>' + d.count + '</td><td>&#8377;' + d.revenue + '</td><td>&#8377;' + d.paid + '</td><td style="color:var(--danger)">&#8377;' + (d.revenue - d.paid) + '</td></tr>';
    });
    html += '</table></div>';
  }

  document.getElementById('revenueResult').innerHTML = html;
}

function statCard(color, label, value, isCount) {
  let prefix = isCount ? '' : '&#8377;';
  return '<div class="stat-card ' + color + '"><div class="stat-label">' + label + '</div><div class="stat-value">' + prefix + value + '</div></div>';
}
