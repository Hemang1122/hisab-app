// ========== HISAB PRINT (PROFESSIONAL INVOICE) ==========

function generateHisab() {
  let from = document.getElementById('hFrom').value, to = document.getElementById('hTo').value;
  let docId = document.getElementById('hDoctor').value;
  if (!docId) return alert('Doctor select karo!');
  if (!from || !to) return alert('Date range daalo!');
  let isSelf = docId === '__self__';
  let doc = isSelf ? { name: 'Self (Walk-in)' } : doctors.find(d => d.id === docId);
  let filtered = entries.filter(e => e.doctorId === docId && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (!filtered.length) { document.getElementById('hisabResult').innerHTML = '<div class="empty">No entries found in this date range.</div>'; return; }

  let grandTotal = 0, grandDoc = 0, grandLab = 0, grandDiscount = 0, grandPaid = 0, grandBal = 0;
  let rows = filtered.map((e, i) => {
    let docS = 0, labS = 0;
    e.tests.forEach(t => { docS += (t.docShare || 0); labS += (t.labShare || 0); });
    grandTotal += e.total; grandDoc += docS; grandLab += labS; grandPaid += e.paid; grandBal += e.balance; grandDiscount += (e.discount || 0);
    let tnames = e.tests.map(t => t.name).join(', ');
    let statusClass = e.balance > 0 ? 'inv-status-due' : 'inv-status-paid';
    let statusText = e.balance > 0 ? 'Due ₹' + e.balance : 'Paid';

    if (isSelf) {
      return '<tr>' +
        '<td class="inv-cell-center">' + (i + 1) + '</td>' +
        '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
        '<td class="inv-cell-name">' + e.name + '</td>' +
        '<td class="inv-cell-tests">' + tnames + '</td>' +
        '<td class="inv-cell-amt">₹' + e.subtotal + '</td>' +
        '<td class="inv-cell-amt">' + (e.discount ? '₹' + e.discount : '-') + '</td>' +
        '<td class="inv-cell-amt inv-cell-total">₹' + e.total + '</td>' +
        '<td class="inv-cell-center"><span class="' + statusClass + '">' + statusText + '</span></td>' +
        '</tr>';
    }
    return '<tr>' +
      '<td class="inv-cell-center">' + (i + 1) + '</td>' +
      '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
      '<td class="inv-cell-name">' + e.name + '</td>' +
      '<td class="inv-cell-tests">' + tnames + '</td>' +
      '<td class="inv-cell-amt">₹' + e.total + '</td>' +
      '<td class="inv-cell-amt inv-doc-share">₹' + docS + '</td>' +
      '<td class="inv-cell-amt inv-lab-share">₹' + labS + '</td>' +
      '<td class="inv-cell-center"><span class="' + statusClass + '">' + statusText + '</span></td>' +
      '</tr>';
  }).join('');

  let grandSubtotal = grandTotal + grandDiscount;
  let today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let invNo = 'INV-' + from.replace(/-/g, '') + '-' + (isSelf ? 'SELF' : docId.substring(0, 6).toUpperCase());

  let html = '<div id="hisabPrintContent" class="invoice">';

  // === HEADER ===
  html += '<div class="inv-header">';
  html += '<div class="inv-header-left">';
  html += '<div class="inv-logo">&#2358;&#2381;&#2352;&#2368;</div>';
  html += '<div>';
  html += '<div class="inv-lab-name">Shree Balaji Clinical Laboratory</div>';
  html += '<div class="inv-lab-tagline">Pathology & Diagnostic Services</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="inv-header-right">';
  html += '<div class="inv-doc-type">' + (isSelf ? 'PATIENT RECORD' : 'ACCOUNT STATEMENT') + '</div>';
  html += '<div class="inv-meta"><span>Invoice #:</span> ' + invNo + '</div>';
  html += '<div class="inv-meta"><span>Generated:</span> ' + today + '</div>';
  html += '</div>';
  html += '</div>';

  // === INFO BAR ===
  html += '<div class="inv-info-bar">';
  html += '<div class="inv-info-block">';
  html += '<div class="inv-info-label">' + (isSelf ? 'Type' : 'Doctor / Hospital') + '</div>';
  html += '<div class="inv-info-value">' + doc.name + '</div>';
  html += '</div>';
  html += '<div class="inv-info-block">';
  html += '<div class="inv-info-label">Period</div>';
  html += '<div class="inv-info-value">' + formatDateInv(from) + ' — ' + formatDateInv(to) + '</div>';
  html += '</div>';
  html += '<div class="inv-info-block">';
  html += '<div class="inv-info-label">Total Patients</div>';
  html += '<div class="inv-info-value">' + filtered.length + '</div>';
  html += '</div>';
  html += '</div>';

  // === TABLE ===
  html += '<div class="inv-table-wrap">';
  if (isSelf) {
    html += '<table class="inv-table"><thead><tr>' +
      '<th class="inv-th-center" style="width:35px">#</th>' +
      '<th style="width:80px">Date</th>' +
      '<th>Patient</th>' +
      '<th>Tests</th>' +
      '<th class="inv-th-right" style="width:70px">Subtotal</th>' +
      '<th class="inv-th-right" style="width:65px">Disc.</th>' +
      '<th class="inv-th-right" style="width:70px">Total</th>' +
      '<th class="inv-th-center" style="width:75px">Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  } else {
    html += '<table class="inv-table"><thead><tr>' +
      '<th class="inv-th-center" style="width:35px">#</th>' +
      '<th style="width:80px">Date</th>' +
      '<th>Patient</th>' +
      '<th>Tests</th>' +
      '<th class="inv-th-right" style="width:65px">Amount</th>' +
      '<th class="inv-th-right" style="width:70px">Dr. Share</th>' +
      '<th class="inv-th-right" style="width:70px">Lab Share</th>' +
      '<th class="inv-th-center" style="width:75px">Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }
  html += '</div>';

  // === SUMMARY CARDS ===
  html += '<div class="inv-summary">';

  if (!isSelf) {
    html += '<div class="inv-sum-card inv-sum-doc">';
    html += '<div class="inv-sum-icon">🩺</div>';
    html += '<div class="inv-sum-label">Doctor Share</div>';
    html += '<div class="inv-sum-value">₹' + grandDoc.toLocaleString('en-IN') + '</div>';
    html += '</div>';

    html += '<div class="inv-sum-card inv-sum-lab">';
    html += '<div class="inv-sum-icon">🔬</div>';
    html += '<div class="inv-sum-label">Lab Share</div>';
    html += '<div class="inv-sum-value">₹' + grandLab.toLocaleString('en-IN') + '</div>';
    html += '</div>';
  }

  html += '<div class="inv-sum-card inv-sum-total">';
  html += '<div class="inv-sum-icon">💰</div>';
  html += '<div class="inv-sum-label">Total Amount</div>';
  html += '<div class="inv-sum-value">₹' + grandTotal.toLocaleString('en-IN') + '</div>';
  html += '</div>';

  html += '<div class="inv-sum-card inv-sum-paid">';
  html += '<div class="inv-sum-icon">✅</div>';
  html += '<div class="inv-sum-label">Total Paid</div>';
  html += '<div class="inv-sum-value">₹' + grandPaid.toLocaleString('en-IN') + '</div>';
  html += '</div>';

  if (grandBal > 0) {
    html += '<div class="inv-sum-card inv-sum-due">';
    html += '<div class="inv-sum-icon">⏳</div>';
    html += '<div class="inv-sum-label">Balance Due</div>';
    html += '<div class="inv-sum-value">₹' + grandBal.toLocaleString('en-IN') + '</div>';
    html += '</div>';
  }
  html += '</div>';

  // === SIGNATURES ===
  html += '<div class="inv-signatures">';
  html += '<div class="inv-sig">';
  html += '<div class="inv-sig-line"></div>';
  html += '<div class="inv-sig-title">Authorized Signatory</div>';
  html += '<div class="inv-sig-name">Shree Balaji Clinical Laboratory</div>';
  html += '</div>';
  if (!isSelf) {
    html += '<div class="inv-sig">';
    html += '<div class="inv-sig-line"></div>';
    html += '<div class="inv-sig-title">Received & Acknowledged</div>';
    html += '<div class="inv-sig-name">' + doc.name + '</div>';
    html += '</div>';
  }
  html += '</div>';

  // === FOOTER ===
  html += '<div class="inv-footer">';
  html += '<div>This is a computer-generated document. • Shree Balaji Clinical Laboratory</div>';
  html += '<div>Generated on ' + today + '</div>';
  html += '</div>';

  html += '</div>';

  document.getElementById('hisabResult').innerHTML = html;
}

function formatDateInv(dateStr) {
  if (!dateStr) return '-';
  let d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function printHisab() {
  let content = document.getElementById('hisabPrintContent');
  if (!content) return alert('Pehle Hisab banao!');
  document.getElementById('printArea').innerHTML = content.innerHTML;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}
