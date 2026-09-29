// ========== DOCTORS MANAGEMENT ==========

let editingDoc = null;

function openDocModal(id) {
  editingDoc = id || null;
  let sel = document.getElementById('docRLSelect');
  sel.innerHTML = '<option value="">-- Select Rate List --</option>' + rateLists.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');
  if (id) {
    let d = doctors.find(x => x.id === id);
    document.getElementById('docNameInput').value = d.name;
    sel.value = d.rateListId || '';
  } else {
    document.getElementById('docNameInput').value = '';
    sel.value = '';
  }
  document.getElementById('docModal').classList.add('show');
}

function saveDoctor() {
  let name = document.getElementById('docNameInput').value.trim();
  if (!name) return alert('Doctor ka naam daalo!');
  let rlId = document.getElementById('docRLSelect').value;
  if (editingDoc) { let d = doctors.find(x => x.id === editingDoc); d.name = name; d.rateListId = rlId; }
  else doctors.push({ id: uid(), name, rateListId: rlId });
  saveAll(); closeModal('docModal'); renderDoctors(); populateDropdowns();
}

function renderDoctors() {
  let c = document.getElementById('doctorsList');
  if (!c) return;
  if (!doctors.length) { c.innerHTML = '<div class="empty">Koi doctor add nahi hua.</div>'; return; }
  c.innerHTML = doctors.map(d => {
    let rl = rateLists.find(r => r.id === d.rateListId);
    return '<div class="card flex-between"><div><b>' + d.name + '</b><br><small style="color:#777">Rate List: ' + (rl ? rl.name : 'Not assigned') + '</small></div><div>' +
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
