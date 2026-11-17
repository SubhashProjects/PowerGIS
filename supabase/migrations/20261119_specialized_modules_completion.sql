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
