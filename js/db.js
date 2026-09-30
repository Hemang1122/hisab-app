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

  // ONE fixed master rate list — just name, rate, type (no labShare/docShare)
  rateLists = [
    {
      id: 'rl_master', name: 'SBCL Master Rate List',
      tests: [
        { name: 'CBC (Complete Blood Count)', rate: 200, type: 'normal' },
        { name: 'ESR', rate: 100, type: 'normal' },
        { name: 'Blood Group & Rh', rate: 100, type: 'normal' },
        { name: 'BT CT (Bleeding/Clotting Time)', rate: 150, type: 'normal' },
        { name: 'Peripheral Smear', rate: 850, type: 'special' },
        { name: 'Platelet Count', rate: 100, type: 'normal' },
        { name: 'Reticulocyte Count', rate: 800, type: 'normal' },
        { name: 'MP (Malaria Parasite)', rate: 100, type: 'normal' },
        { name: 'HbA1c (Glycated Hb)', rate: 550, type: 'special' },
        { name: 'BSF (Blood Sugar Fasting)', rate: 50, type: 'normal' },
        { name: 'BSPP (Blood Sugar Post Prandial)', rate: 50, type: 'normal' },
        { name: 'RBS (Random Blood Sugar)', rate: 100, type: 'normal' },
        { name: 'Urea', rate: 200, type: 'normal' },
        { name: 'Creatinine', rate: 200, type: 'normal' },
        { name: 'Uric Acid', rate: 200, type: 'normal' },
        { name: 'Cholesterol', rate: 200, type: 'normal' },
        { name: 'Triglycerides', rate: 200, type: 'normal' },
        { name: 'SGOT (AST)', rate: 150, type: 'normal' },
        { name: 'SGPT (ALT)', rate: 150, type: 'normal' },
        { name: 'Albumin', rate: 100, type: 'normal' },
        { name: 'Total Protein', rate: 100, type: 'normal' },
        { name: 'Bilirubin (Total/Direct)', rate: 150, type: 'normal' },
        { name: 'Alk Phosphatase', rate: 250, type: 'normal' },
        { name: 'Calcium', rate: 150, type: 'normal' },
        { name: 'Phosphorous', rate: 500, type: 'special' },
        { name: 'GGT', rate: 100, type: 'normal' },
        { name: 'Amylase', rate: 550, type: 'special' },
        { name: 'Lipase', rate: 900, type: 'special' },
        { name: 'CPK Total', rate: 900, type: 'special' },
        { name: 'CPK-MB', rate: 900, type: 'special' },
        { name: 'Electrolyte (Na/K/Cl)', rate: 500, type: 'special' },
        { name: 'LDH', rate: 600, type: 'special' },
        { name: 'Lipid Profile', rate: 500, type: 'normal' },
        { name: 'LFT (Liver Function Test)', rate: 500, type: 'normal' },
        { name: 'RFT (Renal Function Test)', rate: 1200, type: 'normal' },
        { name: 'Thyroid Profile (T3/T4/TSH)', rate: 500, type: 'special' },
        { name: 'KFT (Kidney Function Test)', rate: 1000, type: 'normal' },
        { name: 'Widal Test', rate: 150, type: 'normal' },
        { name: 'VDRL', rate: 350, type: 'normal' },
        { name: 'RA Factor', rate: 400, type: 'normal' },
        { name: 'ASO Titre', rate: 800, type: 'normal' },
        { name: 'RA + AST (Combined)', rate: 400, type: 'normal' },
        { name: 'CRP', rate: 500, type: 'normal' },
        { name: 'HBsAg', rate: 450, type: 'normal' },
        { name: 'HCV', rate: 650, type: 'special' },
        { name: 'HIV I & II', rate: 350, type: 'normal' },
        { name: 'Dengue NS1', rate: 650, type: 'special' },
        { name: 'Dengue Profile (NS1+IgG+IgM)', rate: 1200, type: 'special' },
        { name: 'Chikungunya IgM', rate: 950, type: 'special' },
        { name: 'Typhi Dot (Typhoid)', rate: 850, type: 'special' },
        { name: 'Leptospira IgG/IgM', rate: 1800, type: 'special' },
        { name: 'Trop-I (Troponin I)', rate: 900, type: 'special' },
        { name: 'PT/INR', rate: 550, type: 'special' },
        { name: 'APTT', rate: 500, type: 'special' },
        { name: 'D-Dimer', rate: 1400, type: 'special' },
        { name: 'HHH (Triple H)', rate: 1400, type: 'special' },
        { name: 'ABG (Arterial Blood Gas)', rate: 2000, type: 'special' },
        { name: 'NT-proBNP', rate: 2800, type: 'special' },
        { name: 'PSA (Prostate)', rate: 1200, type: 'special' },
        { name: 'Mantoux Test', rate: 100, type: 'normal' },
        { name: 'M Panti (Montepanti)', rate: 400, type: 'special' },
        { name: 'Urine Routine/Microscopy', rate: 100, type: 'normal' },
        { name: 'UPT (Urine Pregnancy)', rate: 100, type: 'normal' },
        { name: 'Urine Culture & Sensitivity', rate: 900, type: 'special' },
        { name: 'Microalbumin (Urine)', rate: 200, type: 'special' },
        { name: 'Stool Routine/Microscopy', rate: 150, type: 'normal' },
        { name: 'Stool Occult Blood', rate: 100, type: 'normal' },
        { name: 'Semen Analysis', rate: 400, type: 'normal' },
        { name: 'Blood Culture & AST', rate: 1400, type: 'special' },
        { name: 'Pus Culture & AST', rate: 1400, type: 'special' },
        { name: 'Sputum Culture & AST', rate: 1400, type: 'special' },
        { name: 'AFB Stain (TB)', rate: 1400, type: 'normal' },
        { name: 'Gram Stain', rate: 3200, type: 'normal' },
        { name: 'KOH Mount (Fungal)', rate: 500, type: 'normal' },
        { name: 'BSF BSPP', rate: 100, type: 'normal' },
        { name: 'RA TEST', rate: 400, type: 'normal' },
        { name: 'FEVER PROFILE', rate: 600, type: 'normal' },
        { name: 'BODY PROFILE', rate: 2500, type: 'normal' },
        { name: 'TROP-I', rate: 900, type: 'normal' },
      ]
    }
  ];

  // Doctors — all get 50% split except Deepak Tiwari (60%)
  // docPercent = doctor's share percentage of the rate
  doctors = [
    { id: 'doc_deepak_tiwari', name: 'Deepak Tiwari', docPercent: 60 },
    { id: 'doc_abhishek_singh', name: 'Abhishek Singh', docPercent: 50 },
    { id: 'doc_dr_sunil_mani_tripathi', name: 'Dr. Sunil Mani Tripathi', docPercent: 50 },
    { id: 'doc_dr_c_v_yadav', name: 'Dr. C.V Yadav', docPercent: 50 },
    { id: 'doc_dr_kalyani_thengane', name: 'Dr. Kalyani Thengane', docPercent: 50 },
    { id: 'doc_sandeep_gaud', name: 'Sandeep Gaud', docPercent: 50 },
    { id: 'doc_dr_netra_yadav', name: 'Dr. Netra Yadav', docPercent: 50 },
    { id: 'doc_dr_narendra_patil', name: 'Dr. Narendra Patil', docPercent: 50 },
    { id: 'doc_dr_ajay_r_yadav', name: 'Dr. Ajay R Yadav', docPercent: 50 },
    { id: 'doc_dr_amit_kumar_meena', name: 'Dr. Amit Kumar Meena', docPercent: 50 },
    { id: 'doc_dr_khusboo_pandey', name: 'Dr. Khusboo Pandey', docPercent: 50 },
    { id: 'doc_satyendra_tiwari', name: 'Satyendra Tiwari', docPercent: 50 },
    { id: 'doc_lotus_hospital', name: 'Lotus Hospital', docPercent: 50 },
    { id: 'doc_dhurva_hospital', name: 'Dhurva Hospital', docPercent: 50 },
    { id: 'doc_dr_chandreshekhar_jain', name: 'Dr. Chandreshekhar Jain', docPercent: 50 },
    { id: 'doc_dr_ruchi_jain', name: 'Dr. Ruchi Jain', docPercent: 50 },
  ];

  // Collection boys
  collectors = [
    { id: 'munudcim4kana', name: 'JITU KUAMR' },
    { id: 'munudlrhnrqhp', name: 'KISHAN PATHAK' },
    { id: 'munuep7h7i1vh', name: 'SUJEET KUMAR' },
    { id: 'munuf5z9y57uv', name: 'Shalini KUAMRI' },
    { id: 'munufexxw0m0d', name: 'ATISHA KUAMRI' },
    { id: 'munufpem9xujz', name: 'REHAN KUMAR' },
  ];

  saveLocal();
  // Sync to Supabase if connected
  if (dbReady) {
    rateLists.forEach(r => sbSave('rate_lists', r.id, r));
    doctors.forEach(d => sbSave('doctors', d.id, d));
    collectors.forEach(c => sbSave('collectors', c.id, c));
  }
}

// Get the master rate list (always the first/only one)
function getMasterRL() {
  return rateLists[0] || null;
}

// Get doctor's split percentage (defaults to 50 if not set)
function getDocPercent(docId) {
  if (!docId || docId === '__self__') return 50;
  let doc = doctors.find(d => d.id === docId);
  return (doc && doc.docPercent != null) ? doc.docPercent : 50;
}

// Calculate labShare and docShare from rate and doctor's percentage
function calcShares(rate, docPercent) {
  let docShare = Math.round(rate * docPercent / 100);
  return { labShare: rate - docShare, docShare };
}

// Migrate existing data: convert old rateListId-based doctors to docPercent
function migrateData() {
  let changed = false;

  // Migrate doctors: if they have rateListId but no docPercent, convert
  doctors.forEach(d => {
    if (d.docPercent == null) {
      if (d.rateListId === 'rl_6040') {
        d.docPercent = 60;
      } else {
        d.docPercent = 50;
      }
      delete d.rateListId;
      changed = true;
    }
  });

  // Migrate rate lists: merge into one master if old format
  if (rateLists.length > 1 || (rateLists.length === 1 && rateLists[0].id !== 'rl_master')) {
    // Find the best source (prefer rl_5050 or first one)
    let source = rateLists.find(r => r.id === 'rl_5050') || rateLists[0];
    if (source) {
      // Strip labShare/docShare from tests
      let masterTests = source.tests.map(t => ({ name: t.name, rate: t.rate, type: t.type }));
      rateLists = [{ id: 'rl_master', name: 'SBCL Master Rate List', tests: masterTests }];
      changed = true;
    }
  } else if (rateLists.length === 1 && rateLists[0].id === 'rl_master') {
    // Already migrated, but clean labShare/docShare from tests if present
    let rl = rateLists[0];
    let needsClean = rl.tests.some(t => t.labShare != null || t.docShare != null);
    if (needsClean) {
      rl.tests = rl.tests.map(t => ({ name: t.name, rate: t.rate, type: t.type }));
      changed = true;
    }
  }

  if (changed) {
    saveLocal();
    // Sync to Supabase
    if (dbReady) {
      rateLists.forEach(r => sbSave('rate_lists', r.id, r));
      doctors.forEach(d => sbSave('doctors', d.id, d));
      // Delete old rate lists from Supabase
      sbDelete('rate_lists', 'rl_5050');
      sbDelete('rate_lists', 'rl_6040');
    }
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
    migrateData(); // Convert old format to new single-rate-list + docPercent
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

// ========== UTILITIES ==========
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
