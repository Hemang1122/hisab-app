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
  // Get current filter info for cover page
  let payFilter = document.getElementById('regPayFilter') ? document.getElementById('regPayFilter').value : '';
  let modeFilter = document.getElementById('regModeFilter') ? document.getElementById('regModeFilter').value : '';
  let collFilter = document.getElementById('regCollFilter') ? document.getElementById('regCollFilter').value : '';
  let docFilter = document.getElementById('regDocFilter').value;
  let search = (document.getElementById('regSearch').value || '').trim();

  // Build filter description
  let filterParts = [];
  if (payFilter) {
    let payLabels = { paid: '✅ Paid', balance: '💰 Balance', hold: '⏸️ Hold', cashless: '💳 Cashless', nocut: '🆓 No Cut', hospital: '🏥 Hospital' };
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

  // Date info
  let dateLabel = '';
  if (regDateMode === 'day') {
    let date = getDateFromPicker('reg');
    dateLabel = formatDateInv(date);
  } else {
    let from = document.getElementById('regFromDate').value;
    let to = document.getElementById('regToDate').value;
    dateLabel = formatDateInv(from) + ' to ' + formatDateInv(to);
  }

  // Get the register table + summary
  let summaryHtml = document.getElementById('regSummaryBar').innerHTML;
  let tableHtml = document.getElementById('registerList').innerHTML;

  // Build cover page
  let cover = '<div class="reg-print-cover">' +
    '<div class="cover-logo">श्री</div>' +
    '<h1>Shree Balaji Clinical Laboratory</h1>' +
    '<h2>Pathology & Diagnostic Services</h2>' +
    '<hr style="width:200px;border:1px solid #1565c0;margin:20px auto">' +
    '<div style="font-size:24px;font-weight:700;color:#1565c0;margin:20px 0">📋 Register Report</div>' +
    '<div class="cover-meta"><b>Period:</b> ' + dateLabel + '</div>' +
    '<div class="cover-meta"><b>Filter:</b> ' + filterLabel + '</div>' +
    '<div class="cover-meta"><b>Generated:</b> ' + new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</div>' +
    '</div>';

  let printWin = window.open('', '_blank');
  printWin.document.write('<!DOCTYPE html><html><head><title>Register Report — ' + filterLabel + '</title>');
  printWin.document.write('<style>');
  printWin.document.write('body { font-family: -apple-system, system-ui, sans-serif; color:#222; margin:0; padding:0; }');
  printWin.document.write('.reg-print-cover { page-break-after:always; text-align:center; padding:80px 40px; min-height:80vh; display:flex; flex-direction:column; align-items:center; justify-content:center; }');
  printWin.document.write('.reg-print-cover h1 { font-size:28px; color:#1565c0; margin:8px 0; }');
  printWin.document.write('.reg-print-cover h2 { font-size:18px; color:#555; font-weight:400; margin:0 0 20px; }');
  printWin.document.write('.cover-logo { font-size:48px; color:#1b8a6b; margin-bottom:10px; }');
  printWin.document.write('.cover-meta { font-size:14px; color:#555; margin:6px 0; }');
  printWin.document.write('.content-page { padding:20px 30px; }');
  printWin.document.write('.content-page h3 { font-size:14px; color:#1565c0; margin:0 0 10px; }');
  printWin.document.write('table { width:100%; border-collapse:collapse; font-size:10px; }');
  printWin.document.write('th, td { padding:4px 6px; border:1px solid #ddd; text-align:left; }');
  printWin.document.write('th { background:#f5f5f5; font-weight:600; }');
  printWin.document.write('.total-bar { display:flex; gap:16px; padding:8px 12px; background:#f5f5f5; border-radius:6px; font-size:12px; margin-top:8px; }');
  printWin.document.write('.badge, .badge-green, .badge-red, .inv-status-hold { font-size:9px; padding:2px 6px; border-radius:4px; }');
  printWin.document.write('.badge-green { background:#e8f5e9; color:#2e7d32; }');
  printWin.document.write('.badge-red { background:#fbe9e7; color:#c62828; }');
  printWin.document.write('.inv-status-hold { background:#fff3e0; color:#e65100; }');
  printWin.document.write('.reg-chip { font-size:10px; padding:3px 8px; border-radius:12px; display:inline-block; margin:2px; }');
  printWin.document.write('.reg-chip-green { background:#e8f5e9; color:#2e7d32; }');
  printWin.document.write('.reg-chip-red { background:#fbe9e7; color:#c62828; }');
  printWin.document.write('.reg-chip-orange { background:#fff3e0; color:#e65100; }');
  printWin.document.write('.reg-chip-teal { background:#e0f2f1; color:#00695c; }');
  printWin.document.write('.reg-chip-purple { background:#f3e5f5; color:#6a1b9a; }');
  printWin.document.write('.reg-chip-blue { background:#e3f2fd; color:#1565c0; }');
  printWin.document.write('.reg-chip-gray { background:#f5f5f5; color:#555; }');
  printWin.document.write('.no-print, .btn, input[type="checkbox"] { display:none !important; }');
  printWin.document.write('@media print { .reg-print-cover { page-break-after:always; } table { font-size:9px; } }');
  printWin.document.write('</style></head><body>');
  printWin.document.write(cover);
  printWin.document.write('<div class="content-page">');
  printWin.document.write('<h3>📋 Register — ' + filterLabel + ' — ' + dateLabel + '</h3>');
  if (summaryHtml) printWin.document.write('<div style="margin-bottom:12px">' + summaryHtml + '</div>');
  printWin.document.write(tableHtml);
  printWin.document.write('</div></body></html>');
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 300);
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
