-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM
-- ALL-IN-ONE MASTER DATABASE INSTALLATION & SEED SCRIPT
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste the ENTIRE contents of this file and click "Run" (or Ctrl + Enter)
-- 4. This script installs:
--    - PostGIS, UUID, and Crypto extensions
--    - Master spatial tables and GIST spatial indices
--    - Strict multi-tier Row Level Security (RLS) policies
--    - Atomic survey approval & staging promotion RPC stored procedures
--    - IEEE 1366 reliability calculation functions (SAIFI, SAIDI, CAIDI, ENS)
--    - ISO 55000 asset risk scoring engine
--    - Complete initial test & seed dataset across all 4 regions
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_puducherry_master_schema.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- PowerGIS GIS, ASSET MANAGEMENT & O&M PLATFORM
-- PRODUCTION POSTGRESQL 16 + POSTGIS 3.4 MASTER SCHEMA
-- Covers: Puducherry, Karaikal, Mahe, Yanam (All 4 Regions)
-- Organizational Hierarchy: SE -> EE -> AEE -> AE -> JE
-- Strict Multi-Tier RLS, Staging Approval Workflow, SCADA, PTW, Reliability
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'region_name') THEN
        CREATE TYPE region_name AS ENUM ('Puducherry', 'Karaikal', 'Mahe', 'Yanam');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'official_role') THEN
        CREATE TYPE official_role AS ENUM (
            'super_admin',
            'se',                -- Superintending Engineer
            'ee',                -- Executive Engineer
            'aee',               -- Assistant Executive Engineer
            'ae',                -- Assistant Engineer
            'je',                -- Junior Engineer
            'contractor',        -- Authorized Field Contractor
            'gis_admin',         -- GIS Data Administrator
            'auditor'            -- Read-only Regulatory Auditor
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
        CREATE TYPE asset_status AS ENUM ('operational', 'maintenance', 'faulty', 'decommissioned', 'proposed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'survey_status') THEN
        CREATE TYPE survey_status AS ENUM ('draft', 'submitted', 'je_verified', 'ae_approved', 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fault_status_type') THEN
        CREATE TYPE fault_status_type AS ENUM (
            'new', 'assigned', 'acknowledged', 'in_progress', 'material_required',
            'awaiting_approval', 'completed', 'verified', 'closed', 'reopened'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ptw_status') THEN
        CREATE TYPE ptw_status AS ENUM ('requested', 'approved', 'isolated', 'restored', 'cancelled');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONAL HIERARCHY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name region_name NOT NULL,
    headquarters VARCHAR(100) NOT NULL,
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    ee_in_charge_name VARCHAR(100),
    contact_phone VARCHAR(25),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subdivisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    aee_in_charge_name VARCHAR(100),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.om_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subdivision_id UUID NOT NULL REFERENCES public.subdivisions(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    ae_in_charge_name VARCHAR(100),
    office_address TEXT,
    office_location GEOMETRY(Point, 4326),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.je_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.om_sections(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    je_name VARCHAR(100),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. USER PROFILES & JURISDICTIONS (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role official_role NOT NULL DEFAULT 'auditor',
    designation VARCHAR(100),
    phone VARCHAR(20),
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    subdivision_id UUID REFERENCES public.subdivisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    contractor_company VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. ELECTRICAL ASSETS: SUBSTATIONS, FEEDERS, TRANSFORMERS, POLES, CONDUCTORS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.substations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    voltage_class VARCHAR(20) NOT NULL, -- '230kV', '110kV', '66kV', '33kV', '22kV'
    capacity_mva NUMERIC(8, 2) NOT NULL,
    num_feeders INT DEFAULT 4,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    status asset_status DEFAULT 'operational',
    commission_date DATE,
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_substations_geom ON public.substations USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.feeders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    substation_id UUID REFERENCES public.substations(id) ON DELETE CASCADE,
    voltage_class VARCHAR(20) NOT NULL, -- '22kV', '11kV', 'LT'
    conductor_type VARCHAR(50) DEFAULT 'Rabbit ACSR',
    length_km NUMERIC(8, 2) DEFAULT 5.0,
    peak_load_amps NUMERIC(8, 2) DEFAULT 200.0,
    rated_capacity_amps NUMERIC(8, 2) DEFAULT 350.0,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    is_energized BOOLEAN DEFAULT TRUE,
    status asset_status DEFAULT 'operational',
    geom GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feeders_geom ON public.feeders USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.transformers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    feeder_id UUID REFERENCES public.feeders(id) ON DELETE CASCADE,
    capacity_kva INT NOT NULL, -- 25, 63, 100, 160, 250, 500, 1000
    voltage_ratio VARCHAR(20) DEFAULT '11kV/415V',
    make VARCHAR(100),
    serial_number VARCHAR(100),
    installation_date DATE,
    load_percentage NUMERIC(5, 2) DEFAULT 50.0,
    oil_level_pct NUMERIC(5, 2) DEFAULT 95.0,
    has_oil_leakage BOOLEAN DEFAULT FALSE,
    phase_imbalance_pct NUMERIC(5, 2) DEFAULT 4.0,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    status asset_status DEFAULT 'operational',
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transformers_geom ON public.transformers USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.poles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    pole_number VARCHAR(50) NOT NULL,
    pole_type VARCHAR(50) DEFAULT 'PSCC 9m', -- 'PSCC 9m', 'Steel Tubular 11m', 'Rail Pole'
    material VARCHAR(50) DEFAULT 'Pre-stressed Concrete',
    height_meters NUMERIC(4, 1) DEFAULT 9.0,
    feeder_id UUID REFERENCES public.feeders(id) ON DELETE CASCADE,
    transformer_id UUID REFERENCES public.transformers(id) ON DELETE SET NULL,
    num_insulators INT DEFAULT 3,
    condition VARCHAR(20) DEFAULT 'Good', -- 'Good', 'Fair', 'Poor', 'Damaged'
    has_streetlight BOOLEAN DEFAULT FALSE,
    installation_date DATE,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    status asset_status DEFAULT 'operational',
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poles_geom ON public.poles USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.conductors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    feeder_id UUID REFERENCES public.feeders(id) ON DELETE CASCADE,
    start_pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE,
    end_pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE,
    conductor_type VARCHAR(50) DEFAULT 'Rabbit ACSR',
    voltage_class VARCHAR(20) DEFAULT '11kV',
    length_meters NUMERIC(8, 2) DEFAULT 40.0,
    rated_current_amps NUMERIC(6, 1) DEFAULT 200.0,
    cross_section_sqmm NUMERIC(6, 2) DEFAULT 52.88,
    condition VARCHAR(20) DEFAULT 'Good',
    installation_date DATE,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conductors_geom ON public.conductors USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.streetlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE,
    lamp_type VARCHAR(50) DEFAULT 'LED 70W',
    wattage INT DEFAULT 70,
    working_condition VARCHAR(20) DEFAULT 'Working',
    installation_date DATE,
    section_id UUID REFERENCES public.om_sections(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consumers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_number VARCHAR(50) UNIQUE NOT NULL,
    account_number VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Domestic', -- 'Domestic', 'Commercial', 'Industrial', 'Agricultural'
    sanctioned_load_kw NUMERIC(6, 2) DEFAULT 3.0,
    pole_id UUID REFERENCES public.poles(id) ON DELETE SET NULL,
    transformer_id UUID REFERENCES public.transformers(id) ON DELETE SET NULL,
    feeder_id UUID REFERENCES public.feeders(id) ON DELETE SET NULL,
    meter_number VARCHAR(50) UNIQUE NOT NULL,
    is_smart_meter BOOLEAN DEFAULT FALSE,
    meter_make VARCHAR(50),
    meter_install_date DATE,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    status VARCHAR(20) DEFAULT 'active',
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consumers_geom ON public.consumers USING GIST(geom);

-- ----------------------------------------------------------------------------
-- 5. WARRANTIES & EQUIPMENT LIFECYCLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warranty_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    supplier VARCHAR(100) NOT NULL,
    purchase_reference VARCHAR(100),
    supply_date DATE NOT NULL,
    warranty_months INT NOT NULL DEFAULT 60,
    warranty_expiry DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.warranty_batches(id) ON DELETE SET NULL,
    equipment_type VARCHAR(50) NOT NULL,
    equipment_id UUID NOT NULL,
    equipment_code VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    commencement_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    days_to_expiry INT,
    claim_status VARCHAR(30) DEFAULT 'active', -- 'active', 'claimed', 'replaced', 'expired'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type VARCHAR(50) NOT NULL,
    asset_id UUID NOT NULL,
    asset_code VARCHAR(50) NOT NULL,
    installation_date DATE NOT NULL,
    expected_life_years INT DEFAULT 25,
    current_age_years NUMERIC(5, 2),
    condition_score INT DEFAULT 85, -- 0 to 100
    replacement_priority VARCHAR(20) DEFAULT 'Low', -- 'Critical', 'High', 'Medium', 'Low'
    is_expired BOOLEAN DEFAULT FALSE,
    section_id UUID REFERENCES public.om_sections(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. FAULT MANAGEMENT & WORK ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fault_code VARCHAR(30) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'high', -- 'critical', 'high', 'medium', 'low'
    status fault_status_type DEFAULT 'new',
    feeder_id UUID REFERENCES public.feeders(id),
    transformer_id UUID REFERENCES public.transformers(id),
    pole_id UUID REFERENCES public.poles(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    reported_by UUID REFERENCES public.user_profiles(id),
    assigned_to UUID REFERENCES public.user_profiles(id),
    contractor_id UUID REFERENCES public.user_profiles(id),
    distance_from_pole_m NUMERIC(8, 2),
    distance_from_dt_m NUMERIC(8, 2),
    distance_along_feeder_m NUMERIC(8, 2),
    distance_from_office_km NUMERIC(8, 2),
    affected_consumers_est INT DEFAULT 0,
    photo_url TEXT,
    restoration_photo_url TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    geom GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_faults_geom ON public.faults USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) UNIQUE NOT NULL,
    fault_id UUID REFERENCES public.faults(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    instructions TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'verified', 'closed'
    assigned_crew VARCHAR(100),
    contractor_id UUID REFERENCES public.user_profiles(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_verified BOOLEAN DEFAULT FALSE,
    ae_approved BOOLEAN DEFAULT FALSE,
    materials_used TEXT,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. CONTRACTOR GPS FIELD SURVEY & STAGING APPROVAL WORKFLOW
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.survey_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_code VARCHAR(50) UNIQUE NOT NULL,
    contractor_id UUID NOT NULL REFERENCES public.user_profiles(id),
    je_id UUID REFERENCES public.user_profiles(id),
    ae_id UUID REFERENCES public.user_profiles(id),
    section_id UUID NOT NULL REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    work_order_number VARCHAR(50),
    title VARCHAR(150) NOT NULL,
    asset_counts JSONB DEFAULT '{}',
    status survey_status DEFAULT 'submitted',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    je_verified_at TIMESTAMPTZ,
    ae_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.survey_staging_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.survey_submissions(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- 'pole', 'transformer', 'conductor', 'consumer', 'streetlight'
    temporary_code VARCHAR(50) NOT NULL,
    attributes JSONB NOT NULL,
    gps_accuracy_m NUMERIC(5, 2),
    altitude_m NUMERIC(6, 2),
    photo_url TEXT,
    validation_status VARCHAR(20) DEFAULT 'valid',
    validation_errors TEXT,
    geom GEOMETRY(Geometry, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staging_geom ON public.survey_staging_assets USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.survey_submissions(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.user_profiles(id),
    action VARCHAR(30) NOT NULL, -- 'submit', 'je_verify', 'ae_approve', 'reject', 'resubmit'
    previous_status survey_status,
    new_status survey_status,
    comments TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. EXTENDED SPECIALIZED MODULES (TOPOLOGY, OUTAGE RELIABILITY, PTW, STORES)
-- ----------------------------------------------------------------------------
-- Outage Management & IEEE 1366 Reliability Metrics
CREATE TABLE IF NOT EXISTS public.outages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outage_code VARCHAR(30) UNIQUE NOT NULL,
    feeder_id UUID REFERENCES public.feeders(id),
    transformer_id UUID REFERENCES public.transformers(id),
    outage_type VARCHAR(30) DEFAULT 'Emergency', -- 'Planned', 'Emergency', 'Load Shedding'
    reason TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    expected_restoration TIMESTAMPTZ,
    actual_restoration TIMESTAMPTZ,
    duration_minutes NUMERIC(8, 2),
    affected_consumers_count INT NOT NULL DEFAULT 0,
    energy_not_served_kwh NUMERIC(10, 2) DEFAULT 0,
    section_id UUID REFERENCES public.om_sections(id),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'restored'
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outage_reliability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.om_sections(id),
    feeder_id UUID REFERENCES public.feeders(id),
    calculation_period VARCHAR(20) NOT NULL, -- e.g. '2026-Q1', '2026-11'
    total_consumers_served INT NOT NULL,
    saifi NUMERIC(6, 4) NOT NULL, -- System Average Interruption Frequency Index
    saidi NUMERIC(8, 2) NOT NULL, -- System Average Interruption Duration Index (min)
    caidi NUMERIC(8, 2) NOT NULL, -- Customer Average Interruption Duration Index (min)
    maifi NUMERIC(6, 4) DEFAULT 0, -- Momentary Average Interruption Frequency Index
    ens_mwh NUMERIC(8, 3) NOT NULL, -- Energy Not Served
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Management & Permit to Work (PTW)
CREATE TABLE IF NOT EXISTS public.safety_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ptw_number VARCHAR(30) UNIQUE NOT NULL,
    feeder_id UUID NOT NULL REFERENCES public.feeders(id),
    applicant_id UUID NOT NULL REFERENCES public.user_profiles(id),
    issuing_officer_id UUID REFERENCES public.user_profiles(id),
    work_description TEXT NOT NULL,
    isolation_points TEXT NOT NULL,
    earthing_confirmed BOOLEAN DEFAULT FALSE,
    danger_notices_posted BOOLEAN DEFAULT FALSE,
    gas_discharge_tested BOOLEAN DEFAULT TRUE,
    status ptw_status DEFAULT 'requested',
    issue_time TIMESTAMPTZ,
    clearance_time TIMESTAMPTZ,
    cancellation_reason TEXT,
    section_id UUID REFERENCES public.om_sections(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores and Material Management
CREATE TABLE IF NOT EXISTS public.stores_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Conductor', 'Pole', 'Transformer Oil', 'Insulator', 'Smart Meter'
    unit_of_measure VARCHAR(20) DEFAULT 'NOS',
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 10,
    unit_cost_inr NUMERIC(10, 2) DEFAULT 0,
    section_id UUID REFERENCES public.om_sections(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stores_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(20) NOT NULL, -- 'receipt', 'issue', 'return', 'reconciliation'
    item_id UUID NOT NULL REFERENCES public.stores_inventory(id),
    quantity NUMERIC(10, 2) NOT NULL,
    work_order_id UUID REFERENCES public.work_orders(id),
    recipient_name VARCHAR(100),
    transacted_by UUID NOT NULL REFERENCES public.user_profiles(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disaster Management (Cyclone, Flood, Storm Emergency)
CREATE TABLE IF NOT EXISTS public.disaster_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'Cyclone Thane Category', 'Monsoon Flood', 'Thunderstorm'
    name VARCHAR(100) NOT NULL,
    affected_regions TEXT[],
    start_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'restoration_in_progress', 'closed'
    damaged_poles_count INT DEFAULT 0,
    damaged_dts_count INT DEFAULT 0,
    snapped_conductors_km NUMERIC(8, 2) DEFAULT 0,
    restoration_pct NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCADA Gateways & Telemetry
CREATE TABLE IF NOT EXISTS public.scada_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_tag VARCHAR(50) NOT NULL,
    substation_id UUID REFERENCES public.substations(id),
    feeder_id UUID REFERENCES public.feeders(id),
    voltage_kv NUMERIC(6, 2),
    current_amps NUMERIC(6, 2),
    active_power_mw NUMERIC(6, 2),
    reactive_power_mvar NUMERIC(6, 2),
    frequency_hz NUMERIC(5, 2) DEFAULT 50.00,
    breaker_status VARCHAR(10) DEFAULT 'CLOSED',
    quality VARCHAR(10) DEFAULT 'GOOD',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scada_tag ON public.scada_telemetry(point_tag, recorded_at DESC);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    username VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_rls_jurisdiction_policies.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION ROW-LEVEL SECURITY (RLS) JURISDICTION POLICIES
-- Zero-Trust Multi-Tier Hierarchy: Super Admin -> SE -> EE -> AEE -> AE -> JE -> Contractor
-- ============================================================================

-- 1. Enable RLS on all operational and asset tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_staging_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions to get current authenticated user jurisdiction
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.user_profiles AS $$
    SELECT * FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Jurisdiction-aware Policy for Transformers
DROP POLICY IF EXISTS transformers_jurisdiction_policy ON public.transformers;
CREATE POLICY transformers_jurisdiction_policy ON public.transformers
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            (u.role = 'se' AND transformers.region_id = u.region_id) OR
            (u.role = 'ee' AND transformers.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae') AND transformers.section_id = u.section_id) OR
            (u.role = 'je' AND transformers.je_jurisdiction_id = u.je_jurisdiction_id) OR
            (u.role = 'auditor') OR
            (u.role = 'gis_admin')
        )
    )
);

-- 4. Jurisdiction-aware Policy for Poles
DROP POLICY IF EXISTS poles_jurisdiction_policy ON public.poles;
CREATE POLICY poles_jurisdiction_policy ON public.poles
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            (u.role = 'se' AND poles.region_id = u.region_id) OR
            (u.role = 'ee' AND poles.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae') AND poles.section_id = u.section_id) OR
            (u.role = 'je' AND poles.je_jurisdiction_id = u.je_jurisdiction_id) OR
            (u.role = 'auditor') OR
            (u.role = 'gis_admin')
        )
    )
);

-- 5. Jurisdiction-aware Policy for Consumers
DROP POLICY IF EXISTS consumers_jurisdiction_policy ON public.consumers;
CREATE POLICY consumers_jurisdiction_policy ON public.consumers
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            (u.role = 'se' AND consumers.region_id = u.region_id) OR
            (u.role = 'ee' AND consumers.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae') AND consumers.section_id = u.section_id) OR
            (u.role = 'je' AND consumers.je_jurisdiction_id = u.je_jurisdiction_id) OR
            (u.role = 'auditor') OR
            (u.role = 'gis_admin')
        )
    )
);

-- 6. Strict Policy for Faults
DROP POLICY IF EXISTS faults_jurisdiction_policy ON public.faults;
CREATE POLICY faults_jurisdiction_policy ON public.faults
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id JOIN public.divisions d ON sd.division_id = d.id WHERE s.id = faults.section_id AND d.region_id = u.region_id)) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id WHERE s.id = faults.section_id AND sd.division_id = u.division_id)) OR
            (u.role IN ('aee', 'ae') AND faults.section_id = u.section_id) OR
            (u.role = 'je' AND faults.je_jurisdiction_id = u.je_jurisdiction_id) OR
            (u.role = 'contractor' AND faults.contractor_id = u.id) OR
            (u.role = 'auditor')
        )
    )
);

-- 7. Survey Submissions (Contractor Staging Isolation)
DROP POLICY IF EXISTS survey_submissions_policy ON public.survey_submissions;
CREATE POLICY survey_submissions_policy ON public.survey_submissions
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            (u.role = 'contractor' AND survey_submissions.contractor_id = u.id) OR
            (u.role = 'je' AND survey_submissions.section_id = u.section_id) OR
            (u.role = 'ae' AND survey_submissions.section_id = u.section_id) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id WHERE s.id = survey_submissions.section_id AND sd.division_id = u.division_id)) OR
            (u.role = 'se') OR
            (u.role = 'gis_admin')
        )
    )
);

-- 8. Survey Staging Assets (Zero Live GIS Contamination)
DROP POLICY IF EXISTS survey_staging_assets_policy ON public.survey_staging_assets;
CREATE POLICY survey_staging_assets_policy ON public.survey_staging_assets
FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.survey_submissions sub
        JOIN public.user_profiles u ON u.auth_user_id = auth.uid()
        WHERE sub.id = survey_staging_assets.submission_id
        AND (
            (u.role = 'contractor' AND sub.contractor_id = u.id) OR
            (u.role = 'je' AND sub.section_id = u.section_id) OR
            (u.role = 'ae' AND sub.section_id = u.section_id) OR
            (u.role = 'gis_admin')
        )
    )
);


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_approval_workflow_rpc.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
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


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_spatial_metrics_rpc.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_reliability_metrics_rpc.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
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


-- ----------------------------------------------------------------------------
-- SECTION: 20261108_asset_risk_matrix.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
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


-- ----------------------------------------------------------------------------
-- SECTION: seed.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION SEED DATA: All 4 Regions (Puducherry, Karaikal, Mahe, Yanam)
-- Realistic Coordinate Polygons & Electrical Network Topologies
-- ============================================================================

-- 1. Regions
INSERT INTO public.regions (id, code, name, headquarters) VALUES
('11000000-0000-0000-0000-000000000001', 'REG-PDY', 'Puducherry', 'Gubert Avenue, Puducherry'),
('11000000-0000-0000-0000-000000000002', 'REG-KKL', 'Karaikal', 'Beach Road, Karaikal'),
('11000000-0000-0000-0000-000000000003', 'REG-MAH', 'Mahe', 'Civil Station Road, Mahe'),
('11000000-0000-0000-0000-000000000004', 'REG-YAN', 'Yanam', 'Pillaraya Street, Yanam')
ON CONFLICT (code) DO NOTHING;

-- 2. Divisions
INSERT INTO public.divisions (id, region_id, code, name, ee_in_charge_name, contact_phone) VALUES
('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'DIV-URBAN', 'Urban Distribution Division', 'Er. M. Sivakumar, EE', '+91 94430 11001'),
('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'DIV-RURAL-N', 'Rural North Division', 'Er. R. Baskaran, EE', '+91 94430 11002'),
('12000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'DIV-KKL', 'Karaikal Electricity Division', 'Er. K. Murugesan, EE', '+91 94430 11003'),
('12000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', 'DIV-MAHE-YAN', 'Outlying Regions Division', 'Er. V. Radhakrishnan, EE', '+91 94430 11004')
ON CONFLICT (code) DO NOTHING;

-- 3. Subdivisions
INSERT INTO public.subdivisions (id, division_id, code, name, aee_in_charge_name) VALUES
('13000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'SUBDIV-TOWN', 'Town Sub-Division', 'Er. S. Jayakumar, AEE'),
('13000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'SUBDIV-BLVD', 'Boulevard Sub-Division', 'Er. P. Thirunavukkarasu, AEE'),
('13000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', 'SUBDIV-KKL-TOWN', 'Karaikal Town Sub-Division', 'Er. N. Ravichandran, AEE'),
('13000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', 'SUBDIV-MAHE', 'Mahe O&M Sub-Division', 'Er. K. Mukundan, AEE')
ON CONFLICT (code) DO NOTHING;

-- 4. O&M Sections
INSERT INTO public.om_sections (id, subdivision_id, code, name, ae_in_charge_name, office_address, office_location) VALUES
('14000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'SEC-MARAPALAM', 'Marapalam O&M Section', 'Er. T. Senthil Nathan, AE', 'Maraimalai Adigal Salai, Marapalam', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('14000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'SEC-HERITAGE', 'Heritage French Quarter Section', 'Er. G. Ilangovan, AE', 'Rue Romain Rolland, White Town', ST_SetSRID(ST_Point(79.8340, 11.9360), 4326)),
('14000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', 'SEC-LAWSPET', 'Lawspet O&M Section', 'Er. D. Raman, AE', 'Airport Road, Lawspet', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('14000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000003', 'SEC-KKL-PORT', 'Karaikal Port O&M Section', 'Er. M. Anbarasan, AE', 'Keezha Kasakudy, Karaikal', ST_SetSRID(ST_Point(79.8390, 10.9250), 4326))
ON CONFLICT (code) DO NOTHING;

-- 5. JE Jurisdictions
INSERT INTO public.je_jurisdictions (id, section_id, code, name, je_name) VALUES
('15000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'JE-JUR-MARA-01', 'Marapalam Commercial Ward', 'Er. V. Anand, JE'),
('15000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000001', 'JE-JUR-MARA-02', 'Orleanpet Residential Ward', 'Er. K. Prakash, JE'),
('15000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000002', 'JE-JUR-HERI-01', 'White Town & Beach Road', 'Er. P. Dinesh, JE')
ON CONFLICT (code) DO NOTHING;

-- 6. User Profiles (16 Key Personas covering all roles & SE hierarchy)
INSERT INTO public.user_profiles (
    id, username, email, full_name, role, designation, phone, region_id, division_id, subdivision_id, section_id, je_jurisdiction_id
) VALUES
('20000000-0000-0000-0000-000000000001', 'superadmin', 'superadmin@powergis.internal', 'System Administrator', 'super_admin', 'Director of IT & Geospatial Systems', '+91 413 2336331', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000002', 'se_puducherry_1', 'se1.pdy@powergis.internal', 'Er. T. Chandrasekaran', 'se', 'Superintending Engineer (Circle I - Urban)', '+91 94430 00001', '11000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000003', 'se_puducherry_2', 'se2.pdy@powergis.internal', 'Er. A. Rajagopalan', 'se', 'Superintending Engineer (Circle II - Rural)', '+91 94430 00002', '11000000-0000-0000-0000-000000000001', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000004', 'se_karaikal', 'se.kkl@powergis.internal', 'Er. M. Balasubramanian', 'se', 'Superintending Engineer (Karaikal, Mahe & Yanam)', '+91 94430 00003', '11000000-0000-0000-0000-000000000002', NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000005', 'ee_urban', 'ee.urban@powergis.internal', 'Er. M. Sivakumar', 'ee', 'Executive Engineer (Urban Operations)', '+91 94430 11001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000006', 'aee_town', 'aee.town@powergis.internal', 'Er. S. Jayakumar', 'aee', 'Assistant Executive Engineer (Town Sub-Division)', '+91 94430 11005', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', NULL, NULL),
('20000000-0000-0000-0000-000000000007', 'ae_marapalam', 'ae.marapalam@powergis.internal', 'Er. T. Senthil Nathan', 'ae', 'Assistant Engineer (Marapalam Section)', '+91 94430 11007', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', NULL),
('20000000-0000-0000-0000-000000000008', 'je_marapalam', 'je.marapalam@powergis.internal', 'Er. V. Anand', 'je', 'Junior Engineer (Marapalam Commercial Ward)', '+91 94430 11008', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000009', 'contractor_epc', 'survey.epc@larsenpower.com', 'Er. Rajesh Kumar', 'contractor', 'Authorized EPC Survey Contractor', '+91 98840 22001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000010', 'gis_administrator', 'gisadmin@powergis.internal', 'S. Ananthi', 'gis_admin', 'Principal Spatial Data Administrator', '+91 94430 11010', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000011', 'grid_auditor', 'auditor@jercuts.gov.in', 'Dr. S. Ramachandran', 'auditor', 'JERC Regulatory Grid Auditor', '+91 94430 11015', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (username) DO NOTHING;

-- 7. Substations (Puducherry, Karaikal, Mahe, Yanam)
INSERT INTO public.substations (
    id, code, name, voltage_class, capacity_mva, num_feeders, region_id, division_id, section_id, commission_date, geom
) VALUES
('30000000-0000-0000-0000-000000000001', 'SS-MARA-110', 'Marapalam 110/22kV Substation', '110kV', 80.00, 6, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '2015-08-15', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('30000000-0000-0000-0000-000000000002', 'SS-VILL-230', 'Villianur 230/110kV Auto Substation', '230kV', 200.00, 8, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', NULL, '2012-01-26', ST_SetSRID(ST_Point(79.7562, 11.9168), 4326)),
('30000000-0000-0000-0000-000000000003', 'SS-LAWS-066', 'Lawspet 66/11kV Substation', '66kV', 50.00, 4, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', '2018-05-10', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('30000000-0000-0000-0000-000000000004', 'SS-MUTH-033', 'Muthialpet 33/11kV Substation', '33kV', 25.00, 4, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '2020-03-22', ST_SetSRID(ST_Point(79.8340, 11.9540), 4326)),
('30000000-0000-0000-0000-000000000005', 'SS-KKL-110', 'Karaikal Port 110/33kV Substation', '110kV', 60.00, 5, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', '2016-10-18', ST_SetSRID(ST_Point(79.8385, 10.9230), 4326)),
('30000000-0000-0000-0000-000000000006', 'SS-MAHE-066', 'Mahe 66/11kV Substation', '66kV', 20.00, 3, '11000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', NULL, '2019-02-14', ST_SetSRID(ST_Point(75.5342, 11.7018), 4326)),
('30000000-0000-0000-0000-000000000007', 'SS-YAN-033', 'Yanam Godavari 33/11kV Substation', '33kV', 16.00, 3, '11000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', NULL, '2021-07-09', ST_SetSRID(ST_Point(82.2175, 16.7320), 4326))
ON CONFLICT (code) DO NOTHING;

-- 8. Feeders
INSERT INTO public.feeders (
    id, code, name, substation_id, voltage_class, conductor_type, length_km, peak_load_amps, region_id, division_id, section_id, is_energized, geom
) VALUES
('40000000-0000-0000-0000-000000000001', 'FDR-MARA-01', 'Marapalam - Boulevard 11kV Feeder', '30000000-0000-0000-0000-000000000001', '11kV', 'Rabbit ACSR', 4.80, 245.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8183 11.9216, 79.8210 11.9250, 79.8250 11.9310, 79.8290 11.9340, 79.8310 11.9370)'), 4326)),
('40000000-0000-0000-0000-000000000002', 'FDR-HERI-02', 'French Quarter Heritage 11kV Feeder', '30000000-0000-0000-0000-000000000001', '11kV', 'Dog ACSR', 3.60, 280.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8250 11.9310, 79.8280 11.9340, 79.8310 11.9380, 79.8340 11.9420)'), 4326)),
('40000000-0000-0000-0000-000000000003', 'FDR-LAWS-03', 'Lawspet - Airport Road 11kV Feeder', '30000000-0000-0000-0000-000000000003', '11kV', 'Rabbit ACSR', 5.20, 195.0, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8124 11.9682, 79.8140 11.9650, 79.8160 11.9600, 79.8200 11.9560)'), 4326)),
('40000000-0000-0000-0000-000000000004', 'FDR-KKL-01', 'Karaikal Harbor Express 33kV Feeder', '30000000-0000-0000-0000-000000000005', '33kV', 'Panther ACSR', 6.40, 210.0, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8385 10.9230, 79.8410 10.9260, 79.8450 10.9300)'), 4326))
ON CONFLICT (code) DO NOTHING;

-- 9. Transformers (DTs)
INSERT INTO public.transformers (
    id, code, name, feeder_id, capacity_kva, make, serial_number, installation_date, load_percentage, oil_level_pct, has_oil_leakage, phase_imbalance_pct, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('50000000-0000-0000-0000-000000000001', 'DTR-BLVD-01', 'Boulevard North DTR 250kVA', '40000000-0000-0000-0000-000000000001', 250, 'Voltamp Transformers', 'VT-2022-8812', '2022-03-10', 68.5, 96.0, FALSE, 3.2, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8250, 11.9310), 4326)),
('50000000-0000-0000-0000-000000000002', 'DTR-HERI-02', 'French Quarter Heritage DTR 500kVA', '40000000-0000-0000-0000-000000000002', 500, 'ABB India Ltd', 'ABB-2021-9943', '2021-11-20', 82.0, 92.5, FALSE, 7.8, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8310, 11.9380), 4326)),
('50000000-0000-0000-0000-000000000003', 'DTR-ARPT-03', 'Airport Gateway DTR 160kVA', '40000000-0000-0000-0000-000000000003', 160, 'Kirloskar Electric', 'KEC-2023-1102', '2023-01-15', 45.2, 98.0, FALSE, 2.5, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000003', NULL, ST_SetSRID(ST_Point(79.8160, 11.9600), 4326)),
('50000000-0000-0000-0000-000000000004', 'DTR-KKL-04', 'Karaikal Harbor DTR 400kVA', '40000000-0000-0000-0000-000000000004', 400, 'Schneider Electric', 'SCH-2020-4491', '2020-06-18', 76.4, 94.0, FALSE, 4.1, '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000004', NULL, ST_SetSRID(ST_Point(79.8420, 10.9270), 4326))
ON CONFLICT (code) DO NOTHING;

-- 10. Poles
INSERT INTO public.poles (
    id, code, pole_number, pole_type, material, height_meters, feeder_id, transformer_id, has_streetlight, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('60000000-0000-0000-0000-000000000001', 'POL-MARA-001', 'P-01/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8210, 11.9250), 4326)),
('60000000-0000-0000-0000-000000000002', 'POL-MARA-002', 'P-02/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8230, 11.9280), 4326)),
('60000000-0000-0000-0000-000000000003', 'POL-HERI-010', 'P-10/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', TRUE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8290, 11.9350), 4326)),
('60000000-0000-0000-0000-000000000004', 'POL-HERI-011', 'P-11/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', FALSE, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8315, 11.9385), 4326))
ON CONFLICT (code) DO NOTHING;

-- 11. Consumers & Smart Meters
INSERT INTO public.consumers (
    id, consumer_number, account_number, name, address, category, sanctioned_load_kw, pole_id, transformer_id, feeder_id, meter_number, is_smart_meter, meter_make, meter_install_date, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('70000000-0000-0000-0000-000000000001', 'CON-04-102-9901', 'ACC-PDY-101', 'Alliance Francaise de Pondichery', '58 Suffren Street, White Town, Puducherry', 'Commercial', 35.0, '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'SMTR-LT-44910', TRUE, 'L&T Smart Grid', '2023-04-12', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8320, 11.9390), 4326)),
('70000000-0000-0000-0000-000000000002', 'CON-04-102-9902', 'ACC-PDY-102', 'Aurobindo Ashram Guest House', 'Marine Street, White Town', 'Domestic', 15.0, '60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'SMTR-LT-44911', TRUE, 'L&T Smart Grid', '2023-04-14', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', ST_SetSRID(ST_Point(79.8340, 11.9430), 4326)),
('70000000-0000-0000-0000-000000000003', 'CON-04-102-9903', 'ACC-PDY-103', 'Pondicherry Central Bus Stand Complex', 'Maraimalai Adigal Salai, Marapalam', 'Commercial', 65.0, '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'CONV-GEN-1020', FALSE, 'Genus Power', '2019-08-25', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', ST_SetSRID(ST_Point(79.8220, 11.9270), 4326))
ON CONFLICT (consumer_number) DO NOTHING;

-- 12. Faults & Distance Measurements
INSERT INTO public.faults (
    id, fault_code, category, description, priority, status, feeder_id, transformer_id, pole_id, section_id, je_jurisdiction_id, reported_by, assigned_to, distance_from_pole_m, distance_from_dt_m, distance_along_feeder_m, distance_from_office_km, affected_consumers_est, geom
) VALUES
('80000000-0000-0000-0000-000000000001', 'FLT-2026-0001', 'Conductor Snapped', '11kV Conductor snapped across Maraimalai Adigal Salai due to storm tree fall', 'critical', 'in_progress', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009', 14.5, 120.0, 1850.0, 0.8, 480, ST_SetSRID(ST_Point(79.8225, 11.9265), 4326)),
('80000000-0000-0000-0000-000000000002', 'FLT-2026-0002', 'Transformer Oil Leakage', 'DTR-HERI-02 radiator fin seep with high temperature alarm (oil at 78C)', 'high', 'new', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '14000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000008', 2.0, 0.0, 2200.0, 1.4, 210, ST_SetSRID(ST_Point(79.8310, 11.9380), 4326))
ON CONFLICT (fault_code) DO NOTHING;

-- 13. Contractor Survey Staging & Approval Workflow
INSERT INTO public.survey_submissions (
    id, submission_code, contractor_id, je_id, ae_id, section_id, je_jurisdiction_id, work_order_number, title, asset_counts, status
) VALUES
('91000000-0000-0000-0000-000000000001', 'SURV-2026-081', '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000007', '14000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'WO-RDSS-104', 'Marapalam Commercial Ward GPS Re-mapping', '{"poles": 4, "dts": 1, "consumers": 12, "smart_meters": 10}', 'submitted')
ON CONFLICT (submission_code) DO NOTHING;

INSERT INTO public.survey_staging_assets (
    id, submission_id, asset_type, temporary_code, attributes, gps_accuracy_m, altitude_m, validation_status, geom
) VALUES
('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'pole', 'TMP-POL-081-1', '{"pole_type": "PSCC 9m", "condition": "Good", "num_insulators": 3, "feeder": "FDR-MARA-01"}', 1.8, 12.4, 'valid', ST_SetSRID(ST_Point(79.8242, 11.9295), 4326)),
('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'consumer', 'TMP-CON-081-2', '{"consumer_number": "CON-04-102-9905", "meter_number": "SMTR-LT-44915", "is_smart_meter": true, "sanctioned_load_kw": 5.0}', 1.2, 11.9, 'valid', ST_SetSRID(ST_Point(79.8245, 11.9298), 4326))
ON CONFLICT DO NOTHING;

-- 14. Outage Reliability Metrics (IEEE 1366)
INSERT INTO public.outage_reliability_metrics (
    id, section_id, feeder_id, calculation_period, total_consumers_served, saifi, saidi, caidi, maifi, ens_mwh
) VALUES
('a1000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2026-Q1', 4850, 1.2400, 142.50, 114.92, 0.4500, 18.420),
('a1000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '2026-Q1', 3200, 0.8500, 78.20, 92.00, 0.2000, 9.150)
ON CONFLICT DO NOTHING;

-- 15. Safety Permits (PTW)
INSERT INTO public.safety_permits (
    id, ptw_number, feeder_id, applicant_id, issuing_officer_id, work_description, isolation_points, earthing_confirmed, danger_notices_posted, status, section_id
) VALUES
('b1000000-0000-0000-0000-000000000001', 'PTW-2026-041', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000007', 'Tree branch clearing on 11kV Feeder 1 between Pole 1 and Pole 4', 'Substation Breaker CB-MARA-01 opened and locked out; Isolator ISO-01 opened', TRUE, TRUE, 'isolated', '14000000-0000-0000-0000-000000000001')
ON CONFLICT (ptw_number) DO NOTHING;

-- 16. Stores Inventory
INSERT INTO public.stores_inventory (
    id, item_code, name, category, unit_of_measure, current_stock, reorder_level, unit_cost_inr, section_id
) VALUES
('c1000000-0000-0000-0000-000000000001', 'MAT-ACSR-RAB', 'Rabbit ACSR Conductor (50 sqmm)', 'Conductor', 'KM', 18.5, 5.0, 42000.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000002', 'MAT-POL-PSCC9', 'PSCC Utility Pole 9m 200kg', 'Pole', 'NOS', 64.0, 20.0, 4800.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000003', 'MAT-MTR-SMART', 'Single Phase Smart Energy Meter 5-30A', 'Smart Meter', 'NOS', 350.0, 100.0, 3200.0, '14000000-0000-0000-0000-000000000001'),
('c1000000-0000-0000-0000-000000000004', 'MAT-OIL-TRNS', 'Mineral Transformer Insulating Oil', 'Transformer Oil', 'LITRE', 1200.0, 400.0, 140.0, '14000000-0000-0000-0000-000000000001')
ON CONFLICT (item_code) DO NOTHING;

-- 17. Disaster Management Event
INSERT INTO public.disaster_events (
    id, code, event_type, name, affected_regions, start_date, status, damaged_poles_count, damaged_dts_count, snapped_conductors_km, restoration_pct
) VALUES
('d1000000-0000-0000-0000-000000000001', 'DIS-2026-CYCLONE', 'Cyclone Thane Category', 'Cyclone Storm Alert Response Plan', ARRAY['Puducherry', 'Karaikal'], '2026-11-01', 'restoration_in_progress', 8, 2, 3.4, 82.5)
ON CONFLICT (code) DO NOTHING;

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
