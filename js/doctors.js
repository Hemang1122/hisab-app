// ========== DOCTORS MANAGEMENT ==========

let editingDoc = null;

function openDocModal(id) {
  editingDoc = id || null;
  if (id) {
    let d = doctors.find(x => x.id === id);
    document.getElementById('docNameInput').value = d.name;
    document.getElementById('docSplitInput').value = d.docPercent != null ? d.docPercent : 50;
  } else {
    document.getElementById('docNameInput').value = '';
    document.getElementById('docSplitInput').value = 50;
  }
  document.getElementById('docModal').classList.add('show');
}

function saveDoctor() {
  let name = document.getElementById('docNameInput').value.trim();
  if (!name) return alert('Doctor ka naam daalo!');
  let docPercent = parseInt(document.getElementById('docSplitInput').value) || 50;
  if (docPercent < 0 || docPercent > 100) return alert('Split 0-100 ke beech hona chahiye!');
  if (editingDoc) {
    let d = doctors.find(x => x.id === editingDoc);
    d.name = name;
    d.docPercent = docPercent;
  } else {
    doctors.push({ id: uid(), name, docPercent });
  }
  saveAll(); closeModal('docModal'); renderDoctors(); populateDropdowns();
}

function renderDoctors() {
  let c = document.getElementById('doctorsList');
  if (!c) return;
  if (!doctors.length) { c.innerHTML = '<div class="empty" style="padding:10px;font-size:12px">Koi doctor add nahi hua.</div>'; return; }
  let rows = doctors.map((d, i) => {
    let pct = d.docPercent != null ? d.docPercent : 50;
    return '<tr class="doc-row" data-docname="' + d.name.toLowerCase() + '"><td style="text-align:center;font-size:11px;color:#999">' + (i + 1) + '</td><td style="font-size:13px">' + d.name + '</td>' +
      '<td style="text-align:center;font-size:12px"><span style="background:#f0f4ff;padding:2px 8px;border-radius:10px">' + pct + '-' + (100 - pct) + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-primary" onclick="openDocModal(\'' + d.id + '\')" style="font-size:10px;padding:2px 6px">Edit</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteDoc(\'' + d.id + '\')" style="font-size:10px;padding:2px 6px">Del</button></td></tr>';
  }).join('');
  c.innerHTML = '<input id="docSearchInput" placeholder="🔍 Search doctor/hospital..." oninput="filterDoctors()" style="width:100%;margin-bottom:6px;padding:5px 8px;border:1px solid var(--n200);border-radius:6px;font-size:12px">' +
    '<table style="width:100%;font-size:13px"><thead><tr style="background:var(--n100)"><th style="padding:4px 6px;text-align:center;width:30px">#</th><th style="padding:4px 6px">Name</th><th style="padding:4px 6px;text-align:center;width:70px">Split</th><th style="padding:4px 6px;text-align:right;width:90px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="font-size:11px;color:#999;margin-top:6px"><span id="docCountLabel">' + doctors.length + '</span> doctors/hospitals</div>';
}

function filterDoctors() {
  let q = (document.getElementById('docSearchInput').value || '').toLowerCase();
  let visible = 0;
  document.querySelectorAll('.doc-row').forEach(row => {
    let match = row.dataset.docname.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  let lbl = document.getElementById('docCountLabel');
  if (lbl) lbl.textContent = q ? visible + ' / ' + doctors.length : doctors.length;
}

function deleteDoc(id) {
  doctors = doctors.filter(d => d.id !== id);
  saveAll(); sbDelete('doctors', id);
  renderDoctors(); populateDropdowns();
}

// ========== COLLECTORS ==========

let editingColl = null;

function openCollModal(id) {
  editingColl = id || null;
  let modal = document.getElementById('collModal');
  let title = modal.querySelector('h3');
  if (id) {
    let c = collectors.find(x => x.id === id);
    document.getElementById('collNameInput').value = c ? c.name : '';
    if (title) title.textContent = 'Edit Collection Boy';
  } else {
    document.getElementById('collNameInput').value = '';
    if (title) title.textContent = 'Naya Collection Boy';
  }
  modal.classList.add('show');
}

function saveCollector() {
  let name = document.getElementById('collNameInput').value.trim();
  if (!name) return alert('Naam daalo!');
  if (editingColl) {
    let c = collectors.find(x => x.id === editingColl);
    if (c) {
      c.name = name;
      saveAll();
      if (typeof sbSave === 'function' && dbReady) sbSave('collectors', c.id, c);
    }
  } else {
    let newColl = { id: uid(), name };
    collectors.push(newColl);
    saveAll();
    if (typeof sbSave === 'function' && dbReady) sbSave('collectors', newColl.id, newColl);
  }
  editingColl = null;
  closeModal('collModal');
  renderCollectors();
  populateDropdowns();
}

function renderCollectors() {
  let c = document.getElementById('collectorsList');
  if (!c) return;
  if (!collectors.length) { c.innerHTML = '<div class="empty" style="padding:10px;font-size:12px">Koi collection boy nahi hai.</div>'; return; }
  let rows = collectors.map((cl, i) => {
    return '<tr class="coll-row" data-collname="' + cl.name.toLowerCase() + '"><td style="text-align:center;font-size:11px;color:#999">' + (i + 1) + '</td><td style="font-size:13px">' + cl.name + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' +
      '<button class="btn btn-sm btn-primary" onclick="openCollModal(\'' + cl.id + '\')" style="font-size:10px;padding:2px 6px">Edit</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteColl(\'' + cl.id + '\')" style="font-size:10px;padding:2px 6px">Del</button></td></tr>';
  }).join('');
  c.innerHTML = '<input id="collSearchInput" placeholder="🔍 Search..." oninput="filterCollectors()" style="width:100%;margin-bottom:6px;padding:5px 8px;border:1px solid var(--n200);border-radius:6px;font-size:12px">' +
    '<table style="width:100%;font-size:13px"><thead><tr style="background:var(--n100)"><th style="padding:4px 6px;text-align:center;width:30px">#</th><th style="padding:4px 6px">Name</th><th style="padding:4px 6px;text-align:right;width:90px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="font-size:11px;color:#999;margin-top:6px"><span id="collCountLabel">' + collectors.length + '</span> collection boys</div>';
}

function filterCollectors() {
  let q = (document.getElementById('collSearchInput').value || '').toLowerCase();
  let visible = 0;
  document.querySelectorAll('.coll-row').forEach(row => {
    let match = row.dataset.collname.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  let lbl = document.getElementById('collCountLabel');
  if (lbl) lbl.textContent = q ? visible + ' / ' + collectors.length : collectors.length;
}

function deleteColl(id) {
  collectors = collectors.filter(c => c.id !== id);
  saveAll(); sbDelete('collectors', id);
  renderCollectors(); populateDropdowns();
}
