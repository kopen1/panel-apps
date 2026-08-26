-- ============================================================================
--  IRKOP ECOSYSTEM - DATABASE MIGRATION v2 (FINAL)
-- ----------------------------------------------------------------------------
--  File     : irkop_migration_v2.sql
--  Versi    : 2.0
--  Target   : Supabase (PostgreSQL 15+)
--  Dibuat   : 2026-08-24
--  Catatan  : Konsolidasi seluruh perubahan dari Fase 1 & 2.
--            Aman dijalankan di project Supabase baru (fresh) ATAU
--            di project existing (idempotent — ON CONFLICT DO NOTHING).
-- ----------------------------------------------------------------------------
--  Cara pakai:
--  1. Buka Supabase Dashboard → SQL Editor → New Query
--  2. Paste seluruh isi file ini
--  3. Klik Run (Ctrl+Enter)
--  4. Ikuti instruksi setup di bagian paling bawah
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================================
-- 2. UTILITY FUNCTION: auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$ BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
 $$;


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- 3.1 admin_users ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          text NOT NULL UNIQUE,
  full_name      text,
  role           text NOT NULL DEFAULT 'admin'
                 CHECK (role IN ('super_admin', 'admin', 'viewer')),
  is_active      boolean NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.admin_users IS 'Daftar admin yang dapat akses web panel';
COMMENT ON COLUMN public.admin_users.role IS
  'super_admin = kelola admin lain, admin = kelola apps & ads, viewer = read-only';

-- 3.2 apps -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  package_name      text NOT NULL UNIQUE,
  description       text,
  ads_enabled       boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  maintenance_mode  boolean NOT NULL DEFAULT false,
  config_cache_ttl  integer NOT NULL DEFAULT 3600,
  config_version    text DEFAULT 'v1',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.apps IS 'Master semua aplikasi Android Irkop';
COMMENT ON COLUMN public.apps.ads_enabled IS 'Level 2 kontrol ads (per-app)';
COMMENT ON COLUMN public.apps.maintenance_mode IS
  'Level 2 kontrol maintenance (per-app). Saat true, Flutter app tampilkan layar maintenance.';
COMMENT ON COLUMN public.apps.config_cache_ttl IS
  'Berapa detik Flutter app boleh cache config (default 3600 = 1 jam)';

-- 3.3 ads_slots --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ads_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  slot_key    text NOT NULL CHECK (slot_key IN ('$ads1', '$ads2', '$ads3')),
  ad_type     text NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded')),
  ad_unit_id  text,
  is_enabled  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, slot_key)
);
COMMENT ON TABLE public.ads_slots IS 'Konfigurasi slot iklan per app (Level 3 kontrol)';

-- 3.4 app_users --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id            uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  device_id         text NOT NULL,
  is_premium        boolean NOT NULL DEFAULT false,
  theme_preference  text NOT NULL DEFAULT 'auto'
                    CHECK (theme_preference IN ('dark', 'light', 'auto')),
  last_active_at    timestamptz DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, device_id)
);
COMMENT ON TABLE public.app_users IS 'Pengguna per app (identifikasi via device_id)';

-- 3.5 global_config ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.global_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.global_config IS 'Konfigurasi global (Level 1 kontrol)';

-- 3.6 admin_preferences ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_preferences (
  admin_id   uuid PRIMARY KEY REFERENCES public.admin_users(id) ON DELETE CASCADE,
  theme      text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
  language   text NOT NULL DEFAULT 'id'   CHECK (language IN ('id', 'en')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.admin_preferences IS 'Preferensi UI admin (sinkron antar device)';

-- 3.7 audit_logs -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action        text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  target_table  text NOT NULL,
  target_id     text,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.audit_logs IS 'Audit trail perubahan oleh admin';

-- 3.8 ads_metrics ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ads_metrics (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id         uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  slot_id        uuid REFERENCES public.ads_slots(id) ON DELETE SET NULL,
  impressions    integer NOT NULL DEFAULT 0,
  clicks         integer NOT NULL DEFAULT 0,
  revenue        numeric(12,4) NOT NULL DEFAULT 0,
  recorded_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, slot_id, recorded_date)
);
COMMENT ON TABLE public.ads_metrics IS 'Statistik iklan harian per app per slot';

-- 3.9 app_versions -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  version_name  text NOT NULL,
  version_code  integer NOT NULL,
  min_required  boolean NOT NULL DEFAULT false,
  download_url  text,
  changelog     text,
  released_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_id, version_code)
);
COMMENT ON TABLE public.app_versions IS 'Riwayat versi APK per app';


-- ============================================================================
-- 4. INDEXES (untuk performa query)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ads_slots_app_id         ON public.ads_slots(app_id);
CREATE INDEX IF NOT EXISTS idx_app_users_app_id         ON public.app_users(app_id);
CREATE INDEX IF NOT EXISTS idx_app_users_device_id      ON public.app_users(device_id);
CREATE INDEX IF NOT EXISTS idx_app_users_last_active     ON public.app_users(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id      ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table  ON public.audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_desc  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_app_id       ON public.ads_metrics(app_id);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_slot_id      ON public.ads_metrics(slot_id);
CREATE INDEX IF NOT EXISTS idx_ads_metrics_date          ON public.ads_metrics(recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id      ON public.app_versions(app_id);


-- ============================================================================
-- 5. HELPER FUNCTIONS (untuk RLS & admin)
-- ============================================================================

-- 5.1 Cek apakah user saat ini adalah admin aktif
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$   SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
  );
 $$;

-- 5.2 Cek apakah user saat ini adalah super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$   SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'super_admin'
  );
 $$;


-- ============================================================================
-- 6. TRIGGERS - auto-update updated_at
-- ============================================================================
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_apps_updated_at
  BEFORE UPDATE ON public.apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ads_slots_updated_at
  BEFORE UPDATE ON public.ads_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_global_config_updated_at
  BEFORE UPDATE ON public.global_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_admin_preferences_updated_at
  BEFORE UPDATE ON public.admin_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- 7. AUDIT LOG TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_log_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ DECLARE
  v_admin_id uuid := auth.uid();
  v_target_id text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_target_id := CAST(OLD.id AS text);
    ELSE
      v_target_id := CAST(NEW.id AS text);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_target_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (admin_id, action, target_table, target_id, old_value, new_value)
    VALUES (v_admin_id, 'update', TG_TABLE_NAME, v_target_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (admin_id, action, target_table, target_id, new_value)
    VALUES (v_admin_id, 'insert', TG_TABLE_NAME, v_target_id, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (admin_id, action, target_table, target_id, old_value)
    VALUES (v_admin_id, 'delete', TG_TABLE_NAME, v_target_id, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
 $$;

CREATE TRIGGER trg_audit_apps
  AFTER INSERT OR UPDATE OR DELETE ON public.apps
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_audit();

CREATE TRIGGER trg_audit_ads_slots
  AFTER INSERT OR UPDATE OR DELETE ON public.ads_slots
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_audit();

CREATE TRIGGER trg_audit_global_config
  AFTER INSERT OR UPDATE OR DELETE ON public.global_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_audit();

CREATE TRIGGER trg_audit_admin_users
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_audit();


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_slots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions        ENABLE ROW LEVEL SECURITY;

-- 8.1 admin_users ------------------------------------------------------------
DROP POLICY IF EXISTS "admin_read_admin_users"             ON public.admin_users;
DROP POLICY IF EXISTS "admin_read_admin_users_v2"          ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_manage_admin_users"     ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_manage_admin_users_v2"  ON public.admin_users;

CREATE POLICY "admin_read_admin_users_v2"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "super_admin_manage_admin_users_v2"
  ON public.admin_users FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 8.2 apps -------------------------------------------------------------------
CREATE POLICY "public_read_apps"
  ON public.apps FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admin_manage_apps"
  ON public.apps FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.3 ads_slots --------------------------------------------------------------
CREATE POLICY "public_read_ads_slots"
  ON public.ads_slots FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admin_manage_ads_slots"
  ON public.ads_slots FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.4 app_users --------------------------------------------------------------
CREATE POLICY "public_insert_app_users"
  ON public.app_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "public_update_app_users"
  ON public.app_users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_read_app_users"
  ON public.app_users FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE POLICY "admin_delete_app_users"
  ON public.app_users FOR DELETE
  TO authenticated USING (public.is_admin());

-- 8.5 global_config ----------------------------------------------------------
CREATE POLICY "public_read_global_config"
  ON public.global_config FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admin_manage_global_config"
  ON public.global_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.6 admin_preferences ------------------------------------------------------
CREATE POLICY "admin_own_preferences"
  ON public.admin_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

-- 8.7 audit_logs -------------------------------------------------------------
CREATE POLICY "admin_read_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated USING (public.is_admin());

-- 8.8 ads_metrics ------------------------------------------------------------
CREATE POLICY "public_insert_ads_metrics"
  ON public.ads_metrics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin_read_ads_metrics"
  ON public.ads_metrics FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE POLICY "admin_update_ads_metrics"
  ON public.ads_metrics FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_ads_metrics"
  ON public.ads_metrics FOR DELETE
  TO authenticated USING (public.is_admin());

-- 8.9 app_versions -----------------------------------------------------------
CREATE POLICY "public_read_app_versions"
  ON public.app_versions FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "admin_manage_app_versions"
  ON public.app_versions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================================
-- 9. VIEWS (untuk dashboard & metrics)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM public.apps WHERE is_active = true)            AS total_apps,
  (SELECT COUNT(*) FROM public.app_users)                              AS total_users,
  (SELECT COUNT(*) FROM public.app_users
     WHERE last_active_at > now() - interval '24 hours')               AS active_users_24h,
  (SELECT value = 'true' FROM public.global_config
     WHERE key = 'ads_enabled')                                         AS ads_global_enabled,
  (SELECT COUNT(*) FROM public.ads_slots WHERE is_enabled = true)      AS total_active_slots,
  (SELECT COUNT(*) FROM public.apps WHERE maintenance_mode = true)     AS apps_in_maintenance,
  (SELECT COALESCE(SUM(revenue), 0) FROM public.ads_metrics
     WHERE recorded_date = CURRENT_DATE)                               AS revenue_today,
  (SELECT COALESCE(SUM(impressions), 0) FROM public.ads_metrics
     WHERE recorded_date = CURRENT_DATE)                               AS impressions_today,
  (SELECT COALESCE(SUM(clicks), 0) FROM public.ads_metrics
     WHERE recorded_date = CURRENT_DATE)                               AS clicks_today;

CREATE OR REPLACE VIEW public.v_app_metrics AS
SELECT
  a.id            AS app_id,
  a.name          AS app_name,
  a.ads_enabled,
  COUNT(DISTINCT u.id)                                  AS total_users,
  COUNT(DISTINCT u.id) FILTER
    (WHERE u.last_active_at > now() - interval '24 hours') AS active_users_24h,
  COUNT(DISTINCT s.id) FILTER (WHERE s.is_enabled = true) AS active_slots,
  COALESCE(SUM(m.impressions), 0) AS total_impressions,
  COALESCE(SUM(m.clicks), 0)      AS total_clicks,
  COALESCE(SUM(m.revenue), 0)     AS total_revenue
FROM public.apps a
LEFT JOIN public.app_users  u ON u.app_id  = a.id
LEFT JOIN public.ads_slots  s ON s.app_id = a.id
LEFT JOIN public.ads_metrics m ON m.app_id = a.id
GROUP BY a.id, a.name, a.ads_enabled;


-- ============================================================================
-- 10. STORED FUNCTIONS (Helper untuk admin)
-- ============================================================================

-- 10.1 promote_to_admin: angkat auth.users jadi admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(
  p_email text,
  p_role  text DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ DECLARE
  v_user_id uuid;
BEGIN
  IF p_role NOT IN ('super_admin', 'admin', 'viewer') THEN
    RAISE EXCEPTION 'Role tidak valid: %. Pilih: super_admin | admin | viewer', p_role;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'User dengan email % tidak ditemukan di auth.users. Daftarkan dulu via Supabase Auth.',
      p_email;
  END IF;

  INSERT INTO public.admin_users (id, email, role, is_active)
  VALUES (v_user_id, p_email, p_role, true)
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

  INSERT INTO public.admin_preferences (admin_id, theme, language)
  VALUES (v_user_id, 'dark', 'id')
  ON CONFLICT (admin_id) DO NOTHING;

  RAISE NOTICE '✅ Admin % berhasil dipromote sebagai %', p_email, p_role;
END;
 $$;

-- 10.2 add_app_with_slots: buat app baru + 3 slot default
CREATE OR REPLACE FUNCTION public.add_app_with_slots(
  p_name         text,
  p_package_name text,
  p_description  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ DECLARE
  v_app_id uuid;
BEGIN
  -- Security check: hanya admin yang boleh create app
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: hanya admin yang boleh create app';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Nama app tidak boleh kosong';
  END IF;

  IF NOT p_package_name ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$' THEN
    RAISE EXCEPTION 'Format package name salah: %. Contoh: com.irkop.appa', p_package_name;
  END IF;

  INSERT INTO public.apps (name, package_name, description)
  VALUES (trim(p_name), lower(trim(p_package_name)), p_description)
  RETURNING id INTO v_app_id;

  INSERT INTO public.ads_slots (app_id, slot_key, ad_type, is_enabled) VALUES
    (v_app_id, '$ads1', 'banner',       false),
    (v_app_id, '$ads2', 'interstitial', false),
    (v_app_id, '$ads3', 'rewarded',     false);

  RAISE NOTICE '✅ App % dibuat dengan id %', p_name, v_app_id;
  RETURN v_app_id;
END;
 $$;


-- ============================================================================
-- 11. SEED DATA (default config + sample app)
-- ============================================================================

-- 11.1 Global config defaults
INSERT INTO public.global_config (key, value) VALUES
  ('ads_enabled',       'false'),
  ('maintenance_mode',  'false'),
  ('min_app_version',   '1'),
  ('panel_version',     '2.0.0'),
  ('default_theme',     'dark'),
  ('default_language',  'id')
ON CONFLICT (key) DO NOTHING;

-- 11.2 Sample app untuk testing
INSERT INTO public.apps (id, name, package_name, description, ads_enabled, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   'Irkop App A',
   'com.irkop.appa',
   'Aplikasi pertama Irkop untuk testing panel & ads config',
   false,
   true)
ON CONFLICT (package_name) DO NOTHING;

-- 11.3 Slot iklan default untuk App A
INSERT INTO public.ads_slots (app_id, slot_key, ad_type, ad_unit_id, is_enabled) VALUES
  ('a0000000-0000-0000-0000-000000000001', '$ads1', 'banner',       NULL, false),
  ('a0000000-0000-0000-0000-000000000001', '$ads2', 'interstitial', NULL, false),
  ('a0000000-0000-0000-0000-000000000001', '$ads3', 'rewarded',     NULL, false)
ON CONFLICT (app_id, slot_key) DO NOTHING;

-- 11.4 Versi awal App A
INSERT INTO public.app_versions (app_id, version_name, version_code, min_required, changelog) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '1.0.0',
   1,
   true,
   'Initial release')
ON CONFLICT (app_id, version_code) DO NOTHING;


-- ============================================================================
-- 12. INSTRUKSI SETUP (jalankan manual setelah migration ini)
-- ============================================================================
/*
LANGKAH-LANGKAH SETUP ADMIN PANEL:

1. Buat akun admin di Supabase Auth:
   - Dashboard → Authentication → Users → "Add user"
   - Email    : iqbalshof@gmail.com
   - Password : [password kuat 12+ karakter]
   - Auto Confirm User: ON (centang)
   - Klik "Create user"

2. Promote user tersebut jadi super_admin:
   - Buka SQL Editor → New query → Run:
   - SELECT public.promote_to_admin('iqbalshof@gmail.com', 'super_admin');

3. Verifikasi admin sudah terdaftar:
   - SELECT id, email, role, is_active FROM public.admin_users;
   - Harus muncul 1 row dengan role='super_admin', is_active=true

4. Catat kredensial Supabase:
   - Settings → API:
     - Project URL: https://[PROJECT_REF].supabase.co
     - anon key: eyJhbGciOi... (klik Reveal)

5. Konfigurasi Auth URLs:
   - Authentication → URL Configuration:
     - Site URL      : https://panel.irkop.eu.org
     - Redirect URLs :
         - https://panel.irkop.eu.org
         - http://localhost:5173

6. Deploy panel ke Cloudflare Pages:
   - Framework: Vite
   - Build command: npm run build
   - Build output: dist
   - Env vars:
       VITE_SUPABASE_URL=[PROJECT_URL]
       VITE_SUPABASE_ANON_KEY=[ANON_KEY]
       NODE_VERSION=22

7. Setup custom domain panel.irkop.eu.org di Cloudflare Pages

8. Test login di https://panel.irkop.eu.org
*/


-- ============================================================================
-- END OF MIGRATION v2 — irkop_migration_v2.sql
-- ============================================================================

-- ============================================================================
--  IRKOP MIGRATION v2.1 (DELTA dari v2)
--  Perubahan: tambah kolom admob_app_id untuk tracking/dokumentasi
-- ============================================================================

ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS admob_app_id text;

COMMENT ON COLUMN public.apps.admob_app_id IS
  'AdMob App ID (format ~) untuk dokumentasi. Yang dipakai app tetap hardcoded di AndroidManifest.xml saat build.';

-- Isi untuk Tasbih (opsional):
UPDATE public.apps
SET admob_app_id = 'ca-app-pub-3940256099942544~3347511713'
WHERE package_name = 'com.irkop.tasbih';