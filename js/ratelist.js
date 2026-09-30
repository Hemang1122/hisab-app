// ========== RATE LIST MANAGEMENT ==========
// Now simplified: ONE master rate list with just name, rate, type
// Lab/Doc shares are calculated dynamically per doctor's split %

let editingRL = null;

function openRLModal(id) {
  editingRL = id || null;
  document.getElementById('rlModalTitle').textContent = id ? 'Rate List Edit' : 'Nayi Rate List';
  document.getElementById('rlTestRows').innerHTML = '';
  // Reset search
  let srch = document.getElementById('rlModalSearch');
  if (srch) srch.value = '';
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
  div.dataset.testname = data ? data.name.toLowerCase() : '';
  let n = data ? data.name : '', r = data ? data.rate : '', tp = data ? data.type : 'normal';
  let cds = data && data.customDocShare != null ? data.customDocShare : '';
  let cls = data && data.customLabShare != null ? data.customLabShare : '';
  div.innerHTML = '<button class="del-btn" onclick="this.parentElement.remove()" style="position:absolute;right:4px;top:4px">✕</button>' +
    '<input placeholder="Test name" value="' + n + '" class="rlt-name" style="margin-bottom:4px" oninput="this.parentElement.dataset.testname=this.value.toLowerCase()">' +
    '<div style="display:flex;gap:6px">' +
    '<input type="number" placeholder="Rate ₹" value="' + r + '" class="rlt-rate" style="width:34%">' +
    '<select class="rlt-type" style="width:22%"><option value="normal" ' + (tp === 'normal' ? 'selected' : '') + '>Normal</option><option value="special" ' + (tp === 'special' ? 'selected' : '') + '>Special</option></select>' +
    '<input type="number" placeholder="Dr ₹" value="' + cds + '" class="rlt-doc-share" style="width:22%" title="Custom Doctor Share (leave empty for auto)">' +
    '<input type="number" placeholder="Lab ₹" value="' + cls + '" class="rlt-lab-share" style="width:22%" title="Custom Lab Share (leave empty for auto)">' +
    '</div>';
  document.getElementById('rlTestRows').appendChild(div);
}

function filterRLModal() {
  let q = (document.getElementById('rlModalSearch').value || '').toLowerCase();
  document.querySelectorAll('#rlTestRows > div').forEach(div => {
    div.style.display = div.dataset.testname.includes(q) ? '' : 'none';
  });
}

function saveRateList() {
  let name = document.getElementById('rlNameInput').value.trim();
  if (!name) return alert('Rate list ka naam daalo!');
  let tests = [];
  document.querySelectorAll('#rlTestRows>div').forEach(div => {
    let n = div.querySelector('.rlt-name').value.trim();
    let r = parseFloat(div.querySelector('.rlt-rate').value) || 0;
    let t = div.querySelector('.rlt-type').value;
    let cdsRaw = div.querySelector('.rlt-doc-share').value.trim();
    let clsRaw = div.querySelector('.rlt-lab-share').value.trim();
    if (!n) return;
    let test = { name: n, rate: r, type: t };
    // If either custom share is set, save both (auto-fill the other)
    if (cdsRaw !== '' || clsRaw !== '') {
      let cds = cdsRaw !== '' ? parseFloat(cdsRaw) || 0 : null;
      let cls = clsRaw !== '' ? parseFloat(clsRaw) || 0 : null;
      if (cds != null && cls == null) cls = Math.max(0, r - cds);
      if (cls != null && cds == null) cds = Math.max(0, r - cls);
      test.customDocShare = cds;
      test.customLabShare = cls;
    }
    tests.push(test);
  });
  if (!tests.length) return alert('Kam se kam ek test add karo!');
  let rlId;
  if (editingRL) { let rl = rateLists.find(r => r.id === editingRL); rl.name = name; rl.tests = tests; rlId = editingRL; }
  else { rlId = 'rl_master'; rateLists = [{ id: rlId, name, tests }]; }
  saveAll();
  if (dbReady) sbSave('rate_lists', rlId, rateLists.find(r => r.id === rlId));
  closeModal('rlModal'); renderRateLists(); populateDropdowns();
}

function renderRateLists() {
  let c = document.getElementById('rateListsView');
  if (!c) return;
  let rl = getMasterRL();
  if (!rl) { c.innerHTML = '<div class="empty">Koi rate list nahi hai. Nayi banao!</div>'; return; }

  let testCount = rl.tests.length;
  let incompleteCount = rl.tests.filter(t => !t.rate).length;
  let countBadge = testCount + ' tests' + (incompleteCount ? ' <span style="color:var(--warn);cursor:pointer" onclick="filterRLIncomplete(\'' + rl.id + '\',this)" title="Click to show only incomplete">(' + incompleteCount + ' incomplete)</span>' : '');

  let rows = testCount ? rl.tests.map((t, idx) => {
    let isIncomplete = !t.rate;
    let incomplete = isIncomplete ? ' style="background:var(--warn-bg)"' : '';
    let warn = isIncomplete ? ' ⚠️' : '';
    let ec = 'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px';
    let hasCustom = t.customDocShare != null && t.customLabShare != null;
    let docShareTxt = hasCustom ? '₹' + t.customDocShare : '<span style="color:#aaa">auto</span>';
    let labShareTxt = hasCustom ? '₹' + t.customLabShare : '<span style="color:#aaa">auto</span>';
    return '<tr class="rl-test-row" data-rlid="' + rl.id + '" data-testname="' + t.name.toLowerCase() + '" data-incomplete="' + (isIncomplete ? '1' : '0') + '"' + incomplete + '>' +
      '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'name\',this)">' + t.name + warn + '</td>' +
      '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'type\',this)"><span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span></td>' +
      '<td style="' + ec + '" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'rate\',this)">₹' + (t.rate || 0) + '</td>' +
      '<td style="' + ec + ';text-align:center;font-size:11px" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'customDocShare\',this)">' + docShareTxt + '</td>' +
      '<td style="' + ec + ';text-align:center;font-size:11px" onclick="inlineEditField(\'' + rl.id + '\',' + idx + ',\'customLabShare\',this)">' + labShareTxt + '</td>' +
      '</tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--n400);padding:15px">Koi test nahi — Edit karo aur tests add karo</td></tr>';

  // Search + filter toolbar
  let toolbar = '<div style="display:flex;gap:4px;margin-bottom:6px;align-items:center">' +
    '<input placeholder="🔍 Search test..." oninput="searchRLTests(\'' + rl.id + '\',this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();selectFirstRLTest(\'' + rl.id + '\',this)}" style="flex:1;min-width:80px;padding:5px 8px;border:1px solid var(--gray-300,#ccc);border-radius:var(--radius);font-size:12px">' +
    (incompleteCount ? '<button class="btn btn-sm" onclick="filterRLIncomplete(\'' + rl.id + '\',this)" style="font-size:10px;padding:2px 6px;background:var(--warn);color:#333;border:none;border-radius:var(--radius);cursor:pointer;white-space:nowrap" data-filtered="0">⚠️ ' + incompleteCount + '</button>' : '') +
    '<button class="btn btn-sm btn-secondary" onclick="printRateList(\'' + rl.id + '\')" style="font-size:10px;padding:2px 6px;white-space:nowrap">🖨️ Print</button>' +
    '</div>';

  // Doctor split summary
  let docSplits = doctors.map(d => {
    let pct = d.docPercent != null ? d.docPercent : 50;
    return '<span style="display:inline-block;background:#f0f4ff;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px">' + d.name + ': <b>' + pct + '-' + (100 - pct) + '</b></span>';
  }).join('');

  c.innerHTML = '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">' +
    '<div style="flex:1;min-width:0"><b>' + rl.name + '</b><br><small style="color:var(--gray-500,#777)">Fixed rate list — splits calculated per doctor</small></div>' +
    '<div style="display:flex;gap:4px;flex-shrink:0">' +
    '<button class="btn btn-sm btn-primary" onclick="openRLModal(\'' + rl.id + '\')" style="font-size:11px;padding:4px 8px">Edit All</button></div></div>' +
    (docSplits ? '<div style="margin-bottom:8px"><small style="color:#666">Doctor Splits:</small><br>' + docSplits + '</div>' : '') +
    '<div><button class="btn btn-sm btn-secondary" onclick="toggleRLTests(this)" style="font-size:12px">▶ Show Tests (' + countBadge + ')</button>' +
    '<div class="rl-tests-wrap" style="display:none;margin-top:6px">' + toolbar + '<table><tr><th>Test</th><th>Type</th><th>Rate</th><th style="text-align:center">Dr. Share</th><th style="text-align:center">Lab Share</th></tr>' + rows + '</table></div></div></div>';
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

function selectFirstRLTest(rlId, input) {
  let visible = document.querySelector('.rl-test-row[data-rlid="' + rlId + '"]:not([style*="display: none"]):not([style*="display:none"])');
  if (visible) {
    visible.style.transition = 'background 0.3s';
    visible.style.background = '#bbdefb';
    setTimeout(() => { visible.style.background = ''; }, 1000);
    visible.scrollIntoView({ block: 'nearest' });
  }
  input.value = '';
  searchRLTests(rlId, '');
  input.focus();
}

function filterRLIncomplete(rlId, btn) {
  let isFiltered = btn.dataset.filtered === '1';
  let rows = document.querySelectorAll('.rl-test-row[data-rlid="' + rlId + '"]');
  if (isFiltered) {
    rows.forEach(row => row.style.display = '');
    btn.dataset.filtered = '0';
    if (btn.tagName === 'BUTTON') btn.style.background = 'var(--warn)';
  } else {
    rows.forEach(row => {
      row.style.display = row.dataset.incomplete === '1' ? '' : 'none';
    });
    btn.dataset.filtered = '1';
    if (btn.tagName === 'BUTTON') btn.style.background = '#ff9800';
    let wrap = btn.closest('.rl-tests-wrap') || btn.closest('.card').querySelector('.rl-tests-wrap');
    if (wrap && wrap.style.display === 'none') {
      wrap.style.display = 'block';
      let toggleBtn = wrap.previousElementSibling;
      if (toggleBtn) toggleBtn.textContent = toggleBtn.textContent.replace('▶ Show', '▼ Hide');
    }
  }
}

function printRateList(rlId) {
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl) return;

  let rows = rl.tests.map((t, i) => {
    let warn = !t.rate ? ' ⚠️' : '';
    return '<tr' + (warn ? ' style="background:#fff8e1"' : '') + '><td style="text-align:center">' + (i + 1) + '</td><td>' + t.name + warn + '</td><td><span>' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span></td><td style="text-align:right">₹' + (t.rate || 0) + '</td></tr>';
  }).join('');

  let totalRate = rl.tests.reduce((s, t) => s + (t.rate || 0), 0);

  let html = '<div style="font-family:sans-serif;max-width:800px;margin:auto;padding:20px">' +
    '<h2 style="text-align:center;margin-bottom:2px">Shree Balaji Clinical Laboratory</h2>' +
    '<p style="text-align:center;color:#666;margin-top:0">Master Rate List</p>' +
    '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:6px;margin-bottom:12px;font-size:13px">' +
    '<div><strong>Name:</strong> ' + rl.name + '</div>' +
    '<div><strong>Tests:</strong> ' + rl.tests.length + '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr style="background:#333;color:white"><th style="padding:6px;text-align:center">#</th><th style="padding:6px">Test</th><th style="padding:6px">Type</th><th style="padding:6px;text-align:right">Rate</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr style="font-weight:bold;border-top:2px solid #333"><td colspan="3" style="padding:6px">Total</td><td style="padding:6px;text-align:right">₹' + totalRate + '</td></tr></tfoot>' +
    '</table></div>';

  document.getElementById('printArea').innerHTML = html;
  document.getElementById('printArea').style.display = 'block';
  setTimeout(() => { window.print(); document.getElementById('printArea').style.display = 'none'; }, 200);
}

function inlineEditField(rlId, idx, field, td) {
  if (td.querySelector('input,select')) return;
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl || !rl.tests[idx]) return;
  let t = rl.tests[idx];
  let oldVal = t[field];

  if (field === 'type') {
    t.type = t.type === 'normal' ? 'special' : 'normal';
    let span = td.querySelector('span') || td;
    if (t.type === 'special') { span.className = 'tag-special'; span.textContent = 'Special'; }
    else { span.className = 'tag-normal'; span.textContent = 'Normal'; }
    saveRLTestFieldQuiet(rl, rlId);
    return;
  }

  let isNum = (field === 'rate' || field === 'customDocShare' || field === 'customLabShare');
  let input = document.createElement('input');
  input.type = isNum ? 'number' : 'text';
  input.placeholder = (field === 'customDocShare' || field === 'customLabShare') ? 'auto' : '';
  input.value = (oldVal != null) ? oldVal : '';
  input.style.cssText = 'width:100%;padding:3px 5px;font-size:12px;border:1px solid var(--accent);border-radius:4px;box-sizing:border-box';
  td.textContent = '';
  td.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    if (field === 'customDocShare' || field === 'customLabShare') {
      let raw = input.value.trim();
      if (raw === '') {
        // Clear custom share — revert to auto
        delete t.customDocShare;
        delete t.customLabShare;
      } else {
        let val = parseFloat(raw) || 0;
        t[field] = val;
        // Auto-calculate the other share from rate
        if (field === 'customDocShare') {
          t.customLabShare = Math.max(0, (t.rate || 0) - val);
        } else {
          t.customDocShare = Math.max(0, (t.rate || 0) - val);
        }
      }
    } else {
      let val = isNum ? (parseFloat(input.value) || 0) : input.value.trim();
      if (field === 'name' && !val) val = oldVal;
      t[field] = val;
    }
    let row = td.closest('tr');
    if (row) updateRLRow(row, rl, rlId, idx);
    saveRLTestFieldQuiet(rl, rlId);
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = (oldVal != null) ? oldVal : ''; input.blur(); }
  });
}

function updateRLRow(row, rl, rlId, idx) {
  let t = rl.tests[idx];
  let isIncomplete = !t.rate;
  let warn = isIncomplete ? ' ⚠️' : '';
  let ec = 'cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px';
  row.dataset.incomplete = isIncomplete ? '1' : '0';
  row.dataset.testname = t.name.toLowerCase();
  row.style.background = isIncomplete ? 'var(--warn-bg)' : '';
  let hasCustom = t.customDocShare != null && t.customLabShare != null;
  let cells = row.querySelectorAll('td');
  cells[0].style.cssText = ec; cells[0].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'name',this)"); cells[0].textContent = t.name + warn;
  cells[1].style.cssText = ec; cells[1].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'type',this)"); cells[1].innerHTML = '<span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span>';
  cells[2].style.cssText = ec; cells[2].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'rate',this)"); cells[2].textContent = '₹' + (t.rate || 0);
  cells[3].style.cssText = ec + ';text-align:center;font-size:11px'; cells[3].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'customDocShare',this)"); cells[3].innerHTML = hasCustom ? '₹' + t.customDocShare : '<span style="color:#aaa">auto</span>';
  cells[4].style.cssText = ec + ';text-align:center;font-size:11px'; cells[4].setAttribute('onclick', "inlineEditField('" + rlId + "'," + idx + ",'customLabShare',this)"); cells[4].innerHTML = hasCustom ? '₹' + t.customLabShare : '<span style="color:#aaa">auto</span>';
}

function saveRLTestFieldQuiet(rl, rlId) {
  saveAll();
  if (dbReady) sbSave('rate_lists', rlId, rl);
}

function saveRLTestField(rl, rlId) {
  saveRLTestFieldQuiet(rl, rlId);
  renderRateLists();
}

function deleteRL(id) {
  if (!confirm('Rate list delete karni hai?')) return;
  rateLists = rateLists.filter(r => r.id !== id);
  saveAll(); sbDelete('rate_lists', id);
  renderRateLists(); populateDropdowns();
}
