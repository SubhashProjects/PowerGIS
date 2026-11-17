-- PowerGIS 3.26–3.32 platform evolution foundations.
-- Consumer service applications are requests, not consumer master records or energised connections.
CREATE SEQUENCE IF NOT EXISTS public.consumer_service_request_number_seq;

CREATE TABLE IF NOT EXISTS public.consumer_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE DEFAULT ('CSR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.consumer_service_request_number_seq')::text, 7, '0')),
  applicant_name TEXT NOT NULL CHECK (length(trim(applicant_name)) BETWEEN 2 AND 160),
  contact_phone TEXT NOT NULL CHECK (length(trim(contact_phone)) BETWEEN 7 AND 20),
  service_address TEXT NOT NULL CHECK (length(trim(service_address)) BETWEEN 5 AND 1000),
  category TEXT NOT NULL CHECK (category IN ('Domestic','Commercial','Industrial','Agricultural')),
  requested_load_kw NUMERIC(12,3) NOT NULL CHECK (requested_load_kw > 0),
  section_id UUID NOT NULL REFERENCES public.om_sections(id),
  nearest_pole_id UUID REFERENCES public.poles(id),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','completed')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  assigned_to UUID REFERENCES public.user_profiles(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consumer_service_requests_section_created ON public.consumer_service_requests(section_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consumer_service_requests_status ON public.consumer_service_requests(status, created_at DESC);
ALTER TABLE public.consumer_service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consumer_service_requests_select_scope ON public.consumer_service_requests;
CREATE POLICY consumer_service_requests_select_scope ON public.consumer_service_requests
  FOR SELECT TO authenticated USING (public.user_has_jurisdiction(NULL,NULL,section_id));
DROP POLICY IF EXISTS consumer_service_requests_insert_scope ON public.consumer_service_requests;
CREATE POLICY consumer_service_requests_insert_scope ON public.consumer_service_requests
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND status = 'submitted' AND assigned_to IS NULL AND review_notes IS NULL AND public.user_has_jurisdiction(NULL,NULL,section_id) AND (nearest_pole_id IS NULL OR EXISTS (SELECT 1 FROM public.poles p WHERE p.id = consumer_service_requests.nearest_pole_id AND p.section_id = consumer_service_requests.section_id)));
REVOKE ALL ON public.consumer_service_requests FROM anon;
GRANT SELECT, INSERT ON public.consumer_service_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.consumer_service_request_number_seq TO authenticated;

-- Integration metadata only. Secrets, private keys and connection strings are forbidden here.
CREATE TABLE IF NOT EXISTS public.integration_endpoint_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key TEXT NOT NULL UNIQUE CHECK (integration_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  display_name TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('IEC_61850','IEC_60870_5_104','DNP3','MODBUS_TCP','MQTT','WEBSOCKET_REST','AMI_API','GIS_EXCHANGE')),
  gateway_reference TEXT UNIQUE CHECK (gateway_reference IS NULL OR gateway_reference ~ '^[A-Za-z0-9._:-]{1,128}$'),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  commissioning_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (commissioning_status IN ('not_configured','commissioning','read_only','active','suspended')),
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object' AND (metadata - ARRAY['vendor','site','tag_namespace','firmware_version']) = '{}'::jsonb),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_endpoint_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_registry_read ON public.integration_endpoint_registry;
CREATE POLICY integration_registry_read ON public.integration_endpoint_registry FOR SELECT TO authenticated
  USING (public.user_has_role(ARRAY['super_admin','se','ee','aee','auditor','gis_admin']::public.official_role[]));
DROP POLICY IF EXISTS integration_registry_admin_write ON public.integration_endpoint_registry;
CREATE POLICY integration_registry_admin_write ON public.integration_endpoint_registry FOR ALL TO authenticated
  USING (public.user_has_role(ARRAY['super_admin','gis_admin']::public.official_role[]))
  WITH CHECK (public.user_has_role(ARRAY['super_admin','gis_admin']::public.official_role[]));
REVOKE ALL ON public.integration_endpoint_registry FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_endpoint_registry TO authenticated;


-- Widen legacy historian precision to support normalized gateway readings and quality labels.
ALTER TABLE public.scada_telemetry ALTER COLUMN voltage_kv TYPE NUMERIC(12,3) USING voltage_kv::NUMERIC(12,3);
ALTER TABLE public.scada_telemetry ALTER COLUMN current_amps TYPE NUMERIC(14,3) USING current_amps::NUMERIC(14,3);
ALTER TABLE public.scada_telemetry ALTER COLUMN active_power_mw TYPE NUMERIC(14,3) USING active_power_mw::NUMERIC(14,3);
ALTER TABLE public.scada_telemetry ALTER COLUMN reactive_power_mvar TYPE NUMERIC(14,3) USING reactive_power_mvar::NUMERIC(14,3);
ALTER TABLE public.scada_telemetry ALTER COLUMN frequency_hz TYPE NUMERIC(8,3) USING frequency_hz::NUMERIC(8,3);
ALTER TABLE public.scada_telemetry ALTER COLUMN quality TYPE VARCHAR(16);

-- Read-only telemetry ingress identity and replay protection for secured field gateways.
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS source_event_id TEXT;
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS source_gateway TEXT;
ALTER TABLE public.scada_telemetry ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS idx_scada_telemetry_source_event_id
  ON public.scada_telemetry(source_event_id);
CREATE INDEX IF NOT EXISTS idx_scada_telemetry_gateway_time
  ON public.scada_telemetry(source_gateway, recorded_at DESC) WHERE source_gateway IS NOT NULL;

-- Updated timestamp maintenance.
CREATE OR REPLACE FUNCTION public.set_platform_evolution_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_integration_endpoint_registry_updated_at ON public.integration_endpoint_registry;
CREATE TRIGGER trg_integration_endpoint_registry_updated_at BEFORE UPDATE ON public.integration_endpoint_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_evolution_updated_at();
