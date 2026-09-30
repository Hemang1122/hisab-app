// ========== RATE LIST MANAGEMENT ==========

let editingRL = null;

function openRLModal(id) {
  editingRL = id || null;
  document.getElementById('rlModalTitle').textContent = id ? 'Rate List Edit' : 'Nayi Rate List';
  document.getElementById('rlTestRows').innerHTML = '';
  let dcContainer = document.getElementById('rlDoctorCheckboxes');
  if (doctors.length) {
    let assignedDocIds = id ? doctors.filter(d => d.rateListId === id).map(d => d.id) : [];
    dcContainer.innerHTML = doctors.map(d => '<label style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:13px"><input type="checkbox" class="rl-doc-cb" value="' + d.id + '" ' + (assignedDocIds.includes(d.id) ? 'checked' : '') + '> ' + d.name + '</label>').join('');
  } else {
    dcContainer.innerHTML = '<small style="color:#999">Pehle Doctors tab mein doctor add karo</small>';
  }
  if (id) {
    let rl = rateLists.find(r => r.id === id);
    document.getElementById('rlNameInput').value = rl.name;
    rl.tests.forEach(t => addRLTest(t));
  } else {
    document.getElementById('rlNameInput').value = '';
  }
  document.getElementById('rlModal').classList.add('show');
}

function addRLTest(data) {
  let div = document.createElement('div');
  div.style.cssText = 'border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:6px;position:relative';
  let n = data ? data.name : '', r = data ? data.rate : '', ls = data ? data.labShare : '', ds = data ? data.docShare : '', tp = data ? data.type : 'normal';
  div.innerHTML = '<button class="del-btn" onclick="this.parentElement.remove()" style="position:absolute;right:4px;top:4px">✕</button>' +
    '<input placeholder="Test name" value="' + n + '" class="rlt-name" style="margin-bottom:4px">' +
    '<div style="display:flex;gap:6px">' +
    '<input type="number" placeholder="Rate ₹" value="' + r + '" class="rlt-rate" style="width:25%" oninput="autoSplit(this)">' +
    '<input type="number" placeholder="Lab ₹" value="' + ls + '" class="rlt-lab" style="width:25%">' +
    '<input type="number" placeholder="Doctor ₹" value="' + ds + '" class="rlt-doc" style="width:25%">' +
    '<select class="rlt-type" style="width:25%"><option value="normal" ' + (tp === 'normal' ? 'selected' : '') + '>Normal</option><option value="special" ' + (tp === 'special' ? 'selected' : '') + '>Special</option></select>' +
    '</div>';
  document.getElementById('rlTestRows').appendChild(div);
}

function autoSplit(el) {
  let row = el.closest('div'), rate = parseFloat(el.value) || 0;
  let rlName = document.getElementById('rlNameInput').value.toLowerCase();
  let docPct = (rlName.includes('60-40') || rlName.includes('60 40')) ? 0.6 : 0.5;
  let docShare = Math.round(rate * docPct);
  let labShare = rate - docShare;
  row.querySelector('.rlt-lab').value = labShare;
  row.querySelector('.rlt-doc').value = docShare;
}

function saveRateList() {
  let name = document.getElementById('rlNameInput').value.trim();
  if (!name) return alert('Rate list ka naam daalo!');
  let tests = [];
  document.querySelectorAll('#rlTestRows>div').forEach(div => {
    let n = div.querySelector('.rlt-name').value.trim();
    let r = parseFloat(div.querySelector('.rlt-rate').value) || 0;
    let l = parseFloat(div.querySelector('.rlt-lab').value) || 0;
    let d = parseFloat(div.querySelector('.rlt-doc').value) || 0;
    let t = div.querySelector('.rlt-type').value;
    if (n) tests.push({ name: n, rate: r, labShare: l, docShare: d, type: t });
  });
  if (!tests.length) return alert('Kam se kam ek test add karo!');
  let rlId;
  if (editingRL) { let rl = rateLists.find(r => r.id === editingRL); rl.name = name; rl.tests = tests; rlId = editingRL; }
  else { rlId = uid(); rateLists.push({ id: rlId, name, tests }); }
  let checkedDocIds = [];
  document.querySelectorAll('.rl-doc-cb:checked').forEach(cb => checkedDocIds.push(cb.value));
  doctors.forEach(d => {
    if (checkedDocIds.includes(d.id)) d.rateListId = rlId;
    else if (d.rateListId === rlId) d.rateListId = '';
  });
  saveAll();
  if (dbReady) sbSave('rate_lists', rlId, rateLists.find(r => r.id === rlId));
  closeModal('rlModal'); renderRateLists(); renderDoctors(); populateDropdowns();
}

function renderRateLists() {
  let c = document.getElementById('rateListsView');
  if (!c) return;
  if (!rateLists.length) { c.innerHTML = '<div class="empty">Koi rate list nahi hai. Nayi banao!</div>'; return; }
  c.innerHTML = rateLists.map(rl => {
    let assignedDocs = doctors.filter(d => d.rateListId === rl.id).map(d => d.name);
    let docStr = assignedDocs.length ? assignedDocs.join(', ') : '<i style="color:#999">Koi doctor assign nahi</i>';
    let testCount = rl.tests.length;
    let incompleteCount = rl.tests.filter(t => !t.rate || !t.labShare || !t.docShare).length;
    let countBadge = testCount + ' tests' + (incompleteCount ? ' <span style="color:var(--warn);cursor:pointer" onclick="filterRLIncomplete(\'' + rl.id + '\',this)" title="Click to show only incomplete">(' + incompleteCount + ' incomplete)</span>' : '');
    let rows = testCount ? rl.tests.map((t, idx) => {
      let isIncomplete = (!t.rate || !t.labShare || !t.docShare);
      let incomplete = isIncomplete ? ' style="background:var(--warn-bg)"' : '';
      let warn = isIncomplete ? ' ⚠️' : '';
      let ec = 'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px';
      return '<tr class="rl-test-row" data-rlid="' + rl.id + '" data-testname="' + t.name.toLowerCase() + '" data-incomplete="' + (isIncomplete ? '1' : '0') + '"' + incomplete + '>' +
        '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'name\',this)">' + t.name + warn + '</td>' +
        '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'type\',this)"><span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span></td>' +
        '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'rate\',this)">₹' + (t.rate || 0) + '</td>' +
        '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'labShare\',this)">₹' + (t.labShare || 0) + '</td>' +
        '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'docShare\',this)">₹' + (t.docShare || 0) + '</td>' +
        '<td></td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--n400);padding:15px">Koi test nahi — Edit karo aur tests add karo</td></tr>';

    // Search + filter toolbar inside the test wrap
    let toolbar = '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap">' +
      '<input placeholder="🔍 Test search karo... (Enter to select)" oninput="searchRLTests(\'' + rl.id + '\',this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();selectFirstRLTest(\'' + rl.id + '\',this)}" style="flex:1;min-width:120px;padding:8px 12px;border:2px solid var(--accent);border-radius:var(--radius);font-size:13px;background:var(--accent-light,#e3f2fd);font-weight:500">' +
      (incompleteCount ? '<button class="btn btn-sm" onclick="filterRLIncomplete(\'' + rl.id + '\',this)" style="font-size:11px;padding:3px 8px;background:var(--warn);color:#333;border:none;border-radius:var(--radius);cursor:pointer;white-space:nowrap" data-filtered="0">⚠️ ' + incompleteCount + ' Incomplete</button>' : '') +
      '<button class="btn btn-sm btn-secondary" onclick="printRateList(\'' + rl.id + '\')" style="font-size:11px;padding:3px 8px;white-space:nowrap">🖨️ Print</button>' +
      '</div>';

    return '<div class="card"><div class="flex-between"><div><b>' + rl.name + '</b><br><small>Doctors: ' + docStr + '</small></div><div>' +
      '<button class="btn btn-sm btn-primary" onclick="openRLModal(\'' + rl.id + '\')">Edit All</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteRL(\'' + rl.id + '\')">Delete</button></div></div>' +
      toolbar +
      '<div style="margin-top:4px"><button class="btn btn-sm btn-secondary" onclick="toggleRLTests(this)" style="font-size:12px">▶ Show Tests (' + countBadge + ')</button>' +
      '<div class="rl-tests-wrap" style="display:none;margin-top:6px"><table><tr><th>Test</th><th>Type</th><th>Rate</th><th>Lab</th><th>Doctor</th><th></th></tr>' + rows + '</table></div></div></div>';
  }).join('');
}

function toggleRLTests(btn) {
  let wrap = btn.nextElementSibling;
  if (wrap.style.display === 'none') {
    wrap.style.display = 'block';
    btn.textContent = btn.textContent.replace('▶ Show', '▼ Hide');
  } else {
    wrap.style.display = 'none';
    btn.textContent = btn.textContent.replace('▼ Hide', '▶ Show');
  }
}

// Search tests within a rate list
function searchRLTests(rlId, query) {
  let q = (query || '').toLowerCase();
  // Auto-expand if collapsed
  let rows = document.querySelectorAll('.rl-test-row[data-rlid="' + rlId + '"]');
  if (rows.length) {
    let wrap = rows[0].closest('.rl-tests-wrap');
    if (wrap && wrap.style.display === 'none') {
      wrap.style.display = 'block';
      let toggleBtn = wrap.previousElementSibling;
      if (toggleBtn) toggleBtn.textContent = toggleBtn.textContent.replace('▶ Show', '▼ Hide');
    }
  }
  rows.forEach(row => {
    row.style.display = row.dataset.testname.includes(q) ? '' : 'none';
  });
}

// Select first visible test in RL search (highlight it)
function selectFirstRLTest(rlId, input) {
  let visible = document.querySelector('.rl-test-row[data-rlid="' + rlId + '"]:not([style*="display: none"]):not([style*="display:none"])');
  if (visible) {
    // Flash highlight the row
    visible.style.transition = 'background 0.3s';
    visible.style.background = '#bbdefb';
    setTimeout(() => { visible.style.background = ''; }, 1000);
    visible.scrollIntoView({ block: 'nearest' });
  }
  input.value = '';
  searchRLTests(rlId, '');
  input.focus();
}

// Toggle showing only incomplete tests
function filterRLIncomplete(rlId, btn) {
  let isFiltered = btn.dataset.filtered === '1';
  let rows = document.querySelectorAll('.rl-test-row[data-rlid="' + rlId + '"]');
  if (isFiltered) {
    // Show all
    rows.forEach(row => row.style.display = '');
    btn.dataset.filtered = '0';
    if (btn.tagName === 'BUTTON') btn.style.background = 'var(--warn)';
  } else {
    // Show only incomplete
    rows.forEach(row => {
      row.style.display = row.dataset.incomplete === '1' ? '' : 'none';
    });
    btn.dataset.filtered = '1';
    if (btn.tagName === 'BUTTON') btn.style.background = '#ff9800';
    // Auto-expand the test table if collapsed
    let wrap = btn.closest('.rl-tests-wrap') || btn.closest('.card').querySelector('.rl-tests-wrap');
    if (wrap && wrap.style.display === 'none') {
      wrap.style.display = 'block';
      let toggleBtn = wrap.previousElementSibling;
      if (toggleBtn) toggleBtn.textContent = toggleBtn.textContent.replace('▶ Show', '▼ Hide');
    }
  }
}

// Print rate list as PDF-friendly page
function printRateList(rlId) {
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl) return;
  let assignedDocs = doctors.filter(d => d.rateListId === rl.id).map(d => d.name);
  let docStr = assignedDocs.length ? assignedDocs.join(', ') : 'None';

  let rows = rl.tests.map((t, i) => {
    let warn = (!t.rate || !t.labShare || !t.docShare) ? ' ⚠️' : '';
    return '<tr' + (warn ? ' style="background:#fff8e1"' : '') + '><td style="text-align:center">' + (i + 1) + '</td><td>' + t.name + warn + '</td><td><span>' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span></td><td style="text-align:right">₹' + (t.rate || 0) + '</td><td style="text-align:right">₹' + (t.labShare || 0) + '</td><td style="text-align:right">₹' + (t.docShare || 0) + '</td></tr>';
  }).join('');

  let totalRate = rl.tests.reduce((s, t) => s + (t.rate || 0), 0);
  let incompleteCount = rl.tests.filter(t => !t.rate || !t.labShare || !t.docShare).length;

  let html = '<div style="font-family:sans-serif;max-width:800px;margin:auto;padding:20px">' +
    '<h2 style="text-align:center;margin-bottom:2px">Shree Balaji Clinical Laboratory</h2>' +
    '<p style="text-align:center;color:#666;margin-top:0">Rate List</p>' +
    '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:6px;margin-bottom:12px;font-size:13px">' +
    '<div><strong>Name:</strong> ' + rl.name + '</div>' +
    '<div><strong>Doctors:</strong> ' + docStr + '</div>' +
    '<div><strong>Tests:</strong> ' + rl.tests.length + (incompleteCount ? ' (' + incompleteCount + ' incomplete)' : '') + '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="background:#333;color:white"><th style="padding:6px;text-align:center">#</th><th style="padding:6px">Test</th><th style="padding:6px">Type</th><th style="padding:6px;text-align:right">Rate</th><th style="padding:6px;text-align:right">Lab Share</th><th style="padding:6px;text-align:right">Doctor Share</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="font-weight:bold;border-top:2px solid #333"><td colspan="3" style="padding:6px">Total</td><td style="padding:6px;text-align:right">₹' + totalRate + '</td><td colspan="2"></td></tr></tfoot>' +
    '</table></div>';

  document.getElementById('printArea').innerHTML = html;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function inlineEditField(rlId, idx, field, td) {
  if (td.querySelector('input,select')) return; // already editing
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl || !rl.tests[idx]) return;
  let t = rl.tests[idx];
  let oldVal = t[field];

  if (field === 'type') {
    // Toggle type on click — update in place without re-render
    t.type = t.type === 'normal' ? 'special' : 'normal';
    let span = td.querySelector('span') || td;
    if (t.type === 'special') { span.className = 'tag-special'; span.textContent = 'Special'; }
    else { span.className = 'tag-normal'; span.textContent = 'Normal'; }
    saveRLTestFieldQuiet(rl, rlId);
    return;
  }

  let isNum = (field !== 'name');
  let input = document.createElement('input');
  input.type = isNum ? 'number' : 'text';
  input.value = oldVal || '';
  input.style.cssText = 'width:100%;padding:3px 5px;font-size:12px;border:1px solid var(--accent);border-radius:4px;box-sizing:border-box';
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    let val = isNum ? (parseFloat(input.value) || 0) : input.value.trim();
    if (field === 'name' && !val) val = oldVal; // don't allow empty name
    t[field] = val;
    // Auto-split when rate changes
    if (field === 'rate') {
      let rlName = rl.name.toLowerCase();
      let docPct = (rlName.includes('60-40') || rlName.includes('60 40')) ? 0.6 : 0.5;
      t.docShare = Math.round(val * docPct);
      t.labShare = val - t.docShare;
    }
    // Update the row in place instead of full re-render
    let row = td.closest('tr');
    if (row) updateRLRow(row, rl, rlId, idx);
    saveRLTestFieldQuiet(rl, rlId);
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = oldVal || ''; input.blur(); }
  });
}

// Update a single row in place (no full re-render)
function updateRLRow(row, rl, rlId, idx) {
  let t = rl.tests[idx];
  let isIncomplete = (!t.rate || !t.labShare || !t.docShare);
  let warn = isIncomplete ? ' ⚠️' : '';
  let ec = 'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px';
  row.dataset.incomplete = isIncomplete ? '1' : '0';
  row.dataset.testname = t.name.toLowerCase();
  row.style.background = isIncomplete ? 'var(--warn-bg)' : '';
  let cells = row.querySelectorAll('td');
  cells[0].style.cssText = ec; cells[0].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'name',this)"); cells[0].textContent = t.name + warn;
  cells[1].style.cssText = ec; cells[1].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'type',this)"); cells[1].innerHTML = '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>';
  cells[2].style.cssText = ec; cells[2].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'rate',this)"); cells[2].textContent = '₹' + (t.rate || 0);
  cells[3].style.cssText = ec; cells[3].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'labShare',this)"); cells[3].textContent = '₹' + (t.labShare || 0);
  cells[4].style.cssText = ec; cells[4].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'docShare',this)"); cells[4].textContent = '₹' + (t.docShare || 0);
}

// Save without re-rendering (keeps table open)
function saveRLTestFieldQuiet(rl, rlId) {
  saveAll();
  if (dbReady) sbSave('rate_lists', rlId, rl);
}

// Full save + re-render (used by modal save etc.)
function saveRLTestField(rl, rlId) {
  saveRLTestFieldQuiet(rl, rlId);
  renderRateLists();
}

function deleteRL(id) {
  if (!confirm('Rate list delete karni hai?')) return;
  doctors.forEach(d => { if (d.rateListId === id) d.rateListId = ''; });
  rateLists = rateLists.filter(r => r.id !== id);
  saveAll(); sbDelete('rate_lists', id);
  renderRateLists(); renderDoctors(); populateDropdowns();
}
