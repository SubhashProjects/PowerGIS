# PowerGIS API / RPC Reference — V3.2

## Authentication
- Supabase Auth `signInWithPassword`
- Supabase Auth `resetPasswordForEmail`
- Supabase Auth `updateUser({ password })`

## RPCs
- `create_ptw_request`
- `advance_ptw_stage`
- `issue_inventory_atomic`
- `record_inventory_transaction`
- `je_verify_submission`
- `ae_approve_and_publish`
- `reject_survey_submission`
- `create_work_order`
- `advance_work_order_status`
- `create_fault`
- `transition_fault`
- `admin_update_user_profile`
- `admin_deactivate_user`

All privileged RPCs use explicit execution grants and fixed `search_path` in SECURITY DEFINER functions.
