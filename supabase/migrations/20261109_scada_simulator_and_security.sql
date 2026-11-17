-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION MIGRATION: SCADA TELEMETRY SIMULATOR, DATA ISOLATION & AUDIT RLS
-- ============================================================================

-- 1. Upgrade scada_telemetry table with simulator isolation & 3-phase electrical fields
DO $$
BEGIN
    -- Add source_type column with default OPERATIONAL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'source_type') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL' CHECK (source_type IN ('OPERATIONAL', 'SIMULATOR'));
    END IF;

    -- Add simulation_session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'simulation_session_id') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN simulation_session_id VARCHAR(100);
    END IF;

    -- Add scenario_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'scenario_id') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN scenario_id VARCHAR(50);
    END IF;

    -- Add power_factor column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'power_factor') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN power_factor NUMERIC(4, 3) DEFAULT 0.965;
    END IF;

    -- Add 3-phase currents
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'phase_a_current_amps') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN phase_a_current_amps NUMERIC(7, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'phase_b_current_amps') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN phase_b_current_amps NUMERIC(7, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'phase_c_current_amps') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN phase_c_current_amps NUMERIC(7, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'neutral_current_amps') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN neutral_current_amps NUMERIC(7, 2);
    END IF;

    -- Add thermal & tap fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'transformer_load_pct') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN transformer_load_pct NUMERIC(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'winding_temp_c') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN winding_temp_c NUMERIC(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'oil_temp_c') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN oil_temp_c NUMERIC(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'tap_position') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN tap_position INT DEFAULT 0;
    END IF;

    -- Add timestamp columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'event_timestamp') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN event_timestamp TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'scada_telemetry' AND column_name = 'ingestion_timestamp') THEN
        ALTER TABLE public.scada_telemetry ADD COLUMN ingestion_timestamp TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Create SCADA Simulation Sessions Table
CREATE TABLE IF NOT EXISTS public.scada_simulation_sessions (
    id VARCHAR(100) PRIMARY KEY,
    session_name VARCHAR(100) NOT NULL,
    mode VARCHAR(50) NOT NULL,
    scenario VARCHAR(50) NOT NULL,
    speed INT DEFAULT 1 CHECK (speed IN (1, 2, 5, 10)),
    interval_seconds INT DEFAULT 2 CHECK (interval_seconds BETWEEN 1 AND 60),
    operator_id UUID REFERENCES public.user_profiles(id),
    operator_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 3. Create SCADA Breaker Commands Table (SBO Interlock Audit Trail)
CREATE TABLE IF NOT EXISTS public.scada_breaker_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(50) NOT NULL,
    substation_id UUID REFERENCES public.substations(id),
    feeder_id UUID REFERENCES public.feeders(id),
    target_state VARCHAR(10) NOT NULL CHECK (target_state IN ('OPEN', 'CLOSED')),
    previous_state VARCHAR(10) NOT NULL CHECK (previous_state IN ('OPEN', 'CLOSED')),
    supervisory_reason TEXT NOT NULL,
    operator_id UUID REFERENCES public.user_profiles(id),
    operator_name VARCHAR(100),
    operator_role VARCHAR(20),
    dispatched_via VARCHAR(30) DEFAULT 'IEC-60870-5-104',
    ptw_clearance_verified BOOLEAN DEFAULT FALSE,
    synchro_check_passed BOOLEAN DEFAULT TRUE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('SUCCESS', 'INTERLOCK_BLOCKED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.scada_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scada_simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scada_breaker_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for SCADA Telemetry
DROP POLICY IF EXISTS scada_telemetry_select_policy ON public.scada_telemetry;
CREATE POLICY scada_telemetry_select_policy ON public.scada_telemetry
FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin')
    )
);

DROP POLICY IF EXISTS scada_telemetry_insert_policy ON public.scada_telemetry;
CREATE POLICY scada_telemetry_insert_policy ON public.scada_telemetry
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'ae', 'gis_admin')
    )
);

-- 6. RLS Policies for Breaker Commands (SBO Safety)
DROP POLICY IF EXISTS scada_breaker_commands_select_policy ON public.scada_breaker_commands;
CREATE POLICY scada_breaker_commands_select_policy ON public.scada_breaker_commands
FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'auditor', 'gis_admin')
    )
);

DROP POLICY IF EXISTS scada_breaker_commands_insert_policy ON public.scada_breaker_commands;
CREATE POLICY scada_breaker_commands_insert_policy ON public.scada_breaker_commands
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'ae')
    )
);

-- 7. RLS Policies for Immutable Audit Logs
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('auditor', 'se', 'ee')
    )
);

DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (true); -- Append-only for all authenticated actors

-- 8. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scada_source_tag ON public.scada_telemetry(source_type, point_tag, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scada_sim_session ON public.scada_telemetry(simulation_session_id) WHERE simulation_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scada_breaker_tag ON public.scada_breaker_commands(tag, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
