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
