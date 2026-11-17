# PowerGIS Backup & Restore — V3.2

The existing browser JSON export is not a PostgreSQL/PostGIS backup and is not presented as one.

## Required production architecture
Use Supabase-supported database backups or a trusted external backup service with server-side credentials. Storage objects must be backed up separately.

## Required metadata
Backup ID, timestamp, size, integrity/checksum, retention state, success/failure and restore test evidence.

## Recovery test
A restore must be tested in a separate environment before production readiness is claimed. The browser must never receive database credentials.

## Current application behavior
The Admin UI explicitly refuses to claim a browser export is a database backup or that a restore occurred when no trusted backup service is connected.
