-- PowerGIS 3.8.0 operational integrity primitives.
create table if not exists public.operation_idempotency (
  operation_id text primary key,
  actor_id uuid references public.user_profiles(id),
  operation_type text not null,
  status text not null check (status in ('pending','completed','failed')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists operation_idempotency_actor_idx on public.operation_idempotency(actor_id, created_at desc);
alter table public.operation_idempotency enable row level security;
create or replace function public.touch_operation_idempotency_updated_at()
returns trigger language plpgsql security invoker as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists operation_idempotency_touch on public.operation_idempotency;
create trigger operation_idempotency_touch before update on public.operation_idempotency for each row execute function public.touch_operation_idempotency_updated_at();
create or replace function public.begin_idempotent_operation(p_operation_id text, p_operation_type text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing jsonb;
begin
  select jsonb_build_object('status', status, 'result', result, 'error_message', error_message) into existing from public.operation_idempotency where operation_id = p_operation_id;
  if existing is not null then return existing; end if;
  insert into public.operation_idempotency(operation_id, actor_id, operation_type, status) values (p_operation_id, auth.uid(), p_operation_type, 'pending');
  return jsonb_build_object('status','pending');
end; $$;
revoke all on function public.begin_idempotent_operation(text,text) from public, anon;
grant execute on function public.begin_idempotent_operation(text,text) to authenticated;
comment on table public.operation_idempotency is 'Server-side idempotency ledger for critical PowerGIS mutations.';


create or replace function public.complete_idempotent_operation(p_operation_id text, p_result jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.operation_idempotency set status='completed', result=p_result, error_message=null, updated_at=now()
  where operation_id=p_operation_id and actor_id=auth.uid();
end; $$;

create or replace function public.fail_idempotent_operation(p_operation_id text, p_error_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.operation_idempotency set status='failed', error_message=p_error_message, updated_at=now()
  where operation_id=p_operation_id and actor_id=auth.uid();
end; $$;

revoke all on function public.complete_idempotent_operation(text,jsonb) from public, anon;
revoke all on function public.fail_idempotent_operation(text,text) from public, anon;
grant execute on function public.complete_idempotent_operation(text,jsonb) to authenticated;
grant execute on function public.fail_idempotent_operation(text,text) to authenticated;
