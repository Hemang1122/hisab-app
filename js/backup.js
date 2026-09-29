// ========== BACKUP / RESTORE ==========

function exportData() {
  let blob = new Blob([JSON.stringify({ rateLists, doctors, collectors, entries, settings, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hisab-backup-' + todayStr() + '.json'; a.click();
}

function importData(e) {
  let file = e.target.files[0]; if (!file) return;
  let reader = new FileReader();
  reader.onload = function (ev) {
    try {
      let data = JSON.parse(ev.target.result);
      if (data.rateLists) rateLists = data.rateLists;
      if (data.doctors) doctors = data.doctors;
      if (data.collectors) collectors = data.collectors;
      if (data.entries) entries = data.entries;
      if (data.settings) settings = data.settings;
      saveLocal();
      // Push everything to supabase
      if (dbReady) {
        rateLists.forEach(r => sbSave('rate_lists', r.id, r));
        doctors.forEach(d => sbSave('doctors', d.id, d));
        collectors.forEach(c => sbSave('collectors', c.id, c));
        entries.forEach(en => sbSave('entries', en.id, en));
        sbSaveSettings();
      }
      alert('Restore done! ✅'); location.reload();
    } catch (err) { alert('File mein gadbad hai!'); }
  };
  reader.readAsText(file); e.target.value = '';
}
