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
  if (!doctors.length) { c.innerHTML = '<div class="empty">Koi doctor add nahi hua.</div>'; return; }
  c.innerHTML = doctors.map(d => {
    let pct = d.docPercent != null ? d.docPercent : 50;
    let labPct = 100 - pct;
    return '<div class="card flex-between"><div><b>' + d.name + '</b><br><small style="color:#777">Split: Doctor ' + pct + '% / Lab ' + labPct + '%</small></div><div>' +
      '<button class="btn btn-sm btn-primary" onclick="openDocModal(\'' + d.id + '\')">Edit</button> ' +
      '<button class="btn btn-sm btn-danger" onclick="deleteDoc(\'' + d.id + '\')">Delete</button></div></div>';
  }).join('');
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
  if (!collectors.length) { c.innerHTML = '<div class="empty">Koi collection boy nahi hai.</div>'; return; }
  c.innerHTML = collectors.map(cl => '<div class="card flex-between"><b>' + cl.name + '</b>' +
    '<button class="btn btn-sm btn-danger" onclick="deleteColl(\'' + cl.id + '\')">Delete</button></div>').join('');
}

function deleteColl(id) {
  if (!confirm('Delete?')) return;
  collectors = collectors.filter(c => c.id !== id);
  saveAll(); sbDelete('collectors', id);
  renderCollectors(); populateDropdowns();
}
