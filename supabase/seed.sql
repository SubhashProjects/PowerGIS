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
