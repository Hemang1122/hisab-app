// ========== DATE PICKER ==========
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function initDatePicker(prefix) {
  let now = new Date(), mSel = document.getElementById(prefix + 'Month');
  if (!mSel) return;
  let curMonth = now.getMonth(), curYear = now.getFullYear();
  mSel.innerHTML = '';
  for (let offset = -3; offset <= 1; offset++) {
    let d = new Date(curYear, curMonth + offset, 1);
    let val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    let opt = document.createElement('option');
    opt.value = val; opt.textContent = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (offset === 0) opt.selected = true;
    mSel.appendChild(opt);
  }
  updateDateDropdown(prefix);
}

function updateDateDropdown(prefix) {
  let mSel = document.getElementById(prefix + 'Month'), dSel = document.getElementById(prefix + 'Day');
  if (!mSel || !dSel) return;
  let parts = mSel.value.split('-'), year = parseInt(parts[0]), month = parseInt(parts[1]);
  let daysInMonth = new Date(year, month, 0).getDate();
  let now = new Date(), td = now.getDate(), tm = now.getMonth() + 1, ty = now.getFullYear();
  dSel.innerHTML = '';
  for (let d = 1; d <= daysInMonth; d++) {
    let opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    if (year === ty && month === tm && d === td) opt.selected = true;
    dSel.appendChild(opt);
  }
}

function getDateFromPicker(prefix) {
  let parts = document.getElementById(prefix + 'Month').value.split('-');
  return parts[0] + '-' + parts[1] + '-' + String(document.getElementById(prefix + 'Day').value).padStart(2, '0');
}

// ========== SIDEBAR ==========
function toggleSidebar() {
  let sb = document.getElementById('sidebar');
  let ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}

// ========== TABS ==========
let revUnlocked = false;
const TAB_KEYS = ['entry', 'register', 'hisab', 'revenue', 'ratelist', 'doctors', 'settings'];

function showTab(t, skipHistory) {
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');

  // Update sidebar active state
  let navLinks = document.querySelectorAll('#sidebarNav a');
  navLinks.forEach(a => {
    a.classList.toggle('active', a.dataset.tab === t);
  });

  // Close sidebar on mobile
  let sb = document.getElementById('sidebar');
  if (sb.classList.contains('open')) toggleSidebar();

  // Gradient transition effect
  document.body.classList.remove('page-transition');
  void document.body.offsetWidth; // force reflow
  document.body.classList.add('page-transition');
  setTimeout(() => document.body.classList.remove('page-transition'), 600);

  // Push to browser history so Back button works between tabs
  if (!skipHistory) {
    history.pushState({ tab: t }, '', '#' + t);
  }

  if (t === 'register') renderRegister();
  if (t === 'ratelist') renderRateLists();
  if (t === 'doctors') renderDoctors();
  if (t === 'entry') { reloadEntryTests(); refreshSidebar(); }
}

// Browser back/forward button support
window.addEventListener('popstate', function(e) {
  let tab = (e.state && e.state.tab) ? e.state.tab : 'entry';
  if (TAB_KEYS.includes(tab)) showTab(tab, true);
});

// ========== PASSWORD (inline prompt before showing revenue data) ==========
function checkRevAccess() {
  if (revUnlocked || !settings.revPassword) return true;
  let pw = prompt('Revenue password daalo:');
  if (pw === settings.revPassword) { revUnlocked = true; return true; }
  if (pw !== null) alert('Galat password!');
  return false;
}

function saveRevPassword() {
  settings.revPassword = document.getElementById('setRevPw').value;
  saveAll();
  document.getElementById('setRevPw').value = '';
  alert('Password saved!');
}

// ========== MODALS ==========
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ========== DROPDOWNS ==========
// ========== DOCTOR COMBOBOX (searchable) ==========
function refreshDocComboLabel() {
  // Sync visible input to hidden select's value
  let sel = document.getElementById('eDoctor');
  let inp = document.getElementById('eDoctorSearch');
  if (!sel || !inp) return;
  if (!sel.value) { inp.value = ''; return; }
  if (sel.value === '__self__') { inp.value = 'Self (Walk-in)'; return; }
  let d = doctors.find(x => x.id === sel.value);
  inp.value = d ? d.name : '';
}

function showDocCombo() {
  let dd = document.getElementById('eDoctorDropdown');
  if (!dd) return;
  filterDocCombo();
  dd.style.display = 'block';
}

function hideDocCombo() {
  let dd = document.getElementById('eDoctorDropdown');
  if (dd) dd.style.display = 'none';
}

// Hide dropdown when clicking outside
document.addEventListener('click', function(e) {
  let combo = document.querySelector('.doc-combo');
  if (combo && !combo.contains(e.target)) hideDocCombo();
});

function filterDocCombo() {
  let dd = document.getElementById('eDoctorDropdown');
  let inp = document.getElementById('eDoctorSearch');
  if (!dd || !inp) return;
  let raw = inp.value.toLowerCase().trim();
  function norm(s) { return (s || '').toLowerCase().replace(/[(),.\-\/&]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  let words = norm(raw).split(' ').filter(w => w.length > 0);
  let items = [{ id: '__self__', name: 'Self (Walk-in)', isSelf: true }].concat(doctors);
  let matches = items.filter(d => {
    let t = norm(d.name);
    return words.length === 0 || words.every(w => t.includes(w));
  });
  if (!matches.length) {
    dd.innerHTML = '<div style="padding:10px;color:#888;font-size:12px;text-align:center">No match. Add doctor in "Doctors & Staff" tab.</div>';
  } else {
    dd.innerHTML = matches.map(d =>
      '<div class="doc-combo-item" onmousedown="pickDoc(\'' + d.id + '\')" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f0f0f0" onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'\'">' +
        (d.isSelf ? '<span style="color:#888">🚶 ' + d.name + '</span>' : d.name) +
      '</div>'
    ).join('');
  }
  dd.style.display = 'block';
}

function pickDoc(id) {
  let sel = document.getElementById('eDoctor');
  if (!sel) return;
  sel.value = id;
  sel.dispatchEvent(new Event('change'));
  refreshDocComboLabel();
  hideDocCombo();
  // Move focus to name input
  let name = document.getElementById('eName');
  if (name) name.focus();
}

function docComboKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Pick first visible item
    let first = document.querySelector('#eDoctorDropdown .doc-combo-item');
    if (first) {
      let match = first.getAttribute('onmousedown').match(/pickDoc\('([^']+)'\)/);
      if (match) pickDoc(match[1]);
    }
  } else if (e.key === 'Escape') {
    hideDocCombo();
  }
}

function populateDropdowns() {
  let selfOpt = '<option value="__self__">Self (Walk-in)</option>';
  let docOpts = '<option value="">-- Select --</option>' + selfOpt + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  let eDoc = document.getElementById('eDoctor');
  let hDoc = document.getElementById('hDoctor');
  let regDoc = document.getElementById('regDocFilter');
  let eColl = document.getElementById('eCollector');

  // Preserve current selections across the rebuild
  let prevEDoc = eDoc ? eDoc.value : '';
  let prevHDoc = hDoc ? hDoc.value : '';
  let prevRegDoc = regDoc ? regDoc.value : '';
  let prevEColl = eColl ? eColl.value : '';

  if (eDoc) eDoc.innerHTML = docOpts;
  if (hDoc) hDoc.innerHTML = '<option value="">-- Select --</option>' + selfOpt + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  if (regDoc) regDoc.innerHTML = '<option value="">Sabhi Doctors</option>' + '<option value="__self__">Self (Walk-in)</option>' + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  if (eColl) eColl.innerHTML = '<option value="">-- None --</option>' + collectors.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');

  // Restore selections (only if the value still exists as an option)
  function restore(sel, val) { if (sel && val && Array.from(sel.options).some(o => o.value === val)) sel.value = val; }
  restore(eDoc, prevEDoc);
  restore(hDoc, prevHDoc);
  restore(regDoc, prevRegDoc);
  restore(eColl, prevEColl);
  refreshDocComboLabel();
}
