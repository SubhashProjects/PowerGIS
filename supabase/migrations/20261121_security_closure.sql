-- PowerGIS V3.2.4 security/data-integrity closure.
-- 1) fail closed for unscoped operational records;
-- 2) make survey submission atomic and server-owned;
-- 3) validate PTW evidence ownership/existence;
-- 4) make audit identity server-derived;
-- 5) explicitly mark legacy bundled demo rows as simulator data.

ALTER TABLE public.capital_project_packages
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'OPERATIONAL'
  CHECK (data_source IN ('OPERATIONAL','SIMULATOR'));
ALTER TABLE public.maintenance_tasks
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'OPERATIONAL'
  CHECK (data_source IN ('OPERATIONAL','SIMULATOR'));

-- The bundled project/task rows are test/demo records, not commissioned utility facts.
UPDATE public.capital_project_packages
SET data_source='SIMULATOR'
WHERE scheme_code IN ('RDSS-PUDU-HVDS-01','RDSS-PUDU-HVDS-02','RDSS-PUDU-AMI-03','RDSS-PUDU-SS-04');
UPDATE public.maintenance_tasks
SET data_source='SIMULATOR'
WHERE trigger_reason='Condition-based maintenance review generated from transformer operating condition';

CREATE INDEX IF NOT EXISTS idx_capital_projects_scope ON public.capital_project_packages(region_id,division_id,section_id,data_source);
CREATE INDEX IF NOT EXISTS idx_maintenance_scope ON public.maintenance_tasks(region_id,division_id,section_id,data_source);

-- No-scope rows must not become globally visible merely because their scope is null.
CREATE OR REPLACE FUNCTION public.user_has_jurisdiction(p_region_id UUID, p_division_id UUID, p_section_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.auth_user_id = auth.uid() AND u.is_active = true
      AND (
        u.role IN ('super_admin','auditor','gis_admin')
        OR (u.role='se' AND p_region_id IS NOT NULL AND p_region_id=u.region_id)
        OR (u.role='ee' AND p_division_id IS NOT NULL AND p_division_id=u.division_id)
        OR (u.role IN ('aee','ae') AND p_section_id IS NOT NULL AND p_section_id=u.section_id)
        OR (u.role='je' AND p_section_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.om_sections s
          JOIN public.subdivisions sd ON sd.id=s.subdivision_id
          JOIN public.divisions d ON d.id=sd.division_id
          WHERE s.id=p_section_id AND (u.section_id=s.id OR u.je_jurisdiction_id IN (
            SELECT j.id FROM public.je_jurisdictions j WHERE j.section_id=s.id
          ))
        ))
        OR (u.role='contractor' AND p_section_id IS NOT NULL AND p_section_id=u.section_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_jurisdiction(UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_jurisdiction(UUID,UUID,UUID) TO authenticated;

-- Keep simulator records out of operational module queries even for broad-scope roles.
DROP POLICY IF EXISTS capital_project_select ON public.capital_project_packages;
CREATE POLICY capital_project_select ON public.capital_project_packages FOR SELECT TO authenticated
USING (data_source='OPERATIONAL' AND public.user_has_jurisdiction(region_id,division_id,section_id));
DROP POLICY IF EXISTS capital_project_write ON public.capital_project_packages;
CREATE POLICY capital_project_write ON public.capital_project_packages FOR UPDATE TO authenticated
USING (data_source='OPERATIONAL' AND public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','gis_admin']::official_role[]) AND public.user_has_jurisdiction(region_id,division_id,section_id))
WITH CHECK (data_source='OPERATIONAL' AND public.user_has_jurisdiction(region_id,division_id,section_id));

DROP POLICY IF EXISTS maintenance_select ON public.maintenance_tasks;
CREATE POLICY maintenance_select ON public.maintenance_tasks FOR SELECT TO authenticated
USING (data_source='OPERATIONAL' AND public.user_has_jurisdiction(region_id,division_id,section_id));
DROP POLICY IF EXISTS maintenance_write ON public.maintenance_tasks;
CREATE POLICY maintenance_write ON public.maintenance_tasks FOR UPDATE TO authenticated
USING (data_source='OPERATIONAL' AND public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','je','contractor']::official_role[]) AND public.user_has_jurisdiction(region_id,division_id,section_id))
WITH CHECK (data_source='OPERATIONAL' AND public.user_has_jurisdiction(region_id,division_id,section_id));

-- Server-owned audit event: clients cannot forge actor/user/role identity.
CREATE OR REPLACE FUNCTION public.write_audit_event(
  p_action TEXT,
  p_module TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_id UUID;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required for audit logging'; END IF;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,previous_state,new_state)
  VALUES(auth.uid(),v_user.id,v_user.role,trim(p_action),trim(p_module),p_resource_id,COALESCE(p_details,'{}'::jsonb),p_previous_state,p_new_state)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.write_audit_event(TEXT,TEXT,TEXT,JSONB,JSONB,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_event(TEXT,TEXT,TEXT,JSONB,JSONB,JSONB) TO authenticated;

-- PTW evidence must belong to the caller and exist in the private bucket before it
-- can be recorded as safety evidence.
CREATE OR REPLACE FUNCTION public.validate_ptw_evidence_path(p_evidence_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
  SELECT p_evidence_path IS NOT NULL
    AND split_part(p_evidence_path,'/',1)=auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id='ptw-evidence' AND o.name=p_evidence_path
    );
$$;
REVOKE ALL ON FUNCTION public.validate_ptw_evidence_path(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_ptw_evidence_path(TEXT) TO authenticated;

-- Replace the PTW transition function so the evidence check is enforced server-side.
CREATE OR REPLACE FUNCTION public.advance_ptw_stage(
    p_permit_id UUID, p_stage public.ptw_status, p_equipment TEXT DEFAULT NULL,
    p_location_lat NUMERIC DEFAULT NULL, p_location_lng NUMERIC DEFAULT NULL,
    p_confirmation BOOLEAN DEFAULT FALSE, p_evidence_path TEXT DEFAULT NULL,
    p_comments TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_permit public.safety_permits%ROWTYPE;
DECLARE v_prev public.ptw_status; v_required_role public.official_role; v_geom GEOGRAPHY(Point,4326);
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
  SELECT * INTO v_permit FROM public.safety_permits WHERE id=p_permit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Permit not found'; END IF;
  v_prev:=v_permit.status;
  IF p_stage='requested' THEN RAISE EXCEPTION 'Requested is the creation state and cannot be re-entered'; END IF;
  IF p_confirmation IS NOT TRUE THEN RAISE EXCEPTION 'Explicit safety confirmation is required'; END IF;
  IF p_stage IN ('absence_of_voltage_verified','earthing_confirmed','danger_notices_confirmed','additional_checks_verified','personnel_cleared','earths_removed')
     AND NOT public.validate_ptw_evidence_path(p_evidence_path) THEN
    RAISE EXCEPTION 'Valid private evidence attachment is required for safety-critical stage %',p_stage;
  END IF;
  v_required_role:=CASE p_stage
    WHEN 'isolation_verified' THEN 'je' WHEN 'absence_of_voltage_verified' THEN 'je' WHEN 'earthing_confirmed' THEN 'je'
    WHEN 'danger_notices_confirmed' THEN 'je' WHEN 'additional_checks_verified' THEN 'je' WHEN 'issuer_verified' THEN 'ae'
    WHEN 'approved' THEN 'ae' WHEN 'work_started' THEN 'je' WHEN 'suspended' THEN 'ae' WHEN 'extended' THEN 'ae'
    WHEN 'work_completed' THEN 'je' WHEN 'personnel_cleared' THEN 'je' WHEN 'earths_removed' THEN 'je'
    WHEN 'restoration_approved' THEN 'ae' WHEN 'restored' THEN 'ae' WHEN 'closed' THEN 'ae' ELSE NULL END;
  IF v_required_role IS NOT NULL AND v_user.role NOT IN ('super_admin',v_required_role) THEN RAISE EXCEPTION 'Role is not authorized for PTW stage %',p_stage; END IF;
  IF v_user.role<>'super_admin' AND v_user.section_id IS DISTINCT FROM v_permit.section_id THEN RAISE EXCEPTION 'Permit is outside your jurisdiction'; END IF;
  IF NOT ((v_prev='requested' AND p_stage='isolation_verified') OR (v_prev='isolation_verified' AND p_stage='absence_of_voltage_verified') OR
    (v_prev='absence_of_voltage_verified' AND p_stage='earthing_confirmed') OR (v_prev='earthing_confirmed' AND p_stage='danger_notices_confirmed') OR
    (v_prev='danger_notices_confirmed' AND p_stage='additional_checks_verified') OR (v_prev='additional_checks_verified' AND p_stage='issuer_verified') OR
    (v_prev='issuer_verified' AND p_stage='approved') OR (v_prev='approved' AND p_stage='work_started') OR
    (v_prev='work_started' AND p_stage IN ('suspended','work_completed')) OR (v_prev='suspended' AND p_stage IN ('work_started','extended')) OR
    (v_prev='extended' AND p_stage='work_started') OR (v_prev='work_completed' AND p_stage='personnel_cleared') OR
    (v_prev='personnel_cleared' AND p_stage='earths_removed') OR (v_prev='earths_removed' AND p_stage='restoration_approved') OR
    (v_prev='restoration_approved' AND p_stage='restored') OR (v_prev='restored' AND p_stage='closed')) THEN
    RAISE EXCEPTION 'Invalid PTW transition: % -> %',v_prev,p_stage;
  END IF;
  IF p_location_lat IS NOT NULL OR p_location_lng IS NOT NULL THEN
    IF p_location_lat IS NULL OR p_location_lng IS NULL OR p_location_lat NOT BETWEEN -90 AND 90 OR p_location_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid evidence location coordinates'; END IF;
    v_geom:=ST_SetSRID(ST_MakePoint(p_location_lng,p_location_lat),4326)::geography;
  END IF;
  UPDATE public.safety_permits SET status=p_stage,
    isolation_verified=CASE WHEN p_stage='isolation_verified' THEN TRUE ELSE isolation_verified END,
    absence_of_voltage_verified=CASE WHEN p_stage='absence_of_voltage_verified' THEN TRUE ELSE absence_of_voltage_verified END,
    earthing_confirmed=CASE WHEN p_stage='earthing_confirmed' THEN TRUE ELSE earthing_confirmed END,
    danger_notices_posted=CASE WHEN p_stage='danger_notices_confirmed' THEN TRUE ELSE danger_notices_posted END,
    additional_safety_checks=CASE WHEN p_stage='additional_checks_verified' THEN COALESCE(additional_safety_checks,'{}'::jsonb)||jsonb_build_object('verified',true) ELSE additional_safety_checks END,
    issuer_verified=CASE WHEN p_stage='issuer_verified' THEN TRUE ELSE issuer_verified END,
    issuing_officer_id=CASE WHEN p_stage IN ('issuer_verified','approved','restoration_approved','restored','closed') THEN v_user.id ELSE issuing_officer_id END,
    issue_time=CASE WHEN p_stage='approved' THEN NOW() ELSE issue_time END,
    work_started_at=CASE WHEN p_stage='work_started' THEN NOW() ELSE work_started_at END,
    suspended_at=CASE WHEN p_stage='suspended' THEN NOW() ELSE suspended_at END,
    extended_until=CASE WHEN p_stage='extended' THEN NOW()+INTERVAL '8 hours' ELSE extended_until END,
    work_completed_at=CASE WHEN p_stage='work_completed' THEN NOW() ELSE work_completed_at END,
    personnel_cleared_at=CASE WHEN p_stage='personnel_cleared' THEN NOW() ELSE personnel_cleared_at END,
    earths_removed_at=CASE WHEN p_stage='earths_removed' THEN NOW() ELSE earths_removed_at END,
    restoration_approved_at=CASE WHEN p_stage='restoration_approved' THEN NOW() ELSE restoration_approved_at END,
    restored_at=CASE WHEN p_stage='restored' THEN NOW() ELSE restored_at END,
    closed_at=CASE WHEN p_stage='closed' THEN NOW() ELSE closed_at END
  WHERE id=p_permit_id;
  INSERT INTO public.permit_safety_events(permit_id,actor_auth_user_id,actor_profile_id,actor_role,previous_state,new_state,equipment,location,confirmation,evidence_path,comments)
  VALUES(p_permit_id,auth.uid(),v_user.id,v_user.role,v_prev,p_stage,p_equipment,v_geom,p_confirmation,p_evidence_path,p_comments);
  PERFORM public.write_audit_event('ptw.transition','safety_ptw',p_permit_id::text,jsonb_build_object('evidence_path',p_evidence_path,'equipment',p_equipment),jsonb_build_object('status',v_prev),jsonb_build_object('status',p_stage));
  RETURN jsonb_build_object('success',true,'previous_state',v_prev,'new_state',p_stage);
END $$;
REVOKE ALL ON FUNCTION public.advance_ptw_stage(UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_ptw_stage(UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) TO authenticated;

-- Atomic contractor survey submission + staging insert. The client supplies only
-- field data; actor, contractor, jurisdiction, status and operation identity are
-- derived/validated by the server.
CREATE OR REPLACE FUNCTION public.submit_contractor_survey(
  p_title TEXT, p_work_order_number TEXT, p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_submission UUID; v_item JSONB;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND OR v_user.role<>'contractor' THEN RAISE EXCEPTION 'Authorized contractor profile required'; END IF;
  IF v_user.section_id IS NULL OR v_user.je_jurisdiction_id IS NULL THEN RAISE EXCEPTION 'Contractor jurisdiction is not assigned'; END IF;
  IF trim(COALESCE(p_title,''))='' OR trim(COALESCE(p_work_order_number,''))='' THEN RAISE EXCEPTION 'Survey title and work order are required'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'At least one survey asset is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.work_orders w WHERE w.order_number=trim(p_work_order_number) AND w.section_id=v_user.section_id AND (w.contractor_id=v_user.id OR w.contractor_id IS NULL)) THEN RAISE EXCEPTION 'Work order is not assigned to the contractor jurisdiction'; END IF;
  INSERT INTO public.survey_submissions(contractor_id,submission_code,region_id,division_id,section_id,je_jurisdiction_id,work_order_number,title,asset_counts,status)
  VALUES(v_user.id,'SURV-'||to_char(NOW(),'YYYY')||'-'||substr(gen_random_uuid()::text,1,8),v_user.region_id,v_user.division_id,v_user.section_id,v_user.je_jurisdiction_id,trim(p_work_order_number),trim(p_title),
    (SELECT jsonb_object_agg(k,cnt) FROM (SELECT CASE WHEN x->>'assetType'='pole' THEN 'poles' WHEN x->>'assetType'='transformer' THEN 'transformers' WHEN x->>'assetType'='consumer' THEN 'consumers' ELSE (x->>'assetType')||'s' END k, count(*) cnt FROM jsonb_array_elements(p_items) x GROUP BY 1) q),'submitted') RETURNING id INTO v_submission;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF (v_item->>'locationSource') NOT IN ('GPS','MANUAL') THEN RAISE EXCEPTION 'Invalid survey location source'; END IF;
    IF ((v_item->'coordinates'->>0)::numeric) NOT BETWEEN -90 AND 90 OR ((v_item->'coordinates'->>1)::numeric) NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid survey coordinates'; END IF;
    IF v_item->>'photoUrl' IS NOT NULL AND (split_part(v_item->>'photoUrl','/',1) <> auth.uid()::text OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id='survey-evidence' AND o.name=v_item->>'photoUrl')) THEN RAISE EXCEPTION 'Survey evidence path is not owned by the contractor or does not exist'; END IF;
    INSERT INTO public.survey_staging_assets(submission_id,asset_type,temporary_code,attributes,gps_accuracy_m,altitude_m,photo_url,validation_status,validation_errors,location_source,geom,operation_id)
    VALUES(v_submission,v_item->>'assetType',v_item->>'temporaryCode',COALESCE(v_item->'attributes','{}'::jsonb),CASE WHEN v_item->>'locationSource'='GPS' THEN (v_item->>'gpsAccuracyM')::numeric ELSE NULL END,(v_item->>'altitudeM')::numeric,v_item->>'photoUrl','pending',v_item->'validationErrors',v_item->>'locationSource',ST_SetSRID(ST_MakePoint(((v_item->'coordinates'->>1)::numeric),((v_item->'coordinates'->>0)::numeric)),4326),COALESCE((v_item->>'operationId')::uuid,gen_random_uuid()));
  END LOOP;
  PERFORM public.write_audit_event('survey.submit','survey_approval',v_submission::text,jsonb_build_object('workOrderNumber',p_work_order_number,'assetCount',jsonb_array_length(p_items)));
  RETURN v_submission;
END $$;
REVOKE ALL ON FUNCTION public.submit_contractor_survey(TEXT,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contractor_survey(TEXT,TEXT,JSONB) TO authenticated;

-- Remove the old client-side survey write path from normal authenticated users.
REVOKE INSERT ON public.survey_submissions FROM authenticated;
REVOKE INSERT ON public.survey_staging_assets FROM authenticated;

-- Audit inserts are now server-derived through write_audit_event.
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (actor_id=auth.uid() AND user_id IN (SELECT id FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true));
