// ========== HISAB PRINT (PER-PATIENT, ENGLISH, FOR DOCTOR) ==========

function generateHisab() {
  let from = document.getElementById('hFrom').value, to = document.getElementById('hTo').value;
  let docId = document.getElementById('hDoctor').value;
  if (!docId) return alert('Doctor select karo!');
  if (!from || !to) return alert('Date range daalo!');
  let doc = doctors.find(d => d.id === docId);
  let filtered = entries.filter(e => e.doctorId === docId && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (!filtered.length) { document.getElementById('hisabResult').innerHTML = '<div class="empty">No entries found in this date range.</div>'; return; }

  let grandTotal = 0, grandDoc = 0, grandLab = 0, grandPaid = 0, grandBal = 0;
  let rows = filtered.map((e, i) => {
    let docS = 0, labS = 0;
    e.tests.forEach(t => { docS += t.docShare; labS += t.labShare; });
    grandTotal += e.total; grandDoc += docS; grandLab += labS; grandPaid += e.paid; grandBal += e.balance;
    let tnames = e.tests.map(t => t.name).join(', ');
    let payBal = e.balance > 0 ? 'Paid ₹' + e.paid + ' / Bal ₹' + e.balance : 'Paid ₹' + e.total;
    return '<tr><td>' + e.date + '</td><td>' + e.name + '</td><td style="font-size:11px">' + tnames + '</td><td>₹' + e.total + '</td><td>₹' + docS + '</td><td>₹' + labS + '</td><td>' + payBal + '</td><td>' + e.paymentMode + '</td></tr>';
  }).join('');

  document.getElementById('hisabResult').innerHTML = '<div class="card" id="hisabPrintContent">' +
    '<div style="text-align:center;margin-bottom:10px">' +
    '<h2 style="margin:0">Shree Balaji Clinical Lab</h2>' +
    '<p style="font-size:13px;color:#555">Account Statement</p></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">' +
    '<span><b>Doctor:</b> ' + doc.name + '</span>' +
    '<span><b>Period:</b> ' + from + ' to ' + to + '</span></div>' +
    '<table><tr><th>Date</th><th>Patient</th><th>Tests</th><th>Total</th><th>Doctor</th><th>Lab</th><th>Paid / Balance</th><th>Mode</th></tr>' + rows + '</table>' +
    '<div style="margin-top:14px;padding:10px;background:#f0f0f0;border-radius:6px;font-size:14px">' +
    '<div class="flex-between" style="margin-bottom:6px"><span>Total Patients:</span><b>' + filtered.length + '</b></div>' +
    '<div class="flex-between" style="margin-bottom:6px"><span>Total Amount:</span><b style="color:#1a5276;font-size:16px">₹' + grandTotal + '</b></div>' +
    '<div class="flex-between" style="margin-bottom:6px"><span>Doctor Share:</span><b style="color:#27ae60;font-size:16px">₹' + grandDoc + '</b></div>' +
    '<div class="flex-between" style="margin-bottom:6px"><span>Lab Share:</span><b style="color:#2980b9;font-size:16px">₹' + grandLab + '</b></div>' +
    '<hr>' +
    '<div class="flex-between" style="margin-bottom:4px"><span>Total Paid:</span><b>₹' + grandPaid + '</b></div>' +
    '<div class="flex-between"><span>Total Balance:</span><b style="color:#c0392b">₹' + grandBal + '</b></div>' +
    '</div></div>';
}

function printHisab() {
  let content = document.getElementById('hisabPrintContent');
  if (!content) return alert('Pehle Hisab banao!');
  document.getElementById('printArea').innerHTML = content.innerHTML;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}
