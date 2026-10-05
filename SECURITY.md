# SBCL Hisab — Security Guide

## 🔴 The honest truth about this app's security

This is a **frontend-only PWA** hosted on GitHub Pages, backed by Supabase.
Any user with developer tools can:

1. Open DevTools → see the full source code
2. Read the Supabase URL + anon key (both are **public by design** in frontend apps)
3. **If Supabase RLS is "Allow all" (default setup), they can read/write/delete ALL
   patient data directly via Supabase REST API, bypassing this app entirely.**

The ONLY real line of defense is **Supabase Row Level Security (RLS)** +
**Supabase Auth**. Everything in the client (passwords, hashes, verification
numbers) is for deterring casual snooping, not for stopping a determined
developer.

---

## ✅ What this app already does (client-side hardening)

| Threat | Mitigation |
|---|---|
| Revenue password stored in plaintext | **SHA-256 hashed** before storage |
| Verification number in source code | **SHA-256 hash** in source, compared against hashed input |
| Password brute force in prompt | **Rate limit**: 5 attempts, then 5-min lockout |
| Password change brute force | **3 attempts**, then 1-min lockout |
| Revenue page stays unlocked forever | **15-minute auto-lock** after inactivity |
| Legacy plaintext passwords | **Auto-migrated** to hash on next successful entry |
| Weak passwords | **Minimum 4 characters** required |

### What a dev CAN still do (despite client hardening)

- `localStorage.setItem('hv2_entries', '[]')` → clear local cache (will re-sync from cloud)
- Modify JS at runtime via console → bypass client checks
- Hit the Supabase REST API directly with the anon key → read/write everything (unless RLS is set)

---

## 🚨 CRITICAL: Harden Supabase (one-time SQL run)

Open your Supabase project → SQL Editor → paste and run the full script below.
This locks down the backend so even someone with the anon key can't tamper
with data from outside the authenticated app.

### Option A — Shared-secret pattern (simpler, no login UI needed)

A single app-wide secret is required to read/write. Change it periodically
by re-running the policies with a new secret.

```sql
-- ============================================
-- SBCL HISAB — Backend Hardening (Option A)
-- Shared-secret in request header
-- ============================================

-- 1. Enable RLS on all tables
alter table rate_lists enable row level security;
alter table doctors    enable row level security;
alter table collectors enable row level security;
alter table entries    enable row level security;
alter table config     enable row level security;

-- 2. Drop the dangerous "Allow all" policies if they exist
drop policy if exists "Allow all" on rate_lists;
drop policy if exists "Allow all" on doctors;
drop policy if exists "Allow all" on collectors;
drop policy if exists "Allow all" on entries;
drop policy if exists "Allow all" on config;

-- 3. Create a function that checks for a secret header
-- CHANGE 'YOUR-SECRET-HERE' to a long random string (generate with:
--   openssl rand -hex 32  OR  pwgen -s 48 1 )
create or replace function app_secret_valid() returns boolean as $$
begin
  return current_setting('request.headers', true)::json->>'x-app-secret'
    = 'YOUR-SECRET-HERE';
end;
$$ language plpgsql stable;

-- 4. Policy: only requests with the correct secret can read/write
create policy "secret_read_rate_lists" on rate_lists for select using (app_secret_valid());
create policy "secret_write_rate_lists" on rate_lists for all using (app_secret_valid()) with check (app_secret_valid());

create policy "secret_read_doctors" on doctors for select using (app_secret_valid());
create policy "secret_write_doctors" on doctors for all using (app_secret_valid()) with check (app_secret_valid());

create policy "secret_read_collectors" on collectors for select using (app_secret_valid());
create policy "secret_write_collectors" on collectors for all using (app_secret_valid()) with check (app_secret_valid());

create policy "secret_read_entries" on entries for select using (app_secret_valid());
create policy "secret_write_entries" on entries for all using (app_secret_valid()) with check (app_secret_valid());

create policy "secret_read_config" on config for select using (app_secret_valid());
create policy "secret_write_config" on config for all using (app_secret_valid()) with check (app_secret_valid());
```

Then update `js/db.js` → `initSupabase()` to pass the secret as a header:

```js
sb = supabase.createClient(SB_URL, SB_ANON_KEY, {
  global: { headers: { 'x-app-secret': 'YOUR-SECRET-HERE' } }
});
```

**NOTE:** The secret still ends up in the frontend bundle. A determined dev
can read it from the JS. But it stops casual attacks via just the anon key.
For real security, use Option B.

---

### Option B — Supabase Auth (proper login, truly secure)

Require every user to log in with email/password. Only authenticated users
can access data.

```sql
-- 1. Enable RLS on all tables
alter table rate_lists enable row level security;
alter table doctors    enable row level security;
alter table collectors enable row level security;
alter table entries    enable row level security;
alter table config     enable row level security;

-- 2. Drop dangerous open policies
drop policy if exists "Allow all" on rate_lists;
drop policy if exists "Allow all" on doctors;
drop policy if exists "Allow all" on collectors;
drop policy if exists "Allow all" on entries;
drop policy if exists "Allow all" on config;

-- 3. Only authenticated users may read/write
create policy "auth_rate_lists" on rate_lists for all to authenticated using (true) with check (true);
create policy "auth_doctors"    on doctors    for all to authenticated using (true) with check (true);
create policy "auth_collectors" on collectors for all to authenticated using (true) with check (true);
create policy "auth_entries"    on entries    for all to authenticated using (true) with check (true);
create policy "auth_config"     on config     for all to authenticated using (true) with check (true);
```

Then in Supabase dashboard → Authentication → disable sign-up, manually
create users for Hemang + Priya + whoever. Update the app to show a login
screen before anything else, using `supabase.auth.signInWithPassword()`.

This is the **only truly secure option**. Even if someone extracts the anon
key, they can't do anything without valid credentials.

---

## 📋 Verifying your current Supabase security

Run this in Supabase SQL Editor to see what policies exist:

```sql
select tablename, policyname, cmd, qual from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

If you see policies with `qual = true` (unconditional allow), **your data
is wide open**. Switch to Option A or B immediately.

---

## 🔐 Changing the verification number

The verification number (currently SHA-256 of `9657581433`) is hashed and
hardcoded in `js/ui.js` as `REV_PW_MASTER_HASH`.

To change it:

```bash
echo -n "NEW_NUMBER_HERE" | sha256sum
```

Then update `REV_PW_MASTER_HASH` in `js/ui.js` to the new hash and push.
No one can derive the original number from the hash without brute-forcing
all possible numbers.

---

## 📝 What a software dev COULD still see even with full hardening

Even with Option B + all client hardening:
- They see UI structure and feature set (unavoidable for web apps)
- They see the Supabase project URL (unavoidable)
- They CANNOT read, write, modify, or delete any data without valid login credentials

For code privacy beyond this (hiding business logic), you'd need to move the
app off GitHub Pages into a closed environment, or build it as a desktop
app with Electron / Tauri. But that's a different project.
