// ========== HISAB PRINT (PROFESSIONAL INVOICE) ==========

function generateHisab() {
  let from = document.getElementById('hFrom').value, to = document.getElementById('hTo').value;
  let docId = document.getElementById('hDoctor').value;
  if (!docId) return alert('Doctor select karo!');
  if (!from || !to) return alert('Date range daalo!');
  let isSelf = docId === '__self__';
  let doc = isSelf ? { name: 'Self (Walk-in)' } : doctors.find(d => d.id === docId);

  // ALWAYS sync entries to current rate list before generating — so any
  // rate / custom-split changes made in the Rate List are reflected here.
  if (typeof syncEntriesToRateList === 'function') {
    let updated = syncEntriesToRateList();
    if (updated > 0 && typeof toast === 'function') {
      toast('🔄 ' + updated + ' ' + (updated === 1 ? 'entry' : 'entries') + ' updated to latest rates');
    }
  }

  let filtered = entries.filter(e => e.doctorId === docId && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (!filtered.length) { document.getElementById('hisabResult').innerHTML = '<div class="empty">No entries found in this date range.</div>'; return; }

  // Hisab print IGNORES the extra amount entirely — only shows original test-based totals
  // Discount applied PROPORTIONALLY to both Dr and Lab shares (equal reduction, no drift dump)
  let grandTotal = 0, grandDoc = 0, grandLab = 0, grandDiscount = 0, grandPaid = 0, grandBal = 0, grandHospital = 0;
  let hospitalCount = 0;
  let rows = filtered.map((e, i) => {
    let rawDocS = 0, rawLabS = 0;
    e.tests.forEach(t => { rawDocS += (t.docShare || 0); rawLabS += (t.labShare || 0); });
    // Original total = what tests cost minus discount (extra is excluded from hisab)
    let origTotal = (e.total || 0) - (e.extra || 0);
    // Scale shares down by discount factor — each proportionally reduced
    let origSubtotal = e.subtotal || (rawDocS + rawLabS);
    let docS = rawDocS, labS = rawLabS;
    if (origSubtotal > 0 && (e.discount || 0) > 0) {
      let discountFactor = 1 - ((e.discount || 0) / origSubtotal);
      if (discountFactor < 0) discountFactor = 0;
      docS = Math.round(rawDocS * discountFactor);
      labS = Math.round(rawLabS * discountFactor);
    }
    // Paid amount capped to original total, balance based on original
    let origPaid = Math.min(e.paid || 0, origTotal);
    let origBal = Math.max(0, origTotal - origPaid);
    grandTotal += origTotal; grandDoc += docS; grandLab += labS;
    grandPaid += origPaid; grandBal += origBal; grandDiscount += (e.discount || 0);
    if (e.hospitalPaid) { grandHospital += origTotal; hospitalCount++; }
    let tnames = e.tests.map(t => t.name).join(', ');
    let statusClass, statusText;
    if (e.hospitalPaid) {
      statusClass = 'inv-status-hospital';
      statusText = '🏥 Hospital';
    } else if (origBal > 0) {
      statusClass = 'inv-status-due';
      statusText = 'Due ₹' + origBal;
    } else {
      statusClass = 'inv-status-paid';
      statusText = 'Paid';
    }

    if (isSelf) {
      return '<tr>' +
        '<td class="inv-cell-center">' + (i + 1) + '</td>' +
        '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
        '<td class="inv-cell-name">' + e.name + '</td>' +
        '<td class="inv-cell-tests">' + tnames + '</td>' +
        '<td class="inv-cell-amt">₹' + e.subtotal + '</td>' +
        '<td class="inv-cell-amt">' + (e.discount ? '₹' + e.discount : '-') + '</td>' +
        '<td class="inv-cell-amt inv-cell-total">₹' + origTotal + '</td>' +
        '<td class="inv-cell-center"><span class="' + statusClass + '">' + statusText + '</span></td>' +
        '</tr>';
    }
    return '<tr>' +
      '<td class="inv-cell-center">' + (i + 1) + '</td>' +
      '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
      '<td class="inv-cell-name">' + e.name + '</td>' +
      '<td class="inv-cell-tests">' + tnames + '</td>' +
      '<td class="inv-cell-amt">₹' + origTotal + '</td>' +
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
  if (grandHospital > 0) {
    html += '<div class="inv-sum-card inv-sum-hospital">';
    html += '<div class="inv-sum-icon">🏥</div>';
    html += '<div class="inv-sum-label">Hospital Paid</div>';
    html += '<div class="inv-sum-value">₹' + grandHospital.toLocaleString('en-IN') + '</div>';
    html += '<div style="font-size:10px;color:#666;margin-top:2px">' + hospitalCount + ' entries</div>';
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

  // === TOOLBAR OUTSIDE PRINT ===
  html += '<div class="no-print" style="margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
    '<button class="btn btn-secondary" onclick="toggleHisabCalc()" style="font-size:12px">🧮 Show / Hide Calculation Breakdown</button>' +
    '<button class="btn btn-secondary" onclick="printHisabCalc()" style="font-size:12px">🖨️ Print Calculation</button>' +
    '</div>';

  // === CALCULATION BREAKDOWN (hidden by default, used for both inline + print) ===
  html += '<div id="hisabCalcBreakdown" style="display:none;background:#fff;border:1px solid var(--n200);border-radius:8px;padding:18px;margin-top:12px">' +
    buildCalcBreakdown(filtered, doc, isSelf, from, to) +
    '</div>';

  document.getElementById('hisabResult').innerHTML = html;
}

function toggleHisabCalc() {
  let el = document.getElementById('hisabCalcBreakdown');
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function printHisabCalc() {
  let el = document.getElementById('hisabCalcBreakdown');
  if (!el) return alert('Pehle Hisab banao!');
  document.getElementById('printArea').innerHTML = el.innerHTML;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function buildCalcBreakdown(filtered, doc, isSelf, from, to) {
  let today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let h = '';

  // Header
  h += '<div style="text-align:center;border-bottom:2px solid var(--brand);padding-bottom:10px;margin-bottom:14px">' +
    '<div style="font-size:16px;font-weight:700;color:var(--brand)">Shree Balaji Clinical Laboratory</div>' +
    '<div style="font-size:12px;color:#888;letter-spacing:.5px;text-transform:uppercase;margin-top:2px">Hisab Calculation Breakdown</div>' +
    '<div style="font-size:11px;color:#666;margin-top:6px"><b>' + doc.name + '</b> · ' + formatDateInv(from) + ' — ' + formatDateInv(to) + ' · Generated ' + today + '</div>' +
    '</div>';

  // Explainer
  h += '<div style="background:#fff8ee;border:1px solid var(--accent);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:#555">' +
    '<b style="color:var(--accent)">How this is calculated:</b><br>' +
    '1. Each test has its own Dr Share and Lab Share (either from <b>custom split</b> set in Rate List, or default <b>50-50</b> of the test rate).<br>' +
    '2. The entry subtotal = sum of all test rates. If a <b>discount</b> was given, a <b>discount factor</b> = 1 − (discount ÷ subtotal) is calculated.<br>' +
    '3. Final Dr Share = Σ(test docShares) × discount factor. Same for Lab Share. Extra amount is NOT shown in hisab.' +
    '</div>';

  // Per-entry breakdown
  let grandDoc = 0, grandLab = 0, grandAmt = 0;
  filtered.forEach((e, i) => {
    let rawDocS = 0, rawLabS = 0;
    e.tests.forEach(t => { rawDocS += (t.docShare || 0); rawLabS += (t.labShare || 0); });
    let origTotal = (e.total || 0) - (e.extra || 0);
    let origSubtotal = e.subtotal || (rawDocS + rawLabS);
    let discount = e.discount || 0;
    let factor = (origSubtotal > 0 && discount > 0) ? (1 - discount / origSubtotal) : 1;
    let finalDoc = Math.round(rawDocS * factor);
    let finalLab = Math.round(rawLabS * factor);
    grandDoc += finalDoc; grandLab += finalLab; grandAmt += origTotal;

    h += '<div style="border:1px solid var(--n150);border-radius:6px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px dashed #ddd">' +
      '<div style="font-size:12px"><b style="color:var(--brand)">#' + (i + 1) + ' · ' + e.name + '</b> <span style="color:#999">· ' + formatDateInv(e.date) + '</span></div>' +
      '<div style="font-size:11px;color:#666">Amount: <b>₹' + origTotal + '</b></div>' +
    '</div>';

    // Per-test table
    h += '<table style="width:100%;font-size:10.5px;border-collapse:collapse;margin-bottom:6px">';
    h += '<thead><tr style="background:var(--n50);color:#555">' +
      '<th style="padding:4px 6px;text-align:left;border:1px solid var(--n150)">Test</th>' +
      '<th style="padding:4px 6px;text-align:right;border:1px solid var(--n150);width:60px">Rate</th>' +
      '<th style="padding:4px 6px;text-align:center;border:1px solid var(--n150);width:70px">Split</th>' +
      '<th style="padding:4px 6px;text-align:right;border:1px solid var(--n150);width:70px">Dr Share</th>' +
      '<th style="padding:4px 6px;text-align:right;border:1px solid var(--n150);width:70px">Lab Share</th>' +
      '</tr></thead><tbody>';
    e.tests.forEach(t => {
      let rate = t.rate || 0;
      let dShare = t.docShare || 0;
      let lShare = t.labShare || 0;
      // Determine split type
      let splitLabel;
      if (dShare + lShare === rate) {
        if (rate > 0 && dShare * 2 === rate) splitLabel = '<span style="color:#888">50-50 auto</span>';
        else if (rate > 0) {
          let pct = Math.round(dShare / rate * 100);
          splitLabel = '<span style="color:#888">' + pct + '-' + (100 - pct) + ' auto</span>';
        } else splitLabel = '-';
      } else {
        splitLabel = '<span style="color:var(--accent);font-weight:700">Custom</span>';
      }
      h += '<tr>' +
        '<td style="padding:4px 6px;border:1px solid var(--n150)">' + t.name + '</td>' +
        '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + rate + '</td>' +
        '<td style="padding:4px 6px;text-align:center;border:1px solid var(--n150);font-size:10px">' + splitLabel + '</td>' +
        '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + dShare + '</td>' +
        '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + lShare + '</td>' +
      '</tr>';
    });
    h += '<tr style="background:#f5f5f5;font-weight:700">' +
      '<td style="padding:4px 6px;border:1px solid var(--n150)" colspan="1">Subtotal</td>' +
      '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + origSubtotal + '</td>' +
      '<td style="padding:4px 6px;text-align:center;border:1px solid var(--n150)"></td>' +
      '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + rawDocS + '</td>' +
      '<td style="padding:4px 6px;text-align:right;border:1px solid var(--n150)">₹' + rawLabS + '</td>' +
    '</tr>';
    h += '</tbody></table>';

    // Discount & final calc
    if (discount > 0) {
      h += '<div style="background:#fdf4e4;border-radius:4px;padding:6px 10px;font-size:10.5px;color:#555;margin-top:4px">' +
        '<b>Discount applied:</b> ₹' + discount + ' off ₹' + origSubtotal + ' = <b>' + (factor * 100).toFixed(1) + '%</b> remaining<br>' +
        'Final Dr Share: ₹' + rawDocS + ' × ' + factor.toFixed(3) + ' = <b style="color:var(--brand)">₹' + finalDoc + '</b><br>' +
        'Final Lab Share: ₹' + rawLabS + ' × ' + factor.toFixed(3) + ' = <b style="color:var(--brand)">₹' + finalLab + '</b>' +
      '</div>';
    } else {
      h += '<div style="background:#eef6f1;border-radius:4px;padding:6px 10px;font-size:10.5px;color:#555;margin-top:4px">' +
        'No discount. Final Dr Share: <b style="color:var(--brand)">₹' + finalDoc + '</b> · Final Lab Share: <b style="color:var(--brand)">₹' + finalLab + '</b>' +
      '</div>';
    }

    if (e.extra && e.extra > 0) {
      h += '<div style="background:#fff4f0;border-radius:4px;padding:6px 10px;font-size:10.5px;color:#555;margin-top:4px">' +
        '💵 Extra charge of ₹' + e.extra + ' (' + (e.extraReason || 'no reason given') + ') — <b>not shown in hisab</b>, tracked separately in Revenue' +
      '</div>';
    }
    h += '</div>';
  });

  // Grand total
  h += '<div style="background:var(--brand);color:white;border-radius:6px;padding:12px 16px;margin-top:14px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px">' +
    '<div>Grand Total Amount: <b>₹' + grandAmt + '</b></div>' +
    '<div>Grand Dr Share: <b>₹' + grandDoc + '</b></div>' +
    '<div>Grand Lab Share: <b>₹' + grandLab + '</b></div>' +
  '</div>';

  return h;
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
