-- PowerGIS 3.12.0: close the idempotency and audit gap for fault/outage commands.
-- All business mutations and idempotency-ledger updates execute in one transaction.

-- Prevent operation-id reuse across users or operation types, and serialize retries.
CREATE OR REPLACE FUNCTION public.begin_idempotent_operation(
  p_operation_id TEXT,
  p_operation_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_row public.operation_idempotency%ROWTYPE; v_actor_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required for idempotent operation'; END IF;
  SELECT id INTO v_actor_id FROM public.user_profiles WHERE auth_user_id = auth.uid() AND is_active = TRUE LIMIT 1;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Active PowerGIS user profile required'; END IF;
  IF p_operation_id IS NULL OR length(trim(p_operation_id)) < 16 THEN RAISE EXCEPTION 'A valid operation id is required'; END IF;
  IF p_operation_type IS NULL OR trim(p_operation_type) = '' THEN RAISE EXCEPTION 'Operation type is required'; END IF;

  INSERT INTO public.operation_idempotency(operation_id, actor_id, operation_type, status)
  VALUES (p_operation_id, v_actor_id, p_operation_type, 'pending')
  ON CONFLICT (operation_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.operation_idempotency
  WHERE operation_id = p_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Unable to establish idempotency record'; END IF;
  IF v_row.actor_id IS DISTINCT FROM v_actor_id THEN RAISE EXCEPTION 'Operation id belongs to another actor'; END IF;
  IF v_row.operation_type IS DISTINCT FROM p_operation_type THEN RAISE EXCEPTION 'Operation id was reused for a different operation type'; END IF;

  RETURN jsonb_build_object('status', v_row.status, 'result', v_row.result, 'error_message', v_row.error_message);
END;
$$;

-- Fault records did not previously carry a concurrency token. Add one so
-- optimistic updates have a real server-maintained version.
ALTER TABLE public.faults ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE OR REPLACE FUNCTION public.touch_fault_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS faults_touch_updated_at ON public.faults;
CREATE TRIGGER faults_touch_updated_at BEFORE UPDATE ON public.faults
FOR EACH ROW EXECUTE FUNCTION public.touch_fault_updated_at();

-- The ledger actor references user_profiles.id, not auth.users.id.
CREATE OR REPLACE FUNCTION public.complete_idempotent_operation(p_operation_id TEXT, p_result JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_actor_id UUID;
BEGIN
  SELECT id INTO v_actor_id FROM public.user_profiles WHERE auth_user_id = auth.uid() AND is_active = TRUE LIMIT 1;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Active PowerGIS user profile required'; END IF;
  UPDATE public.operation_idempotency SET status='completed', result=p_result, error_message=NULL, updated_at=NOW()
  WHERE operation_id=p_operation_id AND actor_id=v_actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Idempotency operation ownership check failed'; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.fail_idempotent_operation(p_operation_id TEXT, p_error_message TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE v_actor_id UUID;
BEGIN
  SELECT id INTO v_actor_id FROM public.user_profiles WHERE auth_user_id = auth.uid() AND is_active = TRUE LIMIT 1;
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'Active PowerGIS user profile required'; END IF;
  UPDATE public.operation_idempotency SET status='failed', error_message=p_error_message, updated_at=NOW()
  WHERE operation_id=p_operation_id AND actor_id=v_actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Idempotency operation ownership check failed'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_idempotent_operation(TEXT,JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fail_idempotent_operation(TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_idempotent_operation(TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_idempotent_operation(TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_fault_idempotent(
  p_operation_id TEXT,
  p_category TEXT,
  p_description TEXT,
  p_priority TEXT,
  p_section_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_feeder_id UUID,
  p_je_jurisdiction_id UUID,
  p_affected_consumers_est INT
) RETURNS public.faults
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_gate JSONB; v_fault public.faults%ROWTYPE;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'fault.create');
  IF v_gate->>'status' = 'completed' THEN
    SELECT * INTO v_fault FROM jsonb_populate_record(NULL::public.faults, v_gate->'result');
    RETURN v_fault;
  END IF;
  IF v_gate->>'status' = 'failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous fault operation failed'); END IF;

  v_fault := public.create_fault(p_category,p_description,p_priority,p_section_id,p_lat,p_lng,p_feeder_id,p_je_jurisdiction_id,p_affected_consumers_est);
  UPDATE public.audit_logs SET operation_id = p_operation_id
  WHERE id = (SELECT id FROM public.audit_logs WHERE actor_id = auth.uid() AND action = 'fault.create' AND resource_id = v_fault.id::text ORDER BY created_at DESC LIMIT 1);
  PERFORM public.complete_idempotent_operation(p_operation_id, to_jsonb(v_fault));
  RETURN v_fault;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_fault_idempotent(
  p_operation_id TEXT,
  p_fault_id UUID,
  p_status public.fault_status_type,
  p_assigned_to UUID DEFAULT NULL,
  p_expected_version TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_gate JSONB; v_fault public.faults%ROWTYPE;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'fault.transition');
  IF v_gate->>'status' = 'completed' THEN RETURN COALESCE(v_gate->'result','{}'::jsonb); END IF;
  IF v_gate->>'status' = 'failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous fault transition failed'); END IF;

  SELECT * INTO v_fault FROM public.faults WHERE id = p_fault_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fault not found'; END IF;
  IF p_expected_version IS NOT NULL AND v_fault.updated_at IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'CONCURRENCY_CONFLICT: fault changed before transition';
  END IF;
  PERFORM public.transition_fault(p_fault_id,p_status,p_assigned_to);
  UPDATE public.audit_logs SET operation_id = p_operation_id
  WHERE id = (SELECT id FROM public.audit_logs WHERE actor_id = auth.uid() AND action = 'fault.transition' AND resource_id = p_fault_id::text ORDER BY created_at DESC LIMIT 1);
  SELECT * INTO v_fault FROM public.faults WHERE id = p_fault_id;
  PERFORM public.complete_idempotent_operation(p_operation_id, jsonb_build_object('fault_id',p_fault_id,'status',v_fault.status,'updated_at',v_fault.updated_at));
  RETURN jsonb_build_object('fault_id',p_fault_id,'status',v_fault.status,'updated_at',v_fault.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_outage_idempotent(
  p_operation_id TEXT,
  p_outage_type TEXT,
  p_reason TEXT,
  p_start_time TIMESTAMPTZ,
  p_section_id UUID,
  p_feeder_id UUID,
  p_transformer_id UUID,
  p_expected_restoration TIMESTAMPTZ,
  p_affected_consumers_count INT,
  p_energy_not_served_kwh NUMERIC
) RETURNS public.outages
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp AS $$
DECLARE v_gate JSONB; v_outage public.outages%ROWTYPE;
BEGIN
  v_gate := public.begin_idempotent_operation(p_operation_id, 'outage.create');
  IF v_gate->>'status' = 'completed' THEN
    SELECT * INTO v_outage FROM jsonb_populate_record(NULL::public.outages, v_gate->'result');
    RETURN v_outage;
  END IF;
  IF v_gate->>'status' = 'failed' THEN RAISE EXCEPTION '%', COALESCE(v_gate->>'error_message','Previous outage operation failed'); END IF;

  v_outage := public.create_outage(p_outage_type,p_reason,p_start_time,p_section_id,p_feeder_id,p_transformer_id,p_expected_restoration,p_affected_consumers_count,p_energy_not_served_kwh);
  UPDATE public.audit_logs SET operation_id = p_operation_id
  WHERE id = (SELECT id FROM public.audit_logs WHERE actor_id = auth.uid() AND action = 'outage.create' AND resource_id = v_outage.id::text ORDER BY created_at DESC LIMIT 1);
  PERFORM public.complete_idempotent_operation(p_operation_id, to_jsonb(v_outage));
  RETURN v_outage;
END;
$$;

REVOKE ALL ON FUNCTION public.begin_idempotent_operation(TEXT,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_fault_idempotent(TEXT,TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_fault_idempotent(TEXT,UUID,public.fault_status_type,UUID,TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_outage_idempotent(TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_idempotent_operation(TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_fault_idempotent(TEXT,TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_fault_idempotent(TEXT,UUID,public.fault_status_type,UUID,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_outage_idempotent(TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.create_fault_idempotent(TEXT,TEXT,TEXT,TEXT,UUID,NUMERIC,NUMERIC,UUID,UUID,INT) IS 'Transactional, actor-bound idempotent fault creation with linked audit operation id.';
COMMENT ON FUNCTION public.transition_fault_idempotent(TEXT,UUID,public.fault_status_type,UUID,TIMESTAMPTZ) IS 'Transactional, actor-bound fault transition with optimistic concurrency and audit linkage.';
COMMENT ON FUNCTION public.create_outage_idempotent(TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,UUID,UUID,TIMESTAMPTZ,INT,NUMERIC) IS 'Transactional, actor-bound idempotent outage creation with linked audit operation id.';
