// ========== HISAB PRINT (PER-DOCTOR, FOR DOCTOR) ==========

function generateHisab() {
  let from = document.getElementById('hFrom').value, to = document.getElementById('hTo').value;
  let docId = document.getElementById('hDoctor').value;
  if (!docId) return alert('Doctor select karo!');
  if (!from || !to) return alert('Date range daalo!');
  let isSelf = docId === '__self__';
  let doc = isSelf ? { name: 'Self (Walk-in)' } : doctors.find(d => d.id === docId);
  let filtered = entries.filter(e => e.doctorId === docId && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (!filtered.length) { document.getElementById('hisabResult').innerHTML = '<div class="empty">No entries found in this date range.</div>'; return; }

  let grandTotal = 0, grandDoc = 0, grandLab = 0, grandPaid = 0, grandBal = 0;
  let rows = filtered.map((e, i) => {
    let docS = 0, labS = 0;
    e.tests.forEach(t => { docS += (t.docShare || 0); labS += (t.labShare || 0); });
    grandTotal += e.total; grandDoc += docS; grandLab += labS; grandPaid += e.paid; grandBal += e.balance;
    let tnames = e.tests.map(t => t.name).join(', ');
    let payBal = e.balance > 0 ? 'Paid ₹' + e.paid + ' / Bal ₹' + e.balance : 'Paid ₹' + e.total;
    if (isSelf) {
      return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + e.date + '</td><td>' + e.name + '</td><td style="font-size:11px">' + tnames + '</td><td style="text-align:right">₹' + e.total + '</td><td>' + payBal + '</td></tr>';
    }
    return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + e.date + '</td><td>' + e.name + '</td><td style="font-size:11px">' + tnames + '</td><td style="text-align:right">₹' + e.total + '</td><td style="text-align:right">₹' + docS + '</td><td style="text-align:right">₹' + labS + '</td><td>' + payBal + '</td></tr>';
  }).join('');

  let html = '<div id="hisabPrintContent" class="hisab-print">';

  // Header: Lab name
  html += '<div class="hisab-header">';
  html += '<h2 class="hisab-lab-name">Shree Balaji Clinical Laboratory</h2>';
  html += '<p class="hisab-subtitle">' + (isSelf ? 'Walk-in Patient Record' : 'Account Statement / Hisab') + '</p>';
  html += '</div>';

  // Doctor/Hospital bar or Walk-in bar
  html += '<div class="hisab-doctor-bar">';
  html += '<div><strong>' + (isSelf ? 'Type:' : 'Doctor / Hospital:') + '</strong> ' + doc.name + '</div>';
  html += '<div><strong>Period:</strong> ' + from + ' to ' + to + '</div>';
  html += '</div>';

  // Table — Self has no doctor/lab share columns
  if (isSelf) {
    html += '<table class="hisab-table"><thead><tr><th>#</th><th>Date</th><th>Patient</th><th>Tests</th><th>Total</th><th>Payment</th></tr></thead><tbody>' + rows + '</tbody></table>';
  } else {
    html += '<table class="hisab-table"><thead><tr><th>#</th><th>Date</th><th>Patient</th><th>Tests</th><th>Total</th><th>Doctor Share</th><th>Lab Share</th><th>Payment</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  // Summary box
  html += '<div class="hisab-summary">';
  html += '<div class="hisab-summary-title">Summary</div>';
  html += '<div class="hisab-summary-grid">';
  html += '<div class="flex-between"><span>Total Patients:</span><b>' + filtered.length + '</b></div>';
  html += '<div class="flex-between"><span>Total Amount:</span><b>₹' + grandTotal + '</b></div>';
  if (!isSelf) {
    html += '<div class="flex-between"><span>Doctor Share:</span><b style="color:var(--paid)">₹' + grandDoc + '</b></div>';
    html += '<div class="flex-between"><span>Lab Share:</span><b style="color:var(--info)">₹' + grandLab + '</b></div>';
  }
  html += '<hr>';
  html += '<div class="flex-between"><span>Total Paid:</span><b>₹' + grandPaid + '</b></div>';
  html += '<div class="flex-between"><span>Total Balance:</span><b style="color:var(--due)">₹' + grandBal + '</b></div>';
  html += '</div></div>';

  // Signature section — only lab signature for self
  html += '<div class="hisab-signatures">';
  html += '<div class="hisab-sig-block">';
  html += '<div class="hisab-sig-line"></div>';
  html += '<div class="hisab-sig-label">Authorized Signature</div>';
  html += '<div class="hisab-sig-name">Shree Balaji Clinical Laboratory</div>';
  html += '</div>';
  if (!isSelf) {
    html += '<div class="hisab-sig-block">';
    html += '<div class="hisab-sig-line"></div>';
    html += '<div class="hisab-sig-label">Doctor / Hospital Signature</div>';
    html += '<div class="hisab-sig-name">' + doc.name + '</div>';
    html += '</div>';
  }
  html += '</div>';

  html += '</div>';

  document.getElementById('hisabResult').innerHTML = html;
}

function printHisab() {
  let content = document.getElementById('hisabPrintContent');
  if (!content) return alert('Pehle Hisab banao!');
  document.getElementById('printArea').innerHTML = content.innerHTML;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}
