// ========== REVENUE DASHBOARD (Clean, Sectioned) ==========

let currentRevSection = 'overview';
let lastRevComputed = null;

function switchRevSection(section) {
  currentRevSection = section;
  document.querySelectorAll('.rev-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.rsection === section));
  renderRevenueSection();
}

function showRevenue() {
  if (!checkRevAccess()) return;
  let from = document.getElementById('revFrom').value, to = document.getElementById('revTo').value;
  if (!from || !to) return alert('Date range select karo!');

  // Keep entries in sync with current master rate list
  if (typeof syncEntriesToRateList === 'function') {
    let updated = syncEntriesToRateList();
    if (updated > 0 && typeof toast === 'function') {
      toast('🔄 ' + updated + ' ' + (updated === 1 ? 'entry' : 'entries') + ' updated to latest rates');
    }
  }

  let filtered = entries.filter(e => e.date >= from && e.date <= to);
  if (!filtered.length) {
    document.getElementById('revenueResult').innerHTML = '<div class="card"><div class="empty" style="padding:40px;font-size:14px">Is date range mein koi entry nahi mili.</div></div>';
    lastRevComputed = null;
    updateRevDayLabel();
    return;
  }

  // Compute everything once
  let d = { from, to, filtered };
  d.totalRevenue = 0; d.totalLabShare = 0; d.totalDocShare = 0;
  d.totalDisc = 0; d.totalPaid = 0; d.totalBal = 0; d.totalExtras = 0; d.totalTests = 0;
  d.totalReagent = 0;
  d.extraEntries = []; d.byDoctor = {}; d.byPayMode = {}; d.byCollector = {}; d.byDate = {}; d.byOperator = {}; d.byTest = {};

  filtered.forEach(e => {
    // Raw shares from stored data
    let rawDocS = 0, rawLabS = 0;
    e.tests.forEach(t => { rawDocS += (t.docShare || 0); rawLabS += (t.labShare || 0); });
    // Discount scaling applied equally
    let rawSubtotal = e.subtotal || (rawDocS + rawLabS);
    let docS = rawDocS, labS = rawLabS;
    if (rawSubtotal > 0 && (e.discount || 0) > 0) {
      let discountFactor = 1 - ((e.discount || 0) / rawSubtotal);
      if (discountFactor < 0) discountFactor = 0;
      docS = Math.round(rawDocS * discountFactor);
      labS = Math.round(rawLabS * discountFactor);
    }

    d.totalRevenue += e.total; d.totalLabShare += labS; d.totalDocShare += docS;
    d.totalDisc += (e.discount || 0); d.totalPaid += e.paid; d.totalBal += e.balance;
    d.totalTests += e.tests.length;

    // Per-test aggregation (for materials/reagent cost tracking)
    e.tests.forEach(t => {
      let tName = t.name || 'Unknown';
      if (!d.byTest[tName]) d.byTest[tName] = { count: 0, revenue: 0, reagentCost: 0, reagentPerTest: t.reagentCost || 0, labShare: 0, docShare: 0, type: t.type || 'normal' };
      d.byTest[tName].count++;
      d.byTest[tName].revenue += (t.rate || 0);
      d.byTest[tName].reagentCost += (t.reagentCost || 0);
      d.byTest[tName].labShare += (t.labShare || 0);
      d.byTest[tName].docShare += (t.docShare || 0);
      d.totalReagent += (t.reagentCost || 0);
    });

    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(x => x.id === e.doctorId) : null;
    let currentDocName = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : 'Unknown'));

    if (e.extra && e.extra > 0) {
      d.totalExtras += e.extra;
      d.extraEntries.push({
        date: e.date, name: e.name, doctorName: currentDocName,
        tests: e.tests.map(t => t.name).join(', '),
        extra: e.extra, reason: e.extraReason || '',
        subtotal: e.subtotal, total: e.total
      });
    }

    let dName = currentDocName;
    if (!d.byDoctor[dName]) d.byDoctor[dName] = { revenue: 0, lab: 0, doc: 0, count: 0, paid: 0, balance: 0, tests: 0 };
    d.byDoctor[dName].revenue += e.total; d.byDoctor[dName].lab += labS;
    d.byDoctor[dName].doc += docS; d.byDoctor[dName].count++;
    d.byDoctor[dName].paid += e.paid; d.byDoctor[dName].balance += e.balance;
    d.byDoctor[dName].tests += e.tests.length;

    if (e.paid > 0) d.byPayMode[e.paymentMode] = (d.byPayMode[e.paymentMode] || 0) + e.paid;

    // Collector — with payment mode breakdown + patient list
    let cName = '';
    if (e.collectorId) {
      let liveColl = collectors.find(c => c.id === e.collectorId);
      cName = liveColl ? liveColl.name : (e.collectorName || '');
    }
    if (cName) {
      if (!d.byCollector[cName]) d.byCollector[cName] = {
        samples: 0, revenue: 0, paid: 0, balance: 0, tests: 0,
        byMode: {}, patients: []
      };
      d.byCollector[cName].samples++;
      d.byCollector[cName].revenue += e.total;
      d.byCollector[cName].paid += e.paid;
      d.byCollector[cName].balance += e.balance;
      d.byCollector[cName].tests += e.tests.length;
      if (e.paid > 0) {
        d.byCollector[cName].byMode[e.paymentMode] = (d.byCollector[cName].byMode[e.paymentMode] || 0) + e.paid;
      }
      d.byCollector[cName].patients.push({
        date: e.date, name: e.name, doctor: currentDocName,
        total: e.total, paid: e.paid, balance: e.balance,
        mode: e.paymentMode, status: e.hospitalPaid ? 'hospital' : (e.balance > 0 ? 'due' : 'paid'),
        tests: e.tests.map(t => t.name).join(', ')
      });
    }

    if (!d.byDate[e.date]) d.byDate[e.date] = { count: 0, revenue: 0, paid: 0, cash: 0, gpay: 0, otherDigital: 0, byMode: {} };
    d.byDate[e.date].count++;
    d.byDate[e.date].revenue += e.total;
    d.byDate[e.date].paid += e.paid;
    if (e.paid > 0) {
      let m = e.paymentMode || 'Cash';
      d.byDate[e.date].byMode[m] = (d.byDate[e.date].byMode[m] || 0) + e.paid;
      if (m === 'Cash') d.byDate[e.date].cash += e.paid;
      else if (m === 'GPay') d.byDate[e.date].gpay += e.paid;
      else d.byDate[e.date].otherDigital += e.paid;
    }

    let op = e.filledBy || 'Unknown';
    if (!d.byOperator[op]) d.byOperator[op] = { count: 0, revenue: 0, paid: 0, tests: 0, dates: new Set(), byDate: {} };
    d.byOperator[op].count++;
    d.byOperator[op].revenue += e.total;
    d.byOperator[op].paid += e.paid;
    d.byOperator[op].tests += (e.tests || []).length;
    d.byOperator[op].dates.add(e.date);
    if (!d.byOperator[op].byDate[e.date]) d.byOperator[op].byDate[e.date] = { count: 0, revenue: 0 };
    d.byOperator[op].byDate[e.date].count++;
    d.byOperator[op].byDate[e.date].revenue += e.total;
  });

  d.cashCollected = d.byPayMode['Cash'] || 0;

  lastRevComputed = d;
  window._lastRevenueData = d;
  updateRevDayLabel();
  renderRevenueSection();
}

function renderRevenueSection() {
  let d = lastRevComputed;
  if (!d) return;
  let html = '';
  switch (currentRevSection) {
    case 'overview': html = renderOverview(d); break;
    case 'daily': html = renderDaily(d); break;
    case 'doctor': html = renderByDoctor(d); break;
    case 'collector': html = renderByCollector(d); break;
    case 'operator': html = renderByOperator(d); break;
    case 'payment': html = renderByPayment(d); break;
    case 'extras': html = renderExtras(d); break;
    case 'materials': html = renderMaterials(d); break;
    case 'entries': html = renderAllEntries(d); break;
  }
  document.getElementById('revenueResult').innerHTML = html;
}

// ========== OVERVIEW ==========
function renderOverview(d) {
  let html = '';
  // Primary stats
  html += '<div class="stat-grid">';
  html += statCard('green', 'Total Revenue', d.totalRevenue);
  html += statCard('blue', 'Total Paid', d.totalPaid);
  html += statCard('red', 'Balance Due', d.totalBal);
  html += statCard('yellow', 'Cash Collected', d.cashCollected);
  html += '</div>';

  html += '<div class="stat-grid">';
  html += statCard('green', 'Lab Share', d.totalLabShare);
  html += statCard('purple', 'Doctor Share', d.totalDocShare);
  html += statCard('red', 'Discounts Given', d.totalDisc);
  html += statCard('yellow', 'Extra Collected', d.totalExtras);
  html += '</div>';

  // Reagent cost + estimated lab profit
  let labProfit = d.totalLabShare - d.totalReagent;
  html += '<div class="stat-grid">';
  html += statCard('red', '🧪 Reagent Cost', d.totalReagent);
  html += statCard('green', '📈 Lab Profit (est)', labProfit);
  html += statCard('blue', 'Cost / Patient', d.filtered.length ? Math.round(d.totalReagent / d.filtered.length) : 0);
  html += statCard('purple', 'Profit Margin', d.totalLabShare > 0 ? Math.round(labProfit / d.totalLabShare * 100) + '%' : '-', true);
  html += '</div>';

  html += '<div class="stat-grid">';
  html += statCard('blue', 'Patients', d.filtered.length, true);
  html += statCard('purple', 'Tests Done', d.totalTests, true);
  html += statCard('green', 'Doctors/Hospitals', Object.keys(d.byDoctor).length, true);
  html += statCard('yellow', 'Avg Ticket', d.filtered.length ? Math.round(d.totalRevenue / d.filtered.length) : 0);
  html += '</div>';

  // Payment mode quick strip
  let payList = Object.entries(d.byPayMode).sort((a, b) => b[1] - a[1]);
  if (payList.length) {
    html += '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">💳 Collected by Payment Mode</h3>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
    payList.forEach(([m, amt]) => {
      let pct = d.totalPaid > 0 ? Math.round(amt / d.totalPaid * 100) : 0;
      let color = m === 'Cash' ? '#1b874b' : (m === 'GPay' || m === 'PhonePe' ? '#5a3c88' : '#c8843c');
      html += '<div style="flex:1;min-width:140px;background:white;border:1px solid var(--n200);border-left:3px solid ' + color + ';border-radius:6px;padding:10px 12px">' +
        '<div style="font-size:11px;color:#666;letter-spacing:.5px;text-transform:uppercase">' + m + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:' + color + '">₹' + amt.toLocaleString('en-IN') + '</div>' +
        '<div style="font-size:10px;color:#999">' + pct + '% of total paid</div>' +
      '</div>';
    });
    html += '</div></div>';
  }

  return html;
}

// ========== DAILY TIMELINE ==========
function renderDaily(d) {
  let allDates = [];
  let cur = new Date(d.from + 'T00:00:00'), endD = new Date(d.to + 'T00:00:00');
  while (cur <= endD) {
    let s = cur.toISOString().slice(0, 10);
    allDates.push([s, d.byDate[s] || { count: 0, revenue: 0, paid: 0, cash: 0, gpay: 0, otherDigital: 0, byMode: {} }]);
    cur.setDate(cur.getDate() + 1);
  }

  let maxRev = Math.max(...allDates.map(x => x[1].revenue), 1);
  let html = '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">📈 Daily Revenue Timeline</h3>';
  html += '<div style="display:flex;align-items:flex-end;gap:3px;overflow-x:auto;padding:10px 0 24px;min-height:150px;border-bottom:1px solid var(--n200)">';
  allDates.forEach(([date, x]) => {
    let hPct = maxRev > 0 ? Math.max(2, Math.round(x.revenue / maxRev * 130)) : 2;
    let color = x.revenue > 0 ? 'var(--brand)' : 'var(--n200)';
    html += '<div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;min-width:26px" title="' + date + ': ₹' + x.revenue + ' (' + x.count + ' patients)">' +
      '<div style="font-size:9px;color:#666;margin-bottom:2px;white-space:nowrap">' + (x.revenue > 0 ? '₹' + x.revenue : '') + '</div>' +
      '<div style="width:20px;height:' + hPct + 'px;background:' + color + ';border-radius:3px 3px 0 0;cursor:pointer" onclick="revGoToDate(\'' + date + '\')"></div>' +
      '<div style="font-size:9px;color:#888;margin-top:3px">' + date.slice(5) + '</div>' +
    '</div>';
  });
  html += '</div></div>';

  // Daily breakdown table with payment mode columns
  html += '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">📅 Daily Breakdown</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Date</th><th style="text-align:right">Patients</th><th style="text-align:right">Revenue</th><th style="text-align:right;color:#1b874b">Cash</th><th style="text-align:right;color:#5a3c88">GPay/Digital</th><th style="text-align:right">Paid</th><th style="text-align:right;color:var(--danger)">Balance</th></tr></thead><tbody>';
  let dateList = Object.entries(d.byDate).sort((a, b) => a[0].localeCompare(b[0]));
  dateList.forEach(([date, x]) => {
    let digital = x.gpay + x.otherDigital;
    html += '<tr style="cursor:pointer" onclick="revGoToDate(\'' + date + '\')">' +
      '<td><b>' + formatDate(date) + '</b></td>' +
      '<td style="text-align:right">' + x.count + '</td>' +
      '<td style="text-align:right"><b>₹' + x.revenue + '</b></td>' +
      '<td style="text-align:right;color:#1b874b">₹' + x.cash + '</td>' +
      '<td style="text-align:right;color:#5a3c88">₹' + digital + '</td>' +
      '<td style="text-align:right">₹' + x.paid + '</td>' +
      '<td style="text-align:right;color:var(--danger)">₹' + (x.revenue - x.paid) + '</td>' +
    '</tr>';
  });
  html += '</tbody></table></div></div>';

  return html;
}

// ========== BY DOCTOR ==========
function renderByDoctor(d) {
  let docEntries = Object.entries(d.byDoctor).sort((a, b) => b[1].revenue - a[1].revenue);
  if (!docEntries.length) return '<div class="card"><div class="empty">No doctors in this range.</div></div>';
  let html = '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">👨‍⚕️ Doctor / Hospital Revenue</h3>';
  html += '<div style="overflow-x:auto"><table><thead><tr><th>Doctor / Hospital</th><th style="text-align:right">Patients</th><th style="text-align:right">Tests</th><th style="text-align:right">Revenue</th><th style="text-align:right">Lab Share</th><th style="text-align:right">Dr Share</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th></tr></thead><tbody>';
  docEntries.forEach(([n, x]) => {
    let balClass = x.balance > 0 ? 'color:var(--danger);font-weight:700' : 'color:var(--success)';
    html += '<tr><td><b>' + n + '</b></td><td style="text-align:right">' + x.count + '</td><td style="text-align:right">' + x.tests + '</td><td style="text-align:right"><b>₹' + x.revenue + '</b></td><td style="text-align:right">₹' + x.lab + '</td><td style="text-align:right">₹' + x.doc + '</td><td style="text-align:right">₹' + x.paid + '</td><td style="text-align:right;' + balClass + '">₹' + x.balance + '</td></tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ========== BY COLLECTOR (detailed) ==========
function renderByCollector(d) {
  let collList = Object.entries(d.byCollector).sort((a, b) => b[1].revenue - a[1].revenue);
  if (!collList.length) return '<div class="card"><div class="empty">Koi collection boy entry nahi mili.</div></div>';

  let html = '';

  // Summary cards
  html += '<div class="stat-grid">';
  collList.forEach(([name, c]) => {
    let cashShare = c.byMode['Cash'] || 0;
    let digital = Object.entries(c.byMode).filter(([m]) => m !== 'Cash').reduce((s, [, v]) => s + v, 0);
    html += '<div class="stat-card blue" style="text-align:left;padding:14px">' +
      '<div style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--brand)">🚚 ' + name + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">' +
      '<span>Samples: <b>' + c.samples + '</b></span>' +
      '<span>Tests: <b>' + c.tests + '</b></span>' +
      '<span>Revenue: <b>₹' + c.revenue + '</b></span>' +
      '<span>Paid: <b style="color:var(--paid)">₹' + c.paid + '</b></span>' +
      '<span>Cash: <b style="color:#1b874b">₹' + cashShare + '</b></span>' +
      '<span>GPay+: <b style="color:#5a3c88">₹' + digital + '</b></span>' +
      (c.balance > 0 ? '<span style="grid-column:span 2">Balance: <b style="color:var(--danger)">₹' + c.balance + '</b></span>' : '') +
      '</div></div>';
  });
  html += '</div>';

  // Per collector detailed cards
  collList.forEach(([name, c]) => {
    html += '<div class="card" style="border-left:4px solid var(--brand-light)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
    html += '<h3 style="font-size:15px;margin:0">🚚 ' + name + '</h3>';
    html += '<div style="font-size:12px;color:#666">' + c.samples + ' samples · ' + c.tests + ' tests · ₹' + c.revenue + ' revenue</div>';
    html += '</div>';

    // Payment mode breakdown chips
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
    let modeEntries = Object.entries(c.byMode).sort((a, b) => b[1] - a[1]);
    if (modeEntries.length === 0) {
      html += '<div style="color:#999;font-size:12px">No payments received yet</div>';
    } else {
      modeEntries.forEach(([m, amt]) => {
        let color = m === 'Cash' ? '#1b874b' : (m === 'GPay' || m === 'PhonePe' || m === 'UPI' ? '#5a3c88' : '#c8843c');
        html += '<span style="background:white;border:1px solid var(--n200);border-left:3px solid ' + color + ';padding:4px 10px;border-radius:4px;font-size:12px"><b>' + m + ':</b> ₹' + amt + '</span>';
      });
    }
    if (c.balance > 0) html += '<span style="background:#fceae8;color:var(--due);padding:4px 10px;border-radius:4px;font-size:12px">Balance Due: ₹' + c.balance + '</span>';
    html += '</div>';

    // Patient list
    html += '<div style="overflow-x:auto"><table style="font-size:11px"><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th>Mode</th><th>Status</th></tr></thead><tbody>';
    c.patients.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)).forEach(p => {
      let status = p.status === 'hospital' ? '<span style="background:#e7f0fd;color:#1e4d8c;padding:1px 6px;border-radius:8px;font-size:10px">🏥 Hospital</span>' :
                   p.status === 'due' ? '<span style="background:#fceae8;color:var(--due);padding:1px 6px;border-radius:8px;font-size:10px">Due ₹' + p.balance + '</span>' :
                   '<span style="background:#e6f5ed;color:var(--paid);padding:1px 6px;border-radius:8px;font-size:10px">Paid</span>';
      html += '<tr>' +
        '<td>' + p.date + '</td>' +
        '<td><b>' + p.name + '</b></td>' +
        '<td style="font-size:10px">' + p.doctor + '</td>' +
        '<td style="font-size:10px;max-width:180px">' + p.tests + '</td>' +
        '<td style="text-align:right">₹' + p.total + '</td>' +
        '<td style="text-align:right">₹' + p.paid + '</td>' +
        '<td style="font-size:10px">' + p.mode + '</td>' +
        '<td>' + status + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div></div>';
  });

  return html;
}

// ========== BY OPERATOR ==========
function renderByOperator(d) {
  let opEntries = Object.entries(d.byOperator).sort((a, b) => b[1].revenue - a[1].revenue);
  if (!opEntries.length) return '<div class="card"><div class="empty">No operator activity.</div></div>';
  let html = '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">👤 Operator Activity</h3>';
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
  html += '<h4 style="font-size:12px;margin:10px 0 6px">Day by day:</h4>';
  html += '<div style="overflow-x:auto"><table style="font-size:11px"><thead><tr><th>Operator</th><th>Date</th><th style="text-align:right">Entries</th><th style="text-align:right">Revenue</th></tr></thead><tbody>';
  opEntries.forEach(([name, o]) => {
    let dateList = Object.entries(o.byDate).sort((a, b) => a[0].localeCompare(b[0]));
    dateList.forEach(([date, x], i) => {
      html += '<tr>' + (i === 0 ? '<td rowspan="' + dateList.length + '"><b>' + name + '</b></td>' : '') +
        '<td>' + date + '</td><td style="text-align:right">' + x.count + '</td><td style="text-align:right">₹' + x.revenue + '</td></tr>';
    });
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ========== BY PAYMENT ==========
function renderByPayment(d) {
  let payList = Object.entries(d.byPayMode).sort((a, b) => b[1] - a[1]);
  if (!payList.length) return '<div class="card"><div class="empty">No payments received.</div></div>';
  let html = '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">💳 Payment Mode Breakdown</h3>';
  html += '<div class="stat-grid">';
  payList.forEach(([mode, amt]) => {
    let pct = d.totalPaid > 0 ? Math.round(amt / d.totalPaid * 100) : 0;
    html += '<div class="stat-card green" style="text-align:center;padding:16px"><div class="stat-label">' + mode + '</div><div class="stat-value" style="font-size:22px">₹' + amt + '</div><div style="font-size:11px;color:var(--gray-400)">' + pct + '% of total paid</div></div>';
  });
  html += '</div></div>';
  return html;
}

// ========== EXTRAS ==========
function renderExtras(d) {
  if (!d.extraEntries.length) return '<div class="card"><div class="empty">Koi extra collection nahi hui.</div></div>';
  let html = '<div class="card" style="border-left:4px solid var(--accent);background:#fffbf3">';
  html += '<h3 style="font-size:15px;margin-bottom:6px;color:var(--accent)">💵 Extra Collections <small style="color:#888;font-weight:normal">(Hisab print mein nahi aata — lab ki extra income)</small></h3>';
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">';
  html += '<div style="background:#fff;padding:8px 14px;border-radius:6px;border:1px solid #e8d3a8"><small style="color:#888">Total Extra Collected</small><div style="font-size:22px;font-weight:700;color:var(--accent)">₹' + d.totalExtras + '</div></div>';
  html += '<div style="background:#fff;padding:8px 14px;border-radius:6px;border:1px solid #e8d3a8"><small style="color:#888">Number of Entries</small><div style="font-size:22px;font-weight:700">' + d.extraEntries.length + '</div></div>';
  html += '</div>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th style="text-align:right">Test Total</th><th style="text-align:right;color:var(--accent)">Extra ₹</th><th>Reason</th></tr></thead><tbody>';
  d.extraEntries.forEach(x => {
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
  html += '</tbody></table></div></div>';
  return html;
}

// ========== MATERIALS / REAGENT COST ==========
function renderMaterials(d) {
  let testList = Object.entries(d.byTest).sort((a, b) => b[1].reagentCost - a[1].reagentCost);
  if (!testList.length) return '<div class="card"><div class="empty">No tests in this range.</div></div>';

  let labProfit = d.totalLabShare - d.totalReagent;
  let avgMargin = d.totalLabShare > 0 ? (labProfit / d.totalLabShare * 100) : 0;

  let html = '';
  // Hero stats
  html += '<div class="stat-grid">';
  html += statCard('red', '🧪 Total Reagent Cost', d.totalReagent);
  html += statCard('green', '💰 Lab Share (gross)', d.totalLabShare);
  html += statCard('blue', '📈 Lab Profit (net)', labProfit);
  html += statCard('yellow', 'Profit Margin', Math.round(avgMargin) + '%', true);
  html += '</div>';

  html += '<div class="card" style="background:#fffbf3;border-left:4px solid var(--accent)">';
  html += '<p style="font-size:12px;color:#666;margin:0 0 4px"><b>How this is calculated:</b> Each test has a reagent/consumable cost set in the Rate List. When you perform a test, that cost is subtracted from your Lab Share to estimate net profit. Default costs are typical Indian-market mid-tier estimates — adjust them in Rate List to match your actual supplier prices.</p>';
  html += '</div>';

  // Per-test breakdown
  html += '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">🧪 Material Consumption by Test</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Test</th><th style="text-align:right">Count</th><th style="text-align:right" title="Reagent cost per test">Per-Test ₹</th><th style="text-align:right">Total Reagent ₹</th><th style="text-align:right">Rate ₹ (total)</th><th style="text-align:right">Lab Share ₹</th><th style="text-align:right">Net Profit ₹</th><th style="text-align:right">Margin</th></tr></thead><tbody>';
  testList.forEach(([n, x]) => {
    let profit = x.labShare - x.reagentCost;
    let margin = x.labShare > 0 ? Math.round(profit / x.labShare * 100) : 0;
    let marginColor = margin >= 50 ? 'var(--paid)' : margin >= 20 ? 'var(--accent)' : 'var(--danger)';
    html += '<tr>' +
      '<td><b>' + n + '</b> <small style="color:#999">· ' + x.type + '</small></td>' +
      '<td style="text-align:right">' + x.count + '</td>' +
      '<td style="text-align:right">₹' + x.reagentPerTest + '</td>' +
      '<td style="text-align:right;color:var(--danger)"><b>₹' + x.reagentCost + '</b></td>' +
      '<td style="text-align:right">₹' + x.revenue + '</td>' +
      '<td style="text-align:right">₹' + x.labShare + '</td>' +
      '<td style="text-align:right;color:' + marginColor + ';font-weight:700">₹' + profit + '</td>' +
      '<td style="text-align:right;color:' + marginColor + '">' + margin + '%</td>' +
    '</tr>';
  });
  html += '<tr style="background:var(--n100);font-weight:700">' +
    '<td>Grand Total</td><td style="text-align:right">' + d.totalTests + '</td><td></td>' +
    '<td style="text-align:right;color:var(--danger)">₹' + d.totalReagent + '</td>' +
    '<td style="text-align:right">—</td>' +
    '<td style="text-align:right">₹' + d.totalLabShare + '</td>' +
    '<td style="text-align:right;color:' + (labProfit > 0 ? 'var(--paid)' : 'var(--danger)') + '">₹' + labProfit + '</td>' +
    '<td style="text-align:right">' + Math.round(avgMargin) + '%</td>' +
  '</tr>';
  html += '</tbody></table></div></div>';

  // Tests without reagent cost set
  let missing = testList.filter(([, x]) => !x.reagentPerTest);
  if (missing.length) {
    html += '<div class="card" style="background:#fff8ee;border-left:4px solid var(--accent)">';
    html += '<h4 style="font-size:13px;margin:0 0 6px;color:var(--accent)">⚠️ ' + missing.length + ' test(s) have no reagent cost set</h4>';
    html += '<p style="font-size:11px;color:#666;margin:0 0 8px">Set the reagent cost in Rate List → click the 🧪 Reagent cell for each test. Profit margins for these are overestimated.</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    missing.forEach(([n, x]) => {
      html += '<span style="background:white;border:1px solid #e8d3a8;padding:2px 8px;border-radius:10px;font-size:11px">' + n + ' · ' + x.count + '×</span>';
    });
    html += '</div></div>';
  }

  return html;
}

// ========== ALL ENTRIES ==========
function renderAllEntries(d) {
  let html = '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">📋 All Entries (' + d.filtered.length + ')</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:11px"><thead><tr><th>#</th><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th>Mode</th><th>Operator</th><th>Collector</th></tr></thead><tbody>';
  d.filtered.sort((a, b) => a.date.localeCompare(b.date)).forEach((e, i) => {
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(dc => dc.id === e.doctorId) : null;
    let dn = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : '-'));
    let liveColl = e.collectorId ? collectors.find(c => c.id === e.collectorId) : null;
    let cn = liveColl ? liveColl.name : (e.collectorName || '-');
    let tn = e.tests.map(t => t.name).join(', ');
    html += '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + e.date + '</td>' +
      '<td><b>' + e.name + '</b></td>' +
      '<td style="font-size:10px">' + dn + '</td>' +
      '<td style="font-size:10px;max-width:200px">' + tn + '</td>' +
      '<td style="text-align:right"><b>₹' + e.total + '</b></td>' +
      '<td style="text-align:right">₹' + e.paid + '</td>' +
      '<td style="font-size:10px">' + e.paymentMode + '</td>' +
      '<td style="font-size:10px">' + (e.filledBy || '-') + '</td>' +
      '<td style="font-size:10px">' + cn + '</td>' +
    '</tr>';
  });
  html += '</tbody></table></div></div>';
  return html;
}

// ========== HELPERS ==========
function statCard(color, label, value, isCount) {
  let prefix = isCount ? '' : '&#8377;';
  let display = (typeof value === 'number') ? value.toLocaleString('en-IN') : value;
  return '<div class="stat-card ' + color + '"><div class="stat-label">' + label + '</div><div class="stat-value">' + prefix + display + '</div></div>';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  let d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function updateRevDayLabel() {
  let from = document.getElementById('revFrom').value;
  let to = document.getElementById('revTo').value;
  let label = document.getElementById('revDayLabel');
  let range = document.getElementById('revDayRange');
  if (!label || !range) return;
  if (from === to) {
    let today = new Date().toISOString().slice(0, 10);
    let y = new Date(); y.setDate(y.getDate() - 1);
    let yStr = y.toISOString().slice(0, 10);
    if (from === today) label.textContent = 'Today';
    else if (from === yStr) label.textContent = 'Yesterday';
    else label.textContent = formatDate(from);
    range.textContent = from;
  } else {
    label.textContent = formatDate(from) + ' → ' + formatDate(to);
    let ms = new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00');
    let days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
    range.textContent = days + ' days';
  }
}

function revDayShift(delta) {
  let from = document.getElementById('revFrom').value;
  if (!from) from = new Date().toISOString().slice(0, 10);
  let d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  let s = d.toISOString().slice(0, 10);
  document.getElementById('revFrom').value = s;
  document.getElementById('revTo').value = s;
  showRevenue();
}

function revDayToday() {
  let today = new Date().toISOString().slice(0, 10);
  document.getElementById('revFrom').value = today;
  document.getElementById('revTo').value = today;
  showRevenue();
}

function revGoToDate(date) {
  document.getElementById('revFrom').value = date;
  document.getElementById('revTo').value = date;
  showRevenue();
}

// ========== TIMELINE PRESETS ==========
function setRevenuePreset(preset) {
  let today = new Date();
  let from, to = today.toISOString().slice(0, 10);
  if (preset === 'today') { from = to; }
  else if (preset === 'yesterday') {
    let y = new Date(today); y.setDate(y.getDate() - 1);
    from = to = y.toISOString().slice(0, 10);
  }
  else if (preset === 'last7') { let d = new Date(today); d.setDate(d.getDate() - 6); from = d.toISOString().slice(0, 10); }
  else if (preset === 'last30') { let d = new Date(today); d.setDate(d.getDate() - 29); from = d.toISOString().slice(0, 10); }
  else if (preset === 'thisMonth') { from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10); }
  else if (preset === 'lastMonth') {
    let d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    let d2 = new Date(today.getFullYear(), today.getMonth(), 0);
    from = d1.toISOString().slice(0, 10);
    to = d2.toISOString().slice(0, 10);
  }
  else if (preset === 'thisYear') { from = today.getFullYear() + '-01-01'; }
  else if (preset === 'all') {
    if (entries.length) from = entries.map(e => e.date).sort()[0];
    else from = to;
  }
  document.getElementById('revFrom').value = from;
  document.getElementById('revTo').value = to;
  showRevenue();
}

// ========== PRINT REPORT (unchanged — detailed) ==========
function printRevenueReport() {
  if (!window._lastRevenueData) { alert('Pehle "Show Revenue" click karo!'); return; }
  let d = window._lastRevenueData;
  let today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let html = '<div class="rev-report">';

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

  let docList = Object.entries(d.byDoctor).sort((a, b) => b[1].revenue - a[1].revenue);
  if (docList.length) {
    html += '<div class="rr-section"><h2>Doctor / Hospital Revenue</h2>';
    html += '<table class="rr-table"><thead><tr><th>#</th><th>Doctor / Hospital</th><th class="rr-right">Patients</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Lab ₹</th><th class="rr-right">Doc ₹</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    docList.forEach(([n, x], i) => {
      html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + x.count + '</td><td class="rr-right">' + x.tests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + x.lab + '</td><td class="rr-right">₹' + x.doc + '</td><td class="rr-right">₹' + x.paid + '</td><td class="rr-right" style="color:#c44536">₹' + x.balance + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  let collList = Object.entries(d.byCollector).sort((a, b) => b[1].samples - a[1].samples);
  if (collList.length) {
    html += '<div class="rr-section"><h2>Collection Boy Tracking</h2>';
    html += '<table class="rr-table"><thead><tr><th>#</th><th>Collection Boy</th><th class="rr-right">Samples</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Cash</th><th class="rr-right">Digital</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    collList.forEach(([n, x], i) => {
      let cash = x.byMode['Cash'] || 0;
      let digital = Object.entries(x.byMode).filter(([m]) => m !== 'Cash').reduce((s, [, v]) => s + v, 0);
      html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + x.samples + '</td><td class="rr-right">' + x.tests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + cash + '</td><td class="rr-right">₹' + digital + '</td><td class="rr-right" style="color:#c44536">₹' + x.balance + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

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

  if (d.extraEntries.length) {
    html += '<div class="rr-section"><h2>Extra Collections (Not in Hisab)</h2>';
    html += '<div style="margin-bottom:8px;font-size:12px"><b>Total Extra: ₹' + d.totalExtras + '</b> across ' + d.extraEntries.length + ' entries</div>';
    html += '<table class="rr-table"><thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Tests</th><th class="rr-right">Test Total</th><th class="rr-right">Extra</th><th>Reason</th></tr></thead><tbody>';
    d.extraEntries.forEach(x => {
      html += '<tr><td>' + formatDate(x.date) + '</td><td><b>' + x.name + '</b></td><td>' + (x.doctorName || '-') + '</td><td style="font-size:10px">' + x.tests + '</td><td class="rr-right">₹' + x.subtotal + '</td><td class="rr-right" style="color:#c8843c;font-weight:700">₹' + x.extra + '</td><td style="font-size:10px">' + (x.reason || '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  let dateList = Object.entries(d.byDate).sort((a, b) => a[0].localeCompare(b[0]));
  if (dateList.length) {
    html += '<div class="rr-section"><h2>Daily Breakdown</h2>';
    html += '<table class="rr-table"><thead><tr><th>Date</th><th class="rr-right">Patients</th><th class="rr-right">Tests</th><th class="rr-right">Revenue</th><th class="rr-right">Cash</th><th class="rr-right">Digital</th><th class="rr-right">Balance</th></tr></thead><tbody>';
    dateList.forEach(([date, x]) => {
      let dayTests = d.filtered.filter(e => e.date === date).reduce((s, e) => s + e.tests.length, 0);
      let digital = (x.gpay || 0) + (x.otherDigital || 0);
      html += '<tr><td>' + formatDate(date) + '</td><td class="rr-right">' + x.count + '</td><td class="rr-right">' + dayTests + '</td><td class="rr-right">₹' + x.revenue + '</td><td class="rr-right">₹' + (x.cash || 0) + '</td><td class="rr-right">₹' + digital + '</td><td class="rr-right" style="color:#c44536">₹' + (x.revenue - x.paid) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  html += '<div class="rr-section rr-page-break"><h2>Full Ledger — All Entries</h2>';
  html += '<table class="rr-table"><thead><tr><th>#</th><th>Date</th><th>Operator</th><th>Patient</th><th>Doctor</th><th>Tests</th><th class="rr-right">Total</th><th class="rr-right">Paid</th><th class="rr-right">Balance</th><th>Mode</th></tr></thead><tbody>';
  d.filtered.sort((a, b) => a.date.localeCompare(b.date)).forEach((e, i) => {
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(dc => dc.id === e.doctorId) : null;
    let dn = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : '-'));
    let tn = e.tests.map(t => t.name).join(', ');
    html += '<tr><td class="rr-center">' + (i + 1) + '</td><td>' + formatDate(e.date) + '</td><td style="font-size:10px">' + (e.filledBy || '-') + '</td><td><b>' + e.name + '</b></td><td style="font-size:10px">' + dn + '</td><td style="font-size:10px">' + tn + '</td><td class="rr-right"><b>₹' + e.total + '</b></td><td class="rr-right">₹' + e.paid + '</td><td class="rr-right" style="color:' + (e.balance > 0 ? '#c44536' : '#1b874b') + '">₹' + e.balance + '</td><td style="font-size:10px">' + e.paymentMode + '</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="rr-footer">Shree Balaji Clinical Laboratory · Confidential · Generated ' + today + '</div>';
  html += '</div>';

  document.getElementById('printArea').innerHTML = html;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function metricBox(label, value) {
  return '<div class="rr-metric"><div class="rr-metric-label">' + label + '</div><div class="rr-metric-value">' + value + '</div></div>';
}
