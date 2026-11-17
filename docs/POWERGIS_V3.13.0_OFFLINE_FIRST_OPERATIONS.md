# PowerGIS 3.13.0 — Complete Offline-First Operations

## Scope

This release upgrades the operational mutation queue from localStorage-only storage to a dedicated IndexedDB database. Queue writes are asynchronous and are considered accepted only after the IndexedDB transaction commits. The legacy `powergis-offline-mutations-v2` localStorage queue is migrated non-destructively on first initialization.

## Implemented

- Durable IndexedDB operational mutation queue with schema versioning and startup readiness.
- Stable operation IDs created before the first server attempt and preserved across retries.
- Offline fallback for fault create/transition, outage create, work-order create/transition, PTW create/transition, inventory issue and inventory transaction. Only connectivity failures are queued; business and server errors are not silently converted into offline success.
- Replay uses the existing server-side idempotent RPC handlers and keeps the same operation ID.
- Retry backoff with a capped delay, next-attempt timestamps, automatic due-retry checks, manual retry and dependency-aware replay.
- Cross-tab replay lease stored atomically in IndexedDB; expired leases recover after a crashed tab.
- Concurrency conflicts are blocked for review rather than automatically retried or overwritten.
- Sync Center details for queue states, errors, retry controls and removal of non-syncing queued items.
- Existing survey evidence queue remains on its existing IndexedDB store and is surfaced alongside operational mutation counts.

## Operational behavior

An offline operation is durably queued and the calling service throws an `OfflineMutationQueuedError` with the `OFFLINE_QUEUED` code in its message. UI callers should present this as “saved on this device; awaiting synchronization”, not as a completed server transaction. Once connectivity returns, registered handlers replay the original idempotent RPC with its original operation ID.

A `CONCURRENCY_CONFLICT` is placed in the blocked state and requires an operator to compare/reload/reapply. The queue does not overwrite a newer server version. A blocked item with a dependency-wait reason is automatically made eligible when its dependencies synchronize.

## Important limitations

- This release provides durable queueing and replay, not a full offline replica of every read model. Screens still requiring live repository reads may not be usable without connectivity.
- Offline create calls that require a server-generated identifier report the queued state through `OfflineMutationQueuedError`; they do not fabricate a server record ID. The record appears after successful replay and a subsequent refresh.
- Survey file uploads continue using the existing survey queue. Resumable chunk uploads, content-hash deduplication, upload reconciliation and a dedicated evidence transfer manager remain future work.
- Browser storage can still be cleared by the user/browser or evicted under storage pressure. IndexedDB is more durable than localStorage but is not a substitute for server backup.
- Full semantic TypeScript/build verification and live Supabase integration require the project's dependency installation and configured backend. They were not performed as part of this source-only release.

## Verification

Run `node tests/v3_13_offline_first.test.mjs` for static architecture checks. No npm installation is required for that test.
