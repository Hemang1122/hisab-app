// ========== MATERIALS & REAGENT COST MANAGEMENT ==========

let currentMatSection = 'consumption';

function switchMatSection(section) {
  currentMatSection = section;
  document.querySelectorAll('[data-matsection]').forEach(b => b.classList.toggle('active', b.dataset.matsection === section));
  renderMaterialsTab();
}

function initMaterialsTab() {
  let today = localDateStr();
  let fromEl = document.getElementById('matFrom');
  let toEl = document.getElementById('matTo');
  if (!fromEl.value) {
    // Default: this month
    let m = new Date(); m.setDate(1);
    fromEl.value = localDateStr(m);
    toEl.value = today;
  }
  renderMaterialsTab();
}

function setMatPreset(preset) {
  let today = new Date();
  let from, to = localDateStr(today);
  if (preset === 'today') from = to;
  else if (preset === 'last7') { let d = new Date(today); d.setDate(d.getDate() - 6); from = localDateStr(d); }
  else if (preset === 'thisMonth') from = localDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
  else if (preset === 'lastMonth') {
    let d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    let d2 = new Date(today.getFullYear(), today.getMonth(), 0);
    from = localDateStr(d1);
    to = localDateStr(d2);
  } else if (preset === 'all') {
    if (entries.length) from = entries.map(e => e.date).sort()[0];
    else from = to;
  }
  document.getElementById('matFrom').value = from;
  document.getElementById('matTo').value = to;
  renderMaterialsTab();
}

function computeMaterialsData() {
  let from = document.getElementById('matFrom').value;
  let to = document.getElementById('matTo').value;
  if (!from || !to) return null;

  let filtered = entries.filter(e => e.date >= from && e.date <= to);
  let byTest = {};
  let totalReagent = 0, totalLabShare = 0, totalRevenue = 0, totalTests = 0;

  filtered.forEach(e => {
    e.tests.forEach(t => {
      let name = t.name || 'Unknown';
      if (!byTest[name]) byTest[name] = {
        count: 0, revenue: 0, reagentCost: 0, labShare: 0, docShare: 0,
        reagentPerTest: t.reagentCost || 0, type: t.type || 'normal'
      };
      byTest[name].count++;
      byTest[name].revenue += (t.rate || 0);
      byTest[name].reagentCost += (t.reagentCost || 0);
      byTest[name].labShare += (t.labShare || 0);
      byTest[name].docShare += (t.docShare || 0);
      totalReagent += (t.reagentCost || 0);
      totalLabShare += (t.labShare || 0);
      totalRevenue += (t.rate || 0);
      totalTests++;
    });
  });

  return { from, to, filtered, byTest, totalReagent, totalLabShare, totalRevenue, totalTests };
}

function renderMaterialsTab() {
  let d = computeMaterialsData();
  let c = document.getElementById('materialsResult');
  if (!c) return;
  if (!d) { c.innerHTML = ''; return; }

  if (currentMatSection === 'consumption') c.innerHTML = renderMatConsumption(d);
  else if (currentMatSection === 'edit') c.innerHTML = renderMatEdit();
  else if (currentMatSection === 'shopping') c.innerHTML = renderMatShopping(d);
}

// ========== CONSUMPTION ==========
function renderMatConsumption(d) {
  let labProfit = d.totalLabShare - d.totalReagent;
  let avgMargin = d.totalLabShare > 0 ? (labProfit / d.totalLabShare * 100) : 0;
  let testList = Object.entries(d.byTest).sort((a, b) => b[1].reagentCost - a[1].reagentCost);

  if (!testList.length) return '<div class="card"><div class="empty" style="padding:40px">Is date range mein koi test nahi hua.</div></div>';

  let html = '';
  // KPIs
  html += '<div class="stat-grid">';
  html += statCard('red', '🧪 Reagent Spent', d.totalReagent);
  html += statCard('green', '💰 Lab Share Earned', d.totalLabShare);
  html += statCard('blue', '📈 Net Lab Profit', labProfit);
  html += statCard('yellow', 'Profit Margin', Math.round(avgMargin) + '%', true);
  html += '</div>';

  html += '<div class="stat-grid">';
  html += statCard('purple', 'Total Tests Done', d.totalTests, true);
  html += statCard('blue', 'Patients', d.filtered.length, true);
  html += statCard('yellow', 'Avg Reagent / Patient', d.filtered.length ? Math.round(d.totalReagent / d.filtered.length) : 0);
  html += statCard('green', 'Avg Profit / Test', d.totalTests ? Math.round(labProfit / d.totalTests) : 0);
  html += '</div>';

  // Per-test
  html += '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">🧪 Per-Test Consumption</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Test</th><th>Type</th><th style="text-align:right">Count</th><th style="text-align:right" title="Reagent cost per 1 test">Unit ₹</th><th style="text-align:right">Total Reagent ₹</th><th style="text-align:right">Lab Share ₹</th><th style="text-align:right">Net Profit ₹</th><th style="text-align:right">Margin</th></tr></thead><tbody>';
  testList.forEach(([n, x]) => {
    let profit = x.labShare - x.reagentCost;
    let margin = x.labShare > 0 ? Math.round(profit / x.labShare * 100) : 0;
    let marginColor = margin >= 50 ? '#1b874b' : margin >= 20 ? '#c8843c' : '#c44536';
    let typeBadge = x.type === 'special' ? '<span class="tag-special">Special</span>' : '<span class="tag-normal">Normal</span>';
    html += '<tr>' +
      '<td><b>' + n + '</b></td>' +
      '<td>' + typeBadge + '</td>' +
      '<td style="text-align:right">' + x.count + '</td>' +
      '<td style="text-align:right">₹' + x.reagentPerTest + '</td>' +
      '<td style="text-align:right;color:#c44536"><b>₹' + x.reagentCost + '</b></td>' +
      '<td style="text-align:right">₹' + x.labShare + '</td>' +
      '<td style="text-align:right;color:' + marginColor + ';font-weight:700">₹' + profit + '</td>' +
      '<td style="text-align:right;color:' + marginColor + '">' + margin + '%</td>' +
    '</tr>';
  });
  html += '<tr style="background:var(--n100);font-weight:700">' +
    '<td colspan="2">Grand Total</td>' +
    '<td style="text-align:right">' + d.totalTests + '</td><td></td>' +
    '<td style="text-align:right;color:#c44536">₹' + d.totalReagent + '</td>' +
    '<td style="text-align:right">₹' + d.totalLabShare + '</td>' +
    '<td style="text-align:right;color:' + (labProfit > 0 ? '#1b874b' : '#c44536') + '">₹' + labProfit + '</td>' +
    '<td style="text-align:right">' + Math.round(avgMargin) + '%</td>' +
  '</tr>';
  html += '</tbody></table></div></div>';

  // Missing reagent costs
  let missing = testList.filter(([, x]) => !x.reagentPerTest);
  if (missing.length) {
    html += '<div class="card" style="background:#fff8ee;border-left:4px solid var(--accent)">';
    html += '<h4 style="font-size:13px;margin:0 0 6px;color:var(--accent)">⚠️ ' + missing.length + ' test(s) have no reagent cost set</h4>';
    html += '<p style="font-size:11px;color:#666;margin:0 0 8px">Set the reagent cost in the <b>Edit Reagent Costs</b> tab above. Profit margins for these tests are overestimated.</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    missing.forEach(([n, x]) => {
      html += '<span style="background:white;border:1px solid #e8d3a8;padding:3px 10px;border-radius:10px;font-size:11px">' + n + ' <small style="color:#999">· ' + x.count + '×</small></span>';
    });
    html += '</div></div>';
  }

  return html;
}

// ========== EDIT COSTS ==========
let matEditSearch = '';
function renderMatEdit() {
  let rl = getMasterRL();
  if (!rl) return '<div class="card"><div class="empty">Rate list not found.</div></div>';

  let setCount = rl.tests.filter(t => t.reagentCost != null && t.reagentCost > 0).length;
  let totalCount = rl.tests.length;

  let html = '';
  html += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
  html += '<div><h3 style="font-size:14px;margin:0">✏️ Set Reagent Cost per Test</h3><small style="color:#666">' + setCount + ' of ' + totalCount + ' tests have reagent cost set</small></div>';
  html += '<input id="matEditSearchBox" placeholder="🔍 Search test..." value="' + matEditSearch + '" oninput="matEditSearch=this.value;renderMaterialsTab()" style="padding:6px 10px;border:1px solid var(--n200);border-radius:6px;font-size:12px;min-width:200px">';
  html += '</div>';

  function norm(s) { return (s || '').toLowerCase().replace(/[(),.\-\/&]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  let words = norm(matEditSearch).split(' ').filter(w => w.length > 0);
  let visibleTests = rl.tests.map((t, idx) => ({ t, idx })).filter(({ t }) => {
    if (!words.length) return true;
    let target = norm(t.name);
    return words.every(w => target.includes(w));
  });

  html += '<div style="overflow-x:auto"><table style="font-size:12px;width:100%"><thead><tr style="background:var(--brand);color:white"><th style="padding:8px;text-align:left">Test Name</th><th style="padding:8px;text-align:center;width:80px">Type</th><th style="padding:8px;text-align:right;width:80px">Rate</th><th style="padding:8px;text-align:center;width:110px">🧪 Reagent Cost</th></tr></thead><tbody>';
  if (!visibleTests.length) {
    html += '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999">No match for "' + matEditSearch + '"</td></tr>';
  } else {
    visibleTests.forEach(({ t, idx }) => {
      let typeBadge = t.type === 'special' ? '<span class="tag-special">Spec</span>' : '<span class="tag-normal">Norm</span>';
      let costVal = t.reagentCost != null ? t.reagentCost : '';
      html += '<tr style="border-bottom:1px solid var(--n100)">' +
        '<td style="padding:6px 8px"><b>' + t.name + '</b></td>' +
        '<td style="padding:6px 8px;text-align:center">' + typeBadge + '</td>' +
        '<td style="padding:6px 8px;text-align:right;color:#666">₹' + (t.rate || 0) + '</td>' +
        '<td style="padding:6px 8px;text-align:center">' +
          '<input type="number" value="' + costVal + '" placeholder="0" onblur="saveMatCost(' + idx + ',this.value)" style="width:80px;text-align:right;padding:4px 6px;border:1px solid var(--n200);border-radius:4px">' +
        '</td>' +
      '</tr>';
    });
  }
  html += '</tbody></table></div></div>';

  html += '<div class="card" style="background:#f0f7f3;border-left:4px solid var(--brand)">';
  html += '<p style="font-size:12px;color:#555;margin:0"><b>💡 Tip:</b> Changes save automatically when you click out of the field. All past entries get re-synced with the new cost — profit numbers in Revenue update right away.</p>';
  html += '</div>';

  return html;
}

function saveMatCost(idx, val) {
  let rl = getMasterRL();
  if (!rl || !rl.tests[idx]) return;
  let t = rl.tests[idx];
  let raw = (val || '').trim();
  let oldVal = t.reagentCost;
  if (raw === '') delete t.reagentCost;
  else t.reagentCost = parseFloat(raw) || 0;
  if ((oldVal || 0) === (t.reagentCost || 0)) return; // no change

  saveAll();
  if (dbReady) sbSave('rate_lists', rl.id, rl);
  // Propagate to all entries (updates stored test.reagentCost everywhere)
  let updated = typeof syncEntriesToRateList === 'function' ? syncEntriesToRateList() : 0;
  if (typeof toast === 'function') {
    toast('🧪 ' + t.name + ' reagent cost → ₹' + (t.reagentCost || 0) + (updated > 0 ? ' · ' + updated + ' entries re-synced' : ''));
  }
  if (typeof renderRateLists === 'function') renderRateLists();
}

// ========== SHOPPING LIST ==========
function renderMatShopping(d) {
  // Group tests by type, estimate reagent spent (so lab knows what they consumed)
  let testList = Object.entries(d.byTest).sort((a, b) => b[1].reagentCost - a[1].reagentCost);
  if (!testList.length) return '<div class="card"><div class="empty" style="padding:40px">Is date range mein koi test nahi hua.</div></div>';

  let totalSpent = d.totalReagent;
  let html = '';

  html += '<div class="stat-grid">';
  html += statCard('red', 'Total Reagent Spent', totalSpent);
  html += statCard('purple', 'Tests Performed', d.totalTests, true);
  html += statCard('blue', 'Distinct Tests Used', testList.length, true);
  html += statCard('yellow', 'Avg Spend / Test', d.totalTests ? Math.round(totalSpent / d.totalTests) : 0);
  html += '</div>';

  html += '<div class="card" style="background:#fffbf3;border-left:4px solid var(--accent)">';
  html += '<p style="font-size:12px;color:#555;margin:0"><b>How to use:</b> This is what you consumed in the selected period. Compare with what you actually bought from distributors — the gap tells you how much stock is left, or if there was wastage.</p>';
  html += '</div>';

  // Shopping / consumption table
  html += '<div class="card"><h3 style="font-size:14px;margin-bottom:10px">🛒 What You Used (Shopping Reference)</h3>';
  html += '<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Test</th><th style="text-align:right">Tests Done</th><th style="text-align:right">Per Test ₹</th><th style="text-align:right">Materials Spent ₹</th><th style="text-align:right">% of Total</th></tr></thead><tbody>';
  testList.forEach(([n, x]) => {
    let pct = totalSpent > 0 ? (x.reagentCost / totalSpent * 100).toFixed(1) : '0';
    html += '<tr>' +
      '<td><b>' + n + '</b></td>' +
      '<td style="text-align:right">' + x.count + '</td>' +
      '<td style="text-align:right">₹' + x.reagentPerTest + '</td>' +
      '<td style="text-align:right"><b>₹' + x.reagentCost + '</b></td>' +
      '<td style="text-align:right;color:#666">' + pct + '%</td>' +
    '</tr>';
  });
  html += '<tr style="background:var(--n100);font-weight:700">' +
    '<td>Total</td><td style="text-align:right">' + d.totalTests + '</td><td></td>' +
    '<td style="text-align:right">₹' + totalSpent + '</td><td style="text-align:right">100%</td>' +
  '</tr>';
  html += '</tbody></table></div></div>';

  return html;
}

// ========== PRINT ==========
function printMaterialsReport() {
  let d = computeMaterialsData();
  if (!d) return alert('Date range daalo!');
  let today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  let labProfit = d.totalLabShare - d.totalReagent;
  let testList = Object.entries(d.byTest).sort((a, b) => b[1].reagentCost - a[1].reagentCost);

  let html = '<div class="rev-report">';
  html += '<div class="rr-header"><div class="rr-header-left"><div class="rr-logo">श्री</div><div><div class="rr-lab-name">Shree Balaji Clinical Laboratory</div><div class="rr-tagline">Materials & Reagent Cost Report</div></div></div>';
  html += '<div class="rr-header-right"><div class="rr-doc-type">MATERIALS REPORT</div><div class="rr-meta"><span>Period:</span> ' + d.from + ' — ' + d.to + '</div><div class="rr-meta"><span>Generated:</span> ' + today + '</div></div></div>';

  html += '<div class="rr-section"><h2>Summary</h2><div class="rr-metrics">';
  html += '<div class="rr-metric"><div class="rr-metric-label">Total Reagent Spent</div><div class="rr-metric-value">₹' + d.totalReagent + '</div></div>';
  html += '<div class="rr-metric"><div class="rr-metric-label">Lab Share Earned</div><div class="rr-metric-value">₹' + d.totalLabShare + '</div></div>';
  html += '<div class="rr-metric"><div class="rr-metric-label">Net Lab Profit</div><div class="rr-metric-value">₹' + labProfit + '</div></div>';
  html += '<div class="rr-metric"><div class="rr-metric-label">Profit Margin</div><div class="rr-metric-value">' + (d.totalLabShare > 0 ? Math.round(labProfit / d.totalLabShare * 100) : 0) + '%</div></div>';
  html += '<div class="rr-metric"><div class="rr-metric-label">Tests Done</div><div class="rr-metric-value">' + d.totalTests + '</div></div>';
  html += '<div class="rr-metric"><div class="rr-metric-label">Patients</div><div class="rr-metric-value">' + d.filtered.length + '</div></div>';
  html += '</div></div>';

  html += '<div class="rr-section"><h2>Per-Test Consumption</h2>';
  html += '<table class="rr-table"><thead><tr><th>#</th><th>Test</th><th class="rr-right">Count</th><th class="rr-right">Unit ₹</th><th class="rr-right">Total Reagent</th><th class="rr-right">Lab Share</th><th class="rr-right">Net Profit</th><th class="rr-right">Margin</th></tr></thead><tbody>';
  testList.forEach(([n, x], i) => {
    let profit = x.labShare - x.reagentCost;
    let margin = x.labShare > 0 ? Math.round(profit / x.labShare * 100) : 0;
    html += '<tr><td class="rr-center">' + (i + 1) + '</td><td><b>' + n + '</b></td><td class="rr-right">' + x.count + '</td><td class="rr-right">₹' + x.reagentPerTest + '</td><td class="rr-right">₹' + x.reagentCost + '</td><td class="rr-right">₹' + x.labShare + '</td><td class="rr-right">₹' + profit + '</td><td class="rr-right">' + margin + '%</td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="rr-footer">Shree Balaji Clinical Laboratory · Materials Report · ' + today + '</div></div>';

  document.getElementById('printArea').innerHTML = html;
  document.getElementById('printArea').style.display = 'block';
  let title = 'SBCL Materials Report - ' + d.from + (d.to !== d.from ? ' to ' + d.to : '');
  setTimeout(() => { printWithTitle(title); document.getElementById('printArea').style.display = 'none'; }, 200);
}
