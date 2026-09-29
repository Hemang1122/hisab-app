# Hisab - Shree Balaji Clinical Lab

Billing & Account Management System for diagnostic labs. Tracks patient entries, doctor/lab commission splits, generates hisab (account statements) for doctors, and manages rate lists.

## Features
- **Rate Lists** — Create named rate lists with tests, rates, and lab/doctor commission splits
- **Doctor Management** — Assign rate lists to doctors/clinics
- **Fast Entry** — Tab/Enter keyboard flow for quick patient data entry
- **Live Sidebar** — See all entries for selected date while entering
- **Hisab Print** — Generate & print account statements for doctors (English format)
- **Revenue Dashboard** — Password-protected analytics page
- **Supabase Cloud DB** — All data syncs to Supabase (works offline with local backup)
- **Backup/Restore** — JSON export/import as safety net

## Setup

### 1. Deploy
You can deploy this as a static site (it's a single `index.html` file):
- **Netlify**: Drag & drop the folder at [app.netlify.com/drop](https://app.netlify.com/drop)
- **GitHub Pages**: Push to repo → Settings → Pages → Deploy from main branch
- **Local**: Just open `index.html` in your browser

### 2. Connect Supabase (for cloud database)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **"New Project"** → Name it (e.g., `hisab-app`) → Set a database password → Choose region (South Asia/Mumbai for India) → Create
3. Wait for the project to finish setting up (~2 minutes)
4. Go to **SQL Editor** (left sidebar) → Click **"New Query"**
5. Open Hisab app → **Settings tab** → Click **"Setup Supabase"** → **Copy the SQL** shown in the modal
6. Paste the SQL into Supabase SQL Editor → Click **"Run"**
7. In Supabase, go to **Settings → API** → Copy your **Project URL** and **anon public key**
8. Back in the Hisab app modal, paste the **Project URL** and **anon key** → Click **Connect**

That's it! Your data now syncs to the cloud.

## Default Password
Revenue page password: `ANITA@1234` (changeable in Settings)

## Keyboard Shortcuts (Entry Form)
- **Enter** on any field → jumps to next field
- **Enter** on last field → auto-saves the entry
- Flow: Doctor → Name → Age → Gender → Discount → Payment → Mode → Save
