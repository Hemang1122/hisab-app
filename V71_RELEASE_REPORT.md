# v71 RELEASE REPORT — Data Integrity & Sync Hardening

## 1. FILES CHANGED

| File | Purpose |
|------|---------|
| `js/db.js` | All sync safety fixes: sync lock, dirty tracking, config merge timestamps, retry improvements, deletion tracking, localStorage failure detection, online/offline awareness, visibility-based resync, comprehensive status states |
| `css/styles.css` | Added `.db-error` CSS class for error status indicator (orange theme) |
| `index.html` | Version bump from v=70 to v=71 across all CSS/JS includes |
| `tests/v71-sync-tests.js` | New test harness: 42 tests covering all 16 spec scenarios + bonus cases |

## 2. CRITICAL FIXES

### A. Protect edits during sync (dirty lifecycle)
- **`isSyncing` flag** — set at sync start, cleared in `finally` block
- **`dirtyEntryIds` Set** — `saveEntry_db()` adds entry ID when `isSyncing` is true
- **Merge reconciliation** — before `entries = merged`, all dirty entries are re-read from the live `entries` array and replace their stale merge counterparts
- **Lifecycle**: dirtyEntryIds created fresh at sync start → populated during sync by `saveEntry_db()` → consumed during merge → cleared in `finally`

### B. Single-flight sync with re-queue
- **`syncRequested` flag** — if `loadAllFromSupabase()` is called while `isSyncing`, sets flag and returns
- **Follow-up pass** — `finally` block checks `syncRequested` and calls `loadAllFromSupabase()` via `setTimeout(200ms)`
- **Lock release guaranteed** — `try/finally` ensures `isSyncing = false` on success, failure, or exception

### C. Safe config merging (doctors, rateLists, collectors)
- **`lastModified` timestamps** — `saveDoctor_db()`, `saveRateList_db()`, `saveCollector_db()` all stamp `lastModified = Date.now()`
- **Smart merge** — each config type uses Map-based merge with `lastModified` comparison (same pattern as entries)
- **Local-only preservation** — local objects not in cloud are pushed up; local-newer objects win over cloud

### D. Deterministic conflict handling
- **`localMod > sbMod`** → local wins (strictly newer)
- **`sbMod > localMod`** → cloud wins (strictly newer)
- **Equal timestamps or both zero** → local wins (safe default), stamped and pushed if both lack timestamps
- **No reliance on array order or timing**

### E. Dirty delete protection
- **`dirtyDeleteIds` Set** — `trackDeletedEntry()` adds to this set when `isSyncing`
- **Post-merge filter** — `merged = merged.filter(e => !dirtyDeleteIds.has(e.id))` prevents resurrection

## 3. MEDIUM-PRIORITY FIXES

### D. Recovery retry
- **`retryPendingOps()`** now reads fresh data from live arrays (`entries`, `doctors`, etc.) instead of using stale `op.data`
- Missing data (deleted record) causes op removal rather than stale data push

### E. Visibility-based resync
- `document.addEventListener('visibilitychange', ...)` triggers sync when tab becomes visible AND >60 seconds since last sync
- Guards: `dbReady && !isSyncing`

### F. Online/offline awareness
- `window.addEventListener('online', ...)` — triggers sync + toast
- `window.addEventListener('offline', ...)` — updates status + toast
- `saveEntry_db()` checks `navigator.onLine` — queues to `pendingOps` if offline

### G. Bounded pending operations
- `addPendingOp()` deduplicates by `table + id` — only latest op kept per record
- Retry uses fresh data from live arrays, not stale snapshots

### H. Improved deletion tracking
- **Timestamped entries** — `{ id, ts }` objects instead of plain strings
- **30-day age-based eviction** — entries deleted >30 days ago are evicted
- **5000 safety cap** — hard limit as final safety net
- **Backward compatible** — `isDeletedEntry()` handles both legacy string format and new `{id,ts}` format

### I. localStorage failure handling
- **`saveLocal()` returns boolean** — `false` if any `LS.set()` fails
- **`localSaveFailed` flag** — tracks persistent failure state
- **Toast warning** — "⚠️ Local storage error — changes may not be saved!"
- **Auto-recovery** — flag cleared when LS succeeds again

### User-visible sync status (7+ states)
| State | Display |
|-------|---------|
| Syncing | "Syncing..." (amber) |
| Online, no pending | "Online ✓" (green) |
| Online, pending ops | "Online ✓ (N pending)" (green) |
| Offline, no pending | "Offline — changes saved locally" (red) |
| Offline, pending ops | "Offline — N changes saved locally" (red) |
| Sync error + pending | "Sync error — N changes pending" (orange) |
| localStorage failure | "⚠️ Local storage error — changes may not be saved" (orange) |
| Last synced | "Online ✓ · Last synced X min ago" (green) |

## 4. COMPATIBILITY

### Database migration
**NOT REQUIRED.** No Supabase schema changes. All changes are client-side JavaScript only.

### Existing data preservation
- All existing localStorage keys unchanged (`hv2_` prefix preserved)
- Legacy `deletedEntryIds` (plain string format) handled via backward-compatible `isDeletedEntry()`
- Legacy records without `lastModified` handled deterministically (local wins, then stamped)
- No data reset or clearing performed

## 5. TESTING REPORT

### Test harness: `tests/v71-sync-tests.js`
**42 tests, 42 passed, 0 failed**

| # | Scenario | Tests | Result |
|---|----------|-------|--------|
| 1 | Create entry online, verify persistence | 4 | ✅ |
| 2 | Edit during sync (dirty entry protection) | 2 | ✅ |
| 3 | Payment update during sync | 2 | ✅ |
| 4 | Delete during sync | 3 | ✅ |
| 5 | Create new entry during sync | 2 | ✅ |
| 6 | Concurrent sync requests | 1 | ✅ |
| 7 | Offline config changes preserved | 3 | ✅ |
| 8 | Failed cloud save → pending op retry | 2 | ✅ |
| 9 | Failed delete, entry not resurrected | 2 | ✅ |
| 10 | Reload with pending operations | 2 | ✅ |
| 11 | localStorage quota failure | 3 | ✅ |
| 12 | Recovery push with partial failures | 2 | ✅ |
| 13 | Visibility-based resync | 2 | ✅ |
| 14 | Legacy records (missing lastModified) | 4 | ✅ |
| 15 | Unrelated entries unchanged | 2 | ✅ |
| 16 | No duplicates or infinite loops | 3 | ✅ |
| Bonus | pendingOps deduplication | 1 | ✅ |
| Bonus | 30-day deletion eviction | 2 | ✅ |

### Untested scenarios (require live browser + Supabase)
- Real network latency causing mid-flight edits (tested via mechanism simulation)
- Multi-device simultaneous edits (logic tested, transport not)
- Actual localStorage quota exhaustion (mocked)
- `pushLocalToCloud()` and `fullResyncToCloud()` recovery flows (unchanged from v70, not retested)

## 6. REMAINING RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| `navigator.onLine` is only a hint | LOW | Actual Supabase request success/failure is the definitive result; `lastSyncError` tracks real failures |
| Full table download on every sync | LOW (perf) | Acceptable for small lab; long-term fix requires server-side `updated_at` column |
| `pushLocalToCloud()`/`fullResyncToCloud()` still bypass `sbSave` queuing | LOW | These are manual recovery tools with user confirmation; partial failures are reported via alert |
| setTimeout(200ms) for follow-up sync could theoretically stack | VERY LOW | `isSyncing` flag prevents re-entry; only one follow-up queued at a time |

## 7. RELEASE RECOMMENDATION

**✅ v71 is SAFE TO DEPLOY.**

All critical and medium-priority fixes from the spec are implemented. The acceptance criterion is met:

> *A synchronization operation must never silently overwrite a newer local mutation, resurrect a locally deleted record, or discard an unsynchronized configuration change merely because a cloud request started earlier.*

- Newer local mutations are protected by `dirtyEntryIds` + `lastModified` comparison
- Locally deleted records are protected by `dirtyDeleteIds` + `deletedEntryIds` with backward-compatible format
- Configuration changes are protected by `lastModified` timestamps on doctors, rateLists, and collectors
- All 42 automated tests pass
