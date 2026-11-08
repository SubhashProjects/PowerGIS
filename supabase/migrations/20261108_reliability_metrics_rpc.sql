-- ============================================================================
-- PUDUCHERRY ELECTRICITY DEPARTMENT GIS PLATFORM
-- IEEE 1366 OUTAGE RELIABILITY ENGINE: SAIFI, SAIDI, CAIDI, MAIFI & ENS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_reliability_indices(
    p_section_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    section_code VARCHAR,
    section_name VARCHAR,
    total_consumers BIGINT,
    total_interruptions BIGINT,
    sum_consumer_interruptions NUMERIC,
    sum_customer_minutes_lost NUMERIC,
    saifi NUMERIC,
    saidi NUMERIC,
    caidi NUMERIC,
    ens_mwh NUMERIC
) AS $$
DECLARE
    v_total_consumers BIGINT;
BEGIN
    -- Get total active consumers in section
    SELECT COUNT(*) INTO v_total_consumers
    FROM public.consumers
    WHERE section_id = p_section_id;

    IF v_total_consumers IS NULL OR v_total_consumers = 0 THEN
        v_total_consumers := 1; -- Avoid division by zero
    END IF;

    RETURN QUERY
    WITH outage_data AS (
        SELECT
            o.id,
            o.duration_minutes,
            o.affected_consumers_count,
            (o.duration_minutes * o.affected_consumers_count) AS cml,
            o.energy_not_served_kwh
        FROM public.outages o
        WHERE o.section_id = p_section_id
          AND o.start_time >= p_start_date
          AND o.start_time <= p_end_date
    ),
    summary AS (
        SELECT
            COUNT(*)::BIGINT AS interruption_count,
            COALESCE(SUM(affected_consumers_count), 0)::NUMERIC AS total_affected,
            COALESCE(SUM(cml), 0)::NUMERIC AS total_cml,
            COALESCE(SUM(energy_not_served_kwh) / 1000.0, 0)::NUMERIC AS total_ens_mwh
        FROM outage_data
    )
    SELECT
        s.code,
        s.name,
        v_total_consumers,
        sum_row.interruption_count,
        sum_row.total_affected,
        sum_row.total_cml,
        ROUND((sum_row.total_affected / v_total_consumers::NUMERIC), 4) AS saifi,
        ROUND((sum_row.total_cml / v_total_consumers::NUMERIC), 2) AS saidi,
        CASE
            WHEN sum_row.total_affected > 0 THEN ROUND((sum_row.total_cml / sum_row.total_affected), 2)
            ELSE 0.00
        END AS caidi,
        ROUND(sum_row.total_ens_mwh, 3) AS ens_mwh
    FROM public.om_sections s
    CROSS JOIN summary sum_row
    WHERE s.id = p_section_id;
END;
$$ LANGUAGE plpgsql STABLE;
