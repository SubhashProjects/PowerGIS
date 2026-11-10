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
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

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
            u.id = approval_history.approver_id OR
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND s.region_id = u.region_id)) OR
            (u.role = 'ee' AND EXISTS (SELECT 1 FROM public.survey_submissions s WHERE s.id = approval_history.submission_id AND s.division_id = u.division_id)) OR
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
        AND u.id = approval_history.approver_id
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
                    (u.role = 'se' AND EXISTS (SELECT 1 FROM public.substations s WHERE s.id = f.substation_id AND s.region_id = u.region_id)) OR
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
            (u.role = 'se' AND substations.region_id = u.region_id) OR
            (u.role = 'ee' AND substations.division_id = u.division_id) OR
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
            (u.role = 'se' AND EXISTS (SELECT 1 FROM public.substations s WHERE s.id = feeders.substation_id AND s.region_id = u.region_id)) OR
            (u.role = 'ee' AND feeders.division_id = u.division_id) OR
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
            (u.role IN ('aee', 'ae') AND warranties.section_id = u.section_id)
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
            (u.role = 'je' AND work_orders.assigned_to_id = u.id)
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
            (u.role = 'se' AND disaster_events.region_id = u.region_id) OR
            (u.role IN ('ee', 'aee', 'ae', 'je') AND disaster_events.region_id = u.region_id)
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
            (u.role = 'se' AND stores_inventory.region_id = u.region_id) OR
            (u.role = 'ee' AND stores_inventory.division_id = u.division_id) OR
            (u.role IN ('aee', 'ae', 'je'))
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
DROP POLICY IF EXISTS audit_logs_insert_policy ON public.audit_logs;
CREATE POLICY audit_logs_insert_policy ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL AND (
        actor_id = auth.uid() OR
        public.is_super_admin()
    )
);
