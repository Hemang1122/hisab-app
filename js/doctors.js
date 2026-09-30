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
    return '<tr><td style="text-align:center;font-size:11px;color:#999">' + (i + 1) + '</td><td style="font-size:13px">' + d.name + '</td>' +
      '<td style="text-align:center;font-size:12px"><span style="background:#f0f4ff;padding:2px 8px;border-radius:10px">' + pct + '-' + (100 - pct) + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-primary" onclick="openDocModal(\'' + d.id + '\')" style="font-size:10px;padding:2px 6px">Edit</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteDoc(\'' + d.id + '\')" style="font-size:10px;padding:2px 6px">Del</button></td></tr>';
  }).join('');
  c.innerHTML = '<table style="width:100%;font-size:13px"><thead><tr style="background:var(--n100)"><th style="padding:4px 6px;text-align:center;width:30px">#</th><th style="padding:4px 6px">Name</th><th style="padding:4px 6px;text-align:center;width:70px">Split</th><th style="padding:4px 6px;text-align:right;width:90px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="font-size:11px;color:#999;margin-top:6px">' + doctors.length + ' doctors/hospitals</div>';
}

function deleteDoc(id) {
  if (!confirm('Delete?')) return;
  doctors = doctors.filter(d => d.id !== id);
  saveAll(); sbDelete('doctors', id);
  renderDoctors(); populateDropdowns();
}

// ========== COLLECTORS ==========

function openCollModal() {
  document.getElementById('collNameInput').value = '';
  document.getElementById('collModal').classList.add('show');
}

function saveCollector() {
  let name = document.getElementById('collNameInput').value.trim();
  if (!name) return alert('Naam daalo!');
  collectors.push({ id: uid(), name });
  saveAll(); closeModal('collModal'); renderCollectors(); populateDropdowns();
}

function renderCollectors() {
  let c = document.getElementById('collectorsList');
  if (!c) return;
  if (!collectors.length) { c.innerHTML = '<div class="empty" style="padding:10px;font-size:12px">Koi collection boy nahi hai.</div>'; return; }
  let rows = collectors.map((cl, i) => {
    return '<tr><td style="text-align:center;font-size:11px;color:#999">' + (i + 1) + '</td><td style="font-size:13px">' + cl.name + '</td>' +
      '<td style="text-align:right"><button class="btn btn-sm btn-danger" onclick="deleteColl(\'' + cl.id + '\')" style="font-size:10px;padding:2px 6px">Del</button></td></tr>';
  }).join('');
  c.innerHTML = '<table style="width:100%;font-size:13px"><thead><tr style="background:var(--n100)"><th style="padding:4px 6px;text-align:center;width:30px">#</th><th style="padding:4px 6px">Name</th><th style="padding:4px 6px;text-align:right;width:50px"></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div style="font-size:11px;color:#999;margin-top:6px">' + collectors.length + ' collection boys</div>';
}

function deleteColl(id) {
  if (!confirm('Delete?')) return;
  collectors = collectors.filter(c => c.id !== id);
  saveAll(); sbDelete('collectors', id);
  renderCollectors(); populateDropdowns();
}
