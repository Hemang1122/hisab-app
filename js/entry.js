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
    let doc = doctors.find(d => d.id === this.value);
    let container = document.getElementById('testCheckboxes'), rlSpan = document.getElementById('rlName');
    if (!doc || !doc.rateListId) {
      container.innerHTML = '<div class="empty" style="padding:10px">Pehle doctor select karo jisko rate list assigned ho</div>';
      rlSpan.textContent = '-'; return;
    }
    let rl = rateLists.find(r => r.id === doc.rateListId);
    if (!rl) { container.innerHTML = '<div class="empty" style="padding:10px">Rate list nahi mili</div>'; rlSpan.textContent = '-'; return; }
    rlSpan.textContent = rl.name;
    container.innerHTML = rl.tests.map((t, i) => '<div class="test-row">' +
      '<label style="display:flex;align-items:center;gap:6px;margin:0;flex:1">' +
      '<input type="checkbox" class="test-cb" data-idx="' + i + '" onchange="calcEntry()"> ' +
      '<span class="tname">' + t.name + '</span></label>' +
      '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>' +
      '<span class="trate">₹' + t.rate + '</span></div>').join('');
    calcEntry();
  });
}

function getSelectedTests() {
  let doc = doctors.find(d => d.id === document.getElementById('eDoctor').value);
  if (!doc || !doc.rateListId) return [];
  let rl = rateLists.find(r => r.id === doc.rateListId); if (!rl) return [];
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
    bd.innerHTML = '<span class="paid-display">Full Paid ₹' + total + '</span>';
  } else {
    let bal = Math.max(0, total - (parseFloat(document.getElementById('ePaid').value) || 0));
    bd.innerHTML = '<span class="bal-display">Balance: ₹' + bal + '</span>';
  }
}

function saveEntry() {
  let docId = document.getElementById('eDoctor').value;
  let doc = doctors.find(d => d.id === docId);
  if (!doc) return alert('Doctor select karo!');
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
  let entry = {
    id: uid(),
    date: getDateFromPicker('e'),
    doctorId: docId, doctorName: doc.name, name,
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
    let st = e.balance > 0 ? '<span class="badge badge-red">₹' + e.balance + '</span>' : '<span class="badge badge-green">Paid</span>';
    return '<tr><td>' + (i + 1) + '</td><td>' + e.name + '</td><td>' + e.doctorName + '</td><td style="font-size:11px;max-width:100px">' + tnames + '</td><td>₹' + e.total + '</td><td>' + st + '</td>' +
      '<td><button class="del-btn" onclick="deleteEntry(\'' + e.id + '\')">✕</button></td></tr>';
  }).join('');
  c.innerHTML = '<table><tr><th>#</th><th>Naam</th><th>Doctor</th><th>Tests</th><th>Total</th><th>Status</th><th></th></tr>' + rows + '</table>' +
    '<div style="font-size:12px;margin-top:6px;color:#555"><b>' + dayEntries.length + '</b> entries | Total: <b>₹' + totalAmt + '</b> | Paid: <b>₹' + totalPaid + '</b> | Baaki: <b style="color:#c0392b">₹' + (totalAmt - totalPaid) + '</b></div>';
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
      if (ev.key === 'Enter') { ev.preventDefault(); nextField(id); }
    });
  });
}
