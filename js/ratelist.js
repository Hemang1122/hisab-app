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
  // Check if editing the 60-40 rate list
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
    let countBadge = testCount + ' tests' + (incompleteCount ? ' <span style="color:var(--warn)">(' + incompleteCount + ' incomplete)</span>' : '');
    let rows = testCount ? rl.tests.map((t, idx) => {
      let incomplete = (!t.rate || !t.labShare || !t.docShare) ? ' style="background:var(--warn-bg)"' : '';
      let warn = (!t.rate || !t.labShare || !t.docShare) ? ' ⚠️' : '';
      return '<tr' + incomplete + '><td>' + t.name + warn + '</td><td><span class="' + (t.type === 'special' ? 'tag-special' : 'tag-normal') + '">' + (t.type === 'normal' ? 'Normal' : 'Special') + '</span></td><td>₹' + (t.rate || 0) + '</td><td>₹' + (t.labShare || 0) + '</td><td>₹' + (t.docShare || 0) + '</td><td><button class="btn btn-sm btn-secondary" onclick="editSingleTest(\'' + rl.id + '\',' + idx + ')" style="padding:2px 8px;font-size:11px">✏️</button></td></tr>';
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--n400);padding:15px">Koi test nahi — Edit karo aur tests add karo</td></tr>';
    return '<div class="card"><div class="flex-between"><div><b>' + rl.name + '</b><br><small>Doctors: ' + docStr + '</small></div><div>' +
      '<button class="btn btn-sm btn-primary" onclick="openRLModal(\'' + rl.id + '\')">Edit All</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteRL(\'' + rl.id + '\')">Delete</button></div></div>' +
      '<div style="margin-top:8px"><button class="btn btn-sm btn-secondary" onclick="toggleRLTests(this)" style="font-size:12px">▶ Show Tests (' + countBadge + ')</button>' +
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

function editSingleTest(rlId, idx) {
  let rl = rateLists.find(r => r.id === rlId);
  if (!rl || !rl.tests[idx]) return;
  let t = rl.tests[idx];
  let name = prompt('Test Name:', t.name);
  if (name === null) return;
  let rate = prompt('Rate ₹:', t.rate || 0);
  if (rate === null) return;
  rate = parseFloat(rate) || 0;
  let rlName = rl.name.toLowerCase();
  let docPct = (rlName.includes('60-40') || rlName.includes('60 40')) ? 0.6 : 0.5;
  let docShare = Math.round(rate * docPct);
  let labShare = rate - docShare;
  let type = prompt('Type (normal/special):', t.type || 'normal');
  if (type === null) return;
  type = (type === 'special') ? 'special' : 'normal';
  rl.tests[idx] = { name: name.trim() || t.name, rate, labShare, docShare, type };
  saveAll();
  if (dbReady) sbSave('rate_lists', rlId, rl);
  renderRateLists();
}

function deleteRL(id) {
  if (!confirm('Rate list delete karni hai?')) return;
  doctors.forEach(d => { if (d.rateListId === id) d.rateListId = ''; });
  rateLists = rateLists.filter(r => r.id !== id);
  saveAll(); sbDelete('rate_lists', id);
  renderRateLists(); renderDoctors(); populateDropdowns();
}
