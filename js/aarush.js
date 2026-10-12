// ========== AARUSH HOSPITAL — CUSTOM RATE & SPLIT ENTRY ==========
// All changes isolated to Aarush Hospital entries only.
// Master rate list is NEVER modified — overrides stored on entry test objects.

function isAarushDoctor(docId) {
  if (!docId || docId === '__self__') return false;
  let doc = doctors.find(d => d.id === docId);
  if (!doc) return false;
  return doc.name.toLowerCase().includes('aarush');
}

function isAarushMode() {
  let docVal = document.getElementById('eDoctor').value;
  return isAarushDoctor(docVal);
}

// ── Show/hide Aarush mode banner + custom total input ──
function updateAarushUI() {
  let aarush = isAarushMode();
  let banner = document.getElementById('aarushBanner');
  let customTotalWrap = document.getElementById('aarushCustomTotalWrap');
  if (banner) banner.style.display = aarush ? 'block' : 'none';
  if (customTotalWrap) customTotalWrap.style.display = aarush ? 'block' : 'none';
  // Toggle editable fields visibility on test rows
  document.querySelectorAll('.aarush-edit').forEach(el => {
    el.style.display = aarush ? '' : 'none';
  });
  document.querySelectorAll('.trate-default').forEach(el => {
    el.style.display = aarush ? 'none' : '';
  });
}

// ── Load test checkboxes with Aarush editable fields ──
// Called AFTER the normal loadTestCheckboxes — augments the rows
function augmentTestRowsForAarush() {
  if (!isAarushMode()) return;
  let rl = getMasterRL();
  if (!rl) return;
  let container = document.getElementById('testCheckboxes');
  let docPercent = parseInt(container.dataset.docPercent) || 50;

  document.querySelectorAll('.test-row').forEach(row => {
    // Skip if already augmented
    if (row.querySelector('.aarush-edit')) return;
    let cb = row.querySelector('.test-cb');
    if (!cb) return;
    let idx = parseInt(cb.dataset.idx);
    let t = rl.tests[idx];
    if (!t) return;

    let shares = calcShares(t.rate, docPercent, t);

    // Hide the default rate display
    let rateSpan = row.querySelector('.trate');
    if (rateSpan) {
      rateSpan.classList.add('trate-default');
      rateSpan.style.display = 'none';
    }

    // Add editable fields
    let editDiv = document.createElement('div');
    editDiv.className = 'aarush-edit';
    editDiv.style.cssText = 'display:flex;gap:3px;align-items:center;margin-left:auto;font-size:11px';
    editDiv.innerHTML =
      '<input type="number" class="aarush-rate" data-idx="' + idx + '" value="' + (t.rate || 0) + '" ' +
        'style="width:55px;padding:2px 4px;border:1px solid #26a69a;border-radius:4px;font-size:11px;text-align:right;background:#e0f2f1" ' +
        'title="Custom Rate" placeholder="Rate" oninput="aarushFieldChanged(' + idx + ')" onclick="event.stopPropagation()">' +
      '<span style="color:#888;font-size:9px">L:</span>' +
      '<input type="number" class="aarush-lab" data-idx="' + idx + '" value="' + shares.labShare + '" ' +
        'style="width:45px;padding:2px 3px;border:1px solid #66bb6a;border-radius:4px;font-size:11px;text-align:right;background:#e8f5e9" ' +
        'title="Lab Share" placeholder="Lab" oninput="aarushSplitChanged(' + idx + ',\'lab\')" onclick="event.stopPropagation()">' +
      '<span style="color:#888;font-size:9px">D:</span>' +
      '<input type="number" class="aarush-doc" data-idx="' + idx + '" value="' + shares.docShare + '" ' +
        'style="width:45px;padding:2px 3px;border:1px solid #ef5350;border-radius:4px;font-size:11px;text-align:right;background:#ffebee" ' +
        'title="Doc Share" placeholder="Doc" oninput="aarushSplitChanged(' + idx + ',\'doc\')" onclick="event.stopPropagation()">';
    row.appendChild(editDiv);
  });
}

// ── When Aarush rate field changes → recalculate lab/doc split proportionally ──
function aarushFieldChanged(idx) {
  let rateInput = document.querySelector('.aarush-rate[data-idx="' + idx + '"]');
  let labInput = document.querySelector('.aarush-lab[data-idx="' + idx + '"]');
  let docInput = document.querySelector('.aarush-doc[data-idx="' + idx + '"]');
  if (!rateInput || !labInput || !docInput) return;

  let newRate = parseFloat(rateInput.value) || 0;
  let rl = getMasterRL();
  let container = document.getElementById('testCheckboxes');
  let docPercent = parseInt(container.dataset.docPercent) || 50;
  let t = rl && rl.tests[idx] ? rl.tests[idx] : null;

  // Recalculate split based on the doctor's percentage
  let shares = calcShares(newRate, docPercent, t ? { ...t, rate: newRate, customDocShare: null, customLabShare: null } : { rate: newRate });
  // Actually for Aarush, use percentage-based calc always (ignore custom shares from master)
  let docShare = Math.round(newRate * docPercent / 100);
  let labShare = newRate - docShare;
  labInput.value = labShare;
  docInput.value = docShare;
  calcEntry();
}

// ── When Aarush split field changes → auto-calc the other share ──
function aarushSplitChanged(idx, which) {
  let rateInput = document.querySelector('.aarush-rate[data-idx="' + idx + '"]');
  let labInput = document.querySelector('.aarush-lab[data-idx="' + idx + '"]');
  let docInput = document.querySelector('.aarush-doc[data-idx="' + idx + '"]');
  if (!rateInput || !labInput || !docInput) return;

  let rate = parseFloat(rateInput.value) || 0;
  if (which === 'lab') {
    let lab = parseFloat(labInput.value) || 0;
    docInput.value = Math.max(0, rate - lab);
  } else {
    let doc = parseFloat(docInput.value) || 0;
    labInput.value = Math.max(0, rate - doc);
  }
  calcEntry();
}

// ── Custom Total Override — scales all test rates proportionally ──
function aarushApplyCustomTotal() {
  let customTotal = parseFloat(document.getElementById('aarushCustomTotal').value) || 0;
  if (customTotal <= 0) return;

  // Get currently checked tests and their current Aarush rates
  let rl = getMasterRL();
  if (!rl) return;
  let container = document.getElementById('testCheckboxes');
  let docPercent = parseInt(container.dataset.docPercent) || 50;

  let checkedTests = [];
  document.querySelectorAll('.test-cb:checked').forEach(cb => {
    let idx = parseInt(cb.dataset.idx);
    let rateInput = document.querySelector('.aarush-rate[data-idx="' + idx + '"]');
    if (rateInput) {
      checkedTests.push({ idx, currentRate: parseFloat(rateInput.value) || 0 });
    }
  });

  if (!checkedTests.length) return alert('Pehle tests select karo!');
  let currentSubtotal = checkedTests.reduce((s, t) => s + t.currentRate, 0);
  if (currentSubtotal <= 0) return;

  // Scale each test rate proportionally
  let scale = customTotal / currentSubtotal;
  checkedTests.forEach(t => {
    let newRate = Math.round(t.currentRate * scale);
    let rateInput = document.querySelector('.aarush-rate[data-idx="' + t.idx + '"]');
    if (rateInput) {
      rateInput.value = newRate;
      aarushFieldChanged(t.idx);
    }
  });
  calcEntry();
  if (typeof toast === 'function') toast('✅ Rates adjusted to ₹' + customTotal + ' total');
}

// ── Get selected tests with Aarush overrides ──
function getSelectedTestsAarush() {
  let rl = getMasterRL();
  if (!rl) return [];
  let selected = [];
  document.querySelectorAll('.test-cb:checked').forEach(cb => {
    let idx = parseInt(cb.dataset.idx);
    if (!rl.tests[idx]) return;
    let t = rl.tests[idx];

    let rateInput = document.querySelector('.aarush-rate[data-idx="' + idx + '"]');
    let labInput = document.querySelector('.aarush-lab[data-idx="' + idx + '"]');
    let docInput = document.querySelector('.aarush-doc[data-idx="' + idx + '"]');

    // The custom rate is ONLY the basis for the Dr/Lab split.
    // The amount charged (rate) always stays the original master rate.
    let splitBase = rateInput ? (parseFloat(rateInput.value) || 0) : t.rate;
    let labShare = labInput ? (parseFloat(labInput.value) || 0) : 0;
    let docShare = docInput ? (parseFloat(docInput.value) || 0) : 0;

    selected.push({
      name: t.name, rate: t.rate, splitBase: splitBase, type: t.type,
      labShare: labShare, docShare: docShare,
      reagentCost: t.reagentCost || 0,
      aarushOverride: true  // flag so we know this was an Aarush custom entry
    });
  });
  return selected;
}

// ── Restore Aarush overrides when editing an existing Aarush entry ──
function restoreAarushOverrides(entryTests) {
  if (!isAarushMode()) return;
  let rl = getMasterRL();
  if (!rl) return;

  // Map entry test names to their saved overrides
  let overrideMap = {};
  entryTests.forEach(t => {
    overrideMap[t.name.toLowerCase()] = t;
  });

  // Apply saved values to the Aarush edit fields
  document.querySelectorAll('.test-cb:checked').forEach(cb => {
    let idx = parseInt(cb.dataset.idx);
    let t = rl.tests[idx];
    if (!t) return;
    let saved = overrideMap[t.name.toLowerCase()];
    if (!saved) return;

    let rateInput = document.querySelector('.aarush-rate[data-idx="' + idx + '"]');
    let labInput = document.querySelector('.aarush-lab[data-idx="' + idx + '"]');
    let docInput = document.querySelector('.aarush-doc[data-idx="' + idx + '"]');

    let base = saved.splitBase != null ? saved.splitBase : saved.rate;
    if (rateInput && base != null) rateInput.value = base;
    if (labInput && saved.labShare != null) labInput.value = saved.labShare;
    if (docInput && saved.docShare != null) docInput.value = saved.docShare;
  });
}
