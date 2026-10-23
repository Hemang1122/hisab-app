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
  // Daily payment tracking for summary
  let dailyPay = {};
  let rows = filtered.map((e, i) => {
    let rawDocS = 0, rawLabS = 0;
    e.tests.forEach(t => { rawDocS += (t.docShare || 0); rawLabS += (t.labShare || 0); });
    // Original total = what tests cost minus discount
    // Extra is included ONLY if extraInHisab flag is checked for this patient
    let origTotal = e.extraInHisab ? (e.total || 0) : ((e.total || 0) - (e.extra || 0));
    // Scale shares down by discount factor — each proportionally reduced
    let origSubtotal = e.subtotal || (rawDocS + rawLabS);
    let docS = rawDocS, labS = rawLabS;
    if (origSubtotal > 0 && (e.discount || 0) > 0) {
      let discountFactor = 1 - ((e.discount || 0) / origSubtotal);
      if (discountFactor < 0) discountFactor = 0;
      docS = Math.round(rawDocS * discountFactor);
      labS = Math.round(rawLabS * discountFactor);
    }
    // No Cut (Free) — show in hisab but with ₹0 shares, don't add to totals
    if (e.noCut) { docS = 0; labS = 0; origTotal = 0; }
    // Paid amount capped to original total, balance based on original
    let origPaid = Math.min(e.paid || 0, origTotal);
    let origBal = Math.max(0, origTotal - origPaid);
    if (!e.noCut) {
      grandTotal += origTotal; grandDoc += docS; grandLab += labS;
      grandPaid += origPaid; grandBal += origBal; grandDiscount += (e.discount || 0);
    }
    if (e.hospitalPaid) { grandHospital += origTotal; hospitalCount++; }
    // Daily payment tracking
    if (!dailyPay[e.date]) dailyPay[e.date] = { total: 0, paid: 0, balance: 0, byMode: {}, count: 0 };
    dailyPay[e.date].count++;
    dailyPay[e.date].total += origTotal;
    dailyPay[e.date].paid += origPaid;
    dailyPay[e.date].balance += origBal;
    if (origPaid > 0) {
      if (e.paymentModes && e.paymentModes.length > 1) {
        e.paymentModes.forEach(s => {
          if (s.amount > 0) dailyPay[e.date].byMode[s.mode] = (dailyPay[e.date].byMode[s.mode] || 0) + s.amount;
        });
      } else {
        let pm = e.paymentMode || 'Cash';
        dailyPay[e.date].byMode[pm] = (dailyPay[e.date].byMode[pm] || 0) + origPaid;
      }
    }
    let tnames = e.tests.map(t => t.name).join(', ');
    let statusClass, statusText;
    if (e.hold) {
      statusClass = 'inv-status-hold';
      statusText = '⏸️ Hold';
    } else if (e.noCut) {
      statusClass = 'inv-status-nocut';
      statusText = '🆓 No Cut';
    } else if (e.cashless) {
      statusClass = 'inv-status-cashless';
      statusText = '💳 Cashless';
    } else if (e.hospitalPaid) {
      statusClass = 'inv-status-hospital';
      statusText = '🏥 Hospital';
    } else if (origBal > 0) {
      statusClass = 'inv-status-due';
      statusText = 'Due ₹' + origBal;
    } else {
      statusClass = 'inv-status-paid';
      statusText = 'Paid';
    }

    // Build per-patient detail row (shown when checkbox checked)
    let detailHtml = '<div style="background:#fafafa;padding:8px 10px;font-size:10.5px">';
    // Test-level breakdown
    detailHtml += '<table style="width:100%;font-size:10px;border-collapse:collapse;margin-bottom:6px"><thead><tr style="background:#eee">' +
      '<th style="padding:3px 5px;text-align:left;border:1px solid #ddd">Test</th>' +
      '<th style="padding:3px 5px;text-align:right;border:1px solid #ddd">Rate</th>' +
      '<th style="padding:3px 5px;text-align:right;border:1px solid #ddd">Dr Share</th>' +
      '<th style="padding:3px 5px;text-align:right;border:1px solid #ddd">Lab Share</th>' +
      '</tr></thead><tbody>';
    e.tests.forEach(t => {
      detailHtml += '<tr><td style="padding:3px 5px;border:1px solid #ddd">' + t.name + '</td>' +
        '<td style="padding:3px 5px;text-align:right;border:1px solid #ddd">₹' + (t.rate || 0) + '</td>' +
        '<td style="padding:3px 5px;text-align:right;border:1px solid #ddd">₹' + (t.docShare || 0) + '</td>' +
        '<td style="padding:3px 5px;text-align:right;border:1px solid #ddd">₹' + (t.labShare || 0) + '</td></tr>';
    });
    detailHtml += '</tbody></table>';
    // Discount info
    if ((e.discount || 0) > 0) {
      let factor = origSubtotal > 0 ? (1 - (e.discount || 0) / origSubtotal) : 1;
      detailHtml += '<div style="color:#c44536;font-size:10px"><b>Discount:</b> ₹' + e.discount + ' off ₹' + origSubtotal +
        ' (' + (factor * 100).toFixed(1) + '% remaining) → Dr: ₹' + docS + ', Lab: ₹' + labS + '</div>';
    }
    // Extra info
    if ((e.extra || 0) > 0) {
      detailHtml += '<div style="color:#e65100;font-size:10px"><b>Extra:</b> ₹' + e.extra + ' (' + (e.extraReason || '-') + ') — not in hisab</div>';
    }
    // Payment info
    let modeStr = (e.paymentModes && e.paymentModes.length > 1) ?
      e.paymentModes.map(s => s.mode + ' ₹' + s.amount).join(' + ') : (e.paymentMode || 'Cash');
    detailHtml += '<div style="font-size:10px;margin-top:3px"><b>Payment:</b> ' + modeStr +
      ' · Paid: ₹' + (e.paid || 0) + ' · Balance: ₹' + origBal +
      ' · Doctor: ' + (doc ? doc.name : (e.doctorName || 'Unknown')) + '</div>';
    detailHtml += '</div>';

    let colSpan = isSelf ? 8 : 8;
    let detailRow = '<tr class="hisab-detail-row" id="hisabDetail' + i + '" style="display:none"><td colspan="' + colSpan + '" style="padding:0;border-top:none">' + detailHtml + '</td></tr>';

    if (isSelf) {
      return '<tr>' +
        '<td class="inv-cell-center no-print-detail"><input type="checkbox" class="hisab-detail-cb no-print-detail" data-idx="' + i + '" onchange="toggleHisabDetail(' + i + ')" style="cursor:pointer" title="Show detail"></td>' +
        '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
        '<td class="inv-cell-name">' + e.name + '</td>' +
        '<td class="inv-cell-tests">' + tnames + '</td>' +
        '<td class="inv-cell-amt">₹' + e.subtotal + '</td>' +
        '<td class="inv-cell-amt">' + (e.discount ? '₹' + e.discount : '-') + '</td>' +
        '<td class="inv-cell-amt inv-cell-total">₹' + origTotal + '</td>' +
        '<td class="inv-cell-center"><span class="' + statusClass + '">' + statusText + '</span></td>' +
        '</tr>' + detailRow;
    }
    return '<tr>' +
      '<td class="inv-cell-center no-print-detail"><input type="checkbox" class="hisab-detail-cb no-print-detail" data-idx="' + i + '" onchange="toggleHisabDetail(' + i + ')" style="cursor:pointer" title="Show detail"></td>' +
      '<td class="inv-cell-date">' + formatDateInv(e.date) + '</td>' +
      '<td class="inv-cell-name">' + e.name + '</td>' +
      '<td class="inv-cell-tests">' + tnames + '</td>' +
      '<td class="inv-cell-amt">₹' + origTotal + '</td>' +
      '<td class="inv-cell-amt inv-doc-share">₹' + docS + '</td>' +
      '<td class="inv-cell-amt inv-lab-share">₹' + labS + '</td>' +
      '<td class="inv-cell-center"><span class="' + statusClass + '">' + statusText + '</span></td>' +
      '</tr>' + detailRow;
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

  // === ON HOLD PATIENTS (show first so staff fills them) ===
  let holdPatients = filtered.filter(e => e.hold);
  if (holdPatients.length > 0) {
    html += '<div style="background:#fff3e0;border:2px solid #ff9800;border-radius:8px;padding:12px 14px;margin-bottom:14px">';
    html += '<div style="font-size:14px;font-weight:700;color:#e65100;margin-bottom:8px">⏸️ ON HOLD — ' + holdPatients.length + ' Patient' + (holdPatients.length > 1 ? 's' : '') + ' (Pehle ye bharo)</div>';
    html += '<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr style="background:#ffe0b2">' +
      '<th style="padding:5px 8px;text-align:left;border:1px solid #ffcc80">#</th>' +
      '<th style="padding:5px 8px;text-align:left;border:1px solid #ffcc80">Date</th>' +
      '<th style="padding:5px 8px;text-align:left;border:1px solid #ffcc80">Patient</th>' +
      '<th style="padding:5px 8px;text-align:left;border:1px solid #ffcc80">Tests</th>' +
      '<th style="padding:5px 8px;text-align:left;border:1px solid #ffcc80">Kya pata nahi</th>' +
      '<th style="padding:5px 8px;text-align:center;border:1px solid #ffcc80">Fill karo ✏️</th>' +
      '</tr></thead><tbody>';
    holdPatients.forEach((e, hi) => {
      let reasons = (e.holdReasons || []).map(r => {
        if (r === 'price') return '💰 Price';
        if (r === 'collector') return '🚚 Collector';
        if (r === 'payment') return '💳 Payment';
        if (r === 'test') return '🧪 Test';
        return r;
      }).join(', ') || 'Not specified';
      let tnames = e.tests.map(t => t.name).join(', ');
      html += '<tr>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80">' + (hi + 1) + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80">' + formatDateInv(e.date) + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80;font-weight:600">' + e.name + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80;font-size:10px">' + tnames + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80;color:#e65100">' + reasons + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ffcc80;text-align:center">___________</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
  }

  // === TABLE ===
  html += '<div class="inv-table-wrap">';
  if (isSelf) {
    html += '<table class="inv-table"><thead><tr>' +
      '<th class="inv-th-center no-print-detail" style="width:30px" title="Show detail">📋</th>' +
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
      '<th class="inv-th-center no-print-detail" style="width:30px" title="Show detail">📋</th>' +
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

  // === DAILY PAYMENT SUMMARY ===
  let dailyDates = Object.keys(dailyPay).sort();
  if (dailyDates.length > 0) {
    html += '<div style="margin-top:14px;border:1px solid var(--n200);border-radius:6px;overflow:hidden">';
    html += '<div style="background:linear-gradient(135deg,var(--brand),#1a9982);color:white;padding:8px 14px;font-size:13px;font-weight:700">📊 Daily Payment Summary</div>';
    html += '<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr style="background:#f5f5f5">' +
      '<th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--n200)">Date</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">Patients</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">Total</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">Cash</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">GPay</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">Other</th>' +
      '<th style="padding:5px 8px;text-align:right;border-bottom:1px solid var(--n200)">Balance</th>' +
      '</tr></thead><tbody>';
    let sumCash = 0, sumGpay = 0, sumOther = 0;
    dailyDates.forEach(dt => {
      let dp = dailyPay[dt];
      let cash = dp.byMode['Cash'] || 0;
      let gpay = (dp.byMode['GPay'] || 0) + (dp.byMode['PhonePe'] || 0) + (dp.byMode['UPI'] || 0);
      let otherPay = dp.paid - cash - gpay;
      if (otherPay < 0) otherPay = 0;
      sumCash += cash; sumGpay += gpay; sumOther += otherPay;
      html += '<tr>' +
        '<td style="padding:4px 8px;border-bottom:1px solid #eee">' + formatDateInv(dt) + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee">' + dp.count + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;font-weight:600">₹' + dp.total.toLocaleString('en-IN') + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;color:#1b874b">' + (cash > 0 ? '₹' + cash.toLocaleString('en-IN') : '-') + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;color:#5a3c88">' + (gpay > 0 ? '₹' + gpay.toLocaleString('en-IN') : '-') + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;color:#c8843c">' + (otherPay > 0 ? '₹' + otherPay.toLocaleString('en-IN') : '-') + '</td>' +
        '<td style="padding:4px 8px;text-align:right;border-bottom:1px solid #eee;color:' + (dp.balance > 0 ? '#c44536' : '#999') + '">' + (dp.balance > 0 ? '₹' + dp.balance.toLocaleString('en-IN') : '-') + '</td>' +
      '</tr>';
    });
    // Totals row
    html += '<tr style="background:#f0f7f5;font-weight:700">' +
      '<td style="padding:5px 8px;border-top:2px solid var(--brand)">Total</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand)">' + filtered.length + '</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand)">₹' + grandTotal.toLocaleString('en-IN') + '</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand);color:#1b874b">₹' + sumCash.toLocaleString('en-IN') + '</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand);color:#5a3c88">₹' + sumGpay.toLocaleString('en-IN') + '</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand);color:#c8843c">₹' + sumOther.toLocaleString('en-IN') + '</td>' +
      '<td style="padding:5px 8px;text-align:right;border-top:2px solid var(--brand);color:#c44536">₹' + grandBal.toLocaleString('en-IN') + '</td>' +
    '</tr>';
    html += '</tbody></table></div>';
  }

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
  let doc = document.getElementById('hDoctorSearch') ? document.getElementById('hDoctorSearch').value : '';
  let from = document.getElementById('hFrom').value || '';
  let to = document.getElementById('hTo').value || '';
  let title = 'SBCL Hisab Calculation - ' + (doc || 'Doctor') + ' - ' + from + (to && to !== from ? ' to ' + to : '');
  setTimeout(() => { printWithTitle(title); document.getElementById('printArea').style.display = 'none'; }, 200);
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
    let origTotal = e.extraInHisab ? (e.total || 0) : ((e.total || 0) - (e.extra || 0));
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
      if (t.splitBase != null && t.splitBase !== rate) {
        splitLabel = '<span style="color:var(--accent);font-weight:700">Custom on ₹' + t.splitBase + '</span>';
      } else if (dShare + lShare === rate) {
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
  // Hide checkboxes and detail toggle column in print
  document.getElementById('printArea').querySelectorAll('.no-print-detail').forEach(el => el.style.display = 'none');
  document.getElementById('printArea').style.display = 'block';
  // Build descriptive filename: Hisab - <Doctor> - <From> to <To>
  let doc = document.getElementById('hDoctorSearch') ? document.getElementById('hDoctorSearch').value : '';
  let from = document.getElementById('hFrom').value || '';
  let to = document.getElementById('hTo').value || '';
  let title = 'SBCL Hisab - ' + (doc || 'Doctor') + ' - ' + from + (to && to !== from ? ' to ' + to : '');
  setTimeout(() => { printWithTitle(title); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function toggleHisabDetail(idx) {
  let row = document.getElementById('hisabDetail' + idx);
  if (!row) return;
  let cb = document.querySelector('.hisab-detail-cb[data-idx="' + idx + '"]');
  if (cb && cb.checked) {
    row.style.display = 'table-row';
  } else {
    row.style.display = 'none';
  }
}
