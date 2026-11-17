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
