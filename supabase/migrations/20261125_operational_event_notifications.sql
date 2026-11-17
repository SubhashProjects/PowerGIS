-- PowerGIS 3.11.0: operational event notifications.
-- Notifications are emitted transactionally for actual database inserts/status changes.
-- Recipient resolution prefers the assigned operational user and falls back to the actor.

CREATE OR REPLACE FUNCTION public.emit_operational_event_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_row JSONB := to_jsonb(NEW);
  v_old JSONB;
  v_actor UUID := auth.uid();
  v_recipient UUID;
  v_profile_id UUID;
  v_status TEXT;
  v_code TEXT;
  v_title TEXT;
  v_message TEXT;
  v_tab TEXT;
  v_profile_key TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    IF COALESCE(v_row->>'status','') = COALESCE(v_old->>'status','') THEN
      RETURN NEW;
    END IF;
  END IF;

  v_status := COALESCE(v_row->>'status','updated');
  IF TG_TABLE_NAME = 'faults' THEN
    v_code := COALESCE(v_row->>'fault_code', NEW.id::text);
    v_title := CASE WHEN TG_OP='INSERT' THEN 'New fault reported' ELSE 'Fault status changed' END;
    v_tab := 'faults'; v_profile_key := 'assigned_to';
  ELSIF TG_TABLE_NAME = 'work_orders' THEN
    v_code := COALESCE(v_row->>'order_number', NEW.id::text);
    v_title := CASE WHEN TG_OP='INSERT' THEN 'Work order created' ELSE 'Work order status changed' END;
    v_tab := 'work_orders'; v_profile_key := 'contractor_id';
  ELSIF TG_TABLE_NAME = 'outages' THEN
    v_code := COALESCE(v_row->>'outage_code', NEW.id::text);
    v_title := CASE WHEN TG_OP='INSERT' THEN 'Outage recorded' ELSE 'Outage status changed' END;
    v_tab := 'outages'; v_profile_key := NULL;
  ELSIF TG_TABLE_NAME = 'safety_permits' THEN
    v_code := COALESCE(v_row->>'ptw_number', NEW.id::text);
    v_title := CASE WHEN TG_OP='INSERT' THEN 'Safety permit requested' ELSE 'Safety permit status changed' END;
    v_tab := 'safety_ptw'; v_profile_key := 'issuing_officer_id';
  ELSE
    RETURN NEW;
  END IF;

  IF v_profile_key IS NOT NULL AND NULLIF(v_row->>v_profile_key,'') IS NOT NULL THEN
    BEGIN
      v_profile_id := (v_row->>v_profile_key)::uuid;
      SELECT auth_user_id INTO v_recipient FROM public.user_profiles WHERE id=v_profile_id AND is_active=TRUE LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      v_recipient := NULL;
    END;
  END IF;
  v_recipient := COALESCE(v_recipient, v_actor);
  IF v_recipient IS NOT NULL THEN
    v_message := format('%s is now %s.', v_code, replace(v_status, '_', ' '));
    INSERT INTO public.user_notifications(user_id,title,message,priority,target_tab,action_label,metadata)
    VALUES(v_recipient,v_title,v_message,
      CASE WHEN v_status IN ('critical','rejected','cancelled') THEN 'high' ELSE 'info' END,
      v_tab,'Open record',jsonb_build_object('entity',TG_TABLE_NAME,'record_id',NEW.id,'status',v_status));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_operational_event_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fault_operational_notification_insert ON public.faults;
CREATE TRIGGER trg_fault_operational_notification_insert AFTER INSERT ON public.faults
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();
DROP TRIGGER IF EXISTS trg_fault_operational_notification_update ON public.faults;
CREATE TRIGGER trg_fault_operational_notification_update AFTER UPDATE OF status ON public.faults
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();

DROP TRIGGER IF EXISTS trg_work_order_operational_notification_insert ON public.work_orders;
CREATE TRIGGER trg_work_order_operational_notification_insert AFTER INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();
DROP TRIGGER IF EXISTS trg_work_order_operational_notification_update ON public.work_orders;
CREATE TRIGGER trg_work_order_operational_notification_update AFTER UPDATE OF status ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();

DROP TRIGGER IF EXISTS trg_outage_operational_notification_insert ON public.outages;
CREATE TRIGGER trg_outage_operational_notification_insert AFTER INSERT ON public.outages
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();
DROP TRIGGER IF EXISTS trg_outage_operational_notification_update ON public.outages;
CREATE TRIGGER trg_outage_operational_notification_update AFTER UPDATE OF status ON public.outages
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();

DROP TRIGGER IF EXISTS trg_safety_permit_operational_notification_insert ON public.safety_permits;
CREATE TRIGGER trg_safety_permit_operational_notification_insert AFTER INSERT ON public.safety_permits
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();
DROP TRIGGER IF EXISTS trg_safety_permit_operational_notification_update ON public.safety_permits;
CREATE TRIGGER trg_safety_permit_operational_notification_update AFTER UPDATE OF status ON public.safety_permits
FOR EACH ROW EXECUTE FUNCTION public.emit_operational_event_notification();
