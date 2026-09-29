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
    return '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + (e.age || '-') + '/' + e.gender + '</td>' +
      '<td>' + e.doctorName + '</td><td style="font-size:11px">' + tnames + '</td>' +
      '<td>₹' + e.total + '</td><td>₹' + e.paid + '</td><td>' + status + '</td>' +
      '<td>' + e.paymentMode + '</td><td>' + (e.collectorName || '-') + '</td>' +
      '<td><button class="del-btn" onclick="deleteEntry(\'' + e.id + '\')">🗑️</button></td></tr>';
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
