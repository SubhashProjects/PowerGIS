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
