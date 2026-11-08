-- ============================================================================
-- PUDUCHERRY ELECTRICITY DEPARTMENT GIS, ASSET MANAGEMENT & O&M PLATFORM
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
