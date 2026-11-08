-- ============================================================================
-- PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
-- ISO 55000 ASSET RISK SCORING MATRIX RPC
-- Calculates multi-parameter health & criticality index for Transformers & Feeders
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_transformer_risk_score(
    p_transformer_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_tr RECORD;
    v_fault_count INT;
    v_age_years NUMERIC;
    v_condition_index NUMERIC;
    v_age_factor NUMERIC;
    v_load_factor NUMERIC;
    v_fault_factor NUMERIC;
    v_criticality NUMERIC;
    v_total_risk NUMERIC;
    v_risk_category VARCHAR(20);
    v_recommendation TEXT;
BEGIN
    SELECT * INTO v_tr FROM public.transformers WHERE id = p_transformer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transformer % not found', p_transformer_id;
    END IF;

    -- Age in years
    v_age_years := COALESCE(EXTRACT(YEAR FROM AGE(NOW(), v_tr.installation_date)), 5.0);

    -- Fault count in last 24 months
    SELECT COUNT(*) INTO v_fault_count
    FROM public.faults
    WHERE transformer_id = p_transformer_id AND reported_at >= NOW() - INTERVAL '2 years';

    -- 1. Condition Index (0-100): Oil level, oil leakage, phase imbalance
    v_condition_index := 100.0;
    IF v_tr.has_oil_leakage THEN
        v_condition_index := v_condition_index - 35.0;
    END IF;
    IF v_tr.oil_level_pct < 85.0 THEN
        v_condition_index := v_condition_index - 25.0;
    END IF;
    IF v_tr.phase_imbalance_pct > 5.0 THEN
        v_condition_index := v_condition_index - (v_tr.phase_imbalance_pct * 2.0);
    END IF;
    v_condition_index := GREATEST(0.0, v_condition_index);

    -- Condition risk (inverse of health)
    v_condition_index := 100.0 - v_condition_index;

    -- 2. Age Factor (0-100): Design life is 25 years
    v_age_factor := LEAST(100.0, (v_age_years / 25.0) * 100.0);

    -- 3. Loading Factor (0-100): Continuous load percentage
    v_load_factor := LEAST(100.0, (v_tr.load_percentage / 100.0) * 100.0);

    -- 4. Fault Factor (0-100): 10 points per fault up to 100
    v_fault_factor := LEAST(100.0, v_fault_count * 20.0);

    -- 5. Criticality (Capacity based: 1000kVA is high criticality)
    v_criticality := CASE
        WHEN v_tr.capacity_kva >= 1000 THEN 90.0
        WHEN v_tr.capacity_kva >= 500 THEN 75.0
        WHEN v_tr.capacity_kva >= 250 THEN 50.0
        ELSE 30.0
    END;

    -- Weighted Risk Formula (ISO 55000):
    -- 30% Condition + 25% Age + 20% Loading + 15% Faults + 10% Criticality
    v_total_risk := ROUND((
        0.30 * v_condition_index +
        0.25 * v_age_factor +
        0.20 * v_load_factor +
        0.15 * v_fault_factor +
        0.10 * v_criticality
    )::numeric, 1);

    IF v_total_risk >= 75.0 THEN
        v_risk_category := 'Critical';
        v_recommendation := 'Immediate overhaul or capacity augmentation required. Deploy portable DTR test kit.';
    ELSIF v_total_risk >= 55.0 THEN
        v_risk_category := 'High';
        v_recommendation := 'Schedule top-up oil filtration and phase load balancing within 14 days.';
    ELSIF v_total_risk >= 35.0 THEN
        v_risk_category := 'Moderate';
        v_recommendation := 'Routine quarterly preventive maintenance cycle.';
    ELSE
        v_risk_category := 'Low';
        v_recommendation := 'Asset operating within normal IEEE/CEA thermal and electrical limits.';
    END IF;

    RETURN jsonb_build_object(
        'transformer_id', p_transformer_id,
        'transformer_code', v_tr.code,
        'age_years', v_age_years,
        'fault_count_2yr', v_fault_count,
        'condition_risk', v_condition_index,
        'age_factor', v_age_factor,
        'load_factor', v_load_factor,
        'total_risk_score', v_total_risk,
        'risk_category', v_risk_category,
        'recommendation', v_recommendation
    );
END;
$$ LANGUAGE plpgsql STABLE;
