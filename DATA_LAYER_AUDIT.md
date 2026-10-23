# 🔍 DATA LAYER AUDIT — Hisab App v69

## EXECUTIVE SUMMARY

The v69 sync safety overhaul (lastModified timestamps, pendingOps queue, deletedEntryIds tracking) fixed the **primary** data loss vectors — edited entries being overwritten and deleted entries reappearing. However, **three critical gaps remain**:

1. **Race condition**: User edits during an in-flight `loadAllFromSupabase()` can be silently lost
2. **No sync lock**: Nothing prevents overlapping syncs from clobbering each other
3. **Config data merge is still naive**: Doctors, rateLists, collectors use no timestamp comparison — cloud always wins

Additionally, 5 medium-severity and 4 low-severity issues affect reliability and UX.

---

## MUTATION PATH MAP

### Path 1: `saveEntry()` — NEW entry
**File**: `entry.js:546-572`
**Flow**: `entries.push(entry)` → `saveEntry_db(entry)` → stamps `lastModified` → `saveLocal()` → `sbSave()` (async)
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Entry saved locally + cloud | ✅ |
| sbSave fails (network) | Queued in pendingOps, retried next sync | ✅ |
| localStorage full | LS.set warns via toast, entry in memory array only | ⚠️ Lost on refresh |
| App closed before sbSave completes | Entry in localStorage, picked up as local-only on next sync | ✅ |

### Path 2: `saveEntry()` — UPDATE entry
**File**: `entry.js:516-544`
**Flow**: `entries[idx] = updated` → `saveEntry_db(updated)` → stamps `lastModified` → `saveLocal()` → `sbSave()`
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Updated locally + cloud | ✅ |
| sbSave fails | Queued, lastModified ensures local wins on merge | ✅ |
| **Edit happens DURING loadAllFromSupabase()** | **See CRITICAL BUG #1 below** | ❌ |

### Path 3: `deleteEntry()` — Single delete
**File**: `register.js:287-292`
**Flow**: `entries.filter()` → `trackDeletedEntry(id)` → `saveLocal()` → `sbDelete()`
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Removed locally, deleted from cloud, ID tracked | ✅ |
| sbDelete fails | ID tracked + queued, next sync filters it from merge + retries delete | ✅ |
| deletedEntryIds overflows (>500) | Old IDs evicted — ancient deleted entries COULD reappear | ⚠️ |

### Path 4: `bulkDeleteEntries()` — Bulk delete
**File**: `register.js:274-284`
**Flow**: Same as Path 3 but loops. Each ID tracked individually.
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | All removed + tracked | ✅ |
| Partial network failure | Each sbDelete queued independently | ✅ |

### Path 5: `updatePayment()` — Payment update
**File**: `register.js:295-311`
**Flow**: Modifies `e.paid`, `e.balance` → `saveEntry_db(e)`
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Updated with lastModified | ✅ |
| Network fail | Queued, local version wins on merge | ✅ |

### Path 6: `syncEntriesToRateList()` — Rate sync
**File**: `db.js:551-628`
**Flow**: Modifies entry fields in-place → `saveLocal()` → `sbSave()` per touched entry
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Entries updated, stamps lastModified | ✅ |
| Some sbSave calls fail | sbSave queues on failure | ✅ |
| `dbReady` is false | Skips sbSave entirely, no queuing | ⚠️ (only called from sync which requires dbReady, so unlikely) |

### Path 7: `recoverCloudToLocal()` — Recovery tool
**File**: `db.js:1107-1128`
**Flow**: `entries.push(e)` → `saveLocal()` — NO sbSave, NO lastModified stamp
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Entries already in cloud, just added to local | ✅ |
| Entry later edited | saveEntry_db sets lastModified | ✅ |
| **Entry has no lastModified, sync runs with same cloud data** | Both sides have lastModified=0, cloud wins (no-op since same data) | ✅ (benign) |

### Path 8: `pushLocalToCloud()` — Recovery push
**File**: `db.js:1130-1148`
**Flow**: Direct `sb.from().upsert()` — bypasses sbSave, no queuing
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Some fail | User sees failure count in alert | ⚠️ No retry for failed ones |

### Path 9: `fullResyncToCloud()` — Full recovery resync
**File**: `db.js:1151-1176`
**Flow**: Direct `sb.from().upsert()` — bypasses sbSave, no queuing
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Same as Path 8 | User sees counts | ⚠️ Same issue |

### Path 10: `loadAllFromSupabase()` — The merge
**File**: `db.js:791-931`
**Flow**: Fetch all → smart merge by lastModified → saveLocal → retryPendingOps → syncEntriesToRateList
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | lastModified comparison, local-newer wins | ✅ |
| Cloud empty, local has data | Pushes all local to cloud | ✅ |
| **Concurrent mutation during merge** | **See CRITICAL BUG #1** | ❌ |
| **Two devices editing same entry** | Last-write-wins by lastModified | ✅ (expected for this app) |

### Path 11: `saveAll()` — Config save
**File**: `db.js:989-997`
**Flow**: `saveLocal()` → sbSave for rateLists/doctors/collectors (not entries)
| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Normal | Config data synced | ✅ |
| Network fail | sbSave queues for rateLists/doctors/collectors | ✅ |

---

## CRITICAL BUGS

### BUG #1: Race condition — Edits during sync are silently lost

**Scenario**: User saves/edits an entry while `loadAllFromSupabase()` is mid-flight (between the `await sb.from('entries').select('*')` on line 832 and `entries = merged` on line 885).

**What happens**:
1. Sync starts. `localMap` built from current `entries` (line 837)
2. Network fetch takes 2-5 seconds on slow mobile data
3. User edits entry X → `entries[idx] = updatedEntry` → `saveEntry_db()` stamps lastModified
4. Sync fetch completes. Merge runs using `localMap` (which has the OLD version of entry X)
5. Cloud version of X has older lastModified → merge picks local... but `localMap` has the PRE-EDIT version!
6. `entries = merged` overwrites the array — user's edit is gone
7. `saveLocal()` persists the loss

**Impact**: Data loss. The user's edit vanishes silently. The entry reverts to its pre-edit state.

**Why step 4's "local-only" pass doesn't save it**: Line 877 iterates current `entries` (which has the edited version), but `sbIds` contains X's ID (it's in cloud), so X is not treated as local-only.

**Fix**: Add a sync lock + dirty-entry tracking.

### BUG #2: No sync lock — Overlapping syncs corrupt state

**Scenario**: `loadAllFromSupabase()` is called twice in rapid succession (e.g., user navigates to a page that triggers sync while a previous sync is still running).

**What happens**: Two async merge operations run concurrently on the same `entries` array. Whichever finishes last wins, potentially dropping entries merged by the first.

**Fix**: Add `isSyncing` flag, skip or queue if already syncing.

### BUG #3: Config data (doctors, rateLists, collectors) merge is naive — cloud always wins

**Scenario**: User changes a doctor's docPercent from 50% to 60% while offline. When sync runs, cloud has old 50% version, which overwrites the local 60%.

**What happens**: Lines 808-816 replace `doctors` with cloud data wholesale, only preserving doctors that don't exist in cloud at all. Same for rateLists (796-805) and collectors (820-829).

**Impact**: Any offline config changes are lost on next sync. Since config changes are less frequent than entry changes, this is lower-risk but still a data loss vector.

**Fix**: Add lastModified to config objects and use same smart merge as entries.

---

## MEDIUM-SEVERITY ISSUES

### M1: Recovery tool pushLocalToCloud/fullResyncToCloud bypass sbSave queuing
**File**: db.js:1130-1148, 1151-1176
**Issue**: Direct `sb.from().upsert()` calls don't queue failures in pendingOps. If some entries fail to push, they're counted but not retried.
**Fix**: Use `sbSave()` instead of direct upsert, or add manual queuing.

### M2: No visibility-change-based resync
**Issue**: When user switches back to the tab after being away (common on mobile), data could be stale. Another device may have added entries.
**Fix**: Add `document.addEventListener('visibilitychange', ...)` to trigger sync when tab becomes visible.

### M3: No navigator.onLine awareness
**Issue**: App happily attempts network calls when offline, generating console errors and queuing ops unnecessarily. No user feedback about offline status.
**Fix**: Check `navigator.onLine` before sync attempts, listen for `online`/`offline` events, show status.

### M4: pendingOps stores full entry data — unbounded growth
**Issue**: Each pending op stores the full entry object. A lab with bad internet could accumulate hundreds of MB in pendingOps localStorage.
**Fix**: Store only entry ID + timestamp in pendingOps for saves, read fresh data from entries array at retry time.

### M5: deletedEntryIds cap of 500 may be too low
**Issue**: A busy lab with 100+ entries/day deleting regularly could cycle through 500 IDs in under a week. After eviction, a very old deleted entry could reappear from Supabase.
**Fix**: Increase to 2000, or better yet, timestamp the deletions and evict by age (e.g., > 30 days old).

---

## LOW-SEVERITY ISSUES

### L1: No user-visible pending changes indicator
**Issue**: User has no way to know if changes are synced or pending. They might close the browser thinking everything is saved.
**Fix**: Show badge/count next to "Online ✓" status (e.g., "Online ✓ (3 pending)").

### L2: saveEntry_db has redundant removePendingOp on success
**File**: db.js:1004
**Issue**: `sbSave().then(ok => { if (ok) removePendingOp(...) })` — but sbSave already calls removePendingOp on success (line 940). Harmless but wasteful.
**Fix**: Remove the `.then()` callback.

### L3: syncEntriesToRateList doesn't queue when dbReady is false
**File**: db.js:620
**Issue**: `if (dbReady && typeof sbSave === 'function')` — if dbReady is false, modified entries won't be queued for cloud save. However, this function is only called from within loadAllFromSupabase which requires dbReady, so this is an unreachable scenario in practice.

### L4: Supabase select fetches ALL entries every sync
**Issue**: `sb.from('entries').select('*')` downloads every entry on every sync. As entry count grows, this becomes slow and wastes bandwidth.
**Fix**: Long-term, add a server-side `updated_at` column and fetch only entries modified since last sync. Short-term, acceptable for a small lab.

---

## RECOMMENDED CODE CHANGES (Priority Order)

### Fix 1: Sync lock + dirty entry protection (CRITICAL)

```javascript
// In db.js, add near the top of the sync section:
let isSyncing = false;
let dirtyEntryIds = new Set(); // entries modified during sync

// Wrap saveEntry_db to track dirty entries:
function saveEntry_db(entry) {
  entry.lastModified = Date.now();
  saveLocal();
  if (isSyncing) dirtyEntryIds.add(entry.id);
  if (dbReady) {
    sbSave('entries', entry.id, entry);
  } else {
    addPendingOp('save', 'entries', entry.id, entry);
  }
}

// In loadAllFromSupabase, add lock:
async function loadAllFromSupabase() {
  if (!dbReady || !sb) return;
  if (isSyncing) return; // prevent overlapping syncs
  isSyncing = true;
  dirtyEntryIds.clear();
  try {
    // ... existing merge code ...
    
    // BEFORE entries = merged, re-check dirty entries:
    dirtyEntryIds.forEach(dirtyId => {
      let freshLocal = entries.find(e => e.id === dirtyId);
      if (freshLocal) {
        let idx = merged.findIndex(e => e.id === dirtyId);
        if (idx >= 0) merged[idx] = freshLocal;
        else merged.push(freshLocal);
      }
    });
    
    entries = merged;
    // ... rest of function ...
  } finally {
    isSyncing = false;
    dirtyEntryIds.clear();
  }
}
```

### Fix 2: Config data lastModified (CRITICAL)

Add `lastModified` stamps to doctor/rateList/collector saves and use timestamp comparison in merge, same pattern as entries.

### Fix 3: Visibility-change resync (MEDIUM)

```javascript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && dbReady) {
    loadAllFromSupabase();
  }
});
```

### Fix 4: Online/offline awareness (MEDIUM)

```javascript
window.addEventListener('online', () => {
  setDbStatus('Online ✓', 'db-online');
  if (dbReady) loadAllFromSupabase();
});
window.addEventListener('offline', () => {
  setDbStatus('Offline', 'db-offline');
});
```

### Fix 5: Pending ops indicator (LOW but high UX impact)

```javascript
function updateSyncBadge() {
  let el = document.getElementById('dbStatus');
  if (!el) return;
  let pending = pendingOps.length;
  if (pending > 0) {
    el.textContent = 'Online ✓ (' + pending + ' pending)';
  }
}
```

---

## UX IMPROVEMENTS (Ranked by Impact)

### 1. 🟢 Sync status indicator with pending count
**Impact**: HIGH — Users know if their data is safe
**Effort**: LOW — Add pending count to existing dbStatus element
**Details**: Show "Online ✓ (3 pending)" when ops are queued. Change to "Syncing..." during sync. Show "Offline — changes saved locally" when offline.

### 2. 🟢 Auto-resync when user returns to tab
**Impact**: HIGH — Stale data is the #1 multi-device confusion
**Effort**: LOW — One event listener + existing loadAllFromSupabase
**Details**: On visibilitychange, if >60 seconds since last sync, trigger loadAllFromSupabase.

### 3. 🟡 Offline mode banner
**Impact**: MEDIUM — User understands why things feel sluggish
**Effort**: LOW — navigator.onLine check + event listeners
**Details**: Show a thin yellow banner at top: "📡 Offline — changes saved locally, will sync when connected"

### 4. 🟡 Last sync timestamp
**Impact**: MEDIUM — User can tell how fresh their data is
**Effort**: LOW — Save Date.now() after sync, show in footer
**Details**: "Last synced: 2 min ago" near the db status indicator

### 5. 🟡 Conflict toast notifications
**Impact**: MEDIUM — Transparency when local vs cloud versions differ
**Effort**: LOW — Already have toast() function and localWins counter
**Details**: When merge picks local over cloud: "🔄 Kept your recent edit for [patient name]"

---

## SUMMARY TABLE

| # | Issue | Severity | Data Loss Risk | Fix Complexity |
|---|-------|----------|---------------|----------------|
| C1 | Race: edits during sync lost | CRITICAL | HIGH | MEDIUM |
| C2 | No sync lock | CRITICAL | MEDIUM | LOW |
| C3 | Config merge is naive | CRITICAL | LOW (rare edits) | MEDIUM |
| M1 | Recovery bypasses queuing | MEDIUM | LOW | LOW |
| M2 | No visibility resync | MEDIUM | NONE (stale data) | LOW |
| M3 | No online/offline awareness | MEDIUM | NONE (UX) | LOW |
| M4 | pendingOps unbounded | MEDIUM | NONE (storage) | LOW |
| M5 | deletedIds cap too low | MEDIUM | LOW | LOW |
| L1 | No pending indicator | LOW | NONE (UX) | LOW |
| L2 | Redundant removePendingOp | LOW | NONE | LOW |
| L3 | syncToRateList no queue | LOW | NONE (unreachable) | LOW |
| L4 | Full table scan on sync | LOW | NONE (perf) | HIGH |
