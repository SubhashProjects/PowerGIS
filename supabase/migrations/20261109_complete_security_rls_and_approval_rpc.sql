-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION ZERO-TRUST DATABASE MIGRATION (PHASE 2 & PHASE 7)
-- Complete 29-Table RLS Enforcement, Zero-Trust Server-Side Approval RPCs,
-- Row-Locking (FOR UPDATE), Anti-Tampering Identity Derivation & Immutable Audits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL 29 CORE TABLES + SCADA TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.om_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.je_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.substations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feeders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transformers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.streetlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warranty_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipment_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.survey_staging_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.outage_reliability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.safety_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stores_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stores_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disaster_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scada_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scada_simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scada_breaker_commands ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS TO RESOLVE AUTHENTICATED USER IDENTITY & ROLES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.user_profiles AS $$
    SELECT * FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. JURISDICTION & HIERARCHICAL RLS POLICIES FOR ALL OPERATIONAL TABLES
-- ----------------------------------------------------------------------------

-- Regions, Divisions, Subdivisions, Sections, Wards (Read for authenticated, write super_admin)
DROP POLICY IF EXISTS regions_select_policy ON public.regions;
CREATE POLICY regions_select_policy ON public.regions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS divisions_select_policy ON public.divisions;
CREATE POLICY divisions_select_policy ON public.divisions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS subdivisions_select_policy ON public.subdivisions;
CREATE POLICY subdivisions_select_policy ON public.subdivisions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS om_sections_select_policy ON public.om_sections;
CREATE POLICY om_sections_select_policy ON public.om_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS je_jurisdictions_select_policy ON public.je_jurisdictions;
CREATE POLICY je_jurisdictions_select_policy ON public.je_jurisdictions FOR SELECT TO authenticated USING (true);

-- User Profiles Policy (View self, superiors view subordinates, super_admin/auditor view all)
DROP POLICY IF EXISTS user_profiles_select_policy ON public.user_profiles;
CREATE POLICY user_profiles_select_policy ON public.user_profiles FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    auth_user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se' AND user_profiles.region_id = u.region_id) OR
            (u.role = 'ee' AND user_profiles.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae') AND user_profiles.section_id = u.section_id)
        )
    )
);

-- Substations & Feeders Policy
DROP POLICY IF EXISTS substations_policy ON public.substations;
CREATE POLICY substations_policy ON public.substations FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'gis_admin', 'auditor') OR
            (u.role = 'se' AND substations.region_id = u.region_id) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.divisions d WHERE d.region_id = u.region_id AND d.id = u.division_id)) OR
            u.role IN ('aee', 'ae', 'je')
        )
    )
);

DROP POLICY IF EXISTS feeders_policy ON public.feeders;
CREATE POLICY feeders_policy ON public.feeders FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'gis_admin', 'auditor') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.substations s WHERE s.id = feeders.substation_id AND s.region_id = u.region_id)) OR
            u.role IN ('ee', 'aee', 'ae', 'je', 'contractor')
        )
    )
);

-- Streetlights Policy
DROP POLICY IF EXISTS streetlights_policy ON public.streetlights;
CREATE POLICY streetlights_policy ON public.streetlights FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'gis_admin', 'auditor') OR
            (u.role = 'se' AND streetlights.region_id = u.region_id) OR
            (u.role = 'ee' AND streetlights.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae') AND streetlights.section_id = u.section_id) OR
            (u.role = 'je' AND streetlights.je_jurisdiction_id = u.je_jurisdiction_id)
        )
    )
);

-- Warranties, Warranty Batches & Equipment Lifecycle
DROP POLICY IF EXISTS warranty_batches_policy ON public.warranty_batches;
CREATE POLICY warranty_batches_policy ON public.warranty_batches FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'auditor', 'gis_admin')
    )
);

DROP POLICY IF EXISTS warranties_policy ON public.warranties;
CREATE POLICY warranties_policy ON public.warranties FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'auditor', 'gis_admin')
    )
);

DROP POLICY IF EXISTS equipment_lifecycle_policy ON public.equipment_lifecycle;
CREATE POLICY equipment_lifecycle_policy ON public.equipment_lifecycle FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'auditor', 'gis_admin')
    )
);

-- Outages & Outage Reliability Metrics
DROP POLICY IF EXISTS outages_policy ON public.outages;
CREATE POLICY outages_policy ON public.outages FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor') OR
            (u.role IN ('aee', 'ae') AND outages.section_id = u.section_id) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id WHERE s.id = outages.section_id AND sd.division_id = u.division_id)) OR
            (u.role = 'se')
        )
    )
);

DROP POLICY IF EXISTS outage_reliability_metrics_policy ON public.outage_reliability_metrics;
CREATE POLICY outage_reliability_metrics_policy ON public.outage_reliability_metrics FOR SELECT TO authenticated
USING (true);

-- Safety Permits (Permit to Work - PTW)
DROP POLICY IF EXISTS safety_permits_select_policy ON public.safety_permits;
CREATE POLICY safety_permits_select_policy ON public.safety_permits FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor') OR
            safety_permits.applicant_id = u.id OR
            safety_permits.issuing_officer_id = u.id OR
            safety_permits.section_id = u.section_id OR
            u.role IN ('se', 'ee')
        )
    )
);

DROP POLICY IF EXISTS safety_permits_insert_policy ON public.safety_permits;
CREATE POLICY safety_permits_insert_policy ON public.safety_permits FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'je')
    )
);

-- Stores Inventory & Transactions
DROP POLICY IF EXISTS stores_inventory_policy ON public.stores_inventory;
CREATE POLICY stores_inventory_policy ON public.stores_inventory FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS stores_transactions_policy ON public.stores_transactions;
CREATE POLICY stores_transactions_policy ON public.stores_transactions FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'je', 'auditor')
    )
);

-- Disaster Management Events
DROP POLICY IF EXISTS disaster_events_policy ON public.disaster_events;
CREATE POLICY disaster_events_policy ON public.disaster_events FOR SELECT TO authenticated
USING (true);

-- Work Orders
DROP POLICY IF EXISTS work_orders_policy ON public.work_orders;
CREATE POLICY work_orders_policy ON public.work_orders FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor') OR
            (u.role = 'contractor' AND work_orders.contractor_id = u.id) OR
            (u.role = 'je' AND work_orders.section_id = u.section_id) OR
            (u.role IN ('aee', 'ae') AND work_orders.section_id = u.section_id) OR
            (u.role IN ('se', 'ee'))
        )
    )
);

-- ----------------------------------------------------------------------------
-- 4. ZERO-TRUST TRANSACTIONAL APPROVAL RPC FUNCTIONS WITH IDENTITY DERIVATION
-- Caller ID is derived from auth.uid() -- Never trust client parameters!
-- Row locking (SELECT ... FOR UPDATE) protects against concurrent approvals.
-- ----------------------------------------------------------------------------

-- Function 1: JE Verification (Caller identity derived from auth.uid())
CREATE OR REPLACE FUNCTION public.je_verify_submission(
    p_submission_id UUID,
    p_comments TEXT DEFAULT 'Field survey inspected and verified'
)
RETURNS JSONB AS $$
DECLARE
    v_caller public.user_profiles%ROWTYPE;
    v_sub public.survey_submissions%ROWTYPE;
BEGIN
    -- 1. Derive authenticated caller from server session
    SELECT * INTO v_caller FROM public.user_profiles WHERE auth_user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Caller session not found in user profiles';
    END IF;

    -- 2. Verify statutory JE role
    IF v_caller.role NOT IN ('je', 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: Only Junior Engineers (JE) or Super Admin can verify field surveys. Caller role: %', v_caller.role;
    END IF;

    -- 3. Lock submission row to prevent concurrent verification races
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    -- 4. Verify jurisdiction
    IF v_caller.role != 'super_admin' AND v_caller.section_id IS NOT NULL AND v_sub.section_id != v_caller.section_id THEN
        RAISE EXCEPTION 'Jurisdiction Violation: JE % is not assigned to section %', v_caller.full_name, v_sub.section_id;
    END IF;

    -- 5. Verify workflow state
    IF v_sub.status != 'submitted' THEN
        RAISE EXCEPTION 'Submission must be in submitted state. Current status: %', v_sub.status;
    END IF;

    -- 6. Update status
    UPDATE public.survey_submissions
    SET status = 'je_verified',
        je_id = v_caller.id,
        je_verified_at = NOW()
    WHERE id = p_submission_id;

    -- 7. Insert immutable approval history entry
    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, v_caller.id, 'je_verify', 'submitted', 'je_verified', p_comments
    );

    -- 8. Log to system audit trail
    INSERT INTO public.audit_logs (
        user_id, username, action, module, resource_id, details
    ) VALUES (
        v_caller.id, v_caller.username, 'JE_VERIFY_SURVEY', 'SURVEYS', p_submission_id::text,
        jsonb_build_object('submission_id', p_submission_id, 'comments', p_comments, 'status', 'je_verified')
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'je_verified',
        'verified_by', v_caller.full_name,
        'message', 'Survey verified by JE successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: AE Approval & Atomic Live GIS Publishing (Caller derived from auth.uid())
CREATE OR REPLACE FUNCTION public.ae_approve_and_publish(
    p_submission_id UUID,
    p_comments TEXT DEFAULT 'Sanctioned for live GIS catalog integration'
)
RETURNS JSONB AS $$
DECLARE
    v_caller public.user_profiles%ROWTYPE;
    v_sub public.survey_submissions%ROWTYPE;
    v_asset RECORD;
    v_published_count INT := 0;
    v_duplicate_count INT := 0;
BEGIN
    -- 1. Derive authenticated caller from server session
    SELECT * INTO v_caller FROM public.user_profiles WHERE auth_user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Caller session not found in user profiles';
    END IF;

    -- 2. Verify statutory AE/AEE/EE approval role
    IF v_caller.role NOT IN ('ae', 'aee', 'ee', 'se', 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: Final sanction requires Assistant Engineer (AE) or above. Caller role: %', v_caller.role;
    END IF;

    -- 3. Lock submission row to prevent concurrent approval races
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    -- 4. Verify jurisdiction
    IF v_caller.role NOT IN ('se', 'super_admin') AND v_caller.section_id IS NOT NULL AND v_sub.section_id != v_caller.section_id THEN
        RAISE EXCEPTION 'Jurisdiction Violation: Officer % is not assigned to section %', v_caller.full_name, v_sub.section_id;
    END IF;

    -- 5. Verify workflow state
    IF v_sub.status != 'je_verified' THEN
        RAISE EXCEPTION 'Submission must be verified by JE before AE can approve. Current status: %', v_sub.status;
    END IF;

    -- 6. Atomically promote staging assets into live GIS production tables
    FOR v_asset IN SELECT * FROM public.survey_staging_assets WHERE submission_id = p_submission_id LOOP
        IF v_asset.asset_type = 'pole' THEN
            -- Check for duplicates
            IF EXISTS (SELECT 1 FROM public.poles WHERE code = v_asset.temporary_code) THEN
                v_duplicate_count := v_duplicate_count + 1;
                UPDATE public.poles SET geom = v_asset.geom::geometry(Point, 4326) WHERE code = v_asset.temporary_code;
            ELSE
                INSERT INTO public.poles (
                    code, pole_number, pole_type, material, height_meters,
                    section_id, je_jurisdiction_id, geom
                ) VALUES (
                    v_asset.temporary_code,
                    COALESCE(v_asset.attributes->>'pole_number', v_asset.temporary_code),
                    COALESCE(v_asset.attributes->>'pole_type', 'PSCC 9m'),
                    COALESCE(v_asset.attributes->>'material', 'Pre-stressed Concrete'),
                    COALESCE((v_asset.attributes->>'height_meters')::numeric, 9.0),
                    v_sub.section_id,
                    v_sub.je_jurisdiction_id,
                    v_asset.geom::geometry(Point, 4326)
                );
                v_published_count := v_published_count + 1;
            END IF;

        ELSIF v_asset.asset_type = 'consumer' THEN
            -- Check for duplicates
            IF EXISTS (SELECT 1 FROM public.consumers WHERE consumer_number = v_asset.temporary_code) THEN
                v_duplicate_count := v_duplicate_count + 1;
                UPDATE public.consumers SET geom = v_asset.geom::geometry(Point, 4326) WHERE consumer_number = v_asset.temporary_code;
            ELSE
                INSERT INTO public.consumers (
                    consumer_number, name, address, meter_number, is_smart_meter,
                    section_id, je_jurisdiction_id, geom
                ) VALUES (
                    v_asset.temporary_code,
                    COALESCE(v_asset.attributes->>'name', 'Verified Consumer'),
                    COALESCE(v_asset.attributes->>'address', 'Puducherry'),
                    COALESCE(v_asset.attributes->>'meter_number', v_asset.temporary_code),
                    COALESCE((v_asset.attributes->>'is_smart_meter')::boolean, false),
                    v_sub.section_id,
                    v_sub.je_jurisdiction_id,
                    v_asset.geom::geometry(Point, 4326)
                );
                v_published_count := v_published_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- 7. Update submission status to ae_approved
    UPDATE public.survey_submissions
    SET status = 'ae_approved',
        ae_id = v_caller.id,
        ae_approved_at = NOW()
    WHERE id = p_submission_id;

    -- 8. Record approval history
    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, v_caller.id, 'ae_approve', 'je_verified', 'ae_approved', p_comments
    );

    -- 9. Record system audit trail
    INSERT INTO public.audit_logs (
        user_id, username, action, module, resource_id, details
    ) VALUES (
        v_caller.id, v_caller.username, 'AE_APPROVE_AND_PUBLISH', 'SURVEYS', p_submission_id::text,
        jsonb_build_object(
            'submission_id', p_submission_id,
            'published_count', v_published_count,
            'duplicate_count', v_duplicate_count,
            'approved_by', v_caller.full_name
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'ae_approved',
        'published_assets', v_published_count,
        'duplicate_assets', v_duplicate_count,
        'approved_by', v_caller.full_name,
        'message', format('Survey sanctioned: %s assets promoted to live GIS catalog.', v_published_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Explicit Survey Rejection with Mandatory Reason
CREATE OR REPLACE FUNCTION public.reject_survey_submission(
    p_submission_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller public.user_profiles%ROWTYPE;
    v_sub public.survey_submissions%ROWTYPE;
    v_prev_status VARCHAR;
BEGIN
    -- 1. Validate mandatory rejection reason
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A mandatory justification reason is required to reject a survey submission';
    END IF;

    -- 2. Derive caller identity
    SELECT * INTO v_caller FROM public.user_profiles WHERE auth_user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Caller session not found in user profiles';
    END IF;

    -- 3. Verify role authority
    IF v_caller.role NOT IN ('je', 'ae', 'aee', 'ee', 'se', 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: Insufficient authority to reject submission';
    END IF;

    -- 4. Lock row
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    v_prev_status := v_sub.status;

    -- 5. Update submission status to rejected
    UPDATE public.survey_submissions
    SET status = 'rejected',
        rejection_reason = p_reason
    WHERE id = p_submission_id;

    -- 6. Insert approval history
    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, v_caller.id, 'reject', v_prev_status, 'rejected', format('REJECTED: %s', p_reason)
    );

    -- 7. System audit log
    INSERT INTO public.audit_logs (
        user_id, username, action, module, resource_id, details
    ) VALUES (
        v_caller.id, v_caller.username, 'REJECT_SURVEY_SUBMISSION', 'SURVEYS', p_submission_id::text,
        jsonb_build_object('submission_id', p_submission_id, 'reason', p_reason, 'rejected_by', v_caller.full_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'rejected',
        'rejected_by', v_caller.full_name,
        'message', 'Survey submission rejected with statutory audit logging'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
