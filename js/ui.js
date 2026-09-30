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
function populateDropdowns() {
  let selfOpt = '<option value="__self__">Self (Walk-in)</option>';
  let docOpts = '<option value="">-- Select --</option>' + selfOpt + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  let eDoc = document.getElementById('eDoctor');
  let hDoc = document.getElementById('hDoctor');
  let regDoc = document.getElementById('regDocFilter');
  let eColl = document.getElementById('eCollector');

  if (eDoc) eDoc.innerHTML = docOpts;
  if (hDoc) hDoc.innerHTML = '<option value="">-- Select --</option>' + selfOpt + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  if (regDoc) regDoc.innerHTML = '<option value="">Sabhi Doctors</option>' + '<option value="__self__">Self (Walk-in)</option>' + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  if (eColl) eColl.innerHTML = '<option value="">-- None --</option>' + collectors.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
}
