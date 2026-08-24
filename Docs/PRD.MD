# 📱 Irkop Apps & Panel System — Product Requirements Document

> **Versi**:2.0
> **Updated**: 2026-08-24
> **Status**: ✅ Panel Production Live | ⏳ Flutter Planned

---

## 1. Product Overview

### 1.1 Nama Produk
**Irkop Apps & Panel System** — ekosistem aplikasi Android yang dikelola melalui satu web admin panel terpusat.

### 1.2 Tagline
> Satu panel untuk semua app. Monetisasi via AdMob, dikelola tanpa PC.

### 1.3 Deskripsi
Irkop adalah ekosistem aplikasi Android yang dikembangkan secara **mobile-first** (Android + Termux, tanpa PC). Setiap app dipublikasikan ke Google Play Store, monetisasi via Google AdMob, dan dikendalikan sepenuhnya dari web admin panel yang di-deploy di Cloudflare Pages dengan database Supabase.

### 1.4 Domain
- Web Panel: `https://panel.irkop.eu.org`
- Brand: `irkop.eu.org`

---

## 2. Goals & Objectives

### 2.1 Goals Utama
1. Membangun ekosistem multiple app Android yang dikelola dari satu panel
2. Memungkinkan monetisasi via AdMob dengan kontrol granular (3 level)
3. Memungkinkan development tanpa PC (mobile-only)
4. Publish ke Google Play Store via GitHub Actions (compile AAB tanpa PC)

### 2.2 Non-Goals (Out of Scope)
- Tidak mendukung iOS
- Tidak mendukung web app Flutter
- Tidak menyediakan backend custom (hanya Supabase)
- Tidak mengelola user-facing authentication (app pakai device_id)

---

## 3. Target Users

### 3.1 End User (App User)
- Pengguna Android yang download app dari Play Store
- Tidak perlu login (identifikasi via device_id)
- Dapat switch tema (Dark/Light/Auto)

### 3.2 Admin (Panel User)
| Role | Hak Akses |
|---|---|
| `super_admin` | Full akses + kelola admin lain |
| `admin` | Kelola apps & ads, tidak bisa kelola admin |
| `viewer` | Read-only (planned) |

---

## 4. Features

### 4.1 Web Admin Panel (v2.0 — LIVE)

#### 4.1.1 Authentication & Authorization
- Login via email/password (Supabase Auth)
- 3 role: super_admin, admin, viewer
- Auto-update `last_login_at` saat login
- Protected routes — redirect ke /login kalau belum auth
- Akun non-aktif tidak bisa login

#### 4.1.2 Dashboard
- Statistik real-time dari view `v_dashboard_stats`:
  - Total Apps, Total Users, Active Users 24h
  - Ads Global status (ON/OFF)
  - Active Slots count
  - Revenue/Impressions/Clicks Today
  - Apps in Maintenance count

#### 4.1.3 Apps Management
- List apps dengan search (name / package_name)
- **Create app**: modal form + auto-create 3 default slots via RPC `add_app_with_slots()`
- **Edit app**: nama, deskripsi, package_name (with warning), status, maintenance, cache_ttl, config_version
- **Delete app**: konfirmasi ketik package_name → cascade delete semua data terkait

#### 4.1.4 App Detail Page
- Header: nama, package_name, deskripsi + status badges
- Maintenance per-app toggle (Level 2)
- Users & Metrics section (dari view `v_app_metrics`)
- App Users table (DataTable dengan 5 columns)
- Ads Config section (3 slots, edit ad_unit_id + toggle)

#### 4.1.5 Ads Configuration (3 Level Control)
| Level | Lokasi | Field | Dampak |
|---|---|---|---|
| 1 — Global | Settings | `global_config.ads_enabled` | SEMUA app |
| 2 — Per App | AppDetail | `apps.ads_enabled` | App tertentu |
| 3 — Per Slot | AdsConfig | `ads_slots.is_enabled` | Slot tertentu |

Logika Flutter: `global && app && slot` semua ON → iklan tampil

#### 4.1.6 Maintenance Mode (2 Level)
| Level | Lokasi | Field | Dampak |
|---|---|---|---|
| 1 — Global | Settings | `global_config.maintenance_mode` | SEMUA app |
| 2 — Per App | AppDetail | `apps.maintenance_mode` | App tertentu |

Logika Flutter: `global OR app` → tampilkan MaintenanceScreen

#### 4.1.7 Audit Logs
- Halaman `/audit-logs` di sidebar
- Auto-captured via PostgreSQL triggers di 4 tabel: apps, ads_slots, global_config, admin_users
- Filter by table
- Show: timestamp, admin_email, action, target_table, target_id, changes summary
- Max 200 entri terbaru

#### 4.1.8 Settings
- Global Ads toggle (Level 1) — emergency switch
- Global Maintenance toggle (Level 1) — with info box
- Theme switch (Dark/Light/Auto) — sync via localStorage
- Account info (email, role, status)

### 4.2 Flutter App Template (PLANNED — Fase 3)

#### 4.2.1 Initialization
- Init Supabase client (URL + anon key)
- Init AdMob (test IDs saat dev, production IDs dari Supabase)
- Register device_id ke `app_users` (kalau belum ada)
- Update `last_active_at` setiap app dibuka

#### 4.2.2 Remote Config (Fetch from Supabase)
- Baca `global_config` (ads_enabled, maintenance_mode, min_app_version)
- Baca `apps` row untuk package_name sendiri
- Baca `ads_slots` (3 slot + ad_unit_id + is_enabled)
- Cache lokal (shared_preferences) dengan TTL dari `config_cache_ttl`

#### 4.2.3 Maintenance Check
- Saat app start: cek `global.maintenance_mode || app.maintenance_mode`
- True → MaintenanceScreen (full screen, tidak bisa di-bypass)
- False → lanjut ke HomeScreen

#### 4.2.4 Ads Display
- **Banner**: load saat home render, display di bottom
- **Interstitial**: trigger saat event tertentu (exit app, selesai level)
- **Rewarded**: trigger saat user minta reward
- Ad Unit ID dari Supabase (tidak hardcode)
- 3 level cek: global → app → slot. Semua ON → iklan tampil

#### 4.2.5 Theme
- Dark / Light / Auto (ikut sistem)
- Preferensi disimpan di `app_users.theme_preference`

#### 4.2.6 Force Update (Planned)
- Cek `app_versions.min_required` untuk versi terbaru
- Current < min_required → ForceUpdateScreen

---

## 5. Technical Architecture

### 5.1 System Diagram
┌──────────────────────────────────────────────────┐
│ IRKOP ADMIN PANEL │
│ panel.irkop.eu.org │
│ React + Tailwind + Supabase JS SDK │
│ Hosted on Cloudflare Pages │
└────────────────────┬─────────────────────────────┘
│ HTTPS (anon key)
▼
┌──────────────────────────────────────────────────┐
│ SUPABASE │
│ (PostgreSQL + Auth + Realtime) │
│ 9 Tables + 2 Views + 6 Functions │
│ RLS Policies + Triggers (audit + updated_at) │
└────────────────────┬─────────────────────────────┘
│ HTTPS (anon key)
▼
┌──────────────────────────────────────────────────┐
│ FLUTTER APPS │
│ (each published to Play Store) │
│ supabase_flutter SDK + google_mobile_ads │
│ Compiled via GitHub Actions (no PC needed)
└──────────────────────────────────────────────────┘

### 5.2 Tech Stack
| Komponen | Teknologi | Versi |
|---|---|---|
| Web Panel | React + TypeScript | React 18, TS 5 |
| Build Tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| Icons | lucide-react | 0.441.x |
| Routing | react-router-dom | 6.x |
| Database | Supabase (PostgreSQL) | 15+ |
| Auth | Supabase Auth | - |
| Hosting (Web) | Cloudflare Pages | - |
| APK Framework | Flutter | 3.x (planned) |
| Ads SDK | google_mobile_ads | - |
| CI/CD | GitHub Actions | - |

### 5.3 Mobile-Only Development Setup
- **Device**: Android phone
- **Terminal**: Termux (Linux environment)
- **Editor**: nano / GitHub web editor
- **Git**: GitHub + Personal Access Token
- **No PC required** for any step

---

## 6. Data Model

### 6.1 Tables (9)
| Table | Purpose | Akses |
|---|---|---|
| `admin_users` | Admin panel accounts | authenticated (admin only) |
| `admin_preferences` | UI preferences per admin | own admin only |
| `apps` | Master semua Android apps | public read, admin write |
| `ads_slots` | Slot iklan per app (3 slots) | public read, admin write |
| `app_users` | User per app (device-based) | public insert/update, admin read |
| `global_config` | Config global (key-value) | public read, admin write |
| `audit_logs` | Audit trail perubahan admin | admin read-only |
| `ads_metrics` | Statistik iklan harian | public insert, admin read |
| `app_versions` | Riwayat versi APK per app | public read, admin write |

### 6.2 Views (2)
- `v_dashboard_stats` — Stats untuk Dashboard utama
- `v_app_metrics` — Stats per app (untuk AppDetail)

### 6.3 Functions (6)
| Function | Purpose |
|---|---|
| `is_admin()` | Cek current user = admin aktif |
| `is_super_admin()` | Cek current user = super_admin |
| `promote_to_admin(email, role)` | Promote auth.users jadi admin |
| `add_app_with_slots(name, package, desc)` | Create app + 3 slots default |
| `update_updated_at_column()` | Trigger utility |
| `fn_log_audit()` | Audit log trigger |

### 6.4 Triggers (9)
- Auto-update `updated_at` di: admin_users, apps, ads_slots, global_config, admin_preferences
- Audit log di: apps, ads_slots, global_config, admin_users (insert/update/delete)

### 6.5 RLS Policies
| Tabel | Public Read | Public Write | Admin |
|---|---|---|---|
| apps | ✅ | ❌ | Full CRUD |
| ads_slots | ✅ | ❌ | Full CRUD |
| global_config | ✅ | ❌ | Full CRUD |
| app_versions | ✅ | ❌ | Full CRUD |
| app_users | ❌ | Insert + Update own | Read + Delete |
| ads_metrics | ❌ | Insert | Read + Update + Delete |
| admin_users | ❌ | ❌ | Read self + super_admin full |
| admin_preferences | ❌ | ❌ | Own only |
| audit_logs | ❌ | ❌ | Read only |

---

## 7. Roadmap & Phases

### Fase 1 — Fondasi ✅ DONE
- Setup Supabase project
- Database schema v2 (9 tables, RLS, triggers, views)
- GitHub account setup

### Fase 2 — Web Panel ✅ DONE (Live: panel.irkop.eu.org)
- React + Vite + Tailwind setup
- Auth + Protected routes
- Dashboard, Apps, AppDetail, AuditLogs, Settings pages
- Edit/Delete App, Maintenance per-app, App Users table
- Dark/Light/Auto theme
- Cloudflare Pages deployment + custom domain

### Fase 3 — Flutter App Template ⏳ NEXT
- Flutter project setup (mobile-only friendly)
- Supabase SDK integration
- Remote config (read from Supabase)
- AdMob integration (3 ad types)
- Maintenance screen
- Theme (Dark/Light/Auto)
- GitHub Actions workflow (compile APK/AAB without PC)

### Fase 4 — Play Store ⏳
- Daftar Google Play Developer ($25)
- Compile AAB via GitHub Actions
- Upload & publish app pertama

### Fase 5 — Monetisasi ⏳
- Daftar AdMob
- Setup AdMob ad unit IDs di panel
- Enable ads via panel (Level 3 first, then per-app, then global)
- Monitor revenue di panel (ads_metrics table)

---

## 8. Success Metrics

### Fase 2 (Web Panel) — ACHIEVED ✅
- ✅ Panel live di panel.irkop.eu.org
- ✅ Login berhasil dengan super_admin
- ✅ All features functional
- ✅ Mobile-responsive
- ✅ Dark/Light/Auto theme

### Fase 3 (Flutter) — TBD
- APK ter-compile via GitHub Actions
- APK bisa di-install di HP & dibuka
- App bisa fetch config dari Supabase
- Maintenance screen tampil saat flag ON
- AdMob test ads tampil (kalau slot ON)

### Fase 4 (Play Store) — TBD
- App ter-upload ke Play Store
- App di-approve Google
- App visible di Play Store

### Fase 5 (Monetisasi) — TBD
- AdMob account approved
- Production ad_unit_id terisi di panel
- First revenue recorded di ads_metrics

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Termux tidak bisa install Flutter SDK | Tidak bisa build APK lokal | GitHub Actions compile |
| AdMob account reject | Tidak bisa monetisasi | Pakai test ads saat dev |
| Play Store reject app | App tidak publish | Follow Play Store policies |
| Supabase free tier habis | Database down | Monitor usage, upgrade Pro ($25/bln) |
| Anon key bocor | Spam ke database | RLS policies ketat, audit log aktif |
| Cloudflare Pages downtime | Panel tidak accessible | App masih jalan (baca cache lokal) |
| HP rusak/hilang | Dev environment gone | Semua di GitHub + Supabase |

---

## 10. Out of Scope

- iOS app
- Web app (Flutter web)
- Custom backend (selain Supabase)
- User authentication di app
- Real-time analytics dashboard
- A/B testing
- Push notifications
- In-app purchases (kecuali premium flag)
- Multi-language app (cuma panel support id/en)
- Admin mobile app (panel web sudah responsive)

---

## 11. Glossary

| Istilah | Definisi |
|---|---|
| APK | Android Package (debug build) |
| AAB | Android App Bundle (release build untuk Play Store) |
| AdMob | Google's mobile ad platform |
| Ad Unit ID | ID unik untuk setiap slot iklan di AdMob |
| Anon Key | Public API key Supabase (aman untuk frontend) |
| Device ID | Identifier unik per device Android |
| RLS | Row Level Security (PostgreSQL) |
| Service Role Key | Private API key Supabase (JANGAN di frontend) |
| Slot Key | Variable iklan di Flutter ($ads1, $ads2, $ads3) |

---

*Living document — akan di-update saat ada perubahan scope atau fitur.*
*Last updated: 2026-08-24 | Version: 2.0*