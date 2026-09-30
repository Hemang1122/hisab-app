// ========== REGISTER ==========

function renderRegister() {
  let date = getDateFromPicker('reg');
  let docFilter = document.getElementById('regDocFilter').value;
  let search = (document.getElementById('regSearch').value || '').toLowerCase();
  let filtered = entries.filter(e => {
    if (e.date !== date) return false;
    if (docFilter && e.doctorId !== docFilter) return false;
    if (search && !e.name.toLowerCase().includes(search)) return false;
    return true;
  });
  let c = document.getElementById('registerList');
  if (!c) return;
  if (!filtered.length) { c.innerHTML = '<div class="empty">Koi entry nahi mili.</div>'; return; }
  let totalAmt = 0, totalPaid = 0;
  let rows = filtered.map((e, i) => {
    totalAmt += e.total; totalPaid += e.paid;
    let tnames = e.tests.map(t => t.name).join(', ');
    let status;
    if (e.hospitalPaid) { status = '<span class="badge" style="background:#e7f0fd;color:#1e4d8c">🏥 Hospital</span>'; }
    else if (e.balance > 0) { status = '<span class="badge badge-red">₹' + e.balance + ' Baaki</span>'; }
    else { status = '<span class="badge badge-green">Paid</span>'; }
    let payBtn = e.balance > 0 ? '<button class="btn btn-success btn-xs" onclick="updatePayment(\'' + e.id + '\')" style="margin-right:4px">₹ Pay</button>' : '';
    let liveDoc = e.doctorId && e.doctorId !== '__self__' ? doctors.find(d => d.id === e.doctorId) : null;
    let docName = liveDoc ? liveDoc.name : (e.doctorName || '-');
    let liveColl = e.collectorId ? collectors.find(c => c.id === e.collectorId) : null;
    let collName = liveColl ? liveColl.name : (e.collectorName || '-');
    return '<tr>' +
      '<td style="text-align:center"><input type="checkbox" class="reg-sel" data-id="' + e.id + '" onchange="updateBulkBar()"></td>' +
      '<td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + (e.age || '-') + '/' + e.gender + '</td>' +
      '<td>' + docName + '</td><td style="font-size:11px">' + tnames + '</td>' +
      '<td>₹' + e.total + '</td><td>₹' + e.paid + '</td><td>' + status + '</td>' +
      '<td>' + e.paymentMode + '</td><td>' + collName + '</td>' +
      '<td>' + payBtn + '</td></tr>';
  }).join('');
  c.innerHTML =
    '<div id="regBulkBar" style="display:none;position:sticky;top:0;z-index:5;background:#fff4e6;border:1px solid var(--accent);border-radius:6px;padding:8px 12px;margin-bottom:8px;align-items:center;justify-content:space-between;gap:8px">' +
      '<span style="font-size:13px"><b id="regSelCount">0</b> selected</span>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-secondary" onclick="clearRegSelection()" style="font-size:11px">Clear</button>' +
        '<button class="btn btn-sm btn-danger" onclick="bulkDeleteEntries()" style="font-size:11px">🗑️ Delete Selected</button>' +
      '</div>' +
    '</div>' +
    '<table><tr><th style="width:32px;text-align:center"><input type="checkbox" onchange="toggleAllReg(this)" title="Select all"></th><th>#</th><th>Naam</th><th>Age/G</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Paid</th><th>Status</th><th>Mode</th><th>Collection</th><th></th></tr>' + rows + '</table>' +
    '<div class="total-bar"><span>Entries: <b>' + filtered.length + '</b></span><span>Total: <b>₹' + totalAmt + '</b></span><span>Paid: <b>₹' + totalPaid + '</b></span><span>Baaki: <b>₹' + (totalAmt - totalPaid) + '</b></span></div>';
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
