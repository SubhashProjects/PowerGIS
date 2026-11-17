-- PowerGIS V3.2.1 concurrency, evidence-storage and offline-idempotency hardening.
-- This migration removes count(*)+1 identifier races and adds server-owned evidence boundaries.

CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.fault_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.outage_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.ptw_number_seq;

DO $$
DECLARE v_max BIGINT;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(order_number, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.work_orders WHERE order_number ~ '[0-9]+$';
  PERFORM setval('public.work_order_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(fault_code, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.faults WHERE fault_code ~ '[0-9]+$';
  PERFORM setval('public.fault_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(outage_code, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.outages WHERE outage_code ~ '[0-9]+$';
  PERFORM setval('public.outage_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(ptw_number, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.safety_permits WHERE ptw_number ~ '[0-9]+$';
  PERFORM setval('public.ptw_number_seq', GREATEST(v_max, 1), v_max > 0);
END $$;

CREATE OR REPLACE FUNCTION public.create_work_order(
    p_title TEXT, p_category TEXT, p_instructions TEXT, p_assigned_crew TEXT,
    p_section_id UUID, p_priority TEXT, p_due_date DATE
) RETURNS public.work_orders AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_order public.work_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','se','ee','aee','ae','je') THEN RAISE EXCEPTION 'Authorized engineering profile required'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'Work order section is outside your jurisdiction'; END IF;
    IF trim(COALESCE(p_title,''))='' OR trim(COALESCE(p_category,''))='' THEN RAISE EXCEPTION 'Title and category are required'; END IF;
    INSERT INTO public.work_orders(order_number,title,category,instructions,priority,status,assigned_crew,assigned_to_id,section_id,due_date,region_id,division_id)
    SELECT 'WO-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.work_order_number_seq')::text,5,'0'),
           trim(p_title), p_category, NULLIF(trim(COALESCE(p_instructions,'')),''),
           COALESCE(NULLIF(p_priority,''),'medium'), 'assigned', NULLIF(trim(COALESCE(p_assigned_crew,'')),''), v_user.id,
           p_section_id, p_due_date, d.region_id, d.id
    FROM public.om_sections s
    JOIN public.subdivisions sd ON sd.id=s.subdivision_id
    JOIN public.divisions d ON d.id=sd.division_id
    WHERE s.id=p_section_id
    RETURNING * INTO v_order;
    IF NOT FOUND THEN RAISE EXCEPTION 'Section not found'; END IF;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state)
    VALUES(auth.uid(),v_user.id,v_user.role,'work_order.create','work_orders',v_order.id::text,jsonb_build_object('order_number',v_order.order_number),jsonb_build_object('status','assigned'));
    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

DROP FUNCTION IF EXISTS public.create_fault;
DROP FUNCTION IF EXISTS public.create_fault(TEXT,TEXT,TEXT,UUID,UUID,UUID,NUMERIC,NUMERIC,INT);
DROP FUNCTION IF EXISTS public.create_fault(TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT);
CREATE OR REPLACE FUNCTION public.create_fault(
    p_category TEXT,
    p_description TEXT,
    p_priority TEXT,
    p_section_id UUID,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_feeder_id UUID DEFAULT NULL,
    p_je_jurisdiction_id UUID DEFAULT NULL,
    p_affected_consumers_est INT DEFAULT 0
) RETURNS public.faults AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_fault public.faults%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','se','ee','aee','ae','je','contractor') THEN RAISE EXCEPTION 'Authorized profile required'; END IF;
    IF p_description IS NULL OR trim(p_description)='' THEN RAISE EXCEPTION 'Fault description is required'; END IF;
    IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid fault coordinates'; END IF;
    IF p_affected_consumers_est < 0 THEN RAISE EXCEPTION 'Affected consumer estimate cannot be negative'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'Fault section is outside your jurisdiction'; END IF;
    IF p_feeder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.feeders f WHERE f.id=p_feeder_id AND f.section_id=p_section_id) THEN RAISE EXCEPTION 'Feeder does not belong to selected section'; END IF;
    IF EXISTS (SELECT 1 FROM public.faults f WHERE f.section_id=p_section_id AND ST_DWithin(f.geom::geography, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography, 20) AND f.status NOT IN ('closed','verified')) THEN RAISE EXCEPTION 'A nearby open fault already exists'; END IF;
    INSERT INTO public.faults(fault_code,category,description,priority,status,feeder_id,section_id,je_jurisdiction_id,reported_by,affected_consumers_est,geom)
    VALUES('FLT-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.fault_number_seq')::text,5,'0'),p_category,p_description,p_priority,'new',p_feeder_id,p_section_id,p_je_jurisdiction_id,v_user.id,p_affected_consumers_est,ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326))
    RETURNING * INTO v_fault;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'fault.create','faults',v_fault.id::text,jsonb_build_object('coordinates',jsonb_build_array(p_lat,p_lng)),jsonb_build_object('status','new'));
    RETURN v_fault;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

DROP FUNCTION IF EXISTS public.create_outage;
DROP FUNCTION IF EXISTS public.create_outage(UUID,UUID,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INT,NUMERIC,UUID);
DROP FUNCTION IF EXISTS public.create_outage(TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC);
CREATE OR REPLACE FUNCTION public.create_outage(
    p_outage_type TEXT,
    p_reason TEXT,
    p_start_time TIMESTAMPTZ,
    p_section_id UUID,
    p_feeder_id UUID DEFAULT NULL,
    p_transformer_id UUID DEFAULT NULL,
    p_expected_restoration TIMESTAMPTZ DEFAULT NULL,
    p_affected_consumers_count INT DEFAULT 0,
    p_energy_not_served_kwh NUMERIC DEFAULT 0
) RETURNS public.outages AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_out public.outages%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
    IF v_user.role NOT IN ('super_admin','se','ee','aee','ae','je') THEN RAISE EXCEPTION 'Authorized engineering profile required'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'Outage is outside your jurisdiction'; END IF;
    IF trim(COALESCE(p_reason,''))='' THEN RAISE EXCEPTION 'Outage reason is required'; END IF;
    IF p_affected_consumers_count < 0 THEN RAISE EXCEPTION 'Affected consumer count cannot be negative'; END IF;
    IF p_expected_restoration IS NOT NULL AND p_expected_restoration < p_start_time THEN RAISE EXCEPTION 'Expected restoration cannot precede outage start'; END IF;
    INSERT INTO public.outages(outage_code,feeder_id,transformer_id,outage_type,reason,start_time,expected_restoration,affected_consumers_count,energy_not_served_kwh,section_id,status)
    VALUES('OUT-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.outage_number_seq')::text,5,'0'),p_feeder_id,p_transformer_id,p_outage_type,p_reason,p_start_time,p_expected_restoration,p_affected_consumers_count,p_energy_not_served_kwh,p_section_id,'active')
    RETURNING * INTO v_out;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'outage.create','outages',v_out.id::text,jsonb_build_object('outage_type',p_outage_type),jsonb_build_object('status','active'));
    RETURN v_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.create_ptw_request(
    p_feeder_id UUID,
    p_section_id UUID,
    p_work_description TEXT,
    p_isolation_points TEXT
) RETURNS UUID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_id UUID; v_number TEXT;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    IF p_work_description IS NULL OR trim(p_work_description)='' THEN RAISE EXCEPTION 'Work description is required'; END IF;
    IF p_isolation_points IS NULL OR trim(p_isolation_points)='' THEN RAISE EXCEPTION 'Isolation points are required'; END IF;
    IF v_user.role NOT IN ('super_admin','se','ee','aee','ae','je','contractor') THEN RAISE EXCEPTION 'Role not authorized to request PTW'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'PTW section is outside your jurisdiction'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.feeders f WHERE f.id=p_feeder_id AND f.section_id=p_section_id) THEN RAISE EXCEPTION 'Feeder does not belong to requested section'; END IF;
    v_number := 'PTW-' || to_char(NOW(),'YYYY') || '-' || lpad(nextval('public.ptw_number_seq')::text,4,'0');
    INSERT INTO public.safety_permits(ptw_number,feeder_id,applicant_id,work_description,isolation_points,section_id,status)
    VALUES(v_number,p_feeder_id,v_user.id,p_work_description,p_isolation_points,p_section_id,'requested') RETURNING id INTO v_id;
    INSERT INTO public.permit_safety_events(permit_id,actor_auth_user_id,actor_profile_id,actor_role,previous_state,new_state,confirmation,comments)
    VALUES(v_id,auth.uid(),v_user.id,v_user.role,'requested','requested',TRUE,'Permit request created');
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- Evidence bucket: objects are scoped to the authenticated uploader's UUID folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ptw-evidence', 'ptw-evidence', false)
ON CONFLICT (id) DO UPDATE SET public=false;

DROP POLICY IF EXISTS powergis_ptw_evidence_insert ON storage.objects;
CREATE POLICY powergis_ptw_evidence_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='ptw-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS powergis_ptw_evidence_select ON storage.objects;
CREATE POLICY powergis_ptw_evidence_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='ptw-evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE AND u.role IN ('super_admin','se','ee','aee','ae','auditor'))
  )
);

DROP POLICY IF EXISTS powergis_ptw_evidence_delete ON storage.objects;
CREATE POLICY powergis_ptw_evidence_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='ptw-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Server-side proof that a PTW evidence object belongs to the authenticated actor.
CREATE OR REPLACE FUNCTION public.validate_ptw_evidence_path(p_evidence_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_evidence_path IS NOT NULL AND split_part(p_evidence_path,'/',1) = auth.uid()::text;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.validate_ptw_evidence_path(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_ptw_evidence_path(TEXT) TO authenticated;

-- Idempotent one-asset offline survey synchronization endpoint.
CREATE OR REPLACE FUNCTION public.sync_offline_survey_asset(
    p_operation_id UUID,
    p_work_order_number TEXT,
    p_title TEXT,
    p_asset_type TEXT,
    p_temporary_code TEXT,
    p_attributes JSONB,
    p_gps_accuracy_m NUMERIC,
    p_altitude_m NUMERIC,
    p_location_source TEXT,
    p_lat NUMERIC,
    p_lng NUMERIC
) RETURNS UUID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_submission UUID; v_existing UUID;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role <> 'contractor' THEN RAISE EXCEPTION 'Authorized contractor profile required'; END IF;
    IF v_user.section_id IS NULL OR v_user.je_jurisdiction_id IS NULL THEN RAISE EXCEPTION 'Contractor jurisdiction is not assigned'; END IF;
    IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation ID is required'; END IF;
    IF p_location_source NOT IN ('GPS','MANUAL') THEN RAISE EXCEPTION 'Invalid location source'; END IF;
    IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid survey coordinates'; END IF;
    SELECT id INTO v_existing FROM public.survey_staging_assets WHERE operation_id=p_operation_id LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

    INSERT INTO public.survey_submissions(contractor_id,submission_code,region_id,division_id,section_id,je_jurisdiction_id,work_order_number,title,asset_counts,status)
    SELECT v_user.id,'OFF-'||to_char(NOW(),'YYYY')||'-'||substr(p_operation_id::text,1,8),d.region_id,d.id,v_user.section_id,v_user.je_jurisdiction_id,p_work_order_number,COALESCE(NULLIF(trim(p_title),''),'Offline field survey'),jsonb_build_object(p_asset_type,1),'submitted'
    FROM public.om_sections sec
    JOIN public.subdivisions sd ON sd.id=sec.subdivision_id
    JOIN public.divisions d ON d.id=sd.division_id
    WHERE sec.id=v_user.section_id
    RETURNING id INTO v_submission;

    INSERT INTO public.survey_staging_assets(submission_id,asset_type,temporary_code,attributes,gps_accuracy_m,altitude_m,location_source,validation_status,geom,operation_id)
    VALUES(v_submission,p_asset_type,p_temporary_code,COALESCE(p_attributes,'{}'::jsonb),CASE WHEN p_location_source='GPS' THEN p_gps_accuracy_m ELSE NULL END,p_altitude_m,p_location_source,'valid',ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326),p_operation_id)
    RETURNING id INTO v_existing;
    RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.sync_offline_survey_asset(UUID,TEXT,TEXT,TEXT,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,NUMERIC,NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_offline_survey_asset(UUID,TEXT,TEXT,TEXT,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,NUMERIC,NUMERIC) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-evidence', 'survey-evidence', false)
ON CONFLICT (id) DO UPDATE SET public=false;

DROP POLICY IF EXISTS powergis_survey_evidence_insert ON storage.objects;
CREATE POLICY powergis_survey_evidence_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='survey-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS powergis_survey_evidence_select ON storage.objects;
CREATE POLICY powergis_survey_evidence_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='survey-evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE AND u.role IN ('super_admin','se','ee','aee','ae','je','auditor','gis_admin'))
  )
);

DROP POLICY IF EXISTS powergis_survey_evidence_delete ON storage.objects;
CREATE POLICY powergis_survey_evidence_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='survey-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
