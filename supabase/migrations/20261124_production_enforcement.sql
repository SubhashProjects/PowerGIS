-- PowerGIS 3.10.0 production enforcement.
-- Persistent notifications, explicit workflow validation, and least-privilege RPC grants.

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('critical','high','medium','info')),
  target_tab TEXT,
  action_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, read_at) WHERE read_at IS NULL;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;
CREATE POLICY user_notifications_update_own ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id UUID, p_title TEXT, p_message TEXT, p_priority TEXT DEFAULT 'info',
  p_target_tab TEXT DEFAULT NULL, p_action_label TEXT DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_id UUID; v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_priority NOT IN ('critical','high','medium','info') THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_PRIORITY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id=v_actor AND (role='super_admin' OR auth_user_id=p_user_id)) THEN
    RAISE EXCEPTION 'NOTIFICATION_SCOPE_DENIED';
  END IF;
  INSERT INTO public.user_notifications(user_id,title,message,priority,target_tab,action_label,metadata)
  VALUES(p_user_id,p_title,p_message,p_priority,p_target_tab,p_action_label,COALESCE(p_metadata,'{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_user_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_user_notification(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS operation_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation_id ON public.audit_logs(operation_id) WHERE operation_id IS NOT NULL;

-- Ensure the transactional wrappers remain inaccessible to anonymous callers after every deployment.
REVOKE ALL ON FUNCTION public.create_work_order_idempotent(TEXT,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,DATE) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_work_order_status_idempotent(TEXT,UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.issue_inventory_atomic_idempotent(TEXT,UUID,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.record_inventory_transaction_idempotent(TEXT,UUID,TEXT,NUMERIC,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_ptw_request_idempotent(TEXT,UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.advance_ptw_stage_idempotent(TEXT,UUID,public.ptw_status,TEXT,NUMERIC,NUMERIC,BOOLEAN,TEXT,TEXT) FROM PUBLIC,anon;

-- Correlate successful transactional operations with an immutable audit event.
CREATE OR REPLACE FUNCTION public.record_operation_audit(p_operation_id TEXT, p_operation_type TEXT, p_resource_id TEXT DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_user public.user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.user_profiles WHERE auth_user_id=auth.uid() AND is_active=TRUE LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
  INSERT INTO public.audit_logs(actor_id,user_id,actor_role,action,module,resource_id,details,operation_id)
  VALUES(auth.uid(),v_user.id,v_user.role,'operation.completed','transactional_operations',p_resource_id,jsonb_build_object('operation_type',p_operation_type,'details',COALESCE(p_details,'{}'::jsonb)),p_operation_id);
END $$;
REVOKE ALL ON FUNCTION public.record_operation_audit(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_operation_audit(TEXT,TEXT,TEXT,JSONB) TO authenticated;
