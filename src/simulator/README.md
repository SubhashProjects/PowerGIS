# PowerGIS Simulator Boundary

This directory contains development/test data and simulator-only behavior.
Production services may import simulator data only in an explicitly selected simulator path.
Production Supabase data must remain the source of truth when Supabase is configured.
Do not import simulator modules from `src/components/gis/` or production repositories as a data source.
