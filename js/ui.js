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

// ========== TABS ==========
let revUnlocked = false;
const TAB_KEYS = ['entry', 'register', 'hisab', 'revenue', 'ratelist', 'doctors', 'settings'];

function showTab(t) {
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  let links = document.querySelectorAll('nav a');
  links.forEach(a => a.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  let idx = TAB_KEYS.indexOf(t);
  if (idx >= 0 && links[idx]) links[idx].classList.add('active');

  if (t === 'revenue' && !revUnlocked && settings.revPassword) {
    document.getElementById('revContent').style.display = 'none';
    document.getElementById('passwordOverlay').classList.add('show');
    setTimeout(() => document.getElementById('revPwInput').focus(), 100);
  } else if (t === 'revenue') {
    document.getElementById('revContent').style.display = 'block';
  }
  if (t === 'register') renderRegister();
  if (t === 'ratelist') renderRateLists();
  if (t === 'doctors') renderDoctors();
  if (t === 'entry') refreshSidebar();
}

// ========== PASSWORD ==========
function checkRevPw() {
  if (document.getElementById('revPwInput').value === settings.revPassword) {
    revUnlocked = true;
    document.getElementById('passwordOverlay').classList.remove('show');
    document.getElementById('revContent').style.display = 'block';
    document.getElementById('revPwInput').value = '';
    document.getElementById('pwError').textContent = '';
  } else {
    document.getElementById('pwError').textContent = 'Galat password!';
  }
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
  let docOpts = '<option value="">-- Select --</option>' + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  let eDoc = document.getElementById('eDoctor');
  let hDoc = document.getElementById('hDoctor');
  let regDoc = document.getElementById('regDocFilter');
  let eColl = document.getElementById('eCollector');

  if (eDoc) eDoc.innerHTML = docOpts;
  if (hDoc) hDoc.innerHTML = docOpts;
  if (regDoc) regDoc.innerHTML = '<option value="">Sabhi Doctors</option>' + doctors.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join('');
  if (eColl) eColl.innerHTML = '<option value="">-- None --</option>' + collectors.map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('');
}
