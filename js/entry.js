// ========== ENTRY FORM ==========

let editingEntryId = null;
let payModeSplits = []; // [{mode:'Cash', amount:200}, ...]

function addPayModeSplit() {
  let mode = document.getElementById('ePayModeAdd').value;
  let amt = parseFloat(document.getElementById('ePayModeAmt').value) || 0;
  if (amt <= 0) {
    // If no amount, just set as single mode (backward compat shortcut)
    payModeSplits = [{ mode: mode, amount: 0 }];
    renderPayModeSplits();
    return;
  }
  // Check if mode already exists, add to it
  let existing = payModeSplits.find(s => s.mode === mode);
  if (existing) {
    existing.amount += amt;
  } else {
    payModeSplits.push({ mode: mode, amount: amt });
  }
  document.getElementById('ePayModeAmt').value = '';
  renderPayModeSplits();
}

function removePayModeSplit(idx) {
  payModeSplits.splice(idx, 1);
  renderPayModeSplits();
}

function renderPayModeSplits() {
  let container = document.getElementById('payModeSplits');
  if (!container) return;
  if (!payModeSplits.length) { container.innerHTML = ''; updatePayModeSplitInfo(); return; }
  let html = payModeSplits.map((s, i) => {
    let amtLabel = s.amount > 0 ? ' ₹' + s.amount : '';
    return '<span class="pay-split-chip">' + s.mode + amtLabel +
      ' <span onclick="removePayModeSplit(' + i + ')" style="cursor:pointer;margin-left:3px;opacity:.6">✕</span></span>';
  }).join(' ');
  container.innerHTML = html;
  updatePayModeSplitInfo();
}

function updatePayModeSplitInfo() {
  let info = document.getElementById('payModeSplitInfo');
  if (!info) return;
  if (payModeSplits.length <= 1) { info.innerHTML = ''; return; }
  let totalSplit = payModeSplits.reduce((s, x) => s + (x.amount || 0), 0);
  info.innerHTML = 'Split total: ₹' + totalSplit;
}

function getPayModeSplitsData() {
  // Returns { paymentMode, paymentModes }
  if (!payModeSplits.length) {
    return { paymentMode: 'Cash', paymentModes: [] };
  }
  if (payModeSplits.length === 1) {
    return { paymentMode: payModeSplits[0].mode, paymentModes: payModeSplits[0].amount > 0 ? payModeSplits : [] };
  }
  // Multiple splits — primary is the one with highest amount
  let sorted = [...payModeSplits].sort((a, b) => b.amount - a.amount);
  return { paymentMode: sorted[0].mode, paymentModes: payModeSplits };
}

function resetPayModeSplits() {
  payModeSplits = [];
  renderPayModeSplits();
  document.getElementById('ePayModeAmt').value = '';
}

function onHoldReasonChange() {
  let anyChecked = document.getElementById('holdPrice').checked ||
    document.getElementById('holdCollector').checked ||
    document.getElementById('holdPayment').checked ||
    document.getElementById('holdTest').checked;
  if (anyChecked) {
    document.getElementById('ePayStatus').value = 'hold';
    togglePayFields();
  }
}

function getHoldReasons() {
  let reasons = [];
  if (document.getElementById('holdPrice').checked) reasons.push('price');
  if (document.getElementById('holdCollector').checked) reasons.push('collector');
  if (document.getElementById('holdPayment').checked) reasons.push('payment');
  if (document.getElementById('holdTest').checked) reasons.push('test');
  return reasons;
}

function resetHoldReasons() {
  document.getElementById('holdPrice').checked = false;
  document.getElementById('holdCollector').checked = false;
  document.getElementById('holdPayment').checked = false;
  document.getElementById('holdTest').checked = false;
}

function restoreHoldReasons(reasons) {
  resetHoldReasons();
  if (!reasons || !reasons.length) return;
  reasons.forEach(r => {
    let el = document.getElementById('hold' + r.charAt(0).toUpperCase() + r.slice(1));
    if (el) el.checked = true;
  });
}

function togglePayFields() {
  let status = document.getElementById('ePayStatus').value;
  let paidInput = document.getElementById('ePaid');
  if (status === 'paid' || status === 'hospital' || status === 'cashless' || status === 'nocut' || status === 'hold') { paidInput.style.display = 'none'; calcEntry(); }
  else { paidInput.style.display = 'block'; paidInput.focus(); calcEntry(); }
  // Auto-set payment mode to "Hospital Collected" when cashless is selected
  if (status === 'cashless') {
    payModeSplits = [{ mode: 'Hospital Collected', amount: 0 }];
    renderPayModeSplits();
  }
}

function getPaymentInfo() {
  let status = document.getElementById('ePayStatus').value;
  let total = parseInt(document.getElementById('eTotal').textContent) || 0;
  if (status === 'paid') return { paid: total, balance: 0, hospitalPaid: false, cashless: false, noCut: false, hold: false };
  if (status === 'hospital') return { paid: 0, balance: total, hospitalPaid: true, cashless: false, noCut: false, hold: false };
  if (status === 'cashless') return { paid: total, balance: 0, hospitalPaid: false, cashless: true, noCut: false, hold: false };
  if (status === 'nocut') return { paid: 0, balance: 0, hospitalPaid: false, cashless: false, noCut: true, hold: false };
  if (status === 'hold') return { paid: 0, balance: total, hospitalPaid: false, cashless: false, noCut: false, hold: true };
  let paid = parseFloat(document.getElementById('ePaid').value) || 0;
  return { paid, balance: Math.max(0, total - paid), hospitalPaid: false, cashless: false, noCut: false, hold: false };
}

function initDoctorChange() {
  let el = document.getElementById('eDoctor');
  if (!el) return;
  el.addEventListener('change', function () {
    let val = this.value;
    let container = document.getElementById('testCheckboxes'), rlSpan = document.getElementById('rlName');
    let rl = getMasterRL();

    // Handle Self (Walk-in) — use master rate list with 50-50
    if (val === '__self__') {
      if (rl) {
        loadTestCheckboxes(rl, 50);
      } else {
        container.innerHTML = '<div class="empty" style="padding:10px">Rate list nahi mili</div>';
        rlSpan.textContent = '-';
      }
      if (typeof updateAarushUI === 'function') updateAarushUI();
      return;
    }

    let doc = doctors.find(d => d.id === val);
    if (!doc) {
      container.innerHTML = '<div class="empty" style="padding:10px">Pehle doctor select karo</div>';
      rlSpan.textContent = '-'; return;
    }
    if (!rl) { container.innerHTML = '<div class="empty" style="padding:10px">Rate list nahi mili</div>'; rlSpan.textContent = '-'; return; }
    let docPct = doc.docPercent != null ? doc.docPercent : 50;
    loadTestCheckboxes(rl, docPct);
    // Aarush mode: show/hide UI and augment test rows
    if (typeof updateAarushUI === 'function') updateAarushUI();
    if (typeof augmentTestRowsForAarush === 'function') augmentTestRowsForAarush();
  });
}

function loadTestCheckboxes(rl, docPercent) {
  let container = document.getElementById('testCheckboxes'), rlSpan = document.getElementById('rlName');
  let labPct = 100 - docPercent;
  rlSpan.textContent = rl.name + ' (Doc ' + docPercent + '% / Lab ' + labPct + '%)';
  if (!rl.tests.length) {
    container.innerHTML = '<div class="empty" style="padding:15px">Is rate list mein koi test nahi hai. Rate List tab mein tests add karo.</div>';
    calcEntry(); return;
  }
  let searchHtml = '<div style="position:sticky;top:0;background:white;z-index:5;padding:4px 2px 8px;border-bottom:2px solid var(--accent);margin-bottom:6px">' +
    '<input id="testSearch" placeholder="🔍 Test search karo..." oninput="filterTests()" onkeydown="testSearchKeyHandler(event)" style="width:100%;padding:9px 12px;border:2px solid var(--accent);border-radius:var(--radius);font-size:14px;font-weight:500;background:#fffdf7;outline:none;box-shadow:0 2px 6px rgba(200,132,60,.15)">' +
    '<div style="font-size:10px;color:#999;margin-top:2px">Press Tab to focus a test, Enter to select, Tab again to go to Discount</div>' +
    '</div>';
  let testsHtml = rl.tests.map((t, i) => {
    let incomplete = !t.rate ? ' test-incomplete' : '';
    // Rate span is clickable — opens quick-edit modal (highlighted when rate=0)
    let rateClickAttr = ' onclick="event.stopPropagation();openQuickTestEdit(' + i + ')" title="Click to edit rate/split" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px"';
    let rateStyle = !t.rate ? ';color:var(--due);font-weight:700' : '';
    return '<div class="test-row' + incomplete + '" data-testname="' + t.name.toLowerCase() + '" tabindex="0" onkeydown="testRowKeyHandler(event,this)">' +
    '<label style="display:flex;align-items:center;gap:6px;margin:0;flex:1">' +
    '<input type="checkbox" class="test-cb" data-idx="' + i + '" tabindex="-1" onchange="onTestCheckChange(this,' + i + ')" onkeydown="testRowKeyHandler(event,this.closest(\'.test-row\'))"> ' +
    '<span class="tname">' + t.name + (incomplete ? ' ⚠️' : '') + '</span></label>' +
    '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>' +
    '<span class="trate"' + rateClickAttr + ' style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px' + rateStyle + '">&#8377;' + (t.rate || 0) + (!t.rate ? ' ✏️' : '') + '</span></div>';
  }).join('');
  container.innerHTML = searchHtml + testsHtml;
  // Store current docPercent for use in getSelectedTests
  container.dataset.docPercent = docPercent;
  // Augment rows with Aarush editable fields if in Aarush mode
  if (typeof updateAarushUI === 'function') updateAarushUI();
  if (typeof augmentTestRowsForAarush === 'function') augmentTestRowsForAarush();
  calcEntry();
}

function filterTests() {
  let searchEl = document.getElementById('testSearch');
  let raw = (searchEl.value || '').trim();
  function norm(s) { return s.toLowerCase().replace(/[(),.\-\/&]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  let q = norm(raw);
  let words = q.split(' ').filter(w => w.length > 0);
  let visibleCount = 0;
  document.querySelectorAll('#testCheckboxes .test-row').forEach(row => {
    let target = norm(row.dataset.testname);
    let match = words.length === 0 || words.every(w => target.includes(w));
    row.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });
  // Show/hide "+ Add" prompt when no matches
  let addBox = document.getElementById('addTestFromSearch');
  if (!addBox) {
    addBox = document.createElement('div');
    addBox.id = 'addTestFromSearch';
    addBox.style.cssText = 'display:none;padding:10px;background:#fff8ee;border:1px dashed var(--accent);border-radius:6px;margin:6px 0;text-align:center;cursor:pointer;font-size:13px';
    // Insert right after the search input
    if (searchEl && searchEl.parentNode) searchEl.parentNode.insertBefore(addBox, searchEl.nextSibling);
  }
  if (raw.length > 0 && visibleCount === 0) {
    addBox.innerHTML = '➕ <b>Add "' + raw + '"</b> as a new test <small style="color:#888">(click to enter rate & split)</small>';
    addBox.onclick = () => addNewTestFromSearch(raw);
    addBox.style.display = 'block';
  } else {
    addBox.style.display = 'none';
  }
}

function addNewTestFromSearch(name) {
  let rl = getMasterRL();
  if (!rl) return alert('Rate list not found');
  // Append a new test with rate=0 and open Quick Edit modal
  rl.tests.push({ name: name, rate: 0, type: 'normal' });
  let newIdx = rl.tests.length - 1;
  saveAll();
  if (dbReady) sbSave('rate_lists', rl.id, rl);
  reloadEntryTests();
  // Clear search so we see all tests
  let s = document.getElementById('testSearch');
  if (s) s.value = '';
  filterTests();
  // Open Quick Edit for this new test so user fills rate + split
  openQuickTestEdit(newIdx);
}

function testSearchKeyHandler(event) {
  if (event.key === 'Tab') {
    // Tab = focus the first visible test row (don't select it)
    event.preventDefault();
    let visible = document.querySelector('#testCheckboxes .test-row:not([style*="display: none"]):not([style*="display:none"])');
    if (visible) {
      visible.focus();
      visible.classList.add('test-row-focused');
    }
  } else if (event.key === 'Enter') {
    // Enter from search = select first visible test, clear search, stay in search
    event.preventDefault();
    let visible = document.querySelector('#testCheckboxes .test-row:not([style*="display: none"]):not([style*="display:none"])');
    if (visible) {
      let cb = visible.querySelector('.test-cb');
      if (cb) {
        cb.checked = !cb.checked;
        let idx = parseInt(cb.dataset.idx);
        onTestCheckChange(cb, idx);
      }
    }
    let s = document.getElementById('testSearch');
    if (s) { s.value = ''; filterTests(); s.focus(); }
  }
}

function testRowKeyHandler(event, row) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.stopPropagation();
    let cb = row.querySelector('.test-cb');
    if (cb) {
      cb.checked = !cb.checked;
      let idx = parseInt(cb.dataset.idx);
      onTestCheckChange(cb, idx);
    }
    row.classList.remove('test-row-focused');
    let s = document.getElementById('testSearch');
    if (s) { s.value = ''; filterTests(); s.focus(); }
  } else if (event.key === 'Tab') {
    event.preventDefault();
    event.stopPropagation();
    row.classList.remove('test-row-focused');
    let visibleRows = Array.from(document.querySelectorAll('#testCheckboxes .test-row')).filter(r => r.offsetParent !== null);
    let idx = visibleRows.indexOf(row);
    let nextIdx = event.shiftKey ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < visibleRows.length) {
      visibleRows[nextIdx].focus();
      visibleRows[nextIdx].classList.add('test-row-focused');
    } else if (!event.shiftKey) {
      document.getElementById('eDisc').focus();
    } else {
      let s = document.getElementById('testSearch');
      if (s) s.focus();
    }
  }
}

// Reload tests when returning to entry tab (e.g. after editing rate list)
function reloadEntryTests() {
  let docVal = document.getElementById('eDoctor').value;
  if (!docVal) return;
  // Remember checked test indices
  let checkedIdxs = [];
  document.querySelectorAll('.test-cb:checked').forEach(cb => checkedIdxs.push(parseInt(cb.dataset.idx)));
  let rl = getMasterRL();
  if (!rl) return;
  let docPct = getDocPercent(docVal);
  loadTestCheckboxes(rl, docPct);
  // Re-check previously selected tests
  if (checkedIdxs.length) {
    checkedIdxs.forEach(idx => {
      let cb = document.querySelector('.test-cb[data-idx="' + idx + '"]');
      if (cb) cb.checked = true;
    });
    calcEntry();
  }
}

// Apply rate list for Self (Walk-in) patients — no longer needs modal
function applySelfRL() {
  closeModal('selfRLModal');
  let rl = getMasterRL();
  if (!rl) return alert('Rate list nahi mili!');
  loadTestCheckboxes(rl, 50);
}

// Quick-edit a test's rate/type/split from the entry page
let quickEditTestIdx = null;
function openQuickTestEdit(idx) {
  let rl = getMasterRL();
  if (!rl || !rl.tests[idx]) return;
  let t = rl.tests[idx];
  quickEditTestIdx = idx;
  document.getElementById('quickTestName').textContent = t.name;
  document.getElementById('qtRate').value = t.rate || '';
  document.getElementById('qtType').value = t.type || 'normal';
  document.getElementById('qtDocShare').value = t.customDocShare != null ? t.customDocShare : '';
  document.getElementById('qtLabShare').value = t.customLabShare != null ? t.customLabShare : '';
  document.getElementById('quickTestModal').classList.add('show');
  setTimeout(() => document.getElementById('qtRate').focus(), 50);
}

function saveQuickTestEdit() {
  if (quickEditTestIdx == null) return;
  let rl = getMasterRL();
  if (!rl || !rl.tests[quickEditTestIdx]) return;
  let t = rl.tests[quickEditTestIdx];
  let newRate = parseFloat(document.getElementById('qtRate').value) || 0;
  let newType = document.getElementById('qtType').value;
  let cdsRaw = document.getElementById('qtDocShare').value.trim();
  let clsRaw = document.getElementById('qtLabShare').value.trim();
  t.rate = newRate;
  t.type = newType;
  if (cdsRaw !== '' || clsRaw !== '') {
    let cds = cdsRaw !== '' ? (parseFloat(cdsRaw) || 0) : null;
    let cls = clsRaw !== '' ? (parseFloat(clsRaw) || 0) : null;
    if (cds != null && cls == null) cls = Math.max(0, newRate - cds);
    if (cls != null && cds == null) cds = Math.max(0, newRate - cls);
    t.customDocShare = cds;
    t.customLabShare = cls;
  } else {
    delete t.customDocShare;
    delete t.customLabShare;
  }
  saveAll();
  if (dbReady) sbSave('rate_lists', rl.id, rl);
  let editedIdx = quickEditTestIdx;
  closeModal('quickTestModal');
  quickEditTestIdx = null;

  // Propagate the price change to ALL existing entries containing this test
  let updated = syncEntriesToRateList();
  if (updated > 0) toast('✅ ' + updated + ' past ' + (updated === 1 ? 'entry' : 'entries') + ' updated with new rate');

  reloadEntryTests();
  setTimeout(() => {
    let cb = document.querySelector('.test-cb[data-idx="' + editedIdx + '"]');
    if (cb) { cb.checked = true; calcEntry(); }
  }, 30);
  if (typeof renderRateLists === 'function') renderRateLists();
  if (typeof refreshSidebar === 'function') refreshSidebar();
}

function removeSelectedTest(idx) {
  if (idx < 0) return;
  let cb = document.querySelector('.test-cb[data-idx="' + idx + '"]');
  if (cb) { cb.checked = false; calcEntry(); }
}

// When a test checkbox is toggled — auto-open quick edit if rate=0 and just checked
function onTestCheckChange(cb, idx) {
  calcEntry();
  if (cb.checked) {
    let rl = getMasterRL();
    if (rl && rl.tests[idx] && !rl.tests[idx].rate) {
      // Rate is 0 — auto-open quick edit so user can enter rate immediately
      setTimeout(() => openQuickTestEdit(idx), 100);
    }
  }
}

function getSelectedTests() {
  // In Aarush mode, use Aarush-specific function for custom rates/splits
  if (typeof isAarushMode === 'function' && isAarushMode() && typeof getSelectedTestsAarush === 'function') {
    return getSelectedTestsAarush();
  }
  let rl = getMasterRL();
  if (!rl) return [];
  let container = document.getElementById('testCheckboxes');
  let docPercent = parseInt(container.dataset.docPercent) || 50;
  let selected = [];
  document.querySelectorAll('.test-cb:checked').forEach(cb => {
    let idx = parseInt(cb.dataset.idx);
    if (rl.tests[idx]) {
      let t = rl.tests[idx];
      let shares = calcShares(t.rate, docPercent, t);
      selected.push({ name: t.name, rate: t.rate, type: t.type, labShare: shares.labShare, docShare: shares.docShare, reagentCost: t.reagentCost || 0 });
    }
  });
  return selected;
}

function calcEntry() {
  let tests = getSelectedTests();
  let subtotal = tests.reduce((s, t) => s + t.rate, 0);
  let disc = parseFloat(document.getElementById('eDisc').value) || 0;
  let discType = document.getElementById('eDiscType').value;
  let discAmt = discType === 'pc' ? Math.round(subtotal * disc / 100) : disc;
  let extra = parseFloat((document.getElementById('eExtra') || {}).value) || 0;
  let total = Math.max(0, subtotal - discAmt + extra);
  document.getElementById('eSubtotal').textContent = subtotal;
  document.getElementById('eDiscAmt').textContent = discAmt;
  let extraDisplay = document.getElementById('eExtraDisplay');
  let extraAmtEl = document.getElementById('eExtraAmt');
  if (extraDisplay && extraAmtEl) {
    if (extra > 0) { extraDisplay.style.display = ''; extraAmtEl.textContent = extra; }
    else { extraDisplay.style.display = 'none'; }
  }
  document.getElementById('eTotal').textContent = total;
  document.getElementById('entryTotals').style.display = tests.length ? 'flex' : 'none';
  // Selected tests summary — chips with × on hover to deselect
  let sumEl = document.getElementById('selectedTestsSummary');
  if (sumEl) {
    if (tests.length) {
      let rl = getMasterRL();
      sumEl.style.display = 'block';
      sumEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">' +
        tests.map(t => {
          // Find this test's index in the master rate list
          let idx = rl ? rl.tests.findIndex(x => x.name === t.name) : -1;
          let displayRate = t.rate || t.splitBase || 0;
          let rateWarn = !t.rate ? ' style="color:#ffe082"' : '';
          return '<span class="sel-test-chip" style="background:var(--accent);color:white;padding:2px 6px 2px 8px;border-radius:12px;font-size:11px;display:inline-flex;align-items:center;gap:3px;cursor:default;position:relative">' +
            t.name + ' <small' + rateWarn + '>₹' + displayRate + '</small>' +
            (idx >= 0 ? '<span onclick="openQuickTestEdit(' + idx + ')" title="Edit rate/split" style="background:rgba(255,255,255,.25);color:white;width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;line-height:1;margin-left:1px" onmouseover="this.style.background=\'rgba(255,255,255,.45)\'" onmouseout="this.style.background=\'rgba(255,255,255,.25)\'">✏️</span>' : '') +
            '<span class="chip-x" onclick="removeSelectedTest(' + idx + ')" title="Remove test" style="background:rgba(255,255,255,.3);color:white;width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;margin-left:1px" onmouseover="this.style.background=\'rgba(255,255,255,.5)\'" onmouseout="this.style.background=\'rgba(255,255,255,.3)\'">×</span>' +
          '</span>';
        }).join('') +
        '</div>';
    } else {
      sumEl.style.display = 'none';
      sumEl.innerHTML = '';
    }
  }
  let bd = document.getElementById('balDisplay');
  let payStatus = document.getElementById('ePayStatus').value;
  if (payStatus === 'paid') {
    bd.innerHTML = '<span class="paid-display">Full Paid &#8377;' + total + '</span>';
  } else if (payStatus === 'hold') {
    bd.innerHTML = '<span style="background:#fff3e0;color:#e65100;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:600">⏸️ On Hold &#8377;' + total + '</span>';
  } else if (payStatus === 'hospital') {
    bd.innerHTML = '<span style="background:#e7f0fd;color:#1e4d8c;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:600">🏥 Hospital owes &#8377;' + total + '</span>';
  } else {
    let bal = Math.max(0, total - (parseFloat(document.getElementById('ePaid').value) || 0));
    bd.innerHTML = '<span class="bal-display">Balance: &#8377;' + bal + '</span>';
  }
}

function saveEntry() {
  // Require operator name before saving
  if (typeof getOperator === 'function' && !getOperator()) {
    if (typeof promptOperator === 'function') promptOperator();
    return alert('Pehle apna naam daalo (operator name)');
  }
  let docVal = document.getElementById('eDoctor').value;
  let isSelf = docVal === '__self__';
  if (!isSelf) {
    let doc = doctors.find(d => d.id === docVal);
    if (!doc) return alert('Doctor select karo!');
  }
  let name = document.getElementById('eName').value.trim();
  if (!name) return alert('Patient ka naam daalo!');
  let tests = getSelectedTests();
  if (!tests.length) return alert('Kam se kam ek test select karo!');
  let subtotal = tests.reduce((s, t) => s + t.rate, 0);
  let disc = parseFloat(document.getElementById('eDisc').value) || 0;
  let discType = document.getElementById('eDiscType').value;
  let discAmt = discType === 'pc' ? Math.round(subtotal * disc / 100) : disc;
  let extra = parseFloat((document.getElementById('eExtra') || {}).value) || 0;
  let extraReason = ((document.getElementById('eExtraReason') || {}).value || '').trim();
  let total = Math.max(0, subtotal - discAmt + extra);
  let payInfo = getPaymentInfo();
  let docName = isSelf ? 'Self' : doctors.find(d => d.id === docVal).name;

  if (editingEntryId) {
    // UPDATE existing entry — preserve id, created, keep everything else fresh
    let idx = entries.findIndex(x => x.id === editingEntryId);
    if (idx < 0) { editingEntryId = null; return alert('Entry not found — reload karo.'); }
    let existing = entries[idx];
    let updated = {
      ...existing,
      date: getDateFromPicker('e'),
      doctorId: docVal, doctorName: docName, name,
      tests, subtotal, discount: discAmt,
      extra: extra, extraReason: extraReason,
      extraInHisab: document.getElementById('eExtraInHisab').checked || false,
      total,
      paid: payInfo.paid, balance: payInfo.balance,
      hospitalPaid: payInfo.hospitalPaid,
      cashless: payInfo.cashless || false,
      noCut: payInfo.noCut || false,
      hold: payInfo.hold || false,
      holdReasons: payInfo.hold ? getHoldReasons() : [],
      paymentMode: getPayModeSplitsData().paymentMode,
      paymentModes: getPayModeSplitsData().paymentModes,
      collectorId: document.getElementById('eCollector').value,
      collectorName: (collectors.find(c => c.id === document.getElementById('eCollector').value) || {}).name || '',
      updatedBy: (typeof getOperator === 'function' ? getOperator() : ''),
      updated: new Date().toISOString()
    };
    entries[idx] = updated;
    saveLocal();
    if (dbReady) sbSave('entries', updated.id, updated);
    editingEntryId = null;
    updateSaveButtonLabel();
  } else {
    // NEW entry
    let entry = {
      id: uid(),
      date: getDateFromPicker('e'),
      doctorId: docVal, doctorName: docName, name,
      age: '', gender: '',
      tests, subtotal, discount: discAmt,
      extra: extra, extraReason: extraReason,
      extraInHisab: document.getElementById('eExtraInHisab').checked || false,
      total,
      paid: payInfo.paid, balance: payInfo.balance,
      hospitalPaid: payInfo.hospitalPaid,
      cashless: payInfo.cashless || false,
      noCut: payInfo.noCut || false,
      hold: payInfo.hold || false,
      holdReasons: payInfo.hold ? getHoldReasons() : [],
      paymentMode: getPayModeSplitsData().paymentMode,
      paymentModes: getPayModeSplitsData().paymentModes,
      collectorId: document.getElementById('eCollector').value,
      collectorName: (collectors.find(c => c.id === document.getElementById('eCollector').value) || {}).name || '',
      filledBy: (typeof getOperator === 'function' ? getOperator() : ''),
      created: new Date().toISOString()
    };
    entries.push(entry);
    saveEntry_db(entry);
  }
  // Reset form
  document.getElementById('eName').value = '';
  document.getElementById('eDisc').value = '';
  document.getElementById('eExtra').value = '';
  document.getElementById('eExtraReason').value = '';
  document.getElementById('eExtraInHisab').checked = false;
  document.getElementById('ePaid').value = '';
  document.getElementById('ePayStatus').value = 'paid';
  resetPayModeSplits();
  resetHoldReasons();
  togglePayFields();
  document.querySelectorAll('.test-cb').forEach(cb => cb.checked = false);
  calcEntry();
  refreshSidebar();
  document.getElementById('eName').focus();
}

function editEntry(id) {
  let e = entries.find(x => x.id === id);
  if (!e) return alert('Entry not found');
  editingEntryId = id;

  // Set date picker — split YYYY-MM-DD -> month/day dropdowns
  let dateParts = (e.date || '').split('-');
  if (dateParts.length === 3) {
    let mSel = document.getElementById('eMonth');
    let dSel = document.getElementById('eDay');
    if (mSel) mSel.value = dateParts[0] + '-' + dateParts[1];
    // updateDateDropdown fills eDay based on month, then set day
    if (typeof updateDateDropdown === 'function') updateDateDropdown('e');
    if (dSel) dSel.value = dateParts[2];
  }

  // Set doctor — triggers change handler that loads test checkboxes
  let dSelect = document.getElementById('eDoctor');
  dSelect.value = e.doctorId || '';
  dSelect.dispatchEvent(new Event('change'));
  if (typeof refreshDocComboLabel === 'function') refreshDocComboLabel();

  // Set patient name
  document.getElementById('eName').value = e.name || '';

  // After a small tick (test checkboxes are rendered synchronously by change handler,
  // but be safe), tick the matching tests by name
  setTimeout(() => {
    let rl = getMasterRL();
    if (!rl) return;
    let entryTestNames = new Set(e.tests.map(t => t.name.toLowerCase()));
    document.querySelectorAll('.test-cb').forEach(cb => {
      let idx = parseInt(cb.dataset.idx);
      let t = rl.tests[idx];
      if (t && entryTestNames.has(t.name.toLowerCase())) cb.checked = true;
    });

    // Discount
    document.getElementById('eDisc').value = e.discount || '';
    document.getElementById('eDiscType').value = 'rs';

    // Extra
    document.getElementById('eExtra').value = e.extra || '';
    document.getElementById('eExtraReason').value = e.extraReason || '';
    document.getElementById('eExtraInHisab').checked = e.extraInHisab || false;

    // Payment
    if (e.hold) {
      document.getElementById('ePayStatus').value = 'hold';
    } else if (e.noCut) {
      document.getElementById('ePayStatus').value = 'nocut';
    } else if (e.cashless) {
      document.getElementById('ePayStatus').value = 'cashless';
    } else if (e.hospitalPaid) {
      document.getElementById('ePayStatus').value = 'hospital';
    } else {
      let isFullPaid = (e.balance || 0) === 0;
      document.getElementById('ePayStatus').value = isFullPaid ? 'paid' : 'partial';
      if (!isFullPaid) document.getElementById('ePaid').value = e.paid || '';
    }
    togglePayFields();

    // Hold reasons
    restoreHoldReasons(e.holdReasons || []);

    // Payment mode splits
    if (e.paymentModes && e.paymentModes.length) {
      payModeSplits = JSON.parse(JSON.stringify(e.paymentModes));
    } else {
      payModeSplits = [{ mode: e.paymentMode || 'Cash', amount: 0 }];
    }
    renderPayModeSplits();

    // Collector
    document.getElementById('eCollector').value = e.collectorId || '';

    // Restore Aarush custom rate/split overrides if editing an Aarush entry
    if (typeof restoreAarushOverrides === 'function' && e.tests) {
      restoreAarushOverrides(e.tests);
    }

    calcEntry();
    updateSaveButtonLabel();

    // Scroll top so user sees the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('eName').focus();
  }, 50);
}

function cancelEditEntry() {
  editingEntryId = null;
  document.getElementById('eName').value = '';
  document.getElementById('eDisc').value = '';
  document.getElementById('eExtra').value = '';
  document.getElementById('eExtraReason').value = '';
  document.getElementById('eExtraInHisab').checked = false;
  document.getElementById('ePaid').value = '';
  document.getElementById('ePayStatus').value = 'paid';
  resetPayModeSplits();
  resetHoldReasons();
  togglePayFields();
  document.querySelectorAll('.test-cb').forEach(cb => cb.checked = false);
  calcEntry();
  updateSaveButtonLabel();
}

function updateSaveButtonLabel() {
  let btn = document.getElementById('saveEntryBtn');
  let cancelBtn = document.getElementById('cancelEditBtn');
  let banner = document.getElementById('editBanner');
  if (editingEntryId) {
    if (btn) btn.innerHTML = '💾 Update Entry';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (banner) banner.style.display = 'block';
  } else {
    if (btn) btn.innerHTML = '💾 Save Entry';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (banner) banner.style.display = 'none';
  }
}

// ========== ENTRY SIDEBAR ==========
function refreshSidebar() {
  let dateEl = document.getElementById('sidebarDate');
  if (!dateEl) return;
  let date = getDateFromPicker('e');
  dateEl.textContent = date;
  let dayEntries = entries.filter(e => e.date === date);
  let c = document.getElementById('sidebarEntries');
  if (!dayEntries.length) { c.innerHTML = '<div class="empty" style="padding:15px">Koi entry nahi</div>'; return; }
  let totalAmt = 0, totalPaid = 0;
  let rows = dayEntries.map((e, i) => {
    totalAmt += e.total; totalPaid += e.paid;
    let tnames = e.tests.map(t => t.name).join(', ');
    let st;
    if (e.hold) { st = '<span class="badge" style="background:#fff3e0;color:#e65100">⏸️ Hold</span>'; }
    else if (e.noCut) { st = '<span class="badge" style="background:#f3e5f5;color:#6a1b9a">🆓 No Cut</span>'; }
    else if (e.cashless) { st = '<span class="badge" style="background:#e0f2f1;color:#00695c">💳 Cashless</span>'; }
    else if (e.hospitalPaid) { st = '<span class="badge" style="background:#e7f0fd;color:#1e4d8c">🏥 Hospital</span>'; }
    else if (e.balance > 0) { st = '<span class="badge badge-red">&#8377;' + e.balance + '</span>'; }
    else { st = '<span class="badge badge-green">Paid</span>'; }
    let payBtn = e.balance > 0 ? '<button class="btn btn-success btn-xs" onclick="updatePayment(\'' + e.id + '\')" title="Pay Balance">&#8377;</button>' : '';
    let editBtn = '<button class="btn btn-xs" onclick="editEntry(\'' + e.id + '\')" title="Edit entry" style="background:var(--accent);color:white;padding:2px 6px;font-size:10px;margin-right:2px">✏️</button>';
    let liveDoc = (e.doctorId && e.doctorId !== '__self__') ? doctors.find(d => d.id === e.doctorId) : null;
    let docName = liveDoc ? liveDoc.name : (e.doctorName || (e.doctorId === '__self__' ? 'Self' : '-'));
    return '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + docName + '</td><td style="font-size:11px;max-width:100px">' + tnames + '</td><td>&#8377;' + e.total + '</td><td>' + st + '</td>' +
      '<td style="white-space:nowrap">' + editBtn + payBtn + '<button class="del-btn" onclick="deleteEntry(\'' + e.id + '\')">&#10005;</button></td></tr>';
  }).join('');
  c.innerHTML = '<table><tr><th>#</th><th>Naam</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Status</th><th></th></tr>' + rows + '</table>' +
    '<div style="font-size:12px;margin-top:6px;color:var(--gray-500)"><b>' + dayEntries.length + '</b> entries | Total: <b>&#8377;' + totalAmt + '</b> | Paid: <b>&#8377;' + totalPaid + '</b> | Baaki: <b style="color:var(--danger)">&#8377;' + (totalAmt - totalPaid) + '</b></div>';
}

// ========== KEYBOARD FLOW ==========
function initKeyboardFlow() {
  const FIELD_ORDER = ['eDoctorSearch', 'eName', 'eDisc', 'eDiscType', 'eExtra', 'eExtraReason', 'ePayStatus', 'ePaid', 'ePayModeAdd', 'ePayModeAmt', 'eCollector'];
  function nextField(currentId) {
    let idx = FIELD_ORDER.indexOf(currentId);
    if (idx < 0) return;
    for (let i = idx + 1; i < FIELD_ORDER.length; i++) {
      let el = document.getElementById(FIELD_ORDER[i]);
      if (el && el.style.display !== 'none' && el.offsetParent !== null) { el.focus(); return; }
    }
    saveEntry();
  }
  FIELD_ORDER.forEach(id => {
    let el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        if (el.tagName === 'SELECT' && !el.dataset.opened) {
          ev.preventDefault();
          el.dataset.opened = '1';
          if (typeof el.showPicker === 'function') { try { el.showPicker(); } catch(e){} }
          return;
        }
        delete el.dataset.opened;
        ev.preventDefault();
        nextField(id);
      }
    });
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', function() { delete el.dataset.opened; });
    }
  });
}
