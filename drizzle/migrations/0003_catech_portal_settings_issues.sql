DROP TRIGGER IF EXISTS institution_change_audit ON public.institutions;
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER institution_touch_updated BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER institution_change_audit AFTER INSERT OR UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.record_institution_change();

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_messages TO authenticated, service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Direct messages read" ON public.direct_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Direct messages insert" ON public.direct_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Direct messages update" ON public.direct_messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "Active institutions public discovery" ON public.institutions FOR SELECT TO authenticated USING (status = 'active');

CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_notes TO authenticated, service_role;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lesson notes access" ON public.lesson_notes FOR ALL TO authenticated USING (true);

ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
CREATE POLICY "Company admins can update own institution" ON public.institutions FOR UPDATE TO authenticated USING (public.can_access_institution(id, true)) WITH CHECK (public.can_access_institution(id, true));

INSERT INTO public.institutions (name, code, contact_email, phone_number, description, address, status)
VALUES
  ('Altocom Engineering & Tech Institute','ALTOCOM','admissions@altocom.co.ke','+254 711 000 111','Specialized engineering, industrial automation, telecommunications, and high-performance cloud networks.','Altocom Tech Park, Waiyaki Way, Nairobi','active'),
  ('Midian Business & Digital Academy','MIDIAN','info@midian.co.ke','+254 722 000 222','Executive fintech leadership, product management, financial engineering, and enterprise strategy.','Midian Financial Centre, Upper Hill, Nairobi','active'),
  ('iTech Software Development Academy','ITECH','enroll@itech.co.ke','+254 733 000 333','Full-stack web engineering, cloud-native DevOps, TypeScript, mobile apps, and microservice architectures.','iTech Innovation Campus, Kilimani, Nairobi','active'),
  ('Catech Higher Learning & Research Hub','CATECH','info@catech.co.ke','+254 700 000 444','Accredited computer science, applied machine learning, cybersecurity, and modern technical curriculum.','Catech Science Park, Ngong Road, Nairobi','active')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'CATECH Learn',
  tagline text NOT NULL DEFAULT 'Accredited Learning & Career Development Platform',
  support_email text NOT NULL DEFAULT 'support@catech.co.ke',
  support_phone text NOT NULL DEFAULT '+254 700 000 444',
  organization_address text NOT NULL DEFAULT 'Nairobi, Kenya',
  default_currency text NOT NULL DEFAULT 'KES',
  mpesa_paybill text NOT NULL DEFAULT '174379',
  allow_student_registration boolean NOT NULL DEFAULT true,
  allow_company_registration boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_system_settings TO authenticated;
GRANT ALL ON public.platform_system_settings TO service_role;
ALTER TABLE public.platform_system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public platform settings read" ON public.platform_system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin platform settings manage" ON public.platform_system_settings FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
INSERT INTO public.platform_system_settings (platform_name, tagline, support_email, support_phone, organization_address, default_currency, mpesa_paybill, allow_student_registration, allow_company_registration, maintenance_mode)
SELECT 'CATECH Learn','Accredited Multi-Tenant Learning & Career Development Platform','support@catech.co.ke','+254 700 000 444','Ngong Road, Nairobi, Kenya','KES','174379',true,true,false
WHERE NOT EXISTS (SELECT 1 FROM public.platform_system_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description text NOT NULL CHECK (char_length(description) >= 10),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','billing','access','course','technical','other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_response text,
  responded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues_select_own" ON public.issues FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "issues_select_admin" ON public.issues FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "issues_insert_own" ON public.issues FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "issues_update_admin" ON public.issues FOR UPDATE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "issues_delete_admin" ON public.issues FOR DELETE TO authenticated USING (public.is_platform_admin());
CREATE POLICY "issues_update_own_open" ON public.issues FOR UPDATE TO authenticated USING (reporter_id = auth.uid() AND status = 'open');
CREATE TRIGGER issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_view text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_ref_id uuid;
ALTER TABLE public.notifications ALTER COLUMN message SET DEFAULT '';