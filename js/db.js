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
const SB_CONFIG_KEY = 'hv2_sbConfig';

function setDbStatus(text, cls) {
  let el = document.getElementById('dbStatus');
  if (el) { el.textContent = text; el.className = 'db-status ' + cls; }
  let s = document.getElementById('fbSettingsStatus');
  if (s) s.textContent = text;
}

function initSupabase() {
  let configStr = localStorage.getItem(SB_CONFIG_KEY);
  if (!configStr) {
    setDbStatus('No DB - Local Only', 'db-offline');
    return;
  }
  try {
    let config = JSON.parse(configStr);
    if (!config.url || !config.key) throw new Error('Missing url or key');
    sb = supabase.createClient(config.url, config.key);
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

// ========== SUPABASE SETUP UI ==========
function openSupabaseSetup() {
  let existing = localStorage.getItem(SB_CONFIG_KEY);
  if (existing) {
    try { let c = JSON.parse(existing); document.getElementById('sbUrl').value = c.url || ''; document.getElementById('sbKey').value = c.key || ''; } catch (e) { }
  }
  document.getElementById('sqlSetup').textContent = SETUP_SQL;
  document.getElementById('supabaseSetup').classList.add('show');
}

function copySql() {
  navigator.clipboard.writeText(SETUP_SQL).then(() => alert('SQL copied! Paste it in Supabase SQL Editor and run.')).catch(() => { });
}

function saveSupabaseConfig() {
  let url = document.getElementById('sbUrl').value.trim();
  let key = document.getElementById('sbKey').value.trim();
  if (!url || !key) return alert('URL aur Key dono daalo!');
  if (!url.startsWith('http')) return alert('URL "https://" se start hona chahiye!');
  url = url.replace(/\/+$/, '');
  localStorage.setItem(SB_CONFIG_KEY, JSON.stringify({ url, key }));
  document.getElementById('supabaseSetup').classList.remove('show');
  sb = null; dbReady = false;
  initSupabase();
  alert('Supabase connected! Data will now sync to cloud.');
}

function disconnectSupabase() {
  if (!confirm('Disconnect Supabase? Local data will remain.')) return;
  localStorage.removeItem(SB_CONFIG_KEY);
  sb = null; dbReady = false;
  setDbStatus('No DB - Local Only', 'db-offline');
}

// ========== UTILITIES ==========
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
