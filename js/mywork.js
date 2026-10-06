// ========== OPERATOR TRACKING + MERA KAAM ==========

// Operator name persists across browser restarts via localStorage.
// Click the badge to change the operator.
function getOperator() {
  try { return localStorage.getItem('hv2_operator') || ''; } catch (e) { return ''; }
}

function setOperatorName(name) {
  try { localStorage.setItem('hv2_operator', name); } catch (e) {}
  updateOperatorBadge();
}

function clearOperator() {
  try { localStorage.removeItem('hv2_operator'); } catch (e) {}
  updateOperatorBadge();
  promptOperator();
}

function updateOperatorBadge() {
  let name = getOperator();
  let badge = document.getElementById('operatorBadge');
  let nameSpan = document.getElementById('operatorName');
  if (!badge || !nameSpan) return;
  if (name) {
    badge.style.display = 'inline-flex';
    nameSpan.textContent = name;
  } else {
    badge.style.display = 'none';
  }
  let hdr = document.getElementById('myWorkOperator');
  if (hdr) hdr.textContent = name ? '· ' + name : '';
}

function promptOperator() {
  let modal = document.getElementById('operatorModal');
  let input = document.getElementById('operatorInput');
  if (!modal || !input) return;
  input.value = getOperator();
  modal.classList.add('show');
  setTimeout(() => input.focus(), 100);
}

function saveOperator() {
  let name = (document.getElementById('operatorInput').value || '').trim();
  if (!name) { alert('Naam daalo!'); return; }
  setOperatorName(name);
  closeModal('operatorModal');
  if (typeof toast === 'function') toast('👤 Welcome ' + name + '!');
}

// Initialise on load — show modal if no operator yet
function initOperator() {
  updateOperatorBadge();
  if (!getOperator()) {
    setTimeout(() => promptOperator(), 400);
  }
}

// ========== MERA KAAM (Operator's Work View) ==========

function setMyWorkPreset(preset) {
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
  else if (preset === 'thisMonth') {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  }
  else if (preset === 'all') {
    if (entries.length) from = entries.map(e => e.date).sort()[0];
    else from = to;
  }
  document.getElementById('mwFrom').value = from;
  document.getElementById('mwTo').value = to;
  showMyWork();
}

function showMyWork() {
  let from = document.getElementById('mwFrom').value;
  let to = document.getElementById('mwTo').value;
  let scope = document.getElementById('mwOperator').value;
  if (!from || !to) { from = to = new Date().toISOString().slice(0, 10); }

  let filtered = entries.filter(e => e.date >= from && e.date <= to);
  let currentOp = getOperator();

  if (scope === '__me__') {
    filtered = filtered.filter(e => (e.filledBy || '').toLowerCase() === currentOp.toLowerCase());
  } else if (scope && scope.startsWith('op:')) {
    let opName = scope.substring(3).toLowerCase();
    filtered = filtered.filter(e => (e.filledBy || '').toLowerCase() === opName);
  }

  let c = document.getElementById('myWorkResult');
  if (!filtered.length) {
    c.innerHTML = '<div class="card"><div class="empty">Is date range mein koi entry nahi mili.</div></div>';
    return;
  }

  // Group by operator + date
  let byOpDate = {}, byOp = {}, totalRev = 0, totalPaid = 0;
  filtered.forEach(e => {
    let op = e.filledBy || 'Unknown';
    if (!byOp[op]) byOp[op] = { entries: 0, revenue: 0, paid: 0, balance: 0, tests: 0, dates: new Set() };
    byOp[op].entries++;
    byOp[op].revenue += e.total || 0;
    byOp[op].paid += e.paid || 0;
    byOp[op].balance += e.balance || 0;
    byOp[op].tests += (e.tests || []).length;
    byOp[op].dates.add(e.date);
    totalRev += e.total || 0;
    totalPaid += e.paid || 0;

    let key = op + '||' + e.date;
    if (!byOpDate[key]) byOpDate[key] = { op, date: e.date, entries: 0, revenue: 0, paid: 0, tests: 0 };
    byOpDate[key].entries++;
    byOpDate[key].revenue += e.total || 0;
    byOpDate[key].paid += e.paid || 0;
    byOpDate[key].tests += (e.tests || []).length;
  });

  let html = '';

  // Header: quick stats
  html += '<div class="stat-grid">';
  html += '<div class="stat-card blue"><div class="stat-label">Total Entries</div><div class="stat-value">' + filtered.length + '</div></div>';
  html += '<div class="stat-card green"><div class="stat-label">Total Revenue</div><div class="stat-value">₹' + totalRev + '</div></div>';
  html += '<div class="stat-card purple"><div class="stat-label">Total Paid</div><div class="stat-value">₹' + totalPaid + '</div></div>';
  html += '<div class="stat-card yellow"><div class="stat-label">Operators</div><div class="stat-value">' + Object.keys(byOp).length + '</div></div>';
  html += '</div>';

  // Operator summary cards
  html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">👤 Operator Activity Summary</h3>';
  html += '<div class="stat-grid" style="margin-bottom:12px">';
  Object.entries(byOp).sort((a, b) => b[1].entries - a[1].entries).forEach(([name, s]) => {
    let daysWorked = s.dates.size;
    let avgTicket = s.entries > 0 ? Math.round(s.revenue / s.entries) : 0;
    html += '<div class="stat-card blue" style="text-align:left;padding:14px">' +
      '<div style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--brand)">' + name + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">' +
      '<span>Entries: <b>' + s.entries + '</b></span>' +
      '<span>Days: <b>' + daysWorked + '</b></span>' +
      '<span>Revenue: <b>₹' + s.revenue + '</b></span>' +
      '<span>Tests: <b>' + s.tests + '</b></span>' +
      '<span>Paid: <b style="color:var(--paid)">₹' + s.paid + '</b></span>' +
      '<span>Avg: <b>₹' + avgTicket + '</b></span>' +
      '</div></div>';
  });
  html += '</div></div>';

  // Day-by-day breakdown per operator
  html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">📅 Day-by-day breakdown</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><tr><th>Date</th><th>Operator</th><th style="text-align:right">Entries</th><th style="text-align:right">Tests</th><th style="text-align:right">Revenue</th><th style="text-align:right">Paid</th></tr>';
  let rows = Object.values(byOpDate).sort((a, b) => a.date.localeCompare(b.date) || a.op.localeCompare(b.op));
  rows.forEach(r => {
    html += '<tr><td>' + r.date + '</td><td><b>' + r.op + '</b></td><td style="text-align:right">' + r.entries + '</td><td style="text-align:right">' + r.tests + '</td><td style="text-align:right">₹' + r.revenue + '</td><td style="text-align:right">₹' + r.paid + '</td></tr>';
  });
  html += '</table></div></div>';

  // Individual entries
  html += '<div class="card"><h3 style="font-size:15px;margin-bottom:10px">📋 Entries (' + filtered.length + ')</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:11px"><tr><th>#</th><th>Date</th><th>Time</th><th>Operator</th><th>Patient</th><th>Doctor</th><th>Tests</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th>Mode</th></tr>';
  filtered.sort((a, b) => (b.created || '').localeCompare(a.created || '')).forEach((e, i) => {
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(d => d.id === e.doctorId) : null;
    let dn = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : '-'));
    let tnames = (e.tests || []).map(t => t.name).join(', ');
    let timeStr = e.created ? new Date(e.created).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-';
    html += '<tr><td>' + (i + 1) + '</td><td>' + e.date + '</td><td style="font-size:10px;color:#888">' + timeStr + '</td><td><b>' + (e.filledBy || '-') + '</b></td><td><b>' + e.name + '</b></td><td style="font-size:10px">' + dn + '</td><td style="font-size:10px;max-width:200px">' + tnames + '</td><td style="text-align:right"><b>₹' + e.total + '</b></td><td style="text-align:right">₹' + e.paid + '</td><td style="font-size:10px">' + (e.paymentMode || '-') + '</td></tr>';
  });
  html += '</table></div></div>';

  c.innerHTML = html;
}

// Initialize My Work date pickers on tab open — always reset to today
function initMyWorkDates() {
  let today = new Date().toISOString().slice(0, 10);
  document.getElementById('mwFrom').value = today;
  document.getElementById('mwTo').value = today;
  showMyWork();
}

// Populate operator dropdown with all known operators from entries
function populateMyWorkOperators() {
  let sel = document.getElementById('mwOperator');
  if (!sel) return;
  let prev = sel.value;
  let ops = new Set();
  entries.forEach(e => { if (e.filledBy) ops.add(e.filledBy); });
  let currentOp = getOperator();
  if (currentOp) ops.add(currentOp);
  let opsList = Array.from(ops).sort();
  sel.innerHTML = '<option value="__all__">All Operators</option>' +
    '<option value="__me__">Just Me (' + (currentOp || '-') + ')</option>' +
    opsList.map(op => '<option value="op:' + op.replace(/"/g, '&quot;') + '">' + op + '</option>').join('');
  if (prev) sel.value = prev;
}
