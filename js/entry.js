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

    // Handle Self (Walk-in)
    if (val === '__self__') {
      let sel = document.getElementById('selfRLSelect');
      sel.innerHTML = '<option value="">-- Select Rate List --</option>' + rateLists.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');
      document.getElementById('selfRLModal').classList.add('show');
      return;
    }

    let doc = doctors.find(d => d.id === val);
    if (!doc || !doc.rateListId) {
      container.innerHTML = '<div class="empty" style="padding:10px">Pehle doctor select karo jisko rate list assigned ho</div>';
      rlSpan.textContent = '-'; return;
    }
    let rl = rateLists.find(r => r.id === doc.rateListId);
    if (!rl) { container.innerHTML = '<div class="empty" style="padding:10px">Rate list nahi mili</div>'; rlSpan.textContent = '-'; return; }
    loadTestCheckboxes(rl);
  });
}

function loadTestCheckboxes(rl) {
  let container = document.getElementById('testCheckboxes'), rlSpan = document.getElementById('rlName');
  rlSpan.textContent = rl.name;
  if (!rl.tests.length) {
    container.innerHTML = '<div class="empty" style="padding:15px">Is rate list mein koi test nahi hai. Rate List tab mein tests add karo.</div>';
    calcEntry(); return;
  }
  let searchHtml = '<input id="testSearch" placeholder="🔍 Test search karo..." oninput="filterTests()" style="width:100%;margin-bottom:6px;padding:6px 10px;border:1px solid var(--gray-200);border-radius:var(--radius);font-size:13px;position:sticky;top:0;background:white;z-index:1">';
  let testsHtml = rl.tests.map((t, i) => {
    let incomplete = (!t.rate || !t.labShare || !t.docShare) ? ' test-incomplete' : '';
    return '<div class="test-row' + incomplete + '" data-testname="' + t.name.toLowerCase() + '">' +
    '<label style="display:flex;align-items:center;gap:6px;margin:0;flex:1">' +
    '<input type="checkbox" class="test-cb" data-idx="' + i + '" data-rlid="' + rl.id + '" onchange="calcEntry()"> ' +
    '<span class="tname">' + t.name + (incomplete ? ' ⚠️' : '') + '</span></label>' +
    '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>' +
    '<span class="trate">&#8377;' + (t.rate || 0) + '</span></div>';
  }).join('');
  container.innerHTML = searchHtml + testsHtml;
  calcEntry();
}

function filterTests() {
  let q = (document.getElementById('testSearch').value || '').toLowerCase();
  document.querySelectorAll('#testCheckboxes .test-row').forEach(row => {
    row.style.display = row.dataset.testname.includes(q) ? '' : 'none';
  });
}

// Apply rate list for Self (Walk-in) patients
function applySelfRL() {
  let rlId = document.getElementById('selfRLSelect').value;
  if (!rlId) return alert('Rate list select karo!');
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl) return alert('Rate list nahi mili!');
  closeModal('selfRLModal');
  // Store selected RL id for self patient
  document.getElementById('eDoctor').dataset.selfRlId = rlId;
  loadTestCheckboxes(rl);
}

function getSelectedTests() {
  let docVal = document.getElementById('eDoctor').value;
  let rl;
  if (docVal === '__self__') {
    let rlId = document.getElementById('eDoctor').dataset.selfRlId;
    rl = rateLists.find(r => r.id === rlId);
  } else {
    let doc = doctors.find(d => d.id === docVal);
    if (!doc || !doc.rateListId) return [];
    rl = rateLists.find(r => r.id === doc.rateListId);
  }
  if (!rl) return [];
  let selected = [];
  document.querySelectorAll('.test-cb:checked').forEach(cb => {
    let idx = parseInt(cb.dataset.idx); if (rl.tests[idx]) selected.push({ ...rl.tests[idx] });
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
    age: document.getElementById('eAge').value,
    gender: document.getElementById('eGender').value,
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
  document.getElementById('eAge').value = '';
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
  const FIELD_ORDER = ['eDoctor', 'eName', 'eAge', 'eGender', 'eDisc', 'eDiscType', 'ePayStatus', 'ePaid', 'ePayMode', 'eCollector'];
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
        // For select dropdowns: first Enter opens it, second Enter (after picking) moves on
        if (el.tagName === 'SELECT' && !el.dataset.opened) {
          ev.preventDefault();
          el.dataset.opened = '1';
          // showPicker opens native dropdown on supported browsers
          if (typeof el.showPicker === 'function') { try { el.showPicker(); } catch(e){} }
          return;
        }
        delete el.dataset.opened;
        ev.preventDefault();
        nextField(id);
      }
    });
    // Reset opened flag when selection changes
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', function() { delete el.dataset.opened; });
    }
  });
}
