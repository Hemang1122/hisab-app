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
      // Validate backup has at least some expected data
      if (!data.entries && !data.rateLists && !data.doctors) {
        return alert('⚠️ Ye valid backup file nahi lagti!');
      }

      // Count what's new vs existing for entries
      let newEntries = 0, existingEntries = 0;
      if (data.entries && data.entries.length) {
        let currentIds = new Set(entries.map(en => en.id));
        data.entries.forEach(en => {
          if (currentIds.has(en.id)) existingEntries++;
          else newEntries++;
        });
      }

      let msg = '⚠️ RESTORE — Backup Details:\n\n';
      msg += 'Backup mein:\n';
      if (data.entries) msg += '  • ' + data.entries.length + ' entries (' + newEntries + ' new, ' + existingEntries + ' already exist)\n';
      if (data.doctors) msg += '  • ' + data.doctors.length + ' doctors\n';
      if (data.rateLists) msg += '  • ' + data.rateLists.length + ' rate lists\n';
      if (data.collectors) msg += '  • ' + data.collectors.length + ' collectors\n';
      if (data.exported) msg += '  • Exported: ' + new Date(data.exported).toLocaleDateString('en-IN') + '\n';
      msg += '\nCurrent data:\n';
      msg += '  • ' + entries.length + ' entries\n';
      msg += '  • ' + doctors.length + ' doctors\n';
      msg += '  • ' + collectors.length + ' collectors\n';
      msg += '\nEntries ko MERGE karega (naye add, existing skip).\n';
      msg += 'Doctors, Rate Lists, Collectors aur Settings REPLACE honge.\n';
      msg += '\nKya aap sure hain?';
      if (!confirm(msg)) return;

      // Replace non-entry data (these are config, not transaction data)
      if (data.rateLists) rateLists = data.rateLists;
      if (data.doctors) doctors = data.doctors;
      if (data.collectors) collectors = data.collectors;
      if (data.settings) settings = data.settings;

      // MERGE entries — keep existing, add new ones from backup
      if (data.entries && data.entries.length) {
        let currentIds = new Set(entries.map(en => en.id));
        let added = 0;
        data.entries.forEach(en => {
          if (!currentIds.has(en.id)) {
            entries.push(en);
            added++;
          }
        });
        if (typeof toast === 'function' && added > 0) {
          toast('✅ ' + added + ' new entries merged from backup');
        }
      }

      saveLocal();
      // Push everything to supabase
      if (dbReady) {
        rateLists.forEach(r => sbSave('rate_lists', r.id, r));
        doctors.forEach(d => sbSave('doctors', d.id, d));
        collectors.forEach(c => sbSave('collectors', c.id, c));
        entries.forEach(en => sbSave('entries', en.id, en));
        sbSaveSettings();
      }
      alert('✅ Restore done! Page reload hoga.'); location.reload();
    } catch (err) { alert('❌ File mein gadbad hai: ' + err.message); }
  };
  reader.readAsText(file); e.target.value = '';
}
