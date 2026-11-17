-- PowerGIS V3.2 production security functions and RLS corrections

-- 4. Atomic inventory operations with row locking
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_inventory_atomic(
    p_item_id UUID,
    p_quantity NUMERIC,
    p_work_order_id UUID DEFAULT NULL,
    p_recipient_name TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_item public.stores_inventory%ROWTYPE;
    v_user public.user_profiles%ROWTYPE;
    v_new_stock NUMERIC;
    v_tx_id UUID;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Inventory issue quantity must be positive';
    END IF;

    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id = auth.uid() AND is_active = TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    IF v_user.role NOT IN ('super_admin','se','ee','aee','ae','je','gis_admin') THEN
        RAISE EXCEPTION 'Role % is not authorized to issue inventory', v_user.role;
    END IF;

    SELECT * INTO v_item FROM public.stores_inventory WHERE id = p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
    IF v_item.section_id IS NOT NULL AND v_user.role NOT IN ('super_admin','gis_admin') AND v_user.section_id IS DISTINCT FROM v_item.section_id THEN
        RAISE EXCEPTION 'Inventory item is outside your jurisdiction';
    END IF;
    IF v_item.is_integer_unit AND p_quantity <> trunc(p_quantity) THEN
        RAISE EXCEPTION 'This inventory item requires an integer quantity';
    END IF;
    IF v_item.current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, requested: %', v_item.current_stock, p_quantity;
    END IF;

    v_new_stock := v_item.current_stock - p_quantity;
    UPDATE public.stores_inventory SET current_stock = v_new_stock, updated_at = NOW() WHERE id = p_item_id;

    INSERT INTO public.stores_transactions(transaction_type, item_id, quantity, work_order_id, recipient_name, transacted_by, remarks)
    VALUES ('issue', p_item_id, p_quantity, p_work_order_id, p_recipient_name, v_user.id, p_remarks)
    RETURNING id INTO v_tx_id;

    INSERT INTO public.audit_logs(actor_id, user_id, actor_role, action, module, resource_id, details, previous_state, new_state)
    VALUES (auth.uid(), v_user.id, v_user.role, 'inventory.issue', 'stores', p_item_id::text,
            jsonb_build_object('quantity', p_quantity, 'work_order_id', p_work_order_id),
            jsonb_build_object('current_stock', v_item.current_stock),
            jsonb_build_object('current_stock', v_new_stock));

    RETURN jsonb_build_object('transaction_id', v_tx_id, 'new_stock', v_new_stock);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
    p_item_id UUID,
    p_transaction_type TEXT,
    p_quantity NUMERIC,
    p_work_order_id UUID DEFAULT NULL,
    p_recipient_name TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_item public.stores_inventory%ROWTYPE;
    v_user public.user_profiles%ROWTYPE;
    v_delta NUMERIC;
    v_new_stock NUMERIC;
    v_tx_id UUID;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF p_transaction_type NOT IN ('receipt','return','reconciliation','transfer','damaged') THEN RAISE EXCEPTION 'Unsupported transaction type'; END IF;
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    SELECT * INTO v_item FROM public.stores_inventory WHERE id=p_item_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
    IF v_item.is_integer_unit AND p_quantity <> trunc(p_quantity) THEN RAISE EXCEPTION 'Integer quantity required'; END IF;
    v_delta := CASE WHEN p_transaction_type IN ('receipt','return') THEN p_quantity ELSE -p_quantity END;
    v_new_stock := v_item.current_stock + v_delta;
    IF v_new_stock < 0 THEN RAISE EXCEPTION 'Transaction would create negative stock'; END IF;
    UPDATE public.stores_inventory SET current_stock=v_new_stock, updated_at=NOW() WHERE id=p_item_id;
    INSERT INTO public.stores_transactions(transaction_type,item_id,quantity,work_order_id,recipient_name,transacted_by,remarks)
    VALUES (p_transaction_type,p_item_id,p_quantity,p_work_order_id,p_recipient_name,v_user.id,p_remarks) RETURNING id INTO v_tx_id;
    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.issue_inventory_atomic(UUID,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_inventory_transaction(UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_inventory_atomic(UUID,NUMERIC,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction(UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Secure PTW request + state transition functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_ptw_request(
    p_feeder_id UUID,
    p_section_id UUID,
    p_work_description TEXT,
    p_isolation_points TEXT
)
RETURNS UUID AS $$
DECLARE
    v_user public.user_profiles%ROWTYPE;
    v_id UUID;
    v_number TEXT;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    IF p_work_description IS NULL OR trim(p_work_description)='' THEN RAISE EXCEPTION 'Work description is required'; END IF;
    IF p_isolation_points IS NULL OR trim(p_isolation_points)='' THEN RAISE EXCEPTION 'Isolation points are required'; END IF;
    IF v_user.role NOT IN ('super_admin','se','ee','aee','ae','je','contractor') THEN RAISE EXCEPTION 'Role not authorized to request PTW'; END IF;
    IF v_user.section_id IS NOT NULL AND v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'PTW section is outside your jurisdiction'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.feeders f WHERE f.id=p_feeder_id AND f.section_id=p_section_id) THEN RAISE EXCEPTION 'Feeder does not belong to requested section'; END IF;

    v_number := 'PTW-' || to_char(NOW(),'YYYY') || '-' || lpad((SELECT count(*)+1 FROM public.safety_permits)::text,4,'0');
    INSERT INTO public.safety_permits(ptw_number,feeder_id,applicant_id,work_description,isolation_points,section_id,status)
    VALUES(v_number,p_feeder_id,v_user.id,p_work_description,p_isolation_points,p_section_id,'requested') RETURNING id INTO v_id;

    INSERT INTO public.permit_safety_events(permit_id,actor_auth_user_id,actor_profile_id,actor_role,previous_state,new_state,confirmation,comments)
    VALUES(v_id,auth.uid(),v_user.id,v_user.role,'requested','requested',TRUE,'Permit request created');
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.advance_ptw_stage(
    p_permit_id UUID,
    p_stage public.ptw_status,
    p_equipment TEXT DEFAULT NULL,
    p_location_lat NUMERIC DEFAULT NULL,
    p_location_lng NUMERIC DEFAULT NULL,
    p_confirmation BOOLEAN DEFAULT FALSE,
    p_evidence_path TEXT DEFAULT NULL,
    p_comments TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user public.user_profiles%ROWTYPE;
    v_permit public.safety_permits%ROWTYPE;
    v_prev public.ptw_status;
    v_required_role public.official_role;
    v_geom GEOGRAPHY(Point,4326);
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    SELECT * INTO v_permit FROM public.safety_permits WHERE id=p_permit_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Permit not found'; END IF;

    v_prev := v_permit.status;
    IF p_stage = 'requested' THEN RAISE EXCEPTION 'Requested is the creation state and cannot be re-entered'; END IF;
    IF p_confirmation IS NOT TRUE THEN RAISE EXCEPTION 'Explicit safety confirmation is required'; END IF;
    IF p_evidence_path IS NULL AND p_stage IN ('absence_of_voltage_verified','earthing_confirmed','danger_notices_confirmed','additional_checks_verified','personnel_cleared','earths_removed') THEN
        RAISE EXCEPTION 'Evidence attachment is required for safety-critical stage %', p_stage;
    END IF;

    v_required_role := CASE p_stage
        WHEN 'isolation_verified' THEN 'je'
        WHEN 'absence_of_voltage_verified' THEN 'je'
        WHEN 'earthing_confirmed' THEN 'je'
        WHEN 'danger_notices_confirmed' THEN 'je'
        WHEN 'additional_checks_verified' THEN 'je'
        WHEN 'issuer_verified' THEN 'ae'
        WHEN 'approved' THEN 'ae'
        WHEN 'work_started' THEN 'je'
        WHEN 'suspended' THEN 'ae'
        WHEN 'extended' THEN 'ae'
        WHEN 'work_completed' THEN 'je'
        WHEN 'personnel_cleared' THEN 'je'
        WHEN 'earths_removed' THEN 'je'
        WHEN 'restoration_approved' THEN 'ae'
        WHEN 'restored' THEN 'ae'
        WHEN 'closed' THEN 'ae'
        ELSE NULL
    END;
    IF v_required_role IS NOT NULL AND v_user.role NOT IN ('super_admin',v_required_role) THEN
        RAISE EXCEPTION 'Role % is not authorized for PTW stage %', v_user.role, p_stage;
    END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM v_permit.section_id THEN
        RAISE EXCEPTION 'Permit is outside your jurisdiction';
    END IF;

    -- Valid state transitions only. No direct jump to restored/closed.
    IF NOT (
        (v_prev='requested' AND p_stage='isolation_verified') OR
        (v_prev='isolation_verified' AND p_stage='absence_of_voltage_verified') OR
        (v_prev='absence_of_voltage_verified' AND p_stage='earthing_confirmed') OR
        (v_prev='earthing_confirmed' AND p_stage='danger_notices_confirmed') OR
        (v_prev='danger_notices_confirmed' AND p_stage='additional_checks_verified') OR
        (v_prev='additional_checks_verified' AND p_stage='issuer_verified') OR
        (v_prev='issuer_verified' AND p_stage='approved') OR
        (v_prev='approved' AND p_stage='work_started') OR
        (v_prev='work_started' AND p_stage IN ('suspended','work_completed')) OR
        (v_prev='suspended' AND p_stage IN ('work_started','extended')) OR
        (v_prev='extended' AND p_stage='work_started') OR
        (v_prev='work_completed' AND p_stage='personnel_cleared') OR
        (v_prev='personnel_cleared' AND p_stage='earths_removed') OR
        (v_prev='earths_removed' AND p_stage='restoration_approved') OR
        (v_prev='restoration_approved' AND p_stage='restored') OR
        (v_prev='restored' AND p_stage='closed')
    ) THEN
        RAISE EXCEPTION 'Invalid PTW transition: % -> %', v_prev, p_stage;
    END IF;

    IF p_location_lat IS NOT NULL AND p_location_lng IS NOT NULL THEN
        IF p_location_lat NOT BETWEEN -90 AND 90 OR p_location_lng NOT BETWEEN -180 AND 180 THEN
            RAISE EXCEPTION 'Invalid evidence location coordinates';
        END IF;
        v_geom := ST_SetSRID(ST_MakePoint(p_location_lng,p_location_lat),4326)::geography;
    END IF;

    UPDATE public.safety_permits
    SET status=p_stage,
        isolation_verified=CASE WHEN p_stage='isolation_verified' THEN TRUE ELSE isolation_verified END,
        absence_of_voltage_verified=CASE WHEN p_stage='absence_of_voltage_verified' THEN TRUE ELSE absence_of_voltage_verified END,
        earthing_confirmed=CASE WHEN p_stage='earthing_confirmed' THEN TRUE ELSE earthing_confirmed END,
        danger_notices_posted=CASE WHEN p_stage='danger_notices_confirmed' THEN TRUE ELSE danger_notices_posted END,
        additional_safety_checks=CASE WHEN p_stage='additional_checks_verified' THEN coalesce(additional_safety_checks,'{}'::jsonb) || jsonb_build_object('verified',true) ELSE additional_safety_checks END,
        issuer_verified=CASE WHEN p_stage='issuer_verified' THEN TRUE ELSE issuer_verified END,
        issuing_officer_id=CASE WHEN p_stage IN ('issuer_verified','approved','restoration_approved','restored','closed') THEN v_user.id ELSE issuing_officer_id END,
        issue_time=CASE WHEN p_stage='approved' THEN NOW() ELSE issue_time END,
        work_started_at=CASE WHEN p_stage='work_started' THEN NOW() ELSE work_started_at END,
        suspended_at=CASE WHEN p_stage='suspended' THEN NOW() ELSE suspended_at END,
        extended_until=CASE WHEN p_stage='extended' THEN (NOW() + INTERVAL '8 hours') ELSE extended_until END,
        work_completed_at=CASE WHEN p_stage='work_completed' THEN NOW() ELSE work_completed_at END,
        personnel_cleared_at=CASE WHEN p_stage='personnel_cleared' THEN NOW() ELSE personnel_cleared_at END,
        earths_removed_at=CASE WHEN p_stage='earths_removed' THEN NOW() ELSE earths_removed_at END,
        restoration_approved_at=CASE WHEN p_stage='restoration_approved' THEN NOW() ELSE restoration_approved_at END,
        restored_at=CASE WHEN p_stage='restored' THEN NOW() ELSE restored_at END,
        closed_at=CASE WHEN p_stage='closed' THEN NOW() ELSE closed_at END
    WHERE id=p_permit_id;

    INSERT INTO public.permit_safety_events(permit_id,actor_auth_user_id,actor_profile_id,actor_role,previous_state,new_state,equipment,location,confirmation,evidence_path,comments)
    VALUES(p_permit_id,auth.uid(),v_user.id,v_user.role,v_prev,p_stage,p_equipment,v_geom,p_confirmation,p_evidence_path,p_comments);

    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,previous_state,new_state)
    VALUES(auth.uid(),v_user.id,v_user.role,'ptw.transition','safety_ptw',p_permit_id::text,
           jsonb_build_object('evidence_path',p_evidence_path,'equipment',p_equipment),
           jsonb_build_object('status',v_prev),jsonb_build_object('status',p_stage));

    RETURN jsonb_build_object('success',true,'previous_state',v_prev,'new_state',p_stage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_ptw_request(UUID,UUID,TEXT,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.advance_ptw_stage(UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ptw_request(UUID,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_ptw_stage(UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Secure survey approval functions: actor identity and jurisdiction are backend-derived
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.je_verify_submission(
    p_submission_id UUID,
    p_comments TEXT DEFAULT 'Field survey inspected and verified'
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
    v_user public.user_profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','je') THEN RAISE EXCEPTION 'Authorized JE profile required'; END IF;
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id=p_submission_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Survey submission not found'; END IF;
    IF v_sub.status <> 'submitted' THEN RAISE EXCEPTION 'Survey must be submitted before JE verification'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.je_jurisdiction_id IS DISTINCT FROM v_sub.je_jurisdiction_id THEN RAISE EXCEPTION 'Survey is outside JE jurisdiction'; END IF;
    IF EXISTS (SELECT 1 FROM public.survey_staging_assets WHERE submission_id=p_submission_id AND validation_status='error') THEN RAISE EXCEPTION 'Survey contains validation errors'; END IF;
    UPDATE public.survey_submissions SET status='je_verified', je_id=v_user.id, je_verified_at=NOW() WHERE id=p_submission_id;
    INSERT INTO public.approval_history(submission_id,actor_id,action,previous_status,new_status,comments) VALUES(p_submission_id,v_user.id,'je_verify','submitted','je_verified',p_comments);
    RETURN jsonb_build_object('success',true,'status','je_verified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.ae_approve_and_publish(
    p_submission_id UUID,
    p_comments TEXT DEFAULT 'Sanctioned for live GIS integration'
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
    v_user public.user_profiles%ROWTYPE;
    v_asset RECORD;
    v_count INT := 0;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','ae') THEN RAISE EXCEPTION 'Authorized AE profile required'; END IF;
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id=p_submission_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Survey submission not found'; END IF;
    IF v_sub.status <> 'je_verified' THEN RAISE EXCEPTION 'Survey must be JE verified before AE approval'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM v_sub.section_id THEN RAISE EXCEPTION 'Survey is outside AE section'; END IF;

    FOR v_asset IN SELECT * FROM public.survey_staging_assets WHERE submission_id=p_submission_id ORDER BY created_at LOOP
        IF v_asset.validation_status='error' THEN RAISE EXCEPTION 'Cannot publish invalid staged asset %', v_asset.temporary_code; END IF;
        IF v_asset.location_source NOT IN ('GPS','MANUAL') THEN RAISE EXCEPTION 'Invalid location source'; END IF;
        IF v_asset.asset_type='pole' THEN
            INSERT INTO public.poles(code,pole_number,pole_type,material,height_meters,feeder_id,section_id,je_jurisdiction_id,region_id,geom)
            VALUES(v_asset.temporary_code,COALESCE(v_asset.attributes->>'pole_number',v_asset.temporary_code),COALESCE(v_asset.attributes->>'pole_type','PSCC 9m'),COALESCE(v_asset.attributes->>'material','Concrete'),COALESCE((v_asset.attributes->>'height_meters')::numeric,9),NULLIF(v_asset.attributes->>'feeder_id','')::uuid,v_sub.section_id,v_sub.je_jurisdiction_id,v_sub.region_id,v_asset.geom::geometry(Point,4326))
            ON CONFLICT(code) DO UPDATE SET geom=EXCLUDED.geom, section_id=EXCLUDED.section_id, je_jurisdiction_id=EXCLUDED.je_jurisdiction_id;
            v_count:=v_count+1;
        ELSIF v_asset.asset_type='transformer' THEN
            INSERT INTO public.transformers(code,name,feeder_id,capacity_kva,make,serial_number,installation_date,section_id,je_jurisdiction_id,region_id,geom)
            VALUES(v_asset.temporary_code,COALESCE(v_asset.attributes->>'name',v_asset.temporary_code),NULLIF(v_asset.attributes->>'feeder_id','')::uuid,COALESCE((v_asset.attributes->>'capacity_kva')::int,0),v_asset.attributes->>'make',v_asset.attributes->>'serial_number',NULLIF(v_asset.attributes->>'installation_date','')::date,v_sub.section_id,v_sub.je_jurisdiction_id,v_sub.region_id,v_asset.geom::geometry(Point,4326))
            ON CONFLICT(code) DO UPDATE SET geom=EXCLUDED.geom, section_id=EXCLUDED.section_id, je_jurisdiction_id=EXCLUDED.je_jurisdiction_id;
            v_count:=v_count+1;
        ELSIF v_asset.asset_type='consumer' THEN
            INSERT INTO public.consumers(consumer_number,name,address,meter_number,is_smart_meter,section_id,je_jurisdiction_id,region_id,geom)
            VALUES(v_asset.temporary_code,COALESCE(v_asset.attributes->>'name','Registered Consumer'),COALESCE(v_asset.attributes->>'address',''),COALESCE(v_asset.attributes->>'meter_number',v_asset.temporary_code),COALESCE((v_asset.attributes->>'is_smart_meter')::boolean,false),v_sub.section_id,v_sub.je_jurisdiction_id,v_sub.region_id,v_asset.geom::geometry(Point,4326))
            ON CONFLICT(consumer_number) DO UPDATE SET geom=EXCLUDED.geom, section_id=EXCLUDED.section_id, je_jurisdiction_id=EXCLUDED.je_jurisdiction_id;
            v_count:=v_count+1;
        END IF;
    END LOOP;

    UPDATE public.survey_submissions SET status='ae_approved',ae_id=v_user.id,ae_approved_at=NOW() WHERE id=p_submission_id;
    INSERT INTO public.approval_history(submission_id,actor_id,action,previous_status,new_status,comments) VALUES(p_submission_id,v_user.id,'ae_approve','je_verified','ae_approved',p_comments);
    RETURN jsonb_build_object('success',true,'status','ae_approved','published_assets',v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.reject_survey_submission(
    p_submission_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
    v_user public.user_profiles%ROWTYPE;
BEGIN
    IF p_reason IS NULL OR trim(p_reason)='' THEN RAISE EXCEPTION 'Mandatory rejection reason is required'; END IF;
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','je','ae') THEN RAISE EXCEPTION 'Authorized JE/AE profile required'; END IF;
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id=p_submission_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Survey submission not found'; END IF;
    IF v_user.role='je' AND v_user.je_jurisdiction_id IS DISTINCT FROM v_sub.je_jurisdiction_id THEN RAISE EXCEPTION 'Survey is outside JE jurisdiction'; END IF;
    IF v_user.role='ae' AND v_user.section_id IS DISTINCT FROM v_sub.section_id THEN RAISE EXCEPTION 'Survey is outside AE section'; END IF;
    UPDATE public.survey_submissions SET status='rejected', rejection_reason=p_reason WHERE id=p_submission_id;
    INSERT INTO public.approval_history(submission_id,actor_id,action,previous_status,new_status,comments) VALUES(p_submission_id,v_user.id,'reject',v_sub.status,'rejected',p_reason);
    RETURN jsonb_build_object('success',true,'status','rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.je_verify_submission(UUID,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ae_approve_and_publish(UUID,TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_survey_submission(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.je_verify_submission(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ae_approve_and_publish(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_survey_submission(UUID,TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. SCADA source separation and alarms
-- ---------------------------------------------------------------------------
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'OPERATIONAL';
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS quality_flag TEXT NOT NULL DEFAULT 'GOOD';
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS simulation_session_id UUID;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scada_telemetry_source_type_ck'
    ) THEN
        ALTER TABLE public.scada_telemetry ADD CONSTRAINT scada_telemetry_source_type_ck CHECK (source_type IN ('OPERATIONAL','SIMULATOR'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_scada_source_time ON public.scada_telemetry(source_type, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.scada_alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_tag VARCHAR(100) NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('OPERATIONAL','SIMULATOR')),
    simulation_session_id UUID,
    alarm_code VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical','high','medium','low')),
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','cleared')),
    acknowledged_by UUID REFERENCES public.user_profiles(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scada_alarms_status_time ON public.scada_alarms(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scada_alarms_source_time ON public.scada_alarms(source_type, created_at DESC);
ALTER TABLE public.scada_alarms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scada_alarms_select_policy ON public.scada_alarms;
CREATE POLICY scada_alarms_select_policy ON public.scada_alarms FOR SELECT TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND u.role IN ('super_admin','se','ee','aee','ae','je','auditor','gis_admin')
    )
);

DROP POLICY IF EXISTS scada_alarms_insert_policy ON public.scada_alarms;
CREATE POLICY scada_alarms_insert_policy ON public.scada_alarms FOR INSERT TO authenticated WITH CHECK (
    source_type='SIMULATOR' AND EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND u.role IN ('super_admin','se','ee','ae','gis_admin')
    )
);

DROP POLICY IF EXISTS scada_telemetry_insert_policy ON public.scada_telemetry;
CREATE POLICY scada_telemetry_insert_policy ON public.scada_telemetry FOR INSERT TO authenticated WITH CHECK (
    (source_type='SIMULATOR' AND EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.role IN ('super_admin','se','ee','ae','gis_admin')))
    OR
    (source_type='OPERATIONAL' AND EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.role IN ('super_admin','se','ee','gis_admin')))
);

-- ---------------------------------------------------------------------------
-- 8. Fix earlier broken policy definitions (wrong/nonexistent column names)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS approval_history_select_policy ON public.approval_history;
CREATE POLICY approval_history_select_policy ON public.approval_history FOR SELECT TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u
        JOIN public.survey_submissions s ON s.id=approval_history.submission_id
        WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('auditor','gis_admin') OR
             (u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=s.section_id AND d.region_id=u.region_id)) OR
             (u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=s.section_id AND subd.division_id=u.division_id)) OR
             (u.role IN ('aee','ae') AND s.section_id=u.section_id) OR
             (u.role='je' AND s.je_jurisdiction_id=u.je_jurisdiction_id))
    )
);

DROP POLICY IF EXISTS approval_history_insert_policy ON public.approval_history;
CREATE POLICY approval_history_insert_policy ON public.approval_history FOR INSERT TO authenticated WITH CHECK (
    actor_id = (SELECT id FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1)
);

ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_to_id UUID;
DROP POLICY IF EXISTS work_orders_policy ON public.work_orders;
CREATE POLICY work_orders_policy ON public.work_orders FOR ALL TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('auditor','gis_admin') OR
             (u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=work_orders.section_id AND d.region_id=u.region_id)) OR
             (u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=work_orders.section_id AND subd.division_id=u.division_id)) OR
             (u.role IN ('aee','ae') AND work_orders.section_id=u.section_id) OR
             (u.role='je' AND work_orders.assigned_to=u.id))
    )
) WITH CHECK (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('se','ee','aee','ae','je','gis_admin') AND
             (u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=work_orders.section_id AND d.region_id=u.region_id) OR
              u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=work_orders.section_id AND subd.division_id=u.division_id) OR
              u.role IN ('aee','ae') AND work_orders.section_id=u.section_id OR
              u.role='je' AND work_orders.assigned_to=u.id OR
              u.role='gis_admin'))
    )
);

DROP POLICY IF EXISTS stores_inventory_policy ON public.stores_inventory;
CREATE POLICY stores_inventory_policy ON public.stores_inventory FOR SELECT TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('auditor','gis_admin') OR
             (u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=stores_inventory.section_id AND d.region_id=u.region_id)) OR
             (u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=stores_inventory.section_id AND subd.division_id=u.division_id)) OR
             (u.role IN ('aee','ae','je') AND stores_inventory.section_id=u.section_id))
    )
);

DROP POLICY IF EXISTS warranties_policy ON public.warranties;
CREATE POLICY warranties_policy ON public.warranties FOR ALL TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('auditor','gis_admin') OR EXISTS (
             SELECT 1 FROM public.equipment_lifecycle el
             WHERE el.asset_id=warranties.equipment_id AND
             ((u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=el.section_id AND d.region_id=u.region_id)) OR
              (u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=el.section_id AND subd.division_id=u.division_id)) OR
              (u.role IN ('aee','ae') AND el.section_id=u.section_id))))
    )
) WITH CHECK (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE
        AND (u.role IN ('se','ee','aee','ae','gis_admin') AND
             (u.role='gis_admin' OR EXISTS (
                SELECT 1 FROM public.equipment_lifecycle el
                WHERE el.asset_id=warranties.equipment_id AND
                ((u.role='se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=el.section_id AND d.region_id=u.region_id)) OR
                 (u.role='ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=el.section_id AND subd.division_id=u.division_id)) OR
                 (u.role IN ('aee','ae') AND el.section_id=u.section_id)))))
    )
);

-- No browser-level or database-level remote switching commands are enabled by this migration.
-- Any existing scada_breaker_commands table remains an audit/read-only boundary.

-- Trusted administration functions. Passwords are never stored in user_profiles.
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_role public.official_role DEFAULT NULL,
    p_designation TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_region_id UUID DEFAULT NULL,
    p_division_id UUID DEFAULT NULL,
    p_subdivision_id UUID DEFAULT NULL,
    p_section_id UUID DEFAULT NULL,
    p_je_jurisdiction_id UUID DEFAULT NULL,
    p_contractor_company TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS public.user_profiles AS $$
DECLARE
    v_caller public.user_profiles%ROWTYPE;
    v_updated public.user_profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_caller FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_caller.role <> 'super_admin' THEN RAISE EXCEPTION 'Super Administrator authorization required'; END IF;
    IF p_user_id = v_caller.id AND p_is_active = FALSE THEN RAISE EXCEPTION 'Cannot deactivate the current administrator session'; END IF;
    UPDATE public.user_profiles SET
      full_name=COALESCE(p_full_name,full_name), username=COALESCE(p_username,username), email=COALESCE(p_email,email),
      role=COALESCE(p_role,role), designation=COALESCE(p_designation,designation), phone=COALESCE(p_phone,phone),
      region_id=COALESCE(p_region_id,region_id), division_id=COALESCE(p_division_id,division_id),
      subdivision_id=COALESCE(p_subdivision_id,subdivision_id), section_id=COALESCE(p_section_id,section_id),
      je_jurisdiction_id=COALESCE(p_je_jurisdiction_id,je_jurisdiction_id), contractor_company=COALESCE(p_contractor_company,contractor_company),
      is_active=COALESCE(p_is_active,is_active), updated_at=NOW()
    WHERE id=p_user_id RETURNING * INTO v_updated;
    IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details) VALUES(auth.uid(),v_caller.id,v_caller.role,'user.update','admin',p_user_id::text,jsonb_build_object('role',v_updated.role,'is_active',v_updated.is_active));
    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_deactivate_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE v_caller public.user_profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_caller FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_caller.role <> 'super_admin' THEN RAISE EXCEPTION 'Super Administrator authorization required'; END IF;
    IF p_user_id=v_caller.id THEN RAISE EXCEPTION 'Cannot deactivate the current administrator session'; END IF;
    UPDATE public.user_profiles SET is_active=FALSE, updated_at=NOW() WHERE id=p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id) VALUES(auth.uid(),v_caller.id,v_caller.role,'user.deactivate','admin',p_user_id::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_profile(UUID,TEXT,TEXT,TEXT,public.official_role,TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,TEXT,BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_deactivate_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(UUID,TEXT,TEXT,TEXT,public.official_role,TEXT,TEXT,UUID,UUID,UUID,UUID,UUID,TEXT,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_user(UUID) TO authenticated;

-- Persistent work-order state machine.
CREATE OR REPLACE FUNCTION public.create_work_order(
    p_title TEXT, p_category TEXT, p_instructions TEXT, p_assigned_crew TEXT,
    p_section_id UUID, p_priority TEXT, p_due_date DATE
) RETURNS public.work_orders AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_order public.work_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','se','ee','aee','ae','je') THEN RAISE EXCEPTION 'Authorized engineering profile required'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'Work order section is outside your jurisdiction'; END IF;
    IF trim(p_title)='' OR trim(p_category)='' THEN RAISE EXCEPTION 'Title and category are required'; END IF;
    INSERT INTO public.work_orders(order_number,title,category,instructions,priority,status,assigned_crew,section_id,due_date,region_id,division_id)
    SELECT 'WO-'||to_char(NOW(),'YYYY')||'-'||lpad(((SELECT count(*)+1 FROM public.work_orders))::text,5,'0'), trim(p_title), p_category, trim(p_instructions), p_priority, 'assigned', trim(p_assigned_crew), p_section_id, p_due_date,
           d.region_id, d.id
    FROM public.om_sections s
    JOIN public.subdivisions sd ON sd.id=s.subdivision_id
    JOIN public.divisions d ON d.id=sd.division_id
    WHERE s.id=p_section_id
    RETURNING * INTO v_order;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state)
    VALUES(auth.uid(),v_user.id,v_user.role,'work_order.create','work_orders',v_order.id::text,jsonb_build_object('order_number',v_order.order_number),jsonb_build_object('status','assigned'));
    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.advance_work_order_status(p_work_order_id UUID, p_next_status TEXT)
RETURNS VOID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_order public.work_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
    SELECT * INTO v_order FROM public.work_orders WHERE id=p_work_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Work order not found'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM v_order.section_id THEN RAISE EXCEPTION 'Work order is outside your jurisdiction'; END IF;
    IF NOT ((v_order.status='assigned' AND p_next_status='in_progress') OR (v_order.status='in_progress' AND p_next_status='completed') OR (v_order.status='completed' AND p_next_status='verified') OR (v_order.status='verified' AND p_next_status='closed')) THEN
        RAISE EXCEPTION 'Invalid work-order transition % -> %', v_order.status, p_next_status;
    END IF;
    UPDATE public.work_orders SET status=p_next_status, je_verified=CASE WHEN p_next_status='verified' THEN TRUE ELSE je_verified END, ae_approved=CASE WHEN p_next_status='closed' THEN TRUE ELSE ae_approved END, completed_at=CASE WHEN p_next_status='completed' THEN NOW() ELSE completed_at END WHERE id=p_work_order_id;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,previous_state,new_state)
    VALUES(auth.uid(),v_user.id,v_user.role,'work_order.transition','work_orders',p_work_order_id::text,NULL,jsonb_build_object('status',v_order.status),jsonb_build_object('status',p_next_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.create_work_order(TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.advance_work_order_status(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_order(TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_work_order_status(UUID,TEXT) TO authenticated;

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
    VALUES('FLT-'||to_char(NOW(),'YYYY')||'-'||lpad(((SELECT count(*)+1 FROM public.faults))::text,5,'0'),p_category,p_description,p_priority,'new',p_feeder_id,p_section_id,p_je_jurisdiction_id,v_user.id,p_affected_consumers_est,ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326))
    RETURNING * INTO v_fault;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'fault.create','faults',v_fault.id::text,jsonb_build_object('coordinates',jsonb_build_array(p_lat,p_lng)),jsonb_build_object('status','new'));
    RETURN v_fault;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.transition_fault(p_fault_id UUID, p_status public.fault_status_type, p_assigned_to UUID DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_fault public.faults%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
    SELECT * INTO v_fault FROM public.faults WHERE id=p_fault_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Fault not found'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM v_fault.section_id THEN RAISE EXCEPTION 'Fault is outside your jurisdiction'; END IF;
    IF p_status='assigned' AND p_assigned_to IS NULL THEN RAISE EXCEPTION 'Assignment target is required'; END IF;
    IF p_status='closed' AND v_fault.status NOT IN ('verified','completed') THEN RAISE EXCEPTION 'Fault must be verified/completed before closure'; END IF;
    UPDATE public.faults SET status=p_status, assigned_to=COALESCE(p_assigned_to,assigned_to), resolved_at=CASE WHEN p_status IN ('completed','verified','closed') THEN COALESCE(resolved_at,NOW()) ELSE resolved_at END WHERE id=p_fault_id;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,previous_state,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'fault.transition','faults',p_fault_id::text,NULL,jsonb_build_object('status',v_fault.status),jsonb_build_object('status',p_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE ALL ON FUNCTION public.create_fault(TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_fault(UUID,public.fault_status_type,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_fault(TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_fault(UUID,public.fault_status_type,UUID) TO authenticated;

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
    IF trim(p_reason)='' THEN RAISE EXCEPTION 'Outage reason is required'; END IF;
    IF p_affected_consumers_count < 0 THEN RAISE EXCEPTION 'Affected consumer count cannot be negative'; END IF;
    IF p_expected_restoration IS NOT NULL AND p_expected_restoration < p_start_time THEN RAISE EXCEPTION 'Expected restoration cannot precede outage start'; END IF;
    INSERT INTO public.outages(outage_code,feeder_id,transformer_id,outage_type,reason,start_time,expected_restoration,affected_consumers_count,energy_not_served_kwh,section_id,status)
    VALUES('OUT-'||to_char(NOW(),'YYYY')||'-'||lpad(((SELECT count(*)+1 FROM public.outages))::text,5,'0'),p_feeder_id,p_transformer_id,p_outage_type,p_reason,p_start_time,p_expected_restoration,p_affected_consumers_count,p_energy_not_served_kwh,p_section_id,'active')
    RETURNING * INTO v_out;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'outage.create','outages',v_out.id::text,jsonb_build_object('outage_type',p_outage_type),jsonb_build_object('status','active'));
    RETURN v_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE ALL ON FUNCTION public.create_outage(TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_outage(TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC) TO authenticated;
