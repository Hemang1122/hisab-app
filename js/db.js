// ========== SUPABASE DATABASE + LOCAL STORAGE ==========

// Setup SQL for Supabase (shown in setup modal)
const SETUP_SQL = `-- Run this in Supabase SQL Editor (one time setup)
create table if not exists rate_lists (
  id text primary key,
  data jsonb not null
);
create table if not exists doctors (
  id text primary key,
  data jsonb not null
);
create table if not exists collectors (
  id text primary key,
  data jsonb not null
);
create table if not exists entries (
  id text primary key,
  data jsonb not null
);
create table if not exists config (
  id text primary key,
  data jsonb not null
);

-- Allow public access (for anon key)
alter table rate_lists enable row level security;
alter table doctors enable row level security;
alter table collectors enable row level security;
alter table entries enable row level security;
alter table config enable row level security;

create policy "Allow all" on rate_lists for all using (true) with check (true);
create policy "Allow all" on doctors for all using (true) with check (true);
create policy "Allow all" on collectors for all using (true) with check (true);
create policy "Allow all" on entries for all using (true) with check (true);
create policy "Allow all" on config for all using (true) with check (true);`;

// ========== LOCAL STORAGE (cache + fallback) ==========
const LS = {
  get(k, d = null) { try { let v = localStorage.getItem('hv2_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hv2_' + k, JSON.stringify(v)); } catch (e) { } }
};

// ========== APP DATA ==========
let rateLists = LS.get('rateLists', []);
let doctors = LS.get('doctors', []);
let collectors = LS.get('collectors', []);
let entries = LS.get('entries', []);
let settings = LS.get('settings', { revPassword: 'ANITA@1234' });

// ========== SEED DATA (runs once if no doctors exist) ==========
function seedDefaultData() {
  if (doctors.length > 0) return; // Already has data

  // All tests with rates — type: 'normal' (in-house), 'special' (outsourced/CRL)
  // Tests with rate 0 will be highlighted for staff to fill in
  let allTests = [
    // === HAEMATOLOGY (Normal - in-house) ===
    { name: 'CBC (Complete Blood Count)', rate: 200, type: 'normal' },
    { name: 'ESR', rate: 100, type: 'normal' },
    { name: 'Blood Group & Rh', rate: 100, type: 'normal' },
    { name: 'BT CT (Bleeding/Clotting Time)', rate: 150, type: 'normal' },
    { name: 'Peripheral Smear', rate: 0, type: 'normal' },
    { name: 'Platelet Count', rate: 0, type: 'normal' },
    { name: 'Reticulocyte Count', rate: 0, type: 'normal' },
    { name: 'MP (Malaria Parasite)', rate: 100, type: 'normal' },
    { name: 'HbA1c (Glycated Hb)', rate: 0, type: 'special' },

    // === BIOCHEMISTRY (Normal - in-house) ===
    { name: 'BSF (Blood Sugar Fasting)', rate: 50, type: 'normal' },
    { name: 'BSPP (Blood Sugar Post Prandial)', rate: 50, type: 'normal' },
    { name: 'RBS (Random Blood Sugar)', rate: 100, type: 'normal' },
    { name: 'Urea', rate: 200, type: 'normal' },
    { name: 'Creatinine', rate: 200, type: 'normal' },
    { name: 'Uric Acid', rate: 200, type: 'normal' },
    { name: 'Cholesterol', rate: 350, type: 'normal' },
    { name: 'Triglycerides', rate: 350, type: 'normal' },
    { name: 'SGOT (AST)', rate: 150, type: 'normal' },
    { name: 'SGPT (ALT)', rate: 150, type: 'normal' },
    { name: 'Albumin', rate: 250, type: 'normal' },
    { name: 'Total Protein', rate: 250, type: 'normal' },
    { name: 'Bilirubin (Total/Direct)', rate: 150, type: 'normal' },
    { name: 'Alk Phosphatase', rate: 350, type: 'normal' },
    { name: 'Calcium', rate: 200, type: 'normal' },
    { name: 'Phosphorous', rate: 0, type: 'normal' },
    { name: 'GGT', rate: 100, type: 'normal' },
    { name: 'Amylase', rate: 550, type: 'special' },
    { name: 'Lipase', rate: 900, type: 'special' },
    { name: 'CPK Total', rate: 900, type: 'special' },
    { name: 'CPK-MB', rate: 900, type: 'special' },
    { name: 'Electrolyte (Na/K/Cl)', rate: 500, type: 'special' },
    { name: 'LDH', rate: 0, type: 'special' },

    // === PROFILES ===
    { name: 'Lipid Profile', rate: 550, type: 'normal' },
    { name: 'LFT (Liver Function Test)', rate: 500, type: 'normal' },
    { name: 'RFT (Renal Function Test)', rate: 1000, type: 'normal' },
    { name: 'Thyroid Profile (T3/T4/TSH)', rate: 0, type: 'special' },
    { name: 'KFT (Kidney Function Test)', rate: 0, type: 'normal' },

    // === SEROLOGY ===
    { name: 'Widal Test', rate: 150, type: 'normal' },
    { name: 'VDRL', rate: 350, type: 'normal' },
    { name: 'RA Factor', rate: 0, type: 'normal' },
    { name: 'ASO Titre', rate: 0, type: 'normal' },
    { name: 'RA + AST (Combined)', rate: 400, type: 'normal' },
    { name: 'CRP', rate: 0, type: 'normal' },
    { name: 'HBsAg', rate: 450, type: 'normal' },
    { name: 'HCV', rate: 650, type: 'special' },
    { name: 'HIV I & II', rate: 350, type: 'normal' },
    { name: 'Dengue NS1', rate: 650, type: 'special' },
    { name: 'Dengue Profile (NS1+IgG+IgM)', rate: 1200, type: 'special' },
    { name: 'Chikungunya IgM', rate: 950, type: 'special' },
    { name: 'Typhi Dot (Typhoid)', rate: 850, type: 'special' },
    { name: 'Leptospira IgG/IgM', rate: 1800, type: 'special' },
    { name: 'Trop-I (Troponin I)', rate: 900, type: 'special' },

    // === COAGULATION ===
    { name: 'PT/INR', rate: 550, type: 'special' },
    { name: 'APTT', rate: 500, type: 'special' },
    { name: 'D-Dimer', rate: 1400, type: 'special' },

    // === SPECIAL / OUTSOURCED ===
    { name: 'HHH (Triple H)', rate: 1400, type: 'special' },
    { name: 'ABG (Arterial Blood Gas)', rate: 2000, type: 'special' },
    { name: 'NT-proBNP', rate: 2800, type: 'special' },
    { name: 'PSA (Prostate)', rate: 0, type: 'special' },
    { name: 'Mantoux Test', rate: 100, type: 'normal' },
    { name: 'M Panti (Montepanti)', rate: 400, type: 'special' },

    // === URINE ===
    { name: 'Urine Routine/Microscopy', rate: 0, type: 'normal' },
    { name: 'UPT (Urine Pregnancy)', rate: 100, type: 'normal' },
    { name: 'Urine Culture & Sensitivity', rate: 0, type: 'special' },
    { name: 'Microalbumin (Urine)', rate: 0, type: 'special' },

    // === STOOL ===
    { name: 'Stool Routine/Microscopy', rate: 150, type: 'normal' },
    { name: 'Stool Occult Blood', rate: 0, type: 'normal' },

    // === SEMEN ===
    { name: 'Semen Analysis', rate: 0, type: 'normal' },

    // === CULTURE & AST ===
    { name: 'Blood Culture & AST', rate: 0, type: 'special' },
    { name: 'Pus Culture & AST', rate: 0, type: 'special' },
    { name: 'Sputum Culture & AST', rate: 0, type: 'special' },

    // === MICROBIOLOGY ===
    { name: 'AFB Stain (TB)', rate: 0, type: 'normal' },
    { name: 'Gram Stain', rate: 0, type: 'normal' },
    { name: 'KOH Mount (Fungal)', rate: 0, type: 'normal' },
  ];

  // Generate split for a rate list: 50-50 or 60-40
  function makeTests(tests, docPct) {
    return tests.map(t => {
      let docShare = Math.round(t.rate * docPct);
      let labShare = t.rate - docShare;
      return { name: t.name, rate: t.rate, labShare, docShare, type: t.type };
    });
  }

  let rl5050 = {
    id: 'rl_5050',
    name: 'Standard 50-50',
    tests: makeTests(allTests, 0.5)
  };
  let rl6040 = {
    id: 'rl_6040',
    name: 'Deepak Tiwari 60-40',
    tests: makeTests(allTests, 0.6)
  };
  rateLists = [rl5050, rl6040];

  // Doctors — all get 50-50 except Deepak Tiwari
  let doctorList = [
    { name: 'Deepak Tiwari', rlId: 'rl_6040' },
    { name: 'Abhishek Singh', rlId: 'rl_5050' },
    { name: 'Dr. Sunil Mani Tripathi', rlId: 'rl_5050' },
    { name: 'Dr. C.V Yadav', rlId: 'rl_5050' },
    { name: 'Dr. Kalyani Thengane', rlId: 'rl_5050' },
    { name: 'Sandeep Gaud', rlId: 'rl_5050' },
    { name: 'Dr. Netra Yadav', rlId: 'rl_5050' },
    { name: 'Dr. Narendra Patil', rlId: 'rl_5050' },
    { name: 'Dr. Ajay R Yadav', rlId: 'rl_5050' },
    { name: 'Dr. Amit Kumar Meena', rlId: 'rl_5050' },
    { name: 'Dr. Khusboo Pandey', rlId: 'rl_5050' },
    { name: 'Satyendra Tiwari', rlId: 'rl_5050' },
    { name: 'Lotus Hospital', rlId: 'rl_5050' },
    { name: 'Dhurva Hospital', rlId: 'rl_5050' },
    { name: 'Dr. Chandreshekhar Jain', rlId: 'rl_5050' },
    { name: 'Dr. Ruchi Jain', rlId: 'rl_5050' },
  ];
  doctors = doctorList.map(d => ({
    id: 'doc_' + d.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
    name: d.name,
    rateListId: d.rlId
  }));

  saveLocal();
  // Sync to Supabase if connected
  if (dbReady) {
    rateLists.forEach(r => sbSave('rate_lists', r.id, r));
    doctors.forEach(d => sbSave('doctors', d.id, d));
  }
}

function saveLocal() {
  LS.set('rateLists', rateLists);
  LS.set('doctors', doctors);
  LS.set('collectors', collectors);
  LS.set('entries', entries);
  LS.set('settings', settings);
}

// ========== SUPABASE ==========
let sb = null;
let dbReady = false;
const SB_URL = 'https://dcjjzejvahjwowtvdnxf.supabase.co';
const SB_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjamp6ZWp2YWhqd293dHZkbnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MDQ0NTgsImV4cCI6MjEwNjI4MDQ1OH0.R_iNN28MweCVlxjNf5r5C2rZIjzQUKCP9z3cKYwHRUs';

function setDbStatus(text, cls) {
  let el = document.getElementById('dbStatus');
  if (el) { el.textContent = text; el.className = 'db-status ' + cls; }
  let s = document.getElementById('fbSettingsStatus');
  if (s) s.textContent = text;
}

function initSupabase() {
  try {
    sb = supabase.createClient(SB_URL, SB_ANON_KEY);
    dbReady = true;
    setDbStatus('Online ✓', 'db-online');
    loadAllFromSupabase();
  } catch (e) {
    console.error('Supabase init error:', e);
    setDbStatus('Error - Local Only', 'db-offline');
  }
}

async function loadAllFromSupabase() {
  if (!dbReady || !sb) return;
  try {
    setDbStatus('Syncing...', 'db-loading');

    let { data: rlData } = await sb.from('rate_lists').select('*');
    if (rlData && rlData.length) { rateLists = rlData.map(r => ({ id: r.id, ...r.data })); }

    let { data: docData } = await sb.from('doctors').select('*');
    if (docData && docData.length) { doctors = docData.map(d => ({ id: d.id, ...d.data })); }

    let { data: collData } = await sb.from('collectors').select('*');
    if (collData && collData.length) { collectors = collData.map(c => ({ id: c.id, ...c.data })); }

    let { data: entData } = await sb.from('entries').select('*');
    if (entData && entData.length) { entries = entData.map(e => ({ id: e.id, ...e.data })); }

    let { data: cfgData } = await sb.from('config').select('*').eq('id', 'settings').single();
    if (cfgData && cfgData.data) settings = { ...settings, ...cfgData.data };

    saveLocal();
    setDbStatus('Online ✓', 'db-online');

    // Refresh UI after sync
    if (typeof populateDropdowns === 'function') populateDropdowns();
    if (typeof renderRateLists === 'function') renderRateLists();
    if (typeof renderDoctors === 'function') renderDoctors();
    if (typeof renderCollectors === 'function') renderCollectors();
    if (typeof refreshSidebar === 'function') refreshSidebar();
  } catch (e) {
    console.error('Supabase load error:', e);
    setDbStatus('Offline - Using Cache', 'db-offline');
  }
}

async function sbSave(table, id, data) {
  if (!dbReady || !sb) return;
  try {
    let clean = { ...data }; delete clean.id;
    await sb.from(table).upsert({ id, data: clean }, { onConflict: 'id' });
  } catch (e) { console.error('SB save error:', table, id, e); }
}

async function sbDelete(table, id) {
  if (!dbReady || !sb) return;
  try { await sb.from(table).delete().eq('id', id); } catch (e) { console.error('SB delete error:', e); }
}

async function sbSaveSettings() {
  if (!dbReady || !sb) return;
  try { await sb.from('config').upsert({ id: 'settings', data: settings }, { onConflict: 'id' }); } catch (e) { }
}

// Combined save: local + supabase
function saveAll() {
  saveLocal();
  if (dbReady) {
    rateLists.forEach(r => sbSave('rate_lists', r.id, r));
    doctors.forEach(d => sbSave('doctors', d.id, d));
    collectors.forEach(c => sbSave('collectors', c.id, c));
    sbSaveSettings();
  }
}

function saveEntry_db(entry) {
  saveLocal();
  if (dbReady) sbSave('entries', entry.id, entry);
}

// Supabase setup UI removed — auto-connects with hardcoded config

// ========== UTILITIES ==========
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
