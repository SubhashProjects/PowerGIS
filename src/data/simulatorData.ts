/**
 * Runtime simulator adapter boundary.
 *
 * Production services/components must not import simulator/mockData directly.
 * This module is the only bridge from application code into the simulator
 * dataset. The simulator remains opt-in and is never a production source of
 * truth when Supabase is configured.
 */
export * from '../simulator/mockData';
