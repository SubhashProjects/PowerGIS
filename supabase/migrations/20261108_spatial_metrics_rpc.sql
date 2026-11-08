-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- SPATIAL DISTANCE & NETWORK TOPOLOGY CALCULATION RPC FUNCTIONS
-- Computes: Nearest Pole distance, Nearest DT distance, Distance along feeder,
-- Straight-line vs Network topology distance, Nearest Section Office distance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_fault_spatial_metrics(
    p_fault_geom GEOMETRY,
    p_feeder_id UUID DEFAULT NULL,
    p_section_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_nearest_pole RECORD;
    v_nearest_dt RECORD;
    v_feeder RECORD;
    v_section RECORD;
    v_dist_pole_m NUMERIC := NULL;
    v_dist_dt_m NUMERIC := NULL;
    v_dist_along_feeder_m NUMERIC := NULL;
    v_dist_office_km NUMERIC := NULL;
BEGIN
    -- 1. Nearest Pole distance (using spherical distance in meters via geography)
    SELECT id, code, pole_number, ST_Distance(geom::geography, p_fault_geom::geography) AS dist_m
    INTO v_nearest_pole
    FROM public.poles
    ORDER BY geom <-> p_fault_geom
    LIMIT 1;

    IF FOUND THEN
        v_dist_pole_m := ROUND(v_nearest_pole.dist_m::numeric, 2);
    END IF;

    -- 2. Nearest Distribution Transformer (DT) distance
    SELECT id, code, name, ST_Distance(geom::geography, p_fault_geom::geography) AS dist_m
    INTO v_nearest_dt
    FROM public.transformers
    ORDER BY geom <-> p_fault_geom
    LIMIT 1;

    IF FOUND THEN
        v_dist_dt_m := ROUND(v_nearest_dt.dist_m::numeric, 2);
    END IF;

    -- 3. Distance along Feeder (LineString projection)
    IF p_feeder_id IS NOT NULL THEN
        SELECT id, code, name, geom,
               ST_Length(geom::geography) AS total_feeder_len_m,
               ST_LineLocatePoint(geom, p_fault_geom) AS frac
        INTO v_feeder
        FROM public.feeders
        WHERE id = p_feeder_id;

        IF FOUND AND v_feeder.geom IS NOT NULL THEN
            v_dist_along_feeder_m := ROUND((v_feeder.total_feeder_len_m * v_feeder.frac)::numeric, 2);
        END IF;
    END IF;

    -- 4. Distance from O&M Section Office
    IF p_section_id IS NOT NULL THEN
        SELECT id, code, name, office_location,
               ST_Distance(office_location::geography, p_fault_geom::geography) / 1000.0 AS dist_km
        INTO v_section
        FROM public.om_sections
        WHERE id = p_section_id;

        IF FOUND AND v_section.office_location IS NOT NULL THEN
            v_dist_office_km := ROUND(v_section.dist_km::numeric, 2);
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'nearest_pole_id', v_nearest_pole.id,
        'nearest_pole_code', v_nearest_pole.code,
        'distance_from_pole_m', v_dist_pole_m,
        'nearest_dt_id', v_nearest_dt.id,
        'nearest_dt_code', v_nearest_dt.code,
        'distance_from_dt_m', v_dist_dt_m,
        'distance_along_feeder_m', v_dist_along_feeder_m,
        'distance_from_office_km', v_dist_office_km
    );
END;
$$ LANGUAGE plpgsql STABLE;
