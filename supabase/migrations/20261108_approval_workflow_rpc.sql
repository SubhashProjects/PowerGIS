-- ============================================================================
-- PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
-- MULTI-TIER SURVEY STAGING TO PRODUCTION PUBLISHING RPC WORKFLOW
-- Enforces: Contractor Submit -> JE Verify -> AE Approve -> Production Live GIS
-- ============================================================================

-- Function 1: JE Verification
CREATE OR REPLACE FUNCTION public.je_verify_submission(
    p_submission_id UUID,
    p_je_id UUID,
    p_comments TEXT DEFAULT 'Field survey inspected and verified'
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
BEGIN
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    IF v_sub.status != 'submitted' THEN
        RAISE EXCEPTION 'Submission must be in submitted state to be verified by JE. Current status: %', v_sub.status;
    END IF;

    UPDATE public.survey_submissions
    SET status = 'je_verified',
        je_id = p_je_id,
        je_verified_at = NOW()
    WHERE id = p_submission_id;

    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, p_je_id, 'je_verify', 'submitted', 'je_verified', p_comments
    );

    RETURN jsonb_build_object('success', true, 'status', 'je_verified', 'message', 'Survey verified by JE successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: AE Approval and Atomic Production GIS Publishing
CREATE OR REPLACE FUNCTION public.ae_approve_and_publish(
    p_submission_id UUID,
    p_ae_id UUID,
    p_comments TEXT DEFAULT 'Sanctioned for live GIS integration'
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
    v_asset RECORD;
    v_published_count INT := 0;
BEGIN
    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    IF v_sub.status != 'je_verified' THEN
        RAISE EXCEPTION 'Submission must be verified by JE before AE can approve. Current status: %', v_sub.status;
    END IF;

    -- Publish staging assets into live GIS production tables
    FOR v_asset IN SELECT * FROM public.survey_staging_assets WHERE submission_id = p_submission_id LOOP
        IF v_asset.asset_type = 'pole' THEN
            INSERT INTO public.poles (
                code, pole_number, pole_type, material, height_meters,
                section_id, je_jurisdiction_id, geom
            ) VALUES (
                v_asset.temporary_code,
                COALESCE(v_asset.attributes->>'pole_number', v_asset.temporary_code),
                COALESCE(v_asset.attributes->>'pole_type', 'PSCC 9m'),
                COALESCE(v_asset.attributes->>'material', 'Concrete'),
                COALESCE((v_asset.attributes->>'height_meters')::numeric, 9.0),
                v_sub.section_id,
                v_sub.je_jurisdiction_id,
                v_asset.geom::geometry(Point, 4326)
            ) ON CONFLICT (code) DO UPDATE SET geom = EXCLUDED.geom;
            v_published_count := v_published_count + 1;

        ELSIF v_asset.asset_type = 'consumer' THEN
            INSERT INTO public.consumers (
                consumer_number, name, address, meter_number, is_smart_meter,
                section_id, je_jurisdiction_id, geom
            ) VALUES (
                v_asset.temporary_code,
                COALESCE(v_asset.attributes->>'name', 'Registered Consumer'),
                COALESCE(v_asset.attributes->>'address', 'Puducherry'),
                COALESCE(v_asset.attributes->>'meter_number', v_asset.temporary_code),
                COALESCE((v_asset.attributes->>'is_smart_meter')::boolean, false),
                v_sub.section_id,
                v_sub.je_jurisdiction_id,
                v_asset.geom::geometry(Point, 4326)
            ) ON CONFLICT (consumer_number) DO UPDATE SET geom = EXCLUDED.geom;
            v_published_count := v_published_count + 1;
        END IF;
    END LOOP;

    -- Update submission status
    UPDATE public.survey_submissions
    SET status = 'ae_approved',
        ae_id = p_ae_id,
        ae_approved_at = NOW()
    WHERE id = p_submission_id;

    -- Record immutable audit log
    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, p_ae_id, 'ae_approve', 'je_verified', 'ae_approved', p_comments
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'ae_approved',
        'published_assets', v_published_count,
        'message', 'Survey approved by AE and live GIS assets published successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Reject Submission with Mandatory Reason
CREATE OR REPLACE FUNCTION public.reject_survey_submission(
    p_submission_id UUID,
    p_actor_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_sub public.survey_submissions%ROWTYPE;
BEGIN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A mandatory rejection reason is required to reject a submission';
    END IF;

    SELECT * INTO v_sub FROM public.survey_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Survey submission % not found', p_submission_id;
    END IF;

    UPDATE public.survey_submissions
    SET status = 'rejected',
        rejection_reason = p_reason
    WHERE id = p_submission_id;

    INSERT INTO public.approval_history (
        submission_id, actor_id, action, previous_status, new_status, comments
    ) VALUES (
        p_submission_id, p_actor_id, 'reject', v_sub.status, 'rejected', p_reason
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'reason', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
