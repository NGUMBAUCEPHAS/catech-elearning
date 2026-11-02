CREATE OR REPLACE FUNCTION public.complete_account_onboarding() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_meta jsonb; v_email text; v_id uuid; v_code text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT raw_user_meta_data, email INTO v_meta,v_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Verify your email before continuing' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 UPDATE public.profiles SET phone_number=coalesce(nullif(phone_number,''),left(v_meta->>'phone_number',40)) WHERE id=auth.uid();
 IF EXISTS(SELECT 1 FROM public.institution_memberships WHERE user_id=auth.uid()) THEN RETURN; END IF;
 IF v_meta->>'account_type'='company' THEN
  v_code=upper(btrim(v_meta->>'company_code'));
  IF v_code IS NULL OR v_code !~ '^[A-Z0-9][A-Z0-9-]{1,29}$' OR char_length(btrim(coalesce(v_meta->>'company_name',''))) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'Valid company name and code required'; END IF;
  IF EXISTS(SELECT 1 FROM public.institutions WHERE code=v_code) THEN RAISE EXCEPTION 'This company code is already registered. Ask its administrator for access.'; END IF;
  INSERT INTO public.institutions(name,code,contact_email,phone_number) VALUES(btrim(v_meta->>'company_name'),v_code,v_email,left(v_meta->>'phone_number',40)) RETURNING id INTO v_id;
  INSERT INTO public.institution_memberships(institution_id,user_id,role) VALUES(v_id,auth.uid(),'institution_admin');
 ELSIF v_meta->>'account_type'='student' AND coalesce(v_meta->>'institution_id','') ~ '^[0-9a-fA-F-]{36}$' THEN
  SELECT id INTO v_id FROM public.institutions WHERE id=(v_meta->>'institution_id')::uuid AND status='active';
  IF v_id IS NOT NULL THEN INSERT INTO public.institution_memberships(institution_id,user_id,role) VALUES(v_id,auth.uid(),'student'); END IF;
 END IF;
 IF v_id IS NOT NULL THEN UPDATE public.profiles SET institution_id=v_id WHERE id=auth.uid(); END IF;
END; $$;
REVOKE ALL ON FUNCTION public.complete_account_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_account_onboarding() TO authenticated;