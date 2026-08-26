1. PROFIL DEVELOPER  → mobile-only, Termux, tanpa PC
2. WORKSPACE RULES   → path, aturan, git boundary
3. KONTEKS ECOSYSTEM → apa yang sudah jalan & dipakai bersama
4. TUGAS SPESIFIK    → project baru mau apa saja
5. FORMAT OUTPUT     → script bash one-shot, bahasa Indonesia


Saya punya ekosistem app Android "Irkop". Ikuti konteks ini:

PROFIL DEVELOPER:
- Mobile-only: Android + Termux, TANPA PC
- Semua compile/build via GitHub Actions
- Editor: nano di Termux

WORKSPACE RULES (wajib ikuti):
- Root workspace: ~/workspace
- Project baru HARUS di: ~/workspace/projects/<nama-project>/
- npm workspaces (projects/*), 1 project = 1 git repo
- Jangan git init kalau repo sudah ada (cek dulu: git rev-parse --show-toplevel)
- Git commands dari project root, bukan subfolder

ECOSYSTEM YANG SUDAH JALAN:
- Admin panel: panel.irkop.eu.org (React+Vite+Tailwind, repo: kopen1/panel-apps)
- Database: Supabase (project yang SAMA dengan panel):
  - Tabel: apps, ads_slots (3 slot: $ads1/$ads2/$ads3), app_users,
    global_config, ads_metrics, app_versions, audit_logs, admin_users
  - RLS aktif: app boleh READ apps/ads_slots/global_config,
    boleh INSERT/UPDATE app_users, TIDAK boleh akses admin_users
- Ads 3-level control: global (global_config) → per-app (apps.ads_enabled)
  → per-slot (ads_slots.is_enabled). Ad Unit ID diambil RUNTIME dari Supabase.
- AdMob App ID: hardcoded di AndroidManifest.xml (tidak bisa dinamis,
  beda dengan Ad Unit ID)
- Maintenance 2-level: global_config.maintenance_mode OR apps.maintenance_mode
- Flutter app akan register device_id ke app_users via upsert

TUGAS: Buat app Flutter baru "[NAMA APP]"
- Package name: com.irkop.[nama]
- Fitur: [daftar fitur]
- Integrasi: fetch config dari Supabase (baca global_config + apps by
  package_name + ads_slots), register device, maintenance screen
- AdMob: banner + interstitial + rewarded (interstitial load on-demand,
  jangan preload)
- Tema: dark/light/auto (default auto)
- Build: GitHub Actions workflow (Flutter 3.22.3, Java 17, upload APK artifact)

FORMAT OUTPUT:
- Script bash one-shot yang bisa saya paste & jalankan di Termux
- Kredensial Supabase: prompt input saat script jalan (jangan hardcode)
- AdMob App ID: fallback ke Google test ID kalau tidak diisi
- Bahasa Indonesia untuk semua komentar & UI
- Setelah script: beri checklist verifikasi + langkah push GitHub

Referensi project sejenis yang sudah jalan: ~/workspace/projects/irkop-tasbih
(pakai struktur & pattern yang sama)