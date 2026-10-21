// ========== REGISTER ==========

let regDateMode = 'day'; // 'day' or 'range'

function formatPayModes(e) {
  if (e.paymentModes && e.paymentModes.length > 1) {
    return e.paymentModes.map(s => s.mode + (s.amount > 0 ? ' ₹' + s.amount : '')).join(' + ');
  }
  return e.paymentMode || 'Cash';
}

function setRegDateMode(mode) {
  regDateMode = mode;
  document.getElementById('regDateModeDay').className = 'btn btn-sm ' + (mode === 'day' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('regDateModeRange').className = 'btn btn-sm ' + (mode === 'range' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('regDayPicker').style.display = mode === 'day' ? 'flex' : 'none';
  document.getElementById('regRangePicker').style.display = mode === 'range' ? 'flex' : 'none';
  // Set default range dates if empty
  if (mode === 'range') {
    let fromEl = document.getElementById('regFromDate');
    let toEl = document.getElementById('regToDate');
    if (!fromEl.value) {
      let now = new Date();
      let y = now.getFullYear(), m = now.getMonth();
      fromEl.value = y + '-' + String(m + 1).padStart(2, '0') + '-01';
      toEl.value = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(new Date(y, m + 1, 0).getDate()).padStart(2, '0');
    }
  }
  renderRegister();
}

function initRegCollectorFilter() {
  let sel = document.getElementById('regCollFilter');
  if (!sel) return;
  let val = sel.value;
  sel.innerHTML = '<option value="">Sabhi Collectors</option>';
  collectors.forEach(c => {
    sel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
  });
  sel.value = val;
}

function getRegPayStatus(e) {
  if (e.hold) return 'hold';
  if (e.noCut) return 'nocut';
  if (e.cashless) return 'cashless';
  if (e.hospitalPaid) return 'hospital';
  if (e.balance > 0) return 'balance';
  return 'paid';
}

function renderRegister() {
  let docFilter = document.getElementById('regDocFilter').value;
  let payFilter = document.getElementById('regPayFilter') ? document.getElementById('regPayFilter').value : '';
  let modeFilter = document.getElementById('regModeFilter') ? document.getElementById('regModeFilter').value : '';
  let collFilter = document.getElementById('regCollFilter') ? document.getElementById('regCollFilter').value : '';
  let search = (document.getElementById('regSearch').value || '').toLowerCase();

  let filtered = entries.filter(e => {
    // Date filter
    if (regDateMode === 'day') {
      let date = getDateFromPicker('reg');
      if (e.date !== date) return false;
    } else {
      let from = document.getElementById('regFromDate').value;
      let to = document.getElementById('regToDate').value;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
    }
    // Doctor filter
    if (docFilter && e.doctorId !== docFilter) return false;
    // Payment status filter
    if (payFilter) {
      let ps = getRegPayStatus(e);
      if (ps !== payFilter) return false;
    }
    // Payment mode filter (check splits too)
    if (modeFilter) {
      if (e.paymentModes && e.paymentModes.length) {
        if (!e.paymentModes.some(s => s.mode === modeFilter)) return false;
      } else {
        if (e.paymentMode !== modeFilter) return false;
      }
    }
    // Collector filter
    if (collFilter && e.collectorId !== collFilter) return false;
    // Search
    if (search && !e.name.toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort by date descending for range mode
  if (regDateMode === 'range') {
    filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Compute summary stats from filtered data
  renderRegSummary(filtered);

  let c = document.getElementById('registerList');
  if (!c) return;
  if (!filtered.length) { c.innerHTML = '<div class="empty">Koi entry nahi mili.</div>'; return; }
  let totalAmt = 0, totalPaid = 0;
  let rows = filtered.map((e, i) => {
    totalAmt += e.total; totalPaid += e.paid;
    let tnames = e.tests.map(t => t.name).join(', ');
    let status;
    if (e.hold) { status = '<span class="inv-status-hold">⏸️ Hold</span>'; }
    else if (e.noCut) { status = '<span class="badge" style="background:#f3e5f5;color:#6a1b9a">🆓 No Cut</span>'; }
    else if (e.cashless) { status = '<span class="badge" style="background:#e0f2f1;color:#00695c">💳 Cashless</span>'; }
    else if (e.hospitalPaid) { status = '<span class="badge" style="background:#e7f0fd;color:#1e4d8c">🏥 Hospital</span>'; }
    else if (e.balance > 0) { status = '<span class="badge badge-red">₹' + e.balance + ' Baaki</span>'; }
    else { status = '<span class="badge badge-green">Paid</span>'; }
    let payBtn = e.balance > 0 ? '<button class="btn btn-success btn-xs" onclick="updatePayment(\'' + e.id + '\')" style="margin-right:4px">₹ Pay</button>' : '';
    let liveDoc = e.doctorId && e.doctorId !== '__self__' ? doctors.find(d => d.id === e.doctorId) : null;
    let docName = liveDoc ? liveDoc.name : (e.doctorName || '-');
    let liveColl = e.collectorId ? collectors.find(cc => cc.id === e.collectorId) : null;
    let collName = liveColl ? liveColl.name : (e.collectorName || '-');
    let dateCol = regDateMode === 'range' ? '<td style="font-size:11px;white-space:nowrap">' + e.date + '</td>' : '';
    return '<tr>' +
      '<td style="text-align:center"><input type="checkbox" class="reg-sel" data-id="' + e.id + '" onchange="updateBulkBar()"></td>' +
      '<td>' + (i + 1) + '</td>' + dateCol + '<td>' + e.name + '</td><td>' + (e.age || '-') + '/' + e.gender + '</td>' +
      '<td>' + docName + '</td><td style="font-size:11px">' + tnames + '</td>' +
      '<td>₹' + e.total + '</td><td>₹' + e.paid + '</td><td>' + status + '</td>' +
      '<td style="font-size:11px">' + formatPayModes(e) + '</td><td>' + collName + '</td>' +
      '<td>' + payBtn + '</td></tr>';
  }).join('');
  let dateHeader = regDateMode === 'range' ? '<th>Date</th>' : '';
  c.innerHTML =
    '<div id="regBulkBar" style="display:none;position:sticky;top:0;z-index:5;background:#fff4e6;border:1px solid var(--accent);border-radius:6px;padding:8px 12px;margin-bottom:8px;align-items:center;justify-content:space-between;gap:8px">' +
      '<span style="font-size:13px"><b id="regSelCount">0</b> selected</span>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-secondary" onclick="clearRegSelection()" style="font-size:11px">Clear</button>' +
        '<button class="btn btn-sm btn-danger" onclick="bulkDeleteEntries()" style="font-size:11px">🗑️ Delete Selected</button>' +
      '</div>' +
    '</div>' +
    '<table><tr><th style="width:32px;text-align:center"><input type="checkbox" onchange="toggleAllReg(this)" title="Select all"></th><th>#</th>' + dateHeader + '<th>Naam</th><th>Age/G</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Paid</th><th>Status</th><th>Mode</th><th>Collection</th><th></th></tr>' + rows + '</table>' +
    '<div class="total-bar"><span>Entries: <b>' + filtered.length + '</b></span><span>Total: <b>₹' + totalAmt + '</b></span><span>Paid: <b>₹' + totalPaid + '</b></span><span>Baaki: <b>₹' + (totalAmt - totalPaid) + '</b></span></div>';
}

function renderRegSummary(filtered) {
  let bar = document.getElementById('regSummaryBar');
  if (!bar) return;
  if (!filtered.length) { bar.innerHTML = ''; return; }

  // Count by payment status
  let paidCount = 0, balCount = 0, holdCount = 0, cashlessCount = 0, noCutCount = 0, hospCount = 0;
  // Count by payment mode
  let modeCounts = {};
  // Count by collector
  let collCounts = {};

  filtered.forEach(e => {
    let ps = getRegPayStatus(e);
    if (ps === 'paid') paidCount++;
    else if (ps === 'balance') balCount++;
    else if (ps === 'hold') holdCount++;
    else if (ps === 'cashless') cashlessCount++;
    else if (ps === 'nocut') noCutCount++;
    else if (ps === 'hospital') hospCount++;

    if (e.paymentModes && e.paymentModes.length > 1) {
      e.paymentModes.forEach(s => { modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1; });
    } else {
      let mode = e.paymentMode || 'Other';
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    }

    if (e.collectorId) {
      let liveColl = collectors.find(cc => cc.id === e.collectorId);
      let cName = liveColl ? liveColl.name : (e.collectorName || 'Unknown');
      collCounts[cName] = (collCounts[cName] || 0) + 1;
    }
  });

  // Build chips
  let statusChips = '';
  if (paidCount) statusChips += '<span class="reg-chip reg-chip-green" onclick="document.getElementById(\'regPayFilter\').value=\'paid\';renderRegister()">✅ Paid: ' + paidCount + '</span>';
  if (balCount) statusChips += '<span class="reg-chip reg-chip-red" onclick="document.getElementById(\'regPayFilter\').value=\'balance\';renderRegister()">💰 Balance: ' + balCount + '</span>';
  if (holdCount) statusChips += '<span class="reg-chip reg-chip-orange" onclick="document.getElementById(\'regPayFilter\').value=\'hold\';renderRegister()">⏸️ Hold: ' + holdCount + '</span>';
  if (cashlessCount) statusChips += '<span class="reg-chip reg-chip-teal" onclick="document.getElementById(\'regPayFilter\').value=\'cashless\';renderRegister()">💳 Cashless: ' + cashlessCount + '</span>';
  if (noCutCount) statusChips += '<span class="reg-chip reg-chip-purple" onclick="document.getElementById(\'regPayFilter\').value=\'nocut\';renderRegister()">🆓 No Cut: ' + noCutCount + '</span>';
  if (hospCount) statusChips += '<span class="reg-chip reg-chip-blue" onclick="document.getElementById(\'regPayFilter\').value=\'hospital\';renderRegister()">🏥 Hospital: ' + hospCount + '</span>';

  let modeChips = '';
  Object.keys(modeCounts).sort().forEach(m => {
    modeChips += '<span class="reg-chip reg-chip-gray" onclick="document.getElementById(\'regModeFilter\').value=\'' + m + '\';renderRegister()">' + m + ': ' + modeCounts[m] + '</span>';
  });

  let collChips = '';
  Object.keys(collCounts).sort().forEach(cn => {
    collChips += '<span class="reg-chip reg-chip-gray">' + cn + ': ' + collCounts[cn] + '</span>';
  });

  bar.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">' + statusChips + '</div>' +
    (modeChips ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">' + modeChips + '</div>' : '') +
    (collChips ? '<div style="display:flex;flex-wrap:wrap;gap:6px">' + collChips + '</div>' : '');
}

function toggleAllReg(cb) {
  document.querySelectorAll('.reg-sel').forEach(x => x.checked = cb.checked);
  updateBulkBar();
}

function updateBulkBar() {
  let selected = document.querySelectorAll('.reg-sel:checked');
  let bar = document.getElementById('regBulkBar');
  if (!bar) return;
  if (selected.length > 0) {
    bar.style.display = 'flex';
    document.getElementById('regSelCount').textContent = selected.length;
  } else {
    bar.style.display = 'none';
  }
}

function clearRegSelection() {
  document.querySelectorAll('.reg-sel').forEach(x => x.checked = false);
  updateBulkBar();
}

function printRegister() {
  let payFilter = document.getElementById('regPayFilter') ? document.getElementById('regPayFilter').value : '';
  let modeFilter = document.getElementById('regModeFilter') ? document.getElementById('regModeFilter').value : '';
  let collFilter = document.getElementById('regCollFilter') ? document.getElementById('regCollFilter').value : '';
  let docFilter = document.getElementById('regDocFilter').value;
  let search = (document.getElementById('regSearch').value || '').trim();

  let filterParts = [];
  if (payFilter) {
    let payLabels = { paid: 'Paid', balance: 'Balance', hold: 'Hold', cashless: 'Cashless', nocut: 'No Cut', hospital: 'Hospital' };
    filterParts.push(payLabels[payFilter] || payFilter);
  }
  if (modeFilter) filterParts.push('Mode: ' + modeFilter);
  if (collFilter) {
    let collSel = document.getElementById('regCollFilter');
    filterParts.push('Collector: ' + collSel.options[collSel.selectedIndex].text);
  }
  if (docFilter) {
    let docSel = document.getElementById('regDocFilter');
    filterParts.push('Doctor: ' + docSel.options[docSel.selectedIndex].text);
  }
  if (search) filterParts.push('Search: "' + search + '"');
  let filterLabel = filterParts.length ? filterParts.join(' · ') : 'All Entries';

  let dateLabel = '';
  if (regDateMode === 'day') {
    dateLabel = formatDateInv(getDateFromPicker('reg'));
  } else {
    dateLabel = formatDateInv(document.getElementById('regFromDate').value) + ' — ' + formatDateInv(document.getElementById('regToDate').value);
  }

  let summaryHtml = document.getElementById('regSummaryBar').innerHTML;
  let tableHtml = document.getElementById('registerList').innerHTML;
  let genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let bodyHtml = '';
  if (summaryHtml) bodyHtml += '<div style="margin-bottom:12px">' + summaryHtml + '</div>';
  bodyHtml += tableHtml;

  openPrintWindow(
    'Register — ' + filterLabel,
    '📋 REGISTER REPORT',
    [
      '<b>Period:</b> ' + dateLabel,
      '<b>Filter:</b> ' + filterLabel,
      '<b>Generated:</b> ' + genDate
    ],
    bodyHtml
  );
}

function bulkDeleteEntries() {
  let ids = Array.from(document.querySelectorAll('.reg-sel:checked')).map(x => x.dataset.id);
  if (!ids.length) return;
  entries = entries.filter(e => !ids.includes(e.id));
  saveLocal();
  ids.forEach(id => sbDelete('entries', id));
  renderRegister();
  refreshSidebar();
}

function deleteEntry(id) {
  // Kept for backwards compatibility (sidebar single-delete still uses it)
  entries = entries.filter(e => e.id !== id);
  saveLocal(); sbDelete('entries', id);
  renderRegister(); refreshSidebar();
}

function updatePayment(id) {
  let e = entries.find(x => x.id === id);
  if (!e) return;
  let remaining = e.total - e.paid;
  let amt = prompt('Balance ₹' + remaining + ' hai. Kitna receive hua?', remaining);
  if (amt === null) return;
  amt = parseFloat(amt) || 0;
  if (amt <= 0) return alert('Amount 0 se zyada hona chahiye!');
  if (amt > remaining) amt = remaining;
  e.paid += amt;
  e.balance = Math.max(0, e.total - e.paid);
  e.paymentUpdated = new Date().toISOString();
  saveLocal();
  if (dbReady) sbSave('entries', e.id, e);
  renderRegister();
  refreshSidebar();
  alert('Payment updated! ' + (e.balance > 0 ? 'Baaki: ₹' + e.balance : 'Full Paid ✓'));
}
