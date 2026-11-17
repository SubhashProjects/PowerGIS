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
