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
    let status = e.balance > 0 ? '<span class="badge badge-red">₹' + e.balance + ' Baaki</span>' : '<span class="badge badge-green">Paid</span>';
    let payBtn = e.balance > 0 ? '<button class="btn btn-success btn-xs" onclick="updatePayment(\'' + e.id + '\')" style="margin-right:4px">₹ Pay</button>' : '';
    // Look up current names from live lists so renames reflect everywhere
    let liveDoc = e.doctorId && e.doctorId !== '__self__' ? doctors.find(d => d.id === e.doctorId) : null;
    let docName = liveDoc ? liveDoc.name : (e.doctorName || '-');
    let liveColl = e.collectorId ? collectors.find(c => c.id === e.collectorId) : null;
    let collName = liveColl ? liveColl.name : (e.collectorName || '-');
    return '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + (e.age || '-') + '/' + e.gender + '</td>' +
      '<td>' + docName + '</td><td style="font-size:11px">' + tnames + '</td>' +
      '<td>₹' + e.total + '</td><td>₹' + e.paid + '</td><td>' + status + '</td>' +
      '<td>' + e.paymentMode + '</td><td>' + collName + '</td>' +
      '<td>' + payBtn + '<button class="del-btn" onclick="deleteEntry(\'' + e.id + '\')">🗑️</button></td></tr>';
  }).join('');
  c.innerHTML = '<table><tr><th>#</th><th>Naam</th><th>Age/G</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Paid</th><th>Status</th><th>Mode</th><th>Collection</th><th></th></tr>' + rows + '</table>' +
    '<div class="total-bar"><span>Entries: <b>' + filtered.length + '</b></span><span>Total: <b>₹' + totalAmt + '</b></span><span>Paid: <b>₹' + totalPaid + '</b></span><span>Baaki: <b>₹' + (totalAmt - totalPaid) + '</b></span></div>';
}

function deleteEntry(id) {
  if (!confirm('Entry delete karni hai?')) return;
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
