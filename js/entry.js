// ========== ENTRY FORM ==========

function togglePayFields() {
  let status = document.getElementById('ePayStatus').value;
  let paidInput = document.getElementById('ePaid');
  if (status === 'paid') { paidInput.style.display = 'none'; calcEntry(); }
  else { paidInput.style.display = 'block'; paidInput.focus(); calcEntry(); }
}

function getPaymentInfo() {
  let status = document.getElementById('ePayStatus').value;
  let total = parseInt(document.getElementById('eTotal').textContent) || 0;
  if (status === 'paid') return { paid: total, balance: 0 };
  let paid = parseFloat(document.getElementById('ePaid').value) || 0;
  return { paid, balance: Math.max(0, total - paid) };
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
  let searchHtml = '<input id="testSearch" placeholder="🔍 Test search karo... (Enter/Tab to select)" oninput="filterTests()" onkeydown="testSearchKeyHandler(event)" style="width:100%;margin-bottom:6px;padding:6px 10px;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:13px;position:sticky;top:0;background:white;z-index:1">';
  let testsHtml = rl.tests.map((t, i) => {
    let incomplete = !t.rate ? ' test-incomplete' : '';
    return '<div class="test-row' + incomplete + '" data-testname="' + t.name.toLowerCase() + '" tabindex="0" onkeydown="testRowKeyHandler(event,this)">' +
    '<label style="display:flex;align-items:center;gap:6px;margin:0;flex:1">' +
    '<input type="checkbox" class="test-cb" data-idx="' + i + '" tabindex="-1" onchange="calcEntry()" onkeydown="testRowKeyHandler(event,this.closest(\'.test-row\'))"> ' +
    '<span class="tname">' + t.name + (incomplete ? ' ⚠️' : '') + '</span></label>' +
    '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>' +
    '<span class="trate">&#8377;' + (t.rate || 0) + '</span></div>';
  }).join('');
  container.innerHTML = searchHtml + testsHtml;
  // Store current docPercent for use in getSelectedTests
  container.dataset.docPercent = docPercent;
  calcEntry();
}

function filterTests() {
  let q = (document.getElementById('testSearch').value || '').toLowerCase();
  document.querySelectorAll('#testCheckboxes .test-row').forEach(row => {
    row.style.display = row.dataset.testname.includes(q) ? '' : 'none';
  });
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
      if (cb) { cb.checked = !cb.checked; calcEntry(); }
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
    if (cb) { cb.checked = !cb.checked; calcEntry(); }
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

function getSelectedTests() {
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
      selected.push({ name: t.name, rate: t.rate, type: t.type, labShare: shares.labShare, docShare: shares.docShare });
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
  let total = Math.max(0, subtotal - discAmt);
  document.getElementById('eSubtotal').textContent = subtotal;
  document.getElementById('eDiscAmt').textContent = discAmt;
  document.getElementById('eTotal').textContent = total;
  document.getElementById('entryTotals').style.display = tests.length ? 'flex' : 'none';
  // Selected tests summary
  let sumEl = document.getElementById('selectedTestsSummary');
  if (sumEl) {
    if (tests.length) {
      sumEl.style.display = 'block';
      sumEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">' +
        tests.map(t => '<span style="background:var(--accent);color:white;padding:2px 8px;border-radius:12px;font-size:11px;display:inline-flex;align-items:center;gap:3px">' + t.name + ' <small>₹' + t.rate + '</small></span>').join('') +
        '</div>';
    } else {
      sumEl.style.display = 'none';
      sumEl.innerHTML = '';
    }
  }
  let bd = document.getElementById('balDisplay');
  if (document.getElementById('ePayStatus').value === 'paid') {
    bd.innerHTML = '<span class="paid-display">Full Paid &#8377;' + total + '</span>';
  } else {
    let bal = Math.max(0, total - (parseFloat(document.getElementById('ePaid').value) || 0));
    bd.innerHTML = '<span class="bal-display">Balance: &#8377;' + bal + '</span>';
  }
}

function saveEntry() {
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
  let total = Math.max(0, subtotal - discAmt);
  let payInfo = getPaymentInfo();
  let docName = isSelf ? 'Self' : doctors.find(d => d.id === docVal).name;
  let entry = {
    id: uid(),
    date: getDateFromPicker('e'),
    doctorId: docVal, doctorName: docName, name,
    age: '', gender: '',
    tests, subtotal, discount: discAmt, total,
    paid: payInfo.paid, balance: payInfo.balance,
    paymentMode: document.getElementById('ePayMode').value,
    collectorId: document.getElementById('eCollector').value,
    collectorName: (collectors.find(c => c.id === document.getElementById('eCollector').value) || {}).name || '',
    created: new Date().toISOString()
  };
  entries.push(entry);
  saveEntry_db(entry);
  // Reset form
  document.getElementById('eName').value = '';
  document.getElementById('eDisc').value = '0';
  document.getElementById('ePaid').value = '0';
  document.getElementById('ePayStatus').value = 'paid';
  togglePayFields();
  document.querySelectorAll('.test-cb').forEach(cb => cb.checked = false);
  calcEntry();
  refreshSidebar();
  document.getElementById('eName').focus();
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
    let st = e.balance > 0 ? '<span class="badge badge-red">&#8377;' + e.balance + '</span>' : '<span class="badge badge-green">Paid</span>';
    let payBtn = e.balance > 0 ? '<button class="btn btn-success btn-xs" onclick="updatePayment(\'' + e.id + '\')" title="Pay Balance">&#8377;</button>' : '';
    return '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + e.doctorName + '</td><td style="font-size:11px;max-width:100px">' + tnames + '</td><td>&#8377;' + e.total + '</td><td>' + st + '</td>' +
      '<td style="white-space:nowrap">' + payBtn + '<button class="del-btn" onclick="deleteEntry(\'' + e.id + '\')">&#10005;</button></td></tr>';
  }).join('');
  c.innerHTML = '<table><tr><th>#</th><th>Naam</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Status</th><th></th></tr>' + rows + '</table>' +
    '<div style="font-size:12px;margin-top:6px;color:var(--gray-500)"><b>' + dayEntries.length + '</b> entries | Total: <b>&#8377;' + totalAmt + '</b> | Paid: <b>&#8377;' + totalPaid + '</b> | Baaki: <b style="color:var(--danger)">&#8377;' + (totalAmt - totalPaid) + '</b></div>';
}

// ========== KEYBOARD FLOW ==========
function initKeyboardFlow() {
  const FIELD_ORDER = ['eDoctor', 'eName', 'eDisc', 'eDiscType', 'ePayStatus', 'ePaid', 'ePayMode', 'eCollector'];
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
