-- PowerGIS 3.17.0: auditable condition-assessment history for canonical assets.
-- Existing equipment_lifecycle rows remain the lifecycle source of truth.
CREATE TABLE IF NOT EXISTS public.equipment_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lifecycle_id UUID NOT NULL REFERENCES public.equipment_lifecycle(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('condition_assessment')),
  condition_score INT NOT NULL CHECK (condition_score BETWEEN 0 AND 100),
  replacement_priority VARCHAR(20) NOT NULL CHECK (replacement_priority IN ('Critical', 'High', 'Medium', 'Low')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS equipment_lifecycle_events_lifecycle_created_idx
  ON public.equipment_lifecycle_events (lifecycle_id, created_at DESC);
ALTER TABLE public.equipment_lifecycle_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_lifecycle_events_read ON public.equipment_lifecycle_events;
CREATE POLICY equipment_lifecycle_events_read ON public.equipment_lifecycle_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equipment_lifecycle el WHERE el.id = lifecycle_id));
DROP POLICY IF EXISTS equipment_lifecycle_events_insert ON public.equipment_lifecycle_events;
CREATE POLICY equipment_lifecycle_events_insert ON public.equipment_lifecycle_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.equipment_lifecycle el WHERE el.id = lifecycle_id));
COMMENT ON TABLE public.equipment_lifecycle_events IS
  'Append-only history of lifecycle condition assessments; visibility follows equipment_lifecycle RLS.';

-- Update the current lifecycle snapshot and append its history atomically.
CREATE OR REPLACE FUNCTION public.record_equipment_lifecycle_assessment(
  p_lifecycle_id UUID,
  p_asset_id UUID,
  p_condition_score INT,
  p_replacement_priority VARCHAR,
  p_is_expired BOOLEAN,
  p_current_age_years NUMERIC,
  p_notes TEXT DEFAULT ''
) RETURNS SETOF public.equipment_lifecycle
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE updated_row public.equipment_lifecycle%ROWTYPE;
BEGIN
  IF p_condition_score < 0 OR p_condition_score > 100 THEN
    RAISE EXCEPTION 'Condition score must be between 0 and 100';
  END IF;
  IF p_replacement_priority NOT IN ('Critical', 'High', 'Medium', 'Low') THEN
    RAISE EXCEPTION 'Invalid replacement priority';
  END IF;
  UPDATE public.equipment_lifecycle
     SET condition_score = p_condition_score,
         replacement_priority = p_replacement_priority,
         is_expired = p_is_expired,
         current_age_years = p_current_age_years
   WHERE id = p_lifecycle_id AND asset_id = p_asset_id
   RETURNING * INTO updated_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lifecycle record not found or access denied';
  END IF;
  INSERT INTO public.equipment_lifecycle_events
    (lifecycle_id, asset_id, event_type, condition_score, replacement_priority, notes)
  VALUES
    (p_lifecycle_id, p_asset_id, 'condition_assessment', p_condition_score, p_replacement_priority, COALESCE(p_notes, ''));
  RETURN NEXT updated_row;
END;
$$;
REVOKE ALL ON FUNCTION public.record_equipment_lifecycle_assessment(UUID, UUID, INT, VARCHAR, BOOLEAN, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_equipment_lifecycle_assessment(UUID, UUID, INT, VARCHAR, BOOLEAN, NUMERIC, TEXT) TO authenticated;
GRANT SELECT, INSERT ON public.equipment_lifecycle_events TO authenticated;
