-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS & ASSET MANAGEMENT PLATFORM
-- ALL-IN-ONE MASTER DATABASE INSTALLATION & SEED SCRIPT
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Click "New Query"
-- 3. Paste the ENTIRE contents of this file and click "Run" (or Ctrl + Enter)
-- 
-- NOTE FOR EXISTING DATABASES:
-- If your database has old, corrupted or conflicting test tables from
-- earlier projects, run this single command first to reset cleanly:
--
--   DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
--
-- Then paste and run this script.
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

-- Guarantee search_path includes both public and extensions (for Supabase PostGIS support)
SET search_path = public, extensions, pg_temp;

-- ----------------------------------------------------------------------------
-- 0. IDEMPOTENT SPATIAL SCHEMA HARDENING FOR PRE-EXISTING TABLES
-- Ensures 'geom' and spatial boundary columns exist before indices and functions compile
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    -- Synchronize legacy column names (location / coordinates -> geom) if pre-existing
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='faults' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='faults' AND column_name='geom') THEN
        ALTER TABLE public.faults RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='poles' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='poles' AND column_name='geom') THEN
        ALTER TABLE public.poles RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transformers' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transformers' AND column_name='geom') THEN
        ALTER TABLE public.transformers RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feeders' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='feeders' AND column_name='geom') THEN
        ALTER TABLE public.feeders RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='substations' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='substations' AND column_name='geom') THEN
        ALTER TABLE public.substations RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='consumers' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='consumers' AND column_name='geom') THEN
        ALTER TABLE public.consumers RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='conductors' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='conductors' AND column_name='geom') THEN
        ALTER TABLE public.conductors RENAME COLUMN location TO geom;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='survey_staging_assets' AND column_name='location')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='survey_staging_assets' AND column_name='geom') THEN
        ALTER TABLE public.survey_staging_assets RENAME COLUMN location TO geom;
    END IF;

    -- Ensure geom column exists on all spatial tables even if created by prior partial migrations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='substations') THEN
        ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feeders') THEN
        ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS geom GEOMETRY(LineString, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transformers') THEN
        ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='poles') THEN
        ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='conductors') THEN
        ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS geom GEOMETRY(LineString, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consumers') THEN
        ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='faults') THEN
        ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='survey_staging_assets') THEN
        ALTER TABLE public.survey_staging_assets ADD COLUMN IF NOT EXISTS geom GEOMETRY(Geometry, 4326);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='outages') THEN
        ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS geom GEOMETRY(MultiPolygon, 4326);
    END IF;
END $$;

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
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

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
ALTER TABLE public.divisions ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

CREATE TABLE IF NOT EXISTS public.subdivisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    aee_in_charge_name VARCHAR(100),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subdivisions ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

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
ALTER TABLE public.om_sections ADD COLUMN IF NOT EXISTS office_location GEOMETRY(Point, 4326);
ALTER TABLE public.om_sections ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

CREATE TABLE IF NOT EXISTS public.je_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.om_sections(id) ON DELETE CASCADE,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    je_name VARCHAR(100),
    boundary GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.je_jurisdictions ADD COLUMN IF NOT EXISTS boundary GEOMETRY(MultiPolygon, 4326);

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
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;

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
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS voltage_class VARCHAR(20);
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS capacity_mva NUMERIC(8, 2);
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS num_feeders INT DEFAULT 4;
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS status asset_status DEFAULT 'operational';
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS commission_date DATE;
ALTER TABLE public.substations ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
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
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS substation_id UUID;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS voltage_class VARCHAR(20);
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS conductor_type VARCHAR(50) DEFAULT 'Rabbit ACSR';
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS length_km NUMERIC(8, 2) DEFAULT 5.0;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS peak_load_amps NUMERIC(8, 2) DEFAULT 200.0;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS rated_capacity_amps NUMERIC(8, 2) DEFAULT 350.0;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS is_energized BOOLEAN DEFAULT TRUE;
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS status asset_status DEFAULT 'operational';
ALTER TABLE public.feeders ADD COLUMN IF NOT EXISTS geom GEOMETRY(LineString, 4326);
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
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS capacity_kva INT DEFAULT 100;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS voltage_ratio VARCHAR(20) DEFAULT '11kV/415V';
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS make VARCHAR(100);
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2) DEFAULT 50.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS oil_level_pct NUMERIC(5, 2) DEFAULT 95.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS has_oil_leakage BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS phase_imbalance_pct NUMERIC(5, 2) DEFAULT 4.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS status asset_status DEFAULT 'operational';
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
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
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS pole_number VARCHAR(50);
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS pole_type VARCHAR(50) DEFAULT 'PSCC 9m';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS material VARCHAR(50) DEFAULT 'Pre-stressed Concrete';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS height_meters NUMERIC(4, 1) DEFAULT 9.0;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS num_insulators INT DEFAULT 3;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'Good';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS has_streetlight BOOLEAN DEFAULT FALSE;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS status asset_status DEFAULT 'operational';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
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
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS start_pole_id UUID;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS end_pole_id UUID;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS conductor_type VARCHAR(50) DEFAULT 'Rabbit ACSR';
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS voltage_class VARCHAR(20) DEFAULT '11kV';
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS length_meters NUMERIC(8, 2) DEFAULT 40.0;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS rated_current_amps NUMERIC(6, 1) DEFAULT 200.0;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS cross_section_sqmm NUMERIC(6, 2) DEFAULT 52.88;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'Good';
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE public.conductors ADD COLUMN IF NOT EXISTS geom GEOMETRY(LineString, 4326);
CREATE INDEX IF NOT EXISTS idx_conductors_geom ON public.conductors USING GIST(geom);

CREATE TABLE IF NOT EXISTS public.streetlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    pole_id UUID REFERENCES public.poles(id) ON DELETE CASCADE,
    lamp_type VARCHAR(50) DEFAULT 'LED 70W',
    wattage INT DEFAULT 70,
    working_condition VARCHAR(20) DEFAULT 'Working',
    installation_date DATE,
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    je_jurisdiction_id UUID REFERENCES public.je_jurisdictions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;

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
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS consumer_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Domestic';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS sanctioned_load_kw NUMERIC(10, 2) DEFAULT 3.0;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS pole_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS is_smart_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_make VARCHAR(100);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_install_date DATE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
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
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS fault_code VARCHAR(30);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'high';
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS status fault_status_type DEFAULT 'new';
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS pole_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS contractor_id UUID;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_pole_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_dt_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_along_feeder_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_office_km NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS affected_consumers_est INT DEFAULT 0;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS restoration_photo_url TEXT;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);
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
ALTER TABLE public.survey_staging_assets ADD COLUMN IF NOT EXISTS geom GEOMETRY(Geometry, 4326);
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
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS outage_code VARCHAR(30);
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS outage_type VARCHAR(30) DEFAULT 'Emergency';
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS expected_restoration TIMESTAMPTZ;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS actual_restoration TIMESTAMPTZ;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC(8, 2);
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS affected_consumers_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS energy_not_served_kwh NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.outages ADD COLUMN IF NOT EXISTS geom GEOMETRY(MultiPolygon, 4326);

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
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS calculation_period VARCHAR(20);
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS total_consumers_served INT;
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS saifi NUMERIC(6, 4);
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS saidi NUMERIC(8, 2);
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS caidi NUMERIC(8, 2);
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS maifi NUMERIC(6, 4) DEFAULT 0;
ALTER TABLE public.outage_reliability_metrics ADD COLUMN IF NOT EXISTS ens_mwh NUMERIC(8, 3);

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
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS ptw_number VARCHAR(30);
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS applicant_id UUID;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS issuing_officer_id UUID;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS work_description TEXT;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS isolation_points TEXT;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS earthing_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS danger_notices_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS gas_discharge_tested BOOLEAN DEFAULT TRUE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS status ptw_status DEFAULT 'requested';
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS issue_time TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS clearance_time TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS section_id UUID;

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
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS item_code VARCHAR(30);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'NOS';
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 10;
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS unit_cost_inr NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS section_id UUID;

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
    region_id UUID REFERENCES public.regions(id),
    division_id UUID REFERENCES public.divisions(id),
    section_id UUID REFERENCES public.om_sections(id),
    start_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'restoration_in_progress', 'closed'
    damaged_poles_count INT DEFAULT 0,
    damaged_dts_count INT DEFAULT 0,
    snapped_conductors_km NUMERIC(8, 2) DEFAULT 0,
    restoration_pct NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS code VARCHAR(30);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS affected_regions TEXT[];
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.disaster_events ALTER COLUMN status TYPE VARCHAR(50);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS damaged_poles_count INT DEFAULT 0;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS damaged_dts_count INT DEFAULT 0;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS snapped_conductors_km NUMERIC(8, 2) DEFAULT 0;
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS restoration_pct NUMERIC(5, 2) DEFAULT 0;

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
    actor_id UUID,
    user_id UUID REFERENCES public.user_profiles(id),
    username VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;


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
-- SECTION: 20261109_complete_security_rls_and_approval_rpc.sql
-- ----------------------------------------------------------------------------

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
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.streetlights ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
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


-- ----------------------------------------------------------------------------
-- SECTION: 20261109_scada_simulator_and_security.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SECTION: 20261110_scada_security_and_rls_hardening.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION MIGRATION: SCADA SECURITY & RLS JURISDICTION HARDENING (PHASE 7)
-- Fixes Missing RLS Policies, Closes Broad Access, Sets search_path on Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER FUNCTIONS WITH EXPLICIT SEARCH_PATH
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.user_profiles AS $$
    SELECT * FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE EXECUTE ON FUNCTION public.current_user_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. EXPLICIT RLS POLICIES FOR PREVIOUSLY UNCOVERED TABLES
-- ----------------------------------------------------------------------------

-- Table 1: approval_history
ALTER TABLE IF EXISTS public.approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS approval_history_select_policy ON public.approval_history;
CREATE POLICY approval_history_select_policy ON public.approval_history FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            u.id = approval_history.actor_id OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=s.section_id AND d.region_id=u.region_id))) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=s.section_id AND subd.division_id=u.division_id))) OR
            (u.role IN ('aee', 'ae') AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND s.section_id = u.section_id)) OR
            (u.role = 'je' AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND s.je_jurisdiction_id = u.je_jurisdiction_id))
        )
    )
);

DROP POLICY IF EXISTS approval_history_insert_policy ON public.approval_history;
CREATE POLICY approval_history_insert_policy ON public.approval_history FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('se', 'ee', 'aee', 'ae', 'je')
        AND u.id = approval_history.actor_id
    )
);

-- Table 2: conductors
ALTER TABLE IF EXISTS public.conductors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conductors_select_policy ON public.conductors;
CREATE POLICY conductors_select_policy ON public.conductors FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            EXISTS (
                SELECT 1 FROM public.feeders f
                WHERE f.id = conductors.feeder_id
                AND (
                    (u.role = 'se' AND EXISTS (SELECT 1 FROM public.substations s WHERE s.id = f.substation_id AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=s.section_id AND d.region_id=u.region_id))) OR
                    (u.role = 'ee' AND f.division_id = u.division_id) OR
                    (u.role IN ('aee', 'ae', 'je') AND f.section_id = u.section_id) OR
                    (u.role = 'contractor' AND f.section_id = u.section_id)
                )
            )
        )
    )
);

-- Table 3: scada_simulation_sessions
ALTER TABLE IF EXISTS public.scada_simulation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scada_simulation_sessions_select_policy ON public.scada_simulation_sessions;
CREATE POLICY scada_simulation_sessions_select_policy ON public.scada_simulation_sessions FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('super_admin', 'se', 'ee', 'aee', 'ae', 'je', 'auditor', 'gis_admin')
    )
);

DROP POLICY IF EXISTS scada_simulation_sessions_insert_policy ON public.scada_simulation_sessions;
CREATE POLICY scada_simulation_sessions_insert_policy ON public.scada_simulation_sessions FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('super_admin', 'se', 'ee', 'ae', 'gis_admin')
    )
);


-- ----------------------------------------------------------------------------
-- 3. HARDEN OVERLY BROAD JURISDICTION POLICIES
-- ----------------------------------------------------------------------------

-- Substations: Scoped strictly by jurisdiction hierarchy
DROP POLICY IF EXISTS substations_policy ON public.substations;
CREATE POLICY substations_policy ON public.substations FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'gis_admin', 'auditor') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=substations.section_id AND d.region_id=u.region_id)) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=substations.section_id AND subd.division_id=u.division_id)) OR
            (u.role IN ('aee', 'ae') AND substations.section_id = u.section_id) OR
            (u.role = 'je' AND substations.section_id = u.section_id)
        )
    )
);

-- Feeders: Scoped strictly by jurisdiction hierarchy & contractor assignments
DROP POLICY IF EXISTS feeders_policy ON public.feeders;
CREATE POLICY feeders_policy ON public.feeders FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'gis_admin', 'auditor') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.substations s WHERE s.id = feeders.substation_id AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=s.section_id AND d.region_id=u.region_id))) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=feeders.section_id AND subd.division_id=u.division_id)) OR
            (u.role IN ('aee', 'ae') AND feeders.section_id = u.section_id) OR
            (u.role = 'je' AND feeders.section_id = u.section_id) OR
            (u.role = 'contractor' AND feeders.section_id = u.section_id)
        )
    )
);

-- Warranties, Batches & Lifecycle: Scoped to jurisdiction section
DROP POLICY IF EXISTS warranty_batches_policy ON public.warranty_batches;
CREATE POLICY warranty_batches_policy ON public.warranty_batches FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se') OR
            (u.role = 'ee')
        )
    )
);

DROP POLICY IF EXISTS warranties_policy ON public.warranties;
CREATE POLICY warranties_policy ON public.warranties FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se') OR
            (u.role = 'ee') OR
            (u.role IN ('aee', 'ae') AND EXISTS (SELECT 1 FROM public.equipment_lifecycle el WHERE el.asset_id=warranties.equipment_id AND el.section_id=u.section_id))
        )
    )
);

DROP POLICY IF EXISTS equipment_lifecycle_policy ON public.equipment_lifecycle;
CREATE POLICY equipment_lifecycle_policy ON public.equipment_lifecycle FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se') OR
            (u.role = 'ee') OR
            (u.role IN ('aee', 'ae') AND equipment_lifecycle.section_id = u.section_id)
        )
    )
);

-- Work Orders: SE and EE strictly restricted to their assigned region/division
DROP POLICY IF EXISTS work_orders_policy ON public.work_orders;
CREATE POLICY work_orders_policy ON public.work_orders FOR ALL TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id JOIN public.divisions d ON sd.division_id = d.id WHERE s.id = work_orders.section_id AND d.region_id = u.region_id)) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id WHERE s.id = work_orders.section_id AND sd.division_id = u.division_id)) OR
            (u.role IN ('aee', 'ae') AND work_orders.section_id = u.section_id) OR
            (u.role = 'je' AND work_orders.section_id = u.section_id)
        )
    )
);

-- Disaster Events: Scoped by region
DROP POLICY IF EXISTS disaster_events_policy ON public.disaster_events;
CREATE POLICY disaster_events_policy ON public.disaster_events FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=disaster_events.section_id AND d.region_id=u.region_id)) OR
            (u.role IN ('ee', 'aee', 'ae', 'je') AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=disaster_events.section_id AND d.region_id=u.region_id))
        )
    )
);

-- Stores Inventory: Scoped by region & division
DROP POLICY IF EXISTS stores_inventory_policy ON public.stores_inventory;
CREATE POLICY stores_inventory_policy ON public.stores_inventory FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id JOIN public.divisions d ON d.id=subd.division_id WHERE sec.id=stores_inventory.section_id AND d.region_id=u.region_id)) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections sec JOIN public.subdivisions subd ON subd.id=sec.subdivision_id WHERE sec.id=stores_inventory.section_id AND subd.division_id=u.division_id)) OR
            (u.role IN ('aee', 'ae', 'je') AND stores_inventory.section_id = u.section_id)
        )
    )
);

-- Outage Reliability Metrics: Scoped by section and division
DROP POLICY IF EXISTS outage_reliability_metrics_policy ON public.outage_reliability_metrics;
CREATE POLICY outage_reliability_metrics_policy ON public.outage_reliability_metrics FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR
    EXISTS (
        SELECT 1 FROM public.user_profiles u
        WHERE u.auth_user_id = auth.uid()
        AND (
            u.role IN ('super_admin', 'auditor', 'gis_admin') OR
            (u.role = 'se') OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON s.subdivision_id = sd.id WHERE s.id = outage_reliability_metrics.section_id AND sd.division_id = u.division_id)) OR
            (u.role IN ('aee', 'ae') AND outage_reliability_metrics.section_id = u.section_id)
        )
    )
);

-- ----------------------------------------------------------------------------
-- 4. HARDEN AUDIT LOGS INSERT POLICY
-- ----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID;
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL AND (
        actor_id = auth.uid() OR
        public.is_super_admin()
    )
);


-- ----------------------------------------------------------------------------
-- SECTION: 20261116_production_schema_hardening.sql
-- ----------------------------------------------------------------------------

-- PowerGIS V3.2 production hardening
-- Incremental migration. Does not drop operational tables or disable RLS.


-- ---------------------------------------------------------------------------
-- 1. Jurisdiction columns missing from earlier policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.warranty_batches ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.warranty_batches ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.om_sections(id);
ALTER TABLE public.equipment_lifecycle ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.equipment_lifecycle ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES public.user_profiles(id);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.stores_inventory ADD COLUMN IF NOT EXISTS is_integer_unit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.survey_submissions ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.survey_submissions ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.survey_staging_assets ADD COLUMN IF NOT EXISTS location_source TEXT NOT NULL DEFAULT 'GPS';
ALTER TABLE public.survey_staging_assets ADD COLUMN IF NOT EXISTS operation_id UUID;

-- Consumers table schema hardening for pre-existing installations
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS consumer_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Domestic';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS sanctioned_load_kw NUMERIC(10, 2) DEFAULT 3.0;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS pole_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS is_smart_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_make VARCHAR(100);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_install_date DATE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- Relax strict NOT NULL constraints on legacy columns from older schemas without defaults
DO $$
DECLARE
    t TEXT;
    c TEXT;
    target_tables TEXT[] := ARRAY[
        'regions', 'divisions', 'subdivisions', 'om_sections', 'je_jurisdictions',
        'user_profiles', 'substations', 'feeders', 'transformers', 'poles',
        'conductors', 'streetlights', 'consumers', 'faults', 'work_orders',
        'survey_submissions', 'survey_staging_assets', 'outages',
        'outage_reliability_metrics', 'safety_permits', 'stores_inventory',
        'stores_transactions', 'disaster_events'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        FOR c IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = t 
              AND is_nullable = 'NO'
              AND column_name NOT IN ('id', 'code', 'consumer_number', 'submission_code', 'fault_code', 'outage_code', 'ptw_number', 'item_code')
              AND column_default IS NULL
        LOOP
            BEGIN
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', t, c);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END LOOP;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'consumers' AND column_name = 'tariff_category'
    ) THEN
        ALTER TABLE public.consumers ALTER COLUMN tariff_category DROP NOT NULL;
        ALTER TABLE public.consumers ALTER COLUMN tariff_category SET DEFAULT 'DOMESTIC';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Reconcile legacy foreign keys pointing to outdated tables (e.g. utility_poles -> poles)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT cl.relname AS table_name, con.conname AS constraint_name, clf.relname AS foreign_table
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_class clf ON clf.oid = con.confrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public' 
          AND con.contype = 'f'
          AND clf.relname IN ('utility_poles', 'distribution_transformers', 'dtrs', 'feeder_lines', 'sections', 'jurisdictions')
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    -- Ensure consumers foreign keys point to canonical tables
    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_pole_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_transformer_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_transformer_id_fkey FOREIGN KEY (transformer_id) REFERENCES public.transformers(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_feeder_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_feeder_id_fkey FOREIGN KEY (feeder_id) REFERENCES public.feeders(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_section_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.om_sections(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Ensure streetlights and faults point to public.poles
    BEGIN
        ALTER TABLE public.streetlights DROP CONSTRAINT IF EXISTS streetlights_pole_id_fkey;
        ALTER TABLE public.streetlights ADD CONSTRAINT streetlights_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.faults DROP CONSTRAINT IF EXISTS faults_pole_id_fkey;
        ALTER TABLE public.faults ADD CONSTRAINT faults_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Widen status column in disaster_events to accommodate 'restoration_in_progress'
    BEGIN
        ALTER TABLE public.disaster_events ALTER COLUMN status TYPE VARCHAR(50);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

CREATE INDEX IF NOT EXISTS idx_work_orders_scope ON public.work_orders(region_id, division_id, section_id, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_warranties_scope ON public.warranties(region_id, division_id, section_id);
CREATE INDEX IF NOT EXISTS idx_inventory_scope ON public.stores_inventory(region_id, division_id, section_id);
CREATE INDEX IF NOT EXISTS idx_surveys_scope ON public.survey_submissions(region_id, division_id, section_id, je_jurisdiction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_staging_operation_id ON public.survey_staging_assets(operation_id) WHERE operation_id IS NOT NULL;

-- Backfill jurisdiction from section relationships where possible.
UPDATE public.equipment_lifecycle el
SET region_id = d.region_id,
    division_id = d.id
FROM public.om_sections s
JOIN public.subdivisions sd ON sd.id = s.subdivision_id
JOIN public.divisions d ON d.id = sd.division_id
WHERE el.section_id = s.id AND (el.region_id IS NULL OR el.division_id IS NULL);

UPDATE public.warranties w
SET section_id = e.section_id,
    region_id = d.region_id,
    division_id = d.id
FROM public.equipment_lifecycle e
JOIN public.om_sections sec ON sec.id = e.section_id
JOIN public.subdivisions subd ON subd.id = sec.subdivision_id
JOIN public.divisions d ON d.id = subd.division_id
WHERE w.section_id IS NULL AND e.asset_id = w.equipment_id;

UPDATE public.work_orders wo
SET region_id = d.region_id,
    division_id = d.id
FROM public.om_sections s
JOIN public.subdivisions sd ON sd.id = s.subdivision_id
JOIN public.divisions d ON d.id = sd.division_id
WHERE wo.section_id = s.id AND (wo.region_id IS NULL OR wo.division_id IS NULL);

UPDATE public.stores_inventory si
SET region_id = d.region_id,
    division_id = d.id
FROM public.om_sections s
JOIN public.subdivisions sd ON sd.id = s.subdivision_id
JOIN public.divisions d ON d.id = sd.division_id
WHERE si.section_id = s.id AND (si.region_id IS NULL OR si.division_id IS NULL);

UPDATE public.survey_submissions ss
SET region_id = d.region_id,
    division_id = d.id
FROM public.om_sections s
JOIN public.subdivisions sd ON sd.id = s.subdivision_id
JOIN public.divisions d ON d.id = sd.division_id
WHERE ss.section_id = s.id AND (ss.region_id IS NULL OR ss.division_id IS NULL);

-- ---------------------------------------------------------------------------
-- 2. PTW safety state machine and immutable stage evidence
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'isolation_verified') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'isolation_verified';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'absence_of_voltage_verified') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'absence_of_voltage_verified';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'earthing_confirmed') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'earthing_confirmed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'danger_notices_confirmed') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'danger_notices_confirmed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'additional_checks_verified') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'additional_checks_verified';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'issuer_verified') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'issuer_verified';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'work_started') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'work_started';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'suspended') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'suspended';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'extended') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'extended';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'work_completed') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'work_completed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'personnel_cleared') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'personnel_cleared';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'earths_removed') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'earths_removed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'restoration_approved') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'restoration_approved';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'ptw_status'::regtype AND enumlabel = 'closed') THEN
        ALTER TYPE public.ptw_status ADD VALUE 'closed';
    END IF;
END $$;

ALTER TABLE public.safety_permits
    ALTER COLUMN gas_discharge_tested SET DEFAULT FALSE,
    ALTER COLUMN earthing_confirmed SET DEFAULT FALSE,
    ALTER COLUMN danger_notices_posted SET DEFAULT FALSE;

ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS additional_safety_checks JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS absence_of_voltage_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS isolation_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS issuer_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS extended_until TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS work_completed_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS personnel_cleared_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS earths_removed_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS restoration_approved_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS restored_at TIMESTAMPTZ;
ALTER TABLE public.safety_permits ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.permit_safety_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id UUID NOT NULL REFERENCES public.safety_permits(id) ON DELETE CASCADE,
    actor_auth_user_id UUID NOT NULL REFERENCES auth.users(id),
    actor_profile_id UUID NOT NULL REFERENCES public.user_profiles(id),
    actor_role public.official_role NOT NULL,
    previous_state public.ptw_status NOT NULL,
    new_state public.ptw_status NOT NULL,
    equipment TEXT,
    location GEOGRAPHY(Point, 4326),
    confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_path TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permit_safety_events_permit ON public.permit_safety_events(permit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permit_safety_events_location ON public.permit_safety_events USING GIST(location);
ALTER TABLE public.permit_safety_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permit_safety_events_select_policy ON public.permit_safety_events;
CREATE POLICY permit_safety_events_select_policy ON public.permit_safety_events
FOR SELECT TO authenticated USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.user_profiles u
        JOIN public.safety_permits p ON p.id = permit_safety_events.permit_id
        WHERE u.auth_user_id = auth.uid() AND u.is_active = TRUE
        AND (u.role IN ('auditor','gis_admin','se','ee','aee','ae','je')
             AND (u.region_id = (SELECT d.region_id FROM public.om_sections s JOIN public.subdivisions sd ON sd.id=s.subdivision_id JOIN public.divisions d ON d.id=sd.division_id WHERE s.id=p.section_id)
                  OR u.section_id = p.section_id))
    )
);

-- ---------------------------------------------------------------------------
-- 3. Immutable audit log hardening
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role public.official_role;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS jurisdiction_id UUID REFERENCES public.je_jurisdictions(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_state JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_state JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS correlation_id UUID;
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_resource ON public.audit_logs(module, resource_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

DROP TRIGGER IF EXISTS audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- ---------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- SECTION: 20261117_production_security_functions.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SECTION: 20261118_concurrency_and_storage_hardening.sql
-- ----------------------------------------------------------------------------

-- PowerGIS V3.2.1 concurrency, evidence-storage and offline-idempotency hardening.
-- This migration removes count(*)+1 identifier races and adds server-owned evidence boundaries.

CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.fault_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.outage_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.ptw_number_seq;

DO $$
DECLARE v_max BIGINT;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(order_number, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.work_orders WHERE order_number ~ '[0-9]+$';
  PERFORM setval('public.work_order_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(fault_code, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.faults WHERE fault_code ~ '[0-9]+$';
  PERFORM setval('public.fault_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(outage_code, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.outages WHERE outage_code ~ '[0-9]+$';
  PERFORM setval('public.outage_number_seq', GREATEST(v_max, 1), v_max > 0);
  SELECT COALESCE(MAX((regexp_replace(ptw_number, '^.*-', ''))::BIGINT), 0) INTO v_max FROM public.safety_permits WHERE ptw_number ~ '[0-9]+$';
  PERFORM setval('public.ptw_number_seq', GREATEST(v_max, 1), v_max > 0);
END $$;

CREATE OR REPLACE FUNCTION public.create_work_order(
    p_title TEXT, p_category TEXT, p_instructions TEXT, p_assigned_crew TEXT,
    p_section_id UUID, p_priority TEXT, p_due_date DATE
) RETURNS public.work_orders AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_order public.work_orders%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role NOT IN ('super_admin','se','ee','aee','ae','je') THEN RAISE EXCEPTION 'Authorized engineering profile required'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'Work order section is outside your jurisdiction'; END IF;
    IF trim(COALESCE(p_title,''))='' OR trim(COALESCE(p_category,''))='' THEN RAISE EXCEPTION 'Title and category are required'; END IF;
    INSERT INTO public.work_orders(order_number,title,category,instructions,priority,status,assigned_crew,assigned_to_id,section_id,due_date,region_id,division_id)
    SELECT 'WO-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.work_order_number_seq')::text,5,'0'),
           trim(p_title), p_category, NULLIF(trim(COALESCE(p_instructions,'')),''),
           COALESCE(NULLIF(p_priority,''),'medium'), 'assigned', NULLIF(trim(COALESCE(p_assigned_crew,'')),''), v_user.id,
           p_section_id, p_due_date, d.region_id, d.id
    FROM public.om_sections s
    JOIN public.subdivisions sd ON sd.id=s.subdivision_id
    JOIN public.divisions d ON d.id=sd.division_id
    WHERE s.id=p_section_id
    RETURNING * INTO v_order;
    IF NOT FOUND THEN RAISE EXCEPTION 'Section not found'; END IF;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state)
    VALUES(auth.uid(),v_user.id,v_user.role,'work_order.create','work_orders',v_order.id::text,jsonb_build_object('order_number',v_order.order_number),jsonb_build_object('status','assigned'));
    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

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
    VALUES('FLT-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.fault_number_seq')::text,5,'0'),p_category,p_description,p_priority,'new',p_feeder_id,p_section_id,p_je_jurisdiction_id,v_user.id,p_affected_consumers_est,ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326))
    RETURNING * INTO v_fault;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'fault.create','faults',v_fault.id::text,jsonb_build_object('coordinates',jsonb_build_array(p_lat,p_lng)),jsonb_build_object('status','new'));
    RETURN v_fault;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

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
    IF trim(COALESCE(p_reason,''))='' THEN RAISE EXCEPTION 'Outage reason is required'; END IF;
    IF p_affected_consumers_count < 0 THEN RAISE EXCEPTION 'Affected consumer count cannot be negative'; END IF;
    IF p_expected_restoration IS NOT NULL AND p_expected_restoration < p_start_time THEN RAISE EXCEPTION 'Expected restoration cannot precede outage start'; END IF;
    INSERT INTO public.outages(outage_code,feeder_id,transformer_id,outage_type,reason,start_time,expected_restoration,affected_consumers_count,energy_not_served_kwh,section_id,status)
    VALUES('OUT-'||to_char(NOW(),'YYYY')||'-'||lpad(nextval('public.outage_number_seq')::text,5,'0'),p_feeder_id,p_transformer_id,p_outage_type,p_reason,p_start_time,p_expected_restoration,p_affected_consumers_count,p_energy_not_served_kwh,p_section_id,'active')
    RETURNING * INTO v_out;
    INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,new_state) VALUES(auth.uid(),v_user.id,v_user.role,'outage.create','outages',v_out.id::text,jsonb_build_object('outage_type',p_outage_type),jsonb_build_object('status','active'));
    RETURN v_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

CREATE OR REPLACE FUNCTION public.create_ptw_request(
    p_feeder_id UUID,
    p_section_id UUID,
    p_work_description TEXT,
    p_isolation_points TEXT
) RETURNS UUID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_id UUID; v_number TEXT;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active PowerGIS profile required'; END IF;
    IF p_work_description IS NULL OR trim(p_work_description)='' THEN RAISE EXCEPTION 'Work description is required'; END IF;
    IF p_isolation_points IS NULL OR trim(p_isolation_points)='' THEN RAISE EXCEPTION 'Isolation points are required'; END IF;
    IF v_user.role NOT IN ('super_admin','se','ee','aee','ae','je','contractor') THEN RAISE EXCEPTION 'Role not authorized to request PTW'; END IF;
    IF v_user.role <> 'super_admin' AND v_user.section_id IS DISTINCT FROM p_section_id THEN RAISE EXCEPTION 'PTW section is outside your jurisdiction'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.feeders f WHERE f.id=p_feeder_id AND f.section_id=p_section_id) THEN RAISE EXCEPTION 'Feeder does not belong to requested section'; END IF;
    v_number := 'PTW-' || to_char(NOW(),'YYYY') || '-' || lpad(nextval('public.ptw_number_seq')::text,4,'0');
    INSERT INTO public.safety_permits(ptw_number,feeder_id,applicant_id,work_description,isolation_points,section_id,status)
    VALUES(v_number,p_feeder_id,v_user.id,p_work_description,p_isolation_points,p_section_id,'requested') RETURNING id INTO v_id;
    INSERT INTO public.permit_safety_events(permit_id,actor_auth_user_id,actor_profile_id,actor_role,previous_state,new_state,confirmation,comments)
    VALUES(v_id,auth.uid(),v_user.id,v_user.role,'requested','requested',TRUE,'Permit request created');
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

-- Evidence bucket: objects are scoped to the authenticated uploader's UUID folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ptw-evidence', 'ptw-evidence', false)
ON CONFLICT (id) DO UPDATE SET public=false;

DROP POLICY IF EXISTS powergis_ptw_evidence_insert ON storage.objects;
CREATE POLICY powergis_ptw_evidence_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='ptw-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS powergis_ptw_evidence_select ON storage.objects;
CREATE POLICY powergis_ptw_evidence_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='ptw-evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE AND u.role IN ('super_admin','se','ee','aee','ae','auditor'))
  )
);

DROP POLICY IF EXISTS powergis_ptw_evidence_delete ON storage.objects;
CREATE POLICY powergis_ptw_evidence_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='ptw-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Server-side proof that a PTW evidence object belongs to the authenticated actor.
CREATE OR REPLACE FUNCTION public.validate_ptw_evidence_path(p_evidence_path TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_evidence_path IS NOT NULL AND split_part(p_evidence_path,'/',1) = auth.uid()::text;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.validate_ptw_evidence_path(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_ptw_evidence_path(TEXT) TO authenticated;

-- Idempotent one-asset offline survey synchronization endpoint.
CREATE OR REPLACE FUNCTION public.sync_offline_survey_asset(
    p_operation_id UUID,
    p_work_order_number TEXT,
    p_title TEXT,
    p_asset_type TEXT,
    p_temporary_code TEXT,
    p_attributes JSONB,
    p_gps_accuracy_m NUMERIC,
    p_altitude_m NUMERIC,
    p_location_source TEXT,
    p_lat NUMERIC,
    p_lng NUMERIC
) RETURNS UUID AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_submission UUID; v_existing UUID;
BEGIN
    SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
    IF NOT FOUND OR v_user.role <> 'contractor' THEN RAISE EXCEPTION 'Authorized contractor profile required'; END IF;
    IF v_user.section_id IS NULL OR v_user.je_jurisdiction_id IS NULL THEN RAISE EXCEPTION 'Contractor jurisdiction is not assigned'; END IF;
    IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Operation ID is required'; END IF;
    IF p_location_source NOT IN ('GPS','MANUAL') THEN RAISE EXCEPTION 'Invalid location source'; END IF;
    IF p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid survey coordinates'; END IF;
    SELECT id INTO v_existing FROM public.survey_staging_assets WHERE operation_id=p_operation_id LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

    INSERT INTO public.survey_submissions(contractor_id,submission_code,region_id,division_id,section_id,je_jurisdiction_id,work_order_number,title,asset_counts,status)
    SELECT v_user.id,'OFF-'||to_char(NOW(),'YYYY')||'-'||substr(p_operation_id::text,1,8),d.region_id,d.id,v_user.section_id,v_user.je_jurisdiction_id,p_work_order_number,COALESCE(NULLIF(trim(p_title),''),'Offline field survey'),jsonb_build_object(p_asset_type,1),'submitted'
    FROM public.om_sections sec
    JOIN public.subdivisions sd ON sd.id=sec.subdivision_id
    JOIN public.divisions d ON d.id=sd.division_id
    WHERE sec.id=v_user.section_id
    RETURNING id INTO v_submission;

    INSERT INTO public.survey_staging_assets(submission_id,asset_type,temporary_code,attributes,gps_accuracy_m,altitude_m,location_source,validation_status,geom,operation_id)
    VALUES(v_submission,p_asset_type,p_temporary_code,COALESCE(p_attributes,'{}'::jsonb),CASE WHEN p_location_source='GPS' THEN p_gps_accuracy_m ELSE NULL END,p_altitude_m,p_location_source,'valid',ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326),p_operation_id)
    RETURNING id INTO v_existing;
    RETURN v_existing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.sync_offline_survey_asset(UUID,TEXT,TEXT,TEXT,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,NUMERIC,NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_offline_survey_asset(UUID,TEXT,TEXT,TEXT,TEXT,JSONB,NUMERIC,NUMERIC,TEXT,NUMERIC,NUMERIC) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-evidence', 'survey-evidence', false)
ON CONFLICT (id) DO UPDATE SET public=false;

DROP POLICY IF EXISTS powergis_survey_evidence_insert ON storage.objects;
CREATE POLICY powergis_survey_evidence_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='survey-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS powergis_survey_evidence_select ON storage.objects;
CREATE POLICY powergis_survey_evidence_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='survey-evidence' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.user_profiles u WHERE u.auth_user_id=auth.uid() AND u.is_active=TRUE AND u.role IN ('super_admin','se','ee','aee','ae','je','auditor','gis_admin'))
  )
);

DROP POLICY IF EXISTS powergis_survey_evidence_delete ON storage.objects;
CREATE POLICY powergis_survey_evidence_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='survey-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ----------------------------------------------------------------------------
-- SECTION: 20261119_specialized_modules_completion.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- PowerGIS V3.2.2 - Specialized Module Persistence & Authorization
-- Capital Projects / Preventive Maintenance / Disaster / Risk
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capital_project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(60) NOT NULL,
  scope_metric VARCHAR(150) NOT NULL,
  sanctioned_budget_cr NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sanctioned_budget_cr >= 0),
  expenditure_cr NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (expenditure_cr >= 0 AND expenditure_cr <= sanctioned_budget_cr),
  physical_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (physical_progress_pct BETWEEN 0 AND 100),
  contractor VARCHAR(150),
  target_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'In Progress',
  corridor TEXT,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  region_id UUID REFERENCES public.regions(id),
  division_id UUID REFERENCES public.divisions(id),
  section_id UUID REFERENCES public.om_sections(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID,
  asset_code VARCHAR(50) NOT NULL,
  asset_name VARCHAR(150) NOT NULL,
  maintenance_type VARCHAR(150) NOT NULL,
  scheduled_date DATE NOT NULL,
  cycle VARCHAR(80) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  trigger_reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  region_id UUID REFERENCES public.regions(id),
  division_id UUID REFERENCES public.divisions(id),
  section_id UUID REFERENCES public.om_sections(id),
  completed_by UUID REFERENCES public.user_profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.user_has_role(p_roles public.official_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND is_active = true AND role = ANY(p_roles));
$$;

CREATE OR REPLACE FUNCTION public.user_has_jurisdiction(p_region_id UUID, p_division_id UUID, p_section_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.auth_user_id = auth.uid() AND u.is_active = true
      AND (u.role IN ('super_admin','auditor','gis_admin')
        OR (p_region_id IS NULL AND p_division_id IS NULL AND p_section_id IS NULL)
        OR (u.role='se' AND p_region_id=u.region_id)
        OR (u.role='ee' AND p_division_id=u.division_id)
        OR (u.role IN ('aee','ae') AND p_section_id=u.section_id)
        OR (u.role='je' AND EXISTS (SELECT 1 FROM public.om_sections s JOIN public.subdivisions sd ON sd.id=s.subdivision_id JOIN public.divisions d ON d.id=sd.division_id WHERE s.id=p_section_id AND (u.section_id=s.id OR u.je_jurisdiction_id IN (SELECT j.id FROM public.je_jurisdictions j WHERE j.section_id=s.id))))
        OR (u.role='contractor' AND p_section_id=u.section_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_role(public.official_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_jurisdiction(UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_role(public.official_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_jurisdiction(UUID,UUID,UUID) TO authenticated;

ALTER TABLE public.capital_project_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capital_project_select ON public.capital_project_packages;
CREATE POLICY capital_project_select ON public.capital_project_packages FOR SELECT TO authenticated
USING (public.user_has_jurisdiction(region_id, division_id, section_id));
DROP POLICY IF EXISTS capital_project_write ON public.capital_project_packages;
CREATE POLICY capital_project_write ON public.capital_project_packages FOR UPDATE TO authenticated
USING (public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','gis_admin']::official_role[]) AND public.user_has_jurisdiction(region_id, division_id, section_id))
WITH CHECK (public.user_has_jurisdiction(region_id, division_id, section_id));

DROP POLICY IF EXISTS maintenance_select ON public.maintenance_tasks;
CREATE POLICY maintenance_select ON public.maintenance_tasks FOR SELECT TO authenticated
USING (public.user_has_jurisdiction(region_id, division_id, section_id));
DROP POLICY IF EXISTS maintenance_write ON public.maintenance_tasks;
CREATE POLICY maintenance_write ON public.maintenance_tasks FOR UPDATE TO authenticated
USING (public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','je','contractor']::official_role[]) AND public.user_has_jurisdiction(region_id, division_id, section_id))
WITH CHECK (public.user_has_jurisdiction(region_id, division_id, section_id));

CREATE OR REPLACE FUNCTION public.update_capital_project_milestone(
  p_project_id UUID, p_milestone_index INT, p_completed BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_row public.capital_project_packages%ROWTYPE; v_m jsonb; v_progress numeric; v_status text;
BEGIN
  IF NOT public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','gis_admin']::official_role[]) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_row FROM public.capital_project_packages WHERE id=p_project_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_has_jurisdiction(v_row.region_id,v_row.division_id,v_row.section_id) THEN RAISE EXCEPTION 'Project outside jurisdiction'; END IF;
  IF p_milestone_index < 0 OR p_milestone_index >= jsonb_array_length(v_row.milestones) THEN RAISE EXCEPTION 'Invalid milestone'; END IF;
  v_m := jsonb_set(v_row.milestones, ARRAY[p_milestone_index::text,'completed'], to_jsonb(p_completed), true);
  SELECT CASE WHEN COUNT(*)=0 THEN 0 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE (x->>'completed')::boolean) / COUNT(*), 2) END INTO v_progress FROM jsonb_array_elements(v_m) x;
  v_status := CASE WHEN v_progress=100 THEN 'Completed' WHEN v_progress>=60 THEN 'In Progress' ELSE 'Delayed' END;
  UPDATE public.capital_project_packages SET milestones=v_m, physical_progress_pct=v_progress, status=v_status, updated_at=NOW() WHERE id=p_project_id RETURNING * INTO v_row;
  INSERT INTO public.audit_logs(user_id,actor_id,action,module,resource_id,details) SELECT u.auth_user_id,u.auth_user_id,'UPDATE_MILESTONE','capital_projects',p_project_id::text,jsonb_build_object('index',p_milestone_index,'completed',p_completed) FROM public.user_profiles u WHERE u.auth_user_id=auth.uid();
  RETURN jsonb_build_object('id',v_row.id,'schemeCode',v_row.scheme_code,'title',v_row.title,'category',v_row.category,'scopeMetric',v_row.scope_metric,'sanctionedBudgetCr',v_row.sanctioned_budget_cr,'expenditureCr',v_row.expenditure_cr,'physicalProgressPct',v_row.physical_progress_pct,'contractor',v_row.contractor,'targetDate',v_row.target_date,'status',v_row.status,'corridor',v_row.corridor,'milestones',v_row.milestones);
END $$;

CREATE OR REPLACE FUNCTION public.complete_maintenance_task(p_task_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_row public.maintenance_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.maintenance_tasks WHERE id=p_task_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_has_jurisdiction(v_row.region_id,v_row.division_id,v_row.section_id) THEN RAISE EXCEPTION 'Task outside jurisdiction'; END IF;
  IF NOT public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','je','contractor']::official_role[]) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_row.status='Completed' THEN RETURN jsonb_build_object('id',v_row.id,'status','Completed'); END IF;
  UPDATE public.maintenance_tasks SET status='Completed',completed_by=(SELECT id FROM public.user_profiles WHERE auth_user_id=auth.uid()),completed_at=NOW(),updated_at=NOW() WHERE id=p_task_id RETURNING * INTO v_row;
  INSERT INTO public.audit_logs(user_id,actor_id,action,module,resource_id,details) SELECT u.auth_user_id,u.auth_user_id,'COMPLETE','maintenance',p_task_id::text,'{}'::jsonb FROM public.user_profiles u WHERE u.auth_user_id=auth.uid();
  RETURN jsonb_build_object('id',v_row.id,'assetCode',v_row.asset_code,'assetName',v_row.asset_name,'maintenanceType',v_row.maintenance_type,'scheduledDate',v_row.scheduled_date,'cycle',v_row.cycle,'priority',v_row.priority,'triggerReason',v_row.trigger_reason,'status',v_row.status);
END $$;

CREATE OR REPLACE FUNCTION public.update_disaster_event(p_event_id UUID, p_patch JSONB) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v public.disaster_events%ROWTYPE; v_user public.user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true;
  IF v_user.id IS NULL OR v_user.role NOT IN ('super_admin','se','ee','aee','ae') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v FROM public.disaster_events WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disaster event not found'; END IF;
  UPDATE public.disaster_events SET
    status=COALESCE(p_patch->>'status',status),
    damaged_poles_count=COALESCE((p_patch->>'damagedPolesCount')::int,damaged_poles_count),
    damaged_dts_count=COALESCE((p_patch->>'damagedDTsCount')::int,damaged_dts_count),
    snapped_conductors_km=COALESCE((p_patch->>'snappedConductorsKm')::numeric,snapped_conductors_km),
    restoration_pct=COALESCE((p_patch->>'restorationPct')::numeric,restoration_pct)
  WHERE id=p_event_id RETURNING * INTO v;
  INSERT INTO public.audit_logs(user_id,actor_id,action,module,resource_id,details) VALUES(v_user.auth_user_id,v_user.auth_user_id,'UPDATE','disaster',p_event_id::text,p_patch);
  RETURN jsonb_build_object('id',v.id,'code',v.code,'eventType',v.event_type,'name',v.name,'affectedRegions',v.affected_regions,'startDate',v.start_date,'status',v.status,'damagedPolesCount',v.damaged_poles_count,'damagedDTsCount',v.damaged_dts_count,'snappedConductorsKm',v.snapped_conductors_km,'restorationPct',v.restoration_pct);
END $$;

REVOKE ALL ON FUNCTION public.update_capital_project_milestone(UUID,INT,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_capital_project_milestone(UUID,INT,BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_maintenance_task(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_task(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.update_disaster_event(UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_disaster_event(UUID,JSONB) TO authenticated;

-- Seed only empty operational tables; these are real records, not simulator-only state.
INSERT INTO public.capital_project_packages(scheme_code,title,category,scope_metric,sanctioned_budget_cr,expenditure_cr,physical_progress_pct,contractor,target_date,status,corridor,milestones)
SELECT scheme_code,title,category,scope_metric,sanctioned_budget_cr,expenditure_cr,physical_progress_pct,contractor,target_date::date,status,corridor,milestones FROM (VALUES
('RDSS-PUDU-UG-01','Coastal Cyclone Resilient Underground Cabling (Package-I)','Underground Cabling','142.5 km HT/LT Trenching',84.50,52.80,68,'Larsen & Toubro Infra Ltd','2026-12-31'::date,'In Progress','Boulevard Town Coastal Belt · Marapalam to Rock Beach','[{"title":"Detailed Project Report (DPR) Sanctioned","completed":true,"date":"2025-01-15"},{"title":"HDD Phase 1","completed":true,"date":"2025-08-10"},{"title":"11kV XLPE Cable Pulling & Jointing","completed":true,"date":"2026-01-14"},{"title":"Feeder Interconnection & RMU Commissioning","completed":false,"date":"2026-10-30"}]'::jsonb),
('RDSS-PUDU-HVDS-02','High Voltage Distribution System (HVDS) Agri Feeder Segregation','HVDS Conversion','88.0 km 11kV Aerial Bunched Cable',42.20,33.10,79,'Tata Projects Ltd','2026-09-30'::date,'On Track','Rural Agricultural Belt · Villianur to Bahour','[{"title":"GPS Survey & Customer Tagging","completed":true,"date":"2025-02-12"},{"title":"25kVA Small DTR Pole Erections","completed":true,"date":"2025-11-28"},{"title":"AB Cable Stringing on PCC Poles","completed":true,"date":"2026-02-15"},{"title":"LT Line Dismantling & Final Charging","completed":false,"date":"2026-08-15"}]'::jsonb),
('RDSS-PUDU-AMI-03','Advanced Metering Infrastructure (AMI Smart Prepaid Meters)','Smart Metering','125,000 Consumer Smart Meters',68.00,48.90,72,'Genus Power Infrastructures','2027-03-31'::date,'In Progress','Urban Commercial & Domestic Consumers · Puducherry & Karaikal','[{"title":"HES & MDMS Cloud Commissioned","completed":true,"date":"2025-06-01"},{"title":"RF Mesh / Cellular Gateway Installation","completed":true,"date":"2025-12-18"},{"title":"Consumer Meter Replacement Phase 1","completed":true,"date":"2026-01-20"},{"title":"Prepaid Billing Integration & App Go-Live","completed":false,"date":"2026-12-15"}]'::jsonb),
('RDSS-PUDU-SS-04','110/22kV Substation Capacity Augmentation & GIS Bay','Substation Augmentation','2x80MVA PTR Augmentation + GIS Bay',35.00,14.50,41,'KEC International Ltd','2027-06-30'::date,'Delayed','Marapalam & Sorapet 110kV Substations','[{"title":"Civil Foundation for 80MVA PTR","completed":true,"date":"2025-07-15"},{"title":"FAT for 80MVA Power Transformer","completed":true,"date":"2025-12-22"},{"title":"GIS Delivery & Erection","completed":false,"date":"2026-05-15"},{"title":"SCADA IEC-61850 Integration","completed":false,"date":"2026-11-30"}]'::jsonb)
) AS x(scheme_code,title,category,scope_metric,sanctioned_budget_cr,expenditure_cr,physical_progress_pct,contractor,target_date,status,corridor,milestones)
WHERE NOT EXISTS (SELECT 1 FROM public.capital_project_packages);

INSERT INTO public.maintenance_tasks(asset_id,asset_code,asset_name,maintenance_type,scheduled_date,cycle,priority,trigger_reason)
SELECT t.id,t.code,t.name,'Transformer oil / condition inspection',CURRENT_DATE + 14,'Quarterly CBM','High','Condition-based maintenance review generated from transformer operating condition'
FROM public.transformers t
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_tasks);


-- ----------------------------------------------------------------------------
-- SECTION: 20261120_final_production_hardening.sql
-- ----------------------------------------------------------------------------

-- PowerGIS V3.2.3 final source-level hardening.
-- Adds missing write RPCs, closes risk/disaster authorization gaps,
-- and removes remaining race-prone identifier generation from the live RPC set.

-- ---------------------------------------------------------------------------
-- Sequences: ensure the server-owned counters exist and remain collision-safe.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.fault_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.outage_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.ptw_number_seq;

-- ---------------------------------------------------------------------------
-- Disaster scope columns. Existing rows remain readable only to privileged
-- users until an administrator assigns a real jurisdiction.
-- ---------------------------------------------------------------------------
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.om_sections(id);
ALTER TABLE public.disaster_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS disaster_events_select ON public.disaster_events;
CREATE POLICY disaster_events_select ON public.disaster_events FOR SELECT TO authenticated
USING (
  public.user_has_role(ARRAY['super_admin','auditor','gis_admin']::official_role[])
  OR public.user_has_jurisdiction(region_id, division_id, section_id)
);
DROP POLICY IF EXISTS disaster_events_write ON public.disaster_events;
CREATE POLICY disaster_events_write ON public.disaster_events FOR UPDATE TO authenticated
USING (
  public.user_has_role(ARRAY['super_admin','se','ee','aee','ae']::official_role[])
  AND (
    public.user_has_role(ARRAY['super_admin']::official_role[])
    OR public.user_has_jurisdiction(region_id, division_id, section_id)
  )
)
WITH CHECK (
  public.user_has_role(ARRAY['super_admin','se','ee','aee','ae']::official_role[])
  AND (
    public.user_has_role(ARRAY['super_admin']::official_role[])
    OR public.user_has_jurisdiction(region_id, division_id, section_id)
  )
);

-- ---------------------------------------------------------------------------
-- Capital project creation: UI can now create packages without direct table
-- writes. All ownership/scope is resolved on the server.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_capital_project_package(
  p_scheme_code TEXT,
  p_title TEXT,
  p_category TEXT,
  p_scope_metric TEXT,
  p_sanctioned_budget_cr NUMERIC,
  p_expenditure_cr NUMERIC DEFAULT 0,
  p_physical_progress_pct NUMERIC DEFAULT 0,
  p_contractor TEXT DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_corridor TEXT DEFAULT NULL,
  p_milestones JSONB DEFAULT '[]'::jsonb,
  p_region_id UUID DEFAULT NULL,
  p_division_id UUID DEFAULT NULL,
  p_section_id UUID DEFAULT NULL
) RETURNS public.capital_project_packages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_row public.capital_project_packages%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND OR NOT public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','gis_admin']::official_role[]) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF trim(COALESCE(p_scheme_code,''))='' OR trim(COALESCE(p_title,''))='' OR trim(COALESCE(p_category,''))='' OR trim(COALESCE(p_scope_metric,''))='' THEN RAISE EXCEPTION 'Required project fields are missing'; END IF;
  IF p_sanctioned_budget_cr < 0 OR p_expenditure_cr < 0 OR p_expenditure_cr > p_sanctioned_budget_cr THEN RAISE EXCEPTION 'Invalid project budget values'; END IF;
  IF p_physical_progress_pct NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Physical progress must be 0..100'; END IF;
  IF NOT public.user_has_jurisdiction(p_region_id,p_division_id,p_section_id) THEN RAISE EXCEPTION 'Project outside jurisdiction'; END IF;
  INSERT INTO public.capital_project_packages(scheme_code,title,category,scope_metric,sanctioned_budget_cr,expenditure_cr,physical_progress_pct,contractor,target_date,corridor,milestones,region_id,division_id,section_id)
  VALUES(trim(p_scheme_code),trim(p_title),trim(p_category),trim(p_scope_metric),p_sanctioned_budget_cr,p_expenditure_cr,p_physical_progress_pct,NULLIF(trim(COALESCE(p_contractor,'')),''),p_target_date,NULLIF(trim(COALESCE(p_corridor,'')),''),COALESCE(p_milestones,'[]'::jsonb),p_region_id,p_division_id,p_section_id)
  RETURNING * INTO v_row;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details)
  VALUES(auth.uid(),v_user.id,v_user.role,'CREATE','capital_projects',v_row.id::text,jsonb_build_object('scheme_code',v_row.scheme_code));
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.create_capital_project_package(TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,DATE,TEXT,JSONB,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_capital_project_package(TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT,DATE,TEXT,JSONB,UUID,UUID,UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Maintenance task creation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_maintenance_task(
  p_asset_id UUID,
  p_asset_code TEXT,
  p_asset_name TEXT,
  p_maintenance_type TEXT,
  p_scheduled_date DATE,
  p_cycle TEXT,
  p_priority TEXT,
  p_trigger_reason TEXT,
  p_region_id UUID DEFAULT NULL,
  p_division_id UUID DEFAULT NULL,
  p_section_id UUID DEFAULT NULL
) RETURNS public.maintenance_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE; v_row public.maintenance_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND OR NOT public.user_has_role(ARRAY['super_admin','se','ee','aee','ae','je']::official_role[]) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF trim(COALESCE(p_asset_code,''))='' OR trim(COALESCE(p_asset_name,''))='' OR trim(COALESCE(p_maintenance_type,''))='' OR trim(COALESCE(p_cycle,''))='' OR trim(COALESCE(p_trigger_reason,''))='' THEN RAISE EXCEPTION 'Required maintenance fields are missing'; END IF;
  IF NOT public.user_has_jurisdiction(p_region_id,p_division_id,p_section_id) THEN RAISE EXCEPTION 'Maintenance task outside jurisdiction'; END IF;
  INSERT INTO public.maintenance_tasks(asset_id,asset_code,asset_name,maintenance_type,scheduled_date,cycle,priority,trigger_reason,region_id,division_id,section_id)
  VALUES(p_asset_id,trim(p_asset_code),trim(p_asset_name),trim(p_maintenance_type),p_scheduled_date,trim(p_cycle),COALESCE(NULLIF(trim(p_priority),''),'Medium'),trim(p_trigger_reason),p_region_id,p_division_id,p_section_id)
  RETURNING * INTO v_row;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details)
  VALUES(auth.uid(),v_user.id,v_user.role,'CREATE','maintenance',v_row.id::text,jsonb_build_object('asset_code',v_row.asset_code));
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.create_maintenance_task(UUID,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_maintenance_task(UUID,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT,UUID,UUID,UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Disaster update: strict field allow-list, value bounds, and jurisdiction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_disaster_event(p_event_id UUID, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v public.disaster_events%ROWTYPE; v_user public.user_profiles%ROWTYPE; v_status TEXT; v_restore NUMERIC;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND OR v_user.role NOT IN ('super_admin','se','ee','aee','ae') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_patch ?| ARRAY['code','eventType','name','affectedRegions','startDate','createdAt','regionId','divisionId','sectionId'] THEN RAISE EXCEPTION 'Immutable or unsupported disaster fields supplied'; END IF;
  SELECT * INTO v FROM public.disaster_events WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disaster event not found'; END IF;
  IF v_user.role <> 'super_admin' AND NOT public.user_has_jurisdiction(v.region_id,v.division_id,v.section_id) THEN RAISE EXCEPTION 'Disaster event outside jurisdiction'; END IF;
  v_status := COALESCE(p_patch->>'status',v.status);
  v_restore := COALESCE((p_patch->>'restorationPct')::numeric,v.restoration_pct);
  IF v_status NOT IN ('active','restoration_in_progress','closed') THEN RAISE EXCEPTION 'Invalid disaster status'; END IF;
  IF v_restore NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Restoration progress must be 0..100'; END IF;
  IF COALESCE((p_patch->>'damagedPolesCount')::int,v.damaged_poles_count) < 0 OR COALESCE((p_patch->>'damagedDTsCount')::int,v.damaged_dts_count) < 0 OR COALESCE((p_patch->>'snappedConductorsKm')::numeric,v.snapped_conductors_km) < 0 THEN RAISE EXCEPTION 'Damage counts cannot be negative'; END IF;
  UPDATE public.disaster_events SET
    status=v_status,
    damaged_poles_count=COALESCE((p_patch->>'damagedPolesCount')::int,damaged_poles_count),
    damaged_dts_count=COALESCE((p_patch->>'damagedDTsCount')::int,damaged_dts_count),
    snapped_conductors_km=COALESCE((p_patch->>'snappedConductorsKm')::numeric,snapped_conductors_km),
    restoration_pct=v_restore,
    updated_at=NOW()
  WHERE id=p_event_id RETURNING * INTO v;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details)
  VALUES(auth.uid(),v_user.id,v_user.role,'UPDATE','disaster',p_event_id::text,p_patch);
  RETURN jsonb_build_object('id',v.id,'code',v.code,'eventType',v.event_type,'name',v.name,'affectedRegions',v.affected_regions,'startDate',v.start_date,'status',v.status,'damagedPolesCount',v.damaged_poles_count,'damagedDTsCount',v.damaged_dts_count,'snappedConductorsKm',v.snapped_conductors_km,'restorationPct',v.restoration_pct);
END $$;
REVOKE ALL ON FUNCTION public.update_disaster_event(UUID,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_disaster_event(UUID,JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- Risk calculation: no longer exposes arbitrary transformers to any user.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_transformer_risk_score(p_transformer_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_tr public.transformers%ROWTYPE; v_user public.user_profiles%ROWTYPE; v_fault_count INT; v_age_years NUMERIC; v_condition_index NUMERIC; v_age_factor NUMERIC; v_load_factor NUMERIC; v_fault_factor NUMERIC; v_criticality NUMERIC; v_total_risk NUMERIC; v_risk_category TEXT; v_recommendation TEXT;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
  SELECT * INTO v_tr FROM public.transformers WHERE id=p_transformer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transformer not found'; END IF;
  IF NOT public.user_has_jurisdiction(v_tr.region_id,v_tr.division_id,v_tr.section_id) THEN RAISE EXCEPTION 'Transformer outside jurisdiction'; END IF;
  v_age_years := COALESCE(EXTRACT(YEAR FROM AGE(NOW(), v_tr.installation_date)), 5.0);
  SELECT COUNT(*) INTO v_fault_count FROM public.faults WHERE transformer_id=p_transformer_id AND reported_at >= NOW()-INTERVAL '2 years';
  v_condition_index := 100.0;
  IF v_tr.has_oil_leakage THEN v_condition_index := v_condition_index - 35.0; END IF;
  IF v_tr.oil_level_pct < 85.0 THEN v_condition_index := v_condition_index - 25.0; END IF;
  IF v_tr.phase_imbalance_pct > 5.0 THEN v_condition_index := v_condition_index - (v_tr.phase_imbalance_pct*2.0); END IF;
  v_condition_index := 100.0-GREATEST(0.0,v_condition_index);
  v_age_factor := LEAST(100.0,(v_age_years/25.0)*100.0);
  v_load_factor := LEAST(100.0,GREATEST(0.0,COALESCE(v_tr.load_percentage,0)));
  v_fault_factor := LEAST(100.0,v_fault_count*20.0);
  v_criticality := CASE WHEN v_tr.capacity_kva>=1000 THEN 90 WHEN v_tr.capacity_kva>=500 THEN 75 WHEN v_tr.capacity_kva>=250 THEN 50 ELSE 30 END;
  v_total_risk := ROUND((0.30*v_condition_index+0.25*v_age_factor+0.20*v_load_factor+0.15*v_fault_factor+0.10*v_criticality)::numeric,1);
  IF v_total_risk>=75 THEN v_risk_category:='Critical'; v_recommendation:='Immediate engineering review and corrective action required.';
  ELSIF v_total_risk>=55 THEN v_risk_category:='High'; v_recommendation:='Schedule engineering inspection and corrective maintenance.';
  ELSIF v_total_risk>=35 THEN v_risk_category:='Moderate'; v_recommendation:='Include in routine preventive-maintenance planning.';
  ELSE v_risk_category:='Low'; v_recommendation:='Continue normal monitoring and preventive maintenance.'; END IF;
  RETURN jsonb_build_object('transformer_id',p_transformer_id,'transformer_code',v_tr.code,'age_years',v_age_years,'fault_count_2yr',v_fault_count,'condition_risk',v_condition_index,'age_factor',v_age_factor,'load_factor',v_load_factor,'total_risk_score',v_total_risk,'risk_category',v_risk_category,'recommendation',v_recommendation);
END $$;
REVOKE ALL ON FUNCTION public.calculate_transformer_risk_score(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_transformer_risk_score(UUID) TO authenticated;

-- Final function grants: callers use RPCs, not direct table mutation.
REVOKE INSERT, UPDATE, DELETE ON public.capital_project_packages FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.maintenance_tasks FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.disaster_events FROM authenticated;

-- Helpful indexes for the now-scoped specialized records.
CREATE INDEX IF NOT EXISTS idx_capital_project_section ON public.capital_project_packages(section_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_section_date ON public.maintenance_tasks(section_id,scheduled_date);
CREATE INDEX IF NOT EXISTS idx_disaster_section ON public.disaster_events(section_id);
CREATE INDEX IF NOT EXISTS idx_disaster_updated_at ON public.disaster_events(updated_at DESC);


-- ----------------------------------------------------------------------------
-- SECTION: 20261121_security_closure.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SECTION: 20261122_operational_integrity.sql
-- ----------------------------------------------------------------------------

-- PowerGIS 3.8.0 operational integrity primitives.
create table if not exists public.operation_idempotency (
  operation_id text primary key,
  actor_id uuid references public.user_profiles(id),
  operation_type text not null,
  status text not null check (status in ('pending','completed','failed')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operation_idempotency_actor_idx on public.operation_idempotency(actor_id, created_at desc);
alter table public.operation_idempotency enable row level security;
create or replace function public.touch_operation_idempotency_updated_at()
returns trigger language plpgsql security invoker as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists operation_idempotency_touch on public.operation_idempotency;
create trigger operation_idempotency_touch before update on public.operation_idempotency for each row execute function public.touch_operation_idempotency_updated_at();
create or replace function public.begin_idempotent_operation(p_operation_id text, p_operation_type text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing jsonb;
begin
  select jsonb_build_object('status', status, 'result', result, 'error_message', error_message) into existing from public.operation_idempotency where operation_id = p_operation_id;
  if existing is not null then return existing; end if;
  insert into public.operation_idempotency(operation_id, actor_id, operation_type, status) values (p_operation_id, auth.uid(), p_operation_type, 'pending');
  return jsonb_build_object('status','pending');
end; $$;
revoke all on function public.begin_idempotent_operation(text,text) from public, anon;
grant execute on function public.begin_idempotent_operation(text,text) to authenticated;
comment on table public.operation_idempotency is 'Server-side idempotency ledger for critical PowerGIS mutations.';


create or replace function public.complete_idempotent_operation(p_operation_id text, p_result jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.operation_idempotency set status='completed', result=p_result, error_message=null, updated_at=now()
  where operation_id=p_operation_id and actor_id=auth.uid();
end; $$;

create or replace function public.fail_idempotent_operation(p_operation_id text, p_error_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.operation_idempotency set status='failed', error_message=p_error_message, updated_at=now()
  where operation_id=p_operation_id and actor_id=auth.uid();
end; $$;

revoke all on function public.complete_idempotent_operation(text,jsonb) from public, anon;
revoke all on function public.fail_idempotent_operation(text,text) from public, anon;
grant execute on function public.complete_idempotent_operation(text,jsonb) to authenticated;
grant execute on function public.fail_idempotent_operation(text,text) to authenticated;


-- ----------------------------------------------------------------------------
-- SECTION: 20261123_transactional_mutation_wrappers.sql
-- ----------------------------------------------------------------------------

-- PowerGIS 3.9.0 transactional mutation wrappers.
-- Each wrapper writes the idempotency ledger and executes the existing business
-- function in the same PostgreSQL transaction. A client retry therefore cannot
-- create a second mutation after a transport timeout.

CREATE OR REPLACE FUNCTION public.create_work_order_idempotent(
  p_operation_id TEXT, p_title TEXT, p_category TEXT, p_instructions TEXT,
  p_assigned_crew TEXT, p_section_id UUID, p_priority TEXT, p_due_date DATE
) RETURNS public.work_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB; v_order public.work_orders%ROWTYPE;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'work_order.create');
  IF v_gate->>'status'='completed' THEN
    SELECT * INTO v_order FROM jsonb_populate_record(NULL::public.work_orders, v_gate->'result');
    RETURN v_order;
  END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  v_order := public.create_work_order(p_title,p_category,p_instructions,p_assigned_crew,p_section_id,p_priority,p_due_date);
  PERFORM public.complete_idempotent_operation(p_operation_id, to_jsonb(v_order));
  RETURN v_order;
END $$;

CREATE OR REPLACE FUNCTION public.advance_work_order_status_idempotent(
  p_operation_id TEXT, p_work_order_id UUID, p_next_status TEXT, p_expected_version TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'work_order.transition');
  IF v_gate->>'status'='completed' THEN RETURN COALESCE(v_gate->'result','{}'::jsonb); END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  IF p_expected_version IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.work_orders WHERE id=p_work_order_id AND updated_at=p_expected_version FOR UPDATE) THEN
    RAISE EXCEPTION 'CONCURRENCY_CONFLICT: work order changed or was removed before transition';
  END IF;
  PERFORM public.advance_work_order_status(p_work_order_id,p_next_status);
  PERFORM public.complete_idempotent_operation(p_operation_id, jsonb_build_object('work_order_id',p_work_order_id,'status',p_next_status));
  RETURN jsonb_build_object('work_order_id',p_work_order_id,'status',p_next_status);
END $$;

CREATE OR REPLACE FUNCTION public.issue_inventory_atomic_idempotent(
  p_operation_id TEXT, p_item_id UUID, p_quantity NUMERIC, p_work_order_id UUID DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL, p_remarks TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB; v_result JSONB;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'inventory.issue');
  IF v_gate->>'status'='completed' THEN RETURN COALESCE(v_gate->'result','{}'::jsonb); END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  v_result := public.issue_inventory_atomic(p_item_id,p_quantity,p_work_order_id,p_recipient_name,p_remarks);
  PERFORM public.complete_idempotent_operation(p_operation_id, v_result);
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.record_inventory_transaction_idempotent(
  p_operation_id TEXT, p_item_id UUID, p_transaction_type TEXT, p_quantity NUMERIC,
  p_work_order_id UUID DEFAULT NULL, p_recipient_name TEXT DEFAULT NULL, p_remarks TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB; v_id UUID;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'inventory.transaction');
  IF v_gate->>'status'='completed' THEN RETURN (v_gate->>'result')::uuid; END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  v_id := public.record_inventory_transaction(p_item_id,p_transaction_type,p_quantity,p_work_order_id,p_recipient_name,p_remarks);
  PERFORM public.complete_idempotent_operation(p_operation_id, to_jsonb(v_id));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_ptw_request_idempotent(
  p_operation_id TEXT, p_feeder_id UUID, p_section_id UUID, p_work_description TEXT, p_isolation_points TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB; v_id UUID;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'ptw.create');
  IF v_gate->>'status'='completed' THEN RETURN (v_gate->>'result')::uuid; END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  v_id := public.create_ptw_request(p_feeder_id,p_section_id,p_work_description,p_isolation_points);
  PERFORM public.complete_idempotent_operation(p_operation_id, to_jsonb(v_id));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.advance_ptw_stage_idempotent(
  p_operation_id TEXT, p_permit_id UUID, p_stage public.ptw_status, p_equipment TEXT DEFAULT NULL,
  p_location_lat NUMERIC DEFAULT NULL, p_location_lng NUMERIC DEFAULT NULL, p_confirmation BOOLEAN DEFAULT FALSE,
  p_evidence_path TEXT DEFAULT NULL, p_comments TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_gate JSONB; v_result JSONB;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'ptw.transition');
  IF v_gate->>'status'='completed' THEN RETURN COALESCE(v_gate->'result','{}'::jsonb); END IF;
  IF v_gate->>'status'='failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous operation failed'); END IF;
  v_result := public.advance_ptw_stage(p_permit_id,p_stage,p_equipment,p_location_lat,p_location_lng,p_confirmation,p_evidence_path,p_comments);
  PERFORM public.complete_idempotent_operation(p_operation_id, v_result);
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.create_work_order_idempotent(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_work_order_status_idempotent(TEXT,UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.issue_inventory_atomic_idempotent(TEXT,UUID,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_inventory_transaction_idempotent(TEXT,UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_ptw_request_idempotent(TEXT,UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_ptw_stage_idempotent(TEXT,UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_work_order_idempotent(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_work_order_status_idempotent(TEXT,UUID,TEXT,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_inventory_atomic_idempotent(TEXT,UUID,NUMERIC,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction_idempotent(TEXT,UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ptw_request_idempotent(TEXT,UUID,UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_ptw_stage_idempotent(TEXT,UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- SECTION: 20261124_production_enforcement.sql
-- ----------------------------------------------------------------------------

-- PowerGIS 3.10.0 production enforcement.
-- Persistent notifications, explicit workflow validation, and least-privilege RPC grants.

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('critical','high','medium','info')),
  target_tab TEXT,
  action_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, read_at) WHERE read_at IS NULL;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;
CREATE POLICY user_notifications_update_own ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id UUID, p_title TEXT, p_message TEXT, p_priority TEXT DEFAULT 'info',
  p_target_tab TEXT DEFAULT NULL, p_action_label TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_id UUID; v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_priority NOT IN ('critical','high','medium','info') THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_PRIORITY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id=v_actor AND (role='super_admin' OR auth_user_id=p_user_id)) THEN
    RAISE EXCEPTION 'NOTIFICATION_SCOPE_DENIED';
  END IF;
  INSERT INTO public.user_notifications(user_id,title,message,priority,target_tab,action_label,metadata)
  VALUES(p_user_id,p_title,p_message,p_priority,p_target_tab,p_action_label,COALESCE(p_metadata,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_user_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_user_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS operation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_id ON public.audit_logs(operation_id) WHERE operation_id IS NOT NULL;

-- Ensure the transactional wrappers remain inaccessible to anonymous callers after every deployment.
REVOKE ALL ON FUNCTION public.create_work_order_idempotent(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_work_order_status_idempotent(TEXT,UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.issue_inventory_atomic_idempotent(TEXT,UUID,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_inventory_transaction_idempotent(TEXT,UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_ptw_request_idempotent(TEXT,UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_ptw_stage_idempotent(TEXT,UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) FROM PUBLIC,anon;

-- Correlate successful transactional operations with an immutable audit event.
CREATE OR REPLACE FUNCTION public.record_operation_audit(p_operation_id TEXT, p_operation_type TEXT, p_resource_id TEXT DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,operation_id)
  VALUES(auth.uid(),v_user.id,v_user.role,'operation.completed','transactional_operations',p_resource_id,jsonb_build_object('operation_type',p_operation_type,'details',COALESCE(p_details,'{}'::jsonb)),p_operation_id);
END $$;
REVOKE ALL ON FUNCTION public.record_operation_audit(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_operation_audit(TEXT,TEXT,TEXT,JSONB) TO authenticated;


-- ----------------------------------------------------------------------------
-- SECTION: seed.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
-- PRODUCTION SEED DATA: All 4 Regions (Puducherry, Karaikal, Mahe, Yanam)
-- Realistic Coordinate Polygons & Electrical Network Topologies
-- ============================================================================

-- Reconcile deterministic UUIDs if tables exist with legacy auto-generated IDs
DO $$
BEGIN
    UPDATE public.regions SET id = '11000000-0000-0000-0000-000000000001' WHERE code = 'REG-PDY' AND id <> '11000000-0000-0000-0000-000000000001';
    UPDATE public.regions SET id = '11000000-0000-0000-0000-000000000002' WHERE code = 'REG-KKL' AND id <> '11000000-0000-0000-0000-000000000002';
    UPDATE public.regions SET id = '11000000-0000-0000-0000-000000000003' WHERE code = 'REG-MAH' AND id <> '11000000-0000-0000-0000-000000000003';
    UPDATE public.regions SET id = '11000000-0000-0000-0000-000000000004' WHERE code = 'REG-YAN' AND id <> '11000000-0000-0000-0000-000000000004';

    UPDATE public.divisions SET id = '12000000-0000-0000-0000-000000000001' WHERE code = 'DIV-URBAN' AND id <> '12000000-0000-0000-0000-000000000001';
    UPDATE public.divisions SET id = '12000000-0000-0000-0000-000000000002' WHERE code = 'DIV-RURAL-N' AND id <> '12000000-0000-0000-0000-000000000002';
    UPDATE public.divisions SET id = '12000000-0000-0000-0000-000000000003' WHERE code = 'DIV-KKL' AND id <> '12000000-0000-0000-0000-000000000003';
    UPDATE public.divisions SET id = '12000000-0000-0000-0000-000000000004' WHERE code = 'DIV-MAHE-YAN' AND id <> '12000000-0000-0000-0000-000000000004';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Relax strict NOT NULL constraints on legacy columns from older database schemas
DO $$
DECLARE
    t TEXT;
    c TEXT;
    target_tables TEXT[] := ARRAY[
        'regions', 'divisions', 'subdivisions', 'om_sections', 'je_jurisdictions',
        'user_profiles', 'substations', 'feeders', 'transformers', 'poles',
        'conductors', 'streetlights', 'consumers', 'faults', 'work_orders',
        'survey_submissions', 'survey_staging_assets', 'outages',
        'outage_reliability_metrics', 'safety_permits', 'stores_inventory',
        'stores_transactions', 'disaster_events'
    ];
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        FOR c IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = t 
              AND is_nullable = 'NO'
              AND column_name NOT IN ('id', 'code', 'consumer_number', 'submission_code', 'fault_code', 'outage_code', 'ptw_number', 'item_code')
              AND column_default IS NULL
        LOOP
            BEGIN
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', t, c);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END LOOP;

    -- Legacy tariff_category alignment if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'consumers' AND column_name = 'tariff_category'
    ) THEN
        ALTER TABLE public.consumers ALTER COLUMN tariff_category DROP NOT NULL;
        ALTER TABLE public.consumers ALTER COLUMN tariff_category SET DEFAULT 'DOMESTIC';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Reconcile legacy foreign keys pointing to outdated tables (e.g. utility_poles -> poles)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT cl.relname AS table_name, con.conname AS constraint_name, clf.relname AS foreign_table
        FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_class clf ON clf.oid = con.confrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE n.nspname = 'public' 
          AND con.contype = 'f'
          AND clf.relname IN ('utility_poles', 'distribution_transformers', 'dtrs', 'feeder_lines', 'sections', 'jurisdictions')
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    -- Ensure consumers foreign keys point to canonical tables
    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_pole_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_transformer_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_transformer_id_fkey FOREIGN KEY (transformer_id) REFERENCES public.transformers(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_feeder_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_feeder_id_fkey FOREIGN KEY (feeder_id) REFERENCES public.feeders(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.consumers DROP CONSTRAINT IF EXISTS consumers_section_id_fkey;
        ALTER TABLE public.consumers ADD CONSTRAINT consumers_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.om_sections(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Ensure streetlights and faults point to public.poles
    BEGIN
        ALTER TABLE public.streetlights DROP CONSTRAINT IF EXISTS streetlights_pole_id_fkey;
        ALTER TABLE public.streetlights ADD CONSTRAINT streetlights_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
        ALTER TABLE public.faults DROP CONSTRAINT IF EXISTS faults_pole_id_fkey;
        ALTER TABLE public.faults ADD CONSTRAINT faults_pole_id_fkey FOREIGN KEY (pole_id) REFERENCES public.poles(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Widen status in disaster_events to fit 'restoration_in_progress' (23 chars)
    BEGIN
        ALTER TABLE public.disaster_events ALTER COLUMN status TYPE VARCHAR(50);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Ensure all columns required by seed data exist even on legacy pre-existing tables
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS consumer_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Domestic';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS sanctioned_load_kw NUMERIC(10, 2) DEFAULT 3.0;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS pole_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_number VARCHAR(50);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS is_smart_meter BOOLEAN DEFAULT FALSE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_make VARCHAR(100);
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS meter_install_date DATE;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS pole_number VARCHAR(50);
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS pole_type VARCHAR(50) DEFAULT 'PSCC 9m';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS material VARCHAR(50) DEFAULT 'Pre-stressed Concrete';
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS height_meters NUMERIC(4, 1) DEFAULT 9.0;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS transformer_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS has_streetlight BOOLEAN DEFAULT FALSE;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.poles ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS feeder_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS capacity_kva INT DEFAULT 100;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS make VARCHAR(100);
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS installation_date DATE;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS load_percentage NUMERIC(5, 2) DEFAULT 50.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS oil_level_pct NUMERIC(5, 2) DEFAULT 95.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS has_oil_leakage BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS phase_imbalance_pct NUMERIC(5, 2) DEFAULT 4.0;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS division_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS je_jurisdiction_id UUID;
ALTER TABLE public.transformers ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_pole_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_dt_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_along_feeder_m NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS distance_from_office_km NUMERIC(8, 2);
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS affected_consumers_est INT DEFAULT 0;
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- 1. Regions
INSERT INTO public.regions (id, code, name, headquarters) VALUES
('11000000-0000-0000-0000-000000000001', 'REG-PDY', 'Puducherry', 'Gubert Avenue, Puducherry'),
('11000000-0000-0000-0000-000000000002', 'REG-KKL', 'Karaikal', 'Beach Road, Karaikal'),
('11000000-0000-0000-0000-000000000003', 'REG-MAH', 'Mahe', 'Civil Station Road, Mahe'),
('11000000-0000-0000-0000-000000000004', 'REG-YAN', 'Yanam', 'Pillaraya Street, Yanam')
ON CONFLICT (code) DO NOTHING;

-- 2. Divisions
INSERT INTO public.divisions (id, region_id, code, name, ee_in_charge_name, contact_phone) VALUES
('12000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), 'DIV-URBAN', 'Urban Distribution Division', 'Er. M. Sivakumar, EE', '+91 94430 11001'),
('12000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), 'DIV-RURAL-N', 'Rural North Division', 'Er. R. Baskaran, EE', '+91 94430 11002'),
('12000000-0000-0000-0000-000000000003', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-KKL' LIMIT 1), '11000000-0000-0000-0000-000000000002'), 'DIV-KKL', 'Karaikal Electricity Division', 'Er. K. Murugesan, EE', '+91 94430 11003'),
('12000000-0000-0000-0000-000000000004', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-MAH' LIMIT 1), '11000000-0000-0000-0000-000000000003'), 'DIV-MAHE-YAN', 'Outlying Regions Division', 'Er. V. Radhakrishnan, EE', '+91 94430 11004')
ON CONFLICT (code) DO NOTHING;

-- 3. Subdivisions
INSERT INTO public.subdivisions (id, division_id, code, name, aee_in_charge_name) VALUES
('13000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), 'SUBDIV-TOWN', 'Town Sub-Division', 'Er. S. Jayakumar, AEE'),
('13000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), 'SUBDIV-BLVD', 'Boulevard Sub-Division', 'Er. P. Thirunavukkarasu, AEE'),
('13000000-0000-0000-0000-000000000003', COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-KKL' LIMIT 1), '12000000-0000-0000-0000-000000000003'), 'SUBDIV-KKL-TOWN', 'Karaikal Town Sub-Division', 'Er. N. Ravichandran, AEE'),
('13000000-0000-0000-0000-000000000004', COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-MAHE-YAN' LIMIT 1), '12000000-0000-0000-0000-000000000004'), 'SUBDIV-MAHE', 'Mahe O&M Sub-Division', 'Er. K. Mukundan, AEE')
ON CONFLICT (code) DO NOTHING;

-- 4. O&M Sections
INSERT INTO public.om_sections (id, subdivision_id, code, name, ae_in_charge_name, office_address, office_location) VALUES
('14000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), 'SEC-MARAPALAM', 'Marapalam O&M Section', 'Er. T. Senthil Nathan, AE', 'Maraimalai Adigal Salai, Marapalam', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('14000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-BLVD' LIMIT 1), '13000000-0000-0000-0000-000000000002'), 'SEC-HERITAGE', 'Heritage French Quarter Section', 'Er. G. Ilangovan, AE', 'Rue Romain Rolland, White Town', ST_SetSRID(ST_Point(79.8340, 11.9360), 4326)),
('14000000-0000-0000-0000-000000000003', COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), 'SEC-LAWSPET', 'Lawspet O&M Section', 'Er. D. Raman, AE', 'Airport Road, Lawspet', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('14000000-0000-0000-0000-000000000004', COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-KKL-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000003'), 'SEC-KKL-PORT', 'Karaikal Port O&M Section', 'Er. M. Anbarasan, AE', 'Keezha Kasakudy, Karaikal', ST_SetSRID(ST_Point(79.8390, 10.9250), 4326))
ON CONFLICT (code) DO NOTHING;

-- 5. JE Jurisdictions
INSERT INTO public.je_jurisdictions (id, section_id, code, name, je_name) VALUES
('15000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), 'JE-JUR-MARA-01', 'Marapalam Commercial Ward', 'Er. V. Anand, JE'),
('15000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), 'JE-JUR-MARA-02', 'Orleanpet Residential Ward', 'Er. K. Prakash, JE'),
('15000000-0000-0000-0000-000000000003', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), 'JE-JUR-HERI-01', 'White Town & Beach Road', 'Er. P. Dinesh, JE')
ON CONFLICT (code) DO NOTHING;

-- 6. User Profiles (16 Key Personas covering all roles & SE hierarchy)
INSERT INTO public.user_profiles (
    id, username, email, full_name, role, designation, phone, region_id, division_id, subdivision_id, section_id, je_jurisdiction_id
) VALUES
('20000000-0000-0000-0000-000000000001', 'superadmin', 'superadmin@powergis.internal', 'System Administrator', 'super_admin', 'Director of IT & Geospatial Systems', '+91 413 2336331', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000002', 'se_puducherry_1', 'se1.pdy@powergis.internal', 'Er. T. Chandrasekaran', 'se', 'Superintending Engineer (Circle I - Urban)', '+91 94430 00001', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000003', 'se_puducherry_2', 'se2.pdy@powergis.internal', 'Er. A. Rajagopalan', 'se', 'Superintending Engineer (Circle II - Rural)', '+91 94430 00002', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000004', 'se_karaikal', 'se.kkl@powergis.internal', 'Er. M. Balasubramanian', 'se', 'Superintending Engineer (Karaikal, Mahe & Yanam)', '+91 94430 00003', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-KKL' LIMIT 1), '11000000-0000-0000-0000-000000000002'), NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000005', 'ee_urban', 'ee.urban@powergis.internal', 'Er. M. Sivakumar', 'ee', 'Executive Engineer (Urban Operations)', '+91 94430 11001', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000006', 'aee_town', 'aee.town@powergis.internal', 'Er. S. Jayakumar', 'aee', 'Assistant Executive Engineer (Town Sub-Division)', '+91 94430 11005', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), NULL, NULL),
('20000000-0000-0000-0000-000000000007', 'ae_marapalam', 'ae.marapalam@powergis.internal', 'Er. T. Senthil Nathan', 'ae', 'Assistant Engineer (Marapalam Section)', '+91 94430 11007', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), NULL),
('20000000-0000-0000-0000-000000000008', 'je_marapalam', 'je.marapalam@powergis.internal', 'Er. V. Anand', 'je', 'Junior Engineer (Marapalam Commercial Ward)', '+91 94430 11008', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001')),
('20000000-0000-0000-0000-000000000009', 'contractor_epc', 'survey.epc@larsenpower.com', 'Er. Rajesh Kumar', 'contractor', 'Authorized EPC Survey Contractor', '+91 98840 22001', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.subdivisions WHERE code = 'SUBDIV-TOWN' LIMIT 1), '13000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001')),
('20000000-0000-0000-0000-000000000010', 'gis_administrator', 'gisadmin@powergis.internal', 'S. Ananthi', 'gis_admin', 'Principal Spatial Data Administrator', '+91 94430 11010', NULL, NULL, NULL, NULL, NULL),
('20000000-0000-0000-0000-000000000011', 'grid_auditor', 'auditor@jercuts.gov.in', 'Dr. S. Ramachandran', 'auditor', 'JERC Regulatory Grid Auditor', '+91 94430 11015', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (username) DO NOTHING;

-- 7. Substations (Puducherry, Karaikal, Mahe, Yanam)
INSERT INTO public.substations (
    id, code, name, voltage_class, capacity_mva, num_feeders, region_id, division_id, section_id, commission_date, geom
) VALUES
('30000000-0000-0000-0000-000000000001', 'SS-MARA-110', 'Marapalam 110/22kV Substation', '110kV', 80.00, 6, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), '2015-08-15', ST_SetSRID(ST_Point(79.8183, 11.9216), 4326)),
('30000000-0000-0000-0000-000000000002', 'SS-VILL-230', 'Villianur 230/110kV Auto Substation', '230kV', 200.00, 8, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-RURAL-N' LIMIT 1), '12000000-0000-0000-0000-000000000002'), NULL, '2012-01-26', ST_SetSRID(ST_Point(79.7562, 11.9168), 4326)),
('30000000-0000-0000-0000-000000000003', 'SS-LAWS-066', 'Lawspet 66/11kV Substation', '66kV', 50.00, 4, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-LAWSPET' LIMIT 1), '14000000-0000-0000-0000-000000000003'), '2018-05-10', ST_SetSRID(ST_Point(79.8124, 11.9682), 4326)),
('30000000-0000-0000-0000-000000000004', 'SS-MUTH-033', 'Muthialpet 33/11kV Substation', '33kV', 25.00, 4, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), '2020-03-22', ST_SetSRID(ST_Point(79.8340, 11.9540), 4326)),
('30000000-0000-0000-0000-000000000005', 'SS-KKL-110', 'Karaikal Port 110/33kV Substation', '110kV', 60.00, 5, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-KKL' LIMIT 1), '11000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-KKL' LIMIT 1), '12000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-KKL-PORT' LIMIT 1), '14000000-0000-0000-0000-000000000004'), '2016-10-18', ST_SetSRID(ST_Point(79.8385, 10.9230), 4326)),
('30000000-0000-0000-0000-000000000006', 'SS-MAHE-066', 'Mahe 66/11kV Substation', '66kV', 20.00, 3, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-MAH' LIMIT 1), '11000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-MAHE-YAN' LIMIT 1), '12000000-0000-0000-0000-000000000004'), NULL, '2019-02-14', ST_SetSRID(ST_Point(75.5342, 11.7018), 4326)),
('30000000-0000-0000-0000-000000000007', 'SS-YAN-033', 'Yanam Godavari 33/11kV Substation', '33kV', 16.00, 3, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-YAN' LIMIT 1), '11000000-0000-0000-0000-000000000004'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-MAHE-YAN' LIMIT 1), '12000000-0000-0000-0000-000000000004'), NULL, '2021-07-09', ST_SetSRID(ST_Point(82.2175, 16.7320), 4326))
ON CONFLICT (code) DO NOTHING;

-- 8. Feeders
INSERT INTO public.feeders (
    id, code, name, substation_id, voltage_class, conductor_type, length_km, peak_load_amps, region_id, division_id, section_id, is_energized, geom
) VALUES
('40000000-0000-0000-0000-000000000001', 'FDR-MARA-01', 'Marapalam - Boulevard 11kV Feeder', COALESCE((SELECT id FROM public.substations WHERE code = 'SS-MARA-110' LIMIT 1), '30000000-0000-0000-0000-000000000001'), '11kV', 'Rabbit ACSR', 4.80, 245.0, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8183 11.9216, 79.8210 11.9250, 79.8250 11.9310, 79.8290 11.9340, 79.8310 11.9370)'), 4326)),
('40000000-0000-0000-0000-000000000002', 'FDR-HERI-02', 'French Quarter Heritage 11kV Feeder', COALESCE((SELECT id FROM public.substations WHERE code = 'SS-MARA-110' LIMIT 1), '30000000-0000-0000-0000-000000000001'), '11kV', 'Dog ACSR', 3.60, 280.0, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8250 11.9310, 79.8280 11.9340, 79.8310 11.9380, 79.8340 11.9420)'), 4326)),
('40000000-0000-0000-0000-000000000003', 'FDR-LAWS-03', 'Lawspet - Airport Road 11kV Feeder', COALESCE((SELECT id FROM public.substations WHERE code = 'SS-LAWS-066' LIMIT 1), '30000000-0000-0000-0000-000000000003'), '11kV', 'Rabbit ACSR', 5.20, 195.0, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-LAWSPET' LIMIT 1), '14000000-0000-0000-0000-000000000003'), TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8124 11.9682, 79.8140 11.9650, 79.8160 11.9600, 79.8200 11.9560)'), 4326)),
('40000000-0000-0000-0000-000000000004', 'FDR-KKL-01', 'Karaikal Harbor Express 33kV Feeder', COALESCE((SELECT id FROM public.substations WHERE code = 'SS-KKL-110' LIMIT 1), '30000000-0000-0000-0000-000000000005'), '33kV', 'Panther ACSR', 6.40, 210.0, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-KKL' LIMIT 1), '11000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-KKL' LIMIT 1), '12000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-KKL-PORT' LIMIT 1), '14000000-0000-0000-0000-000000000004'), TRUE, ST_SetSRID(ST_GeomFromText('LINESTRING(79.8385 10.9230, 79.8410 10.9260, 79.8450 10.9300)'), 4326))
ON CONFLICT (code) DO NOTHING;

-- 9. Transformers (DTs)
INSERT INTO public.transformers (
    id, code, name, feeder_id, capacity_kva, make, serial_number, installation_date, load_percentage, oil_level_pct, has_oil_leakage, phase_imbalance_pct, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('50000000-0000-0000-0000-000000000001', 'DTR-BLVD-01', 'Boulevard North DTR 250kVA', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), 250, 'Voltamp Transformers', 'VT-2022-8812', '2022-03-10', 68.5, 96.0, FALSE, 3.2, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), ST_SetSRID(ST_Point(79.8250, 11.9310), 4326)),
('50000000-0000-0000-0000-000000000002', 'DTR-HERI-02', 'French Quarter Heritage DTR 500kVA', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), 500, 'ABB India Ltd', 'ABB-2021-9943', '2021-11-20', 82.0, 92.5, FALSE, 7.8, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), ST_SetSRID(ST_Point(79.8310, 11.9380), 4326)),
('50000000-0000-0000-0000-000000000003', 'DTR-ARPT-03', 'Airport Gateway DTR 160kVA', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-LAWS-03' LIMIT 1), '40000000-0000-0000-0000-000000000003'), 160, 'Kirloskar Electric', 'KEC-2023-1102', '2023-01-15', 45.2, 98.0, FALSE, 2.5, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-LAWSPET' LIMIT 1), '14000000-0000-0000-0000-000000000003'), NULL, ST_SetSRID(ST_Point(79.8160, 11.9600), 4326)),
('50000000-0000-0000-0000-000000000004', 'DTR-KKL-04', 'Karaikal Harbor DTR 400kVA', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-KKL-01' LIMIT 1), '40000000-0000-0000-0000-000000000004'), 400, 'Schneider Electric', 'SCH-2020-4491', '2020-06-18', 76.4, 94.0, FALSE, 4.1, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-KKL' LIMIT 1), '11000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-KKL' LIMIT 1), '12000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-KKL-PORT' LIMIT 1), '14000000-0000-0000-0000-000000000004'), NULL, ST_SetSRID(ST_Point(79.8420, 10.9270), 4326))
ON CONFLICT (code) DO NOTHING;

-- 10. Poles
INSERT INTO public.poles (
    id, code, pole_number, pole_type, material, height_meters, feeder_id, transformer_id, has_streetlight, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('60000000-0000-0000-0000-000000000001', 'POL-MARA-001', 'P-01/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-BLVD-01' LIMIT 1), '50000000-0000-0000-0000-000000000001'), TRUE, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), ST_SetSRID(ST_Point(79.8210, 11.9250), 4326)),
('60000000-0000-0000-0000-000000000002', 'POL-MARA-002', 'P-02/MARA', 'PSCC 9m', 'Pre-stressed Concrete', 9.0, COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-BLVD-01' LIMIT 1), '50000000-0000-0000-0000-000000000001'), TRUE, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), ST_SetSRID(ST_Point(79.8230, 11.9280), 4326)),
('60000000-0000-0000-0000-000000000003', 'POL-HERI-010', 'P-10/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-HERI-02' LIMIT 1), '50000000-0000-0000-0000-000000000002'), TRUE, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), ST_SetSRID(ST_Point(79.8290, 11.9350), 4326)),
('60000000-0000-0000-0000-000000000004', 'POL-HERI-011', 'P-11/HERI', 'Steel Tubular 11m', 'Galvanized Steel', 11.0, COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-HERI-02' LIMIT 1), '50000000-0000-0000-0000-000000000002'), FALSE, COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), ST_SetSRID(ST_Point(79.8315, 11.9385), 4326))
ON CONFLICT (code) DO NOTHING;

-- 11. Consumers & Smart Meters
INSERT INTO public.consumers (
    id, consumer_number, account_number, name, address, category, sanctioned_load_kw, pole_id, transformer_id, feeder_id, meter_number, is_smart_meter, meter_make, meter_install_date, region_id, division_id, section_id, je_jurisdiction_id, geom
) VALUES
('70000000-0000-0000-0000-000000000001', 'CON-04-102-9901', 'ACC-PDY-101', 'Alliance Francaise de Pondichery', '58 Suffren Street, White Town, Puducherry', 'Commercial', 35.0, COALESCE((SELECT id FROM public.poles WHERE code = 'POL-HERI-010' LIMIT 1), '60000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-HERI-02' LIMIT 1), '50000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), 'SMTR-LT-44910', TRUE, 'L&T Smart Grid', '2023-04-12', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), ST_SetSRID(ST_Point(79.8320, 11.9390), 4326)),
('70000000-0000-0000-0000-000000000002', 'CON-04-102-9902', 'ACC-PDY-102', 'Aurobindo Ashram Guest House', 'Marine Street, White Town', 'Domestic', 15.0, COALESCE((SELECT id FROM public.poles WHERE code = 'POL-HERI-011' LIMIT 1), '60000000-0000-0000-0000-000000000004'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-HERI-02' LIMIT 1), '50000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), 'SMTR-LT-44911', TRUE, 'L&T Smart Grid', '2023-04-14', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), ST_SetSRID(ST_Point(79.8340, 11.9430), 4326)),
('70000000-0000-0000-0000-000000000003', 'CON-04-102-9903', 'ACC-PDY-103', 'Pondicherry Central Bus Stand Complex', 'Maraimalai Adigal Salai, Marapalam', 'Commercial', 65.0, COALESCE((SELECT id FROM public.poles WHERE code = 'POL-MARA-001' LIMIT 1), '60000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-BLVD-01' LIMIT 1), '50000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), 'CONV-GEN-1020', FALSE, 'Genus Power', '2019-08-25', COALESCE((SELECT id FROM public.regions WHERE code = 'REG-PDY' LIMIT 1), '11000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.divisions WHERE code = 'DIV-URBAN' LIMIT 1), '12000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), ST_SetSRID(ST_Point(79.8220, 11.9270), 4326))
ON CONFLICT (consumer_number) DO NOTHING;

-- 12. Faults & Distance Measurements
INSERT INTO public.faults (
    id, fault_code, category, description, priority, status, feeder_id, transformer_id, pole_id, section_id, je_jurisdiction_id, reported_by, assigned_to, distance_from_pole_m, distance_from_dt_m, distance_along_feeder_m, distance_from_office_km, affected_consumers_est, geom
) VALUES
('80000000-0000-0000-0000-000000000001', 'FLT-2026-0001', 'Conductor Snapped', '11kV Conductor snapped across Maraimalai Adigal Salai due to storm tree fall', 'critical', 'in_progress', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-BLVD-01' LIMIT 1), '50000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.poles WHERE code = 'POL-MARA-001' LIMIT 1), '60000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), (SELECT id FROM public.user_profiles WHERE username = 'je_marapalam' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'contractor_epc' LIMIT 1), 14.5, 120.0, 1850.0, 0.8, 480, ST_SetSRID(ST_Point(79.8225, 11.9265), 4326)),
('80000000-0000-0000-0000-000000000002', 'FLT-2026-0002', 'Transformer Oil Leakage', 'DTR-HERI-02 radiator fin seep with high temperature alarm (oil at 78C)', 'high', 'new', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.transformers WHERE code = 'DTR-HERI-02' LIMIT 1), '50000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.poles WHERE code = 'POL-HERI-010' LIMIT 1), '60000000-0000-0000-0000-000000000003'), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-HERI-01' LIMIT 1), '15000000-0000-0000-0000-000000000003'), (SELECT id FROM public.user_profiles WHERE username = 'ae_marapalam' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'je_marapalam' LIMIT 1), 2.0, 0.0, 2200.0, 1.4, 210, ST_SetSRID(ST_Point(79.8310, 11.9380), 4326))
ON CONFLICT (fault_code) DO NOTHING;

-- 13. Contractor Survey Staging & Approval Workflow
INSERT INTO public.survey_submissions (
    id, submission_code, contractor_id, je_id, ae_id, section_id, je_jurisdiction_id, work_order_number, title, asset_counts, status
) VALUES
('91000000-0000-0000-0000-000000000001', 'SURV-2026-081', (SELECT id FROM public.user_profiles WHERE username = 'contractor_epc' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'je_marapalam' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'ae_marapalam' LIMIT 1), COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.je_jurisdictions WHERE code = 'JE-JUR-MARA-01' LIMIT 1), '15000000-0000-0000-0000-000000000001'), 'WO-RDSS-104', 'Marapalam Commercial Ward GPS Re-mapping', '{"poles": 4, "dts": 1, "consumers": 12, "smart_meters": 10}', 'submitted')
ON CONFLICT (submission_code) DO NOTHING;

INSERT INTO public.survey_staging_assets (
    id, submission_id, asset_type, temporary_code, attributes, gps_accuracy_m, altitude_m, validation_status, geom
) VALUES
('92000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.survey_submissions WHERE submission_code = 'SURV-2026-081' LIMIT 1), '91000000-0000-0000-0000-000000000001'), 'pole', 'TMP-POL-081-1', '{"pole_type": "PSCC 9m", "condition": "Good", "num_insulators": 3, "feeder": "FDR-MARA-01"}', 1.8, 12.4, 'valid', ST_SetSRID(ST_Point(79.8242, 11.9295), 4326)),
('92000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.survey_submissions WHERE submission_code = 'SURV-2026-081' LIMIT 1), '91000000-0000-0000-0000-000000000001'), 'consumer', 'TMP-CON-081-2', '{"consumer_number": "CON-04-102-9905", "meter_number": "SMTR-LT-44915", "is_smart_meter": true, "sanctioned_load_kw": 5.0}', 1.2, 11.9, 'valid', ST_SetSRID(ST_Point(79.8245, 11.9298), 4326))
ON CONFLICT DO NOTHING;

-- 14. Outage Reliability Metrics (IEEE 1366)
INSERT INTO public.outage_reliability_metrics (
    id, section_id, feeder_id, calculation_period, total_consumers_served, saifi, saidi, caidi, maifi, ens_mwh
) VALUES
('a1000000-0000-0000-0000-000000000001', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'), COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), '2026-Q1', 4850, 1.2400, 142.50, 114.92, 0.4500, 18.420),
('a1000000-0000-0000-0000-000000000002', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-HERITAGE' LIMIT 1), '14000000-0000-0000-0000-000000000002'), COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-HERI-02' LIMIT 1), '40000000-0000-0000-0000-000000000002'), '2026-Q1', 3200, 0.8500, 78.20, 92.00, 0.2000, 9.150)
ON CONFLICT DO NOTHING;

-- 15. Safety Permits (PTW)
INSERT INTO public.safety_permits (
    id, ptw_number, feeder_id, applicant_id, issuing_officer_id, work_description, isolation_points, earthing_confirmed, danger_notices_posted, status, section_id
) VALUES
('b1000000-0000-0000-0000-000000000001', 'PTW-2026-041', COALESCE((SELECT id FROM public.feeders WHERE code = 'FDR-MARA-01' LIMIT 1), '40000000-0000-0000-0000-000000000001'), (SELECT id FROM public.user_profiles WHERE username = 'je_marapalam' LIMIT 1), (SELECT id FROM public.user_profiles WHERE username = 'ae_marapalam' LIMIT 1), 'Tree branch clearing on 11kV Feeder 1 between Pole 1 and Pole 4', 'Substation Breaker CB-MARA-01 opened and locked out; Isolator ISO-01 opened', TRUE, TRUE, 'isolated', COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'))
ON CONFLICT (ptw_number) DO NOTHING;

-- 16. Stores Inventory
INSERT INTO public.stores_inventory (
    id, item_code, name, category, unit_of_measure, current_stock, reorder_level, unit_cost_inr, section_id
) VALUES
('c1000000-0000-0000-0000-000000000001', 'MAT-ACSR-RAB', 'Rabbit ACSR Conductor (50 sqmm)', 'Conductor', 'KM', 18.5, 5.0, 42000.0, COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001')),
('c1000000-0000-0000-0000-000000000002', 'MAT-POL-PSCC9', 'PSCC Utility Pole 9m 200kg', 'Pole', 'NOS', 64.0, 20.0, 4800.0, COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001')),
('c1000000-0000-0000-0000-000000000003', 'MAT-MTR-SMART', 'Single Phase Smart Energy Meter 5-30A', 'Smart Meter', 'NOS', 350.0, 100.0, 3200.0, COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001')),
('c1000000-0000-0000-0000-000000000004', 'MAT-OIL-TRNS', 'Mineral Transformer Insulating Oil', 'Transformer Oil', 'LITRE', 1200.0, 400.0, 140.0, COALESCE((SELECT id FROM public.om_sections WHERE code = 'SEC-MARAPALAM' LIMIT 1), '14000000-0000-0000-0000-000000000001'))
ON CONFLICT (item_code) DO NOTHING;

-- 17. Disaster Management Event
INSERT INTO public.disaster_events (
    id, code, event_type, name, affected_regions, start_date, status, damaged_poles_count, damaged_dts_count, snapped_conductors_km, restoration_pct
) VALUES
('d1000000-0000-0000-0000-000000000001', 'DIS-2026-CYCLONE', 'Cyclone Thane Category', 'Cyclone Storm Alert Response Plan', ARRAY['Puducherry', 'Karaikal'], '2026-11-01', 'restoration_in_progress', 8, 2, 3.4, 82.5)
ON CONFLICT (code) DO NOTHING;

