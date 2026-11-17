import { supabase, isSupabaseConfigured } from '../../lib/supabase';
export const surveyEvidenceRepository = {
  async upload(path: string, blob: Blob, contentType: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('BACKEND_NOT_CONFIGURED: survey evidence storage requires Supabase.');
    const { error } = await supabase.storage.from('survey-evidence').upload(path, blob, { upsert: false, contentType });
    if (error && !/already exists/i.test(error.message)) throw error;
  },
};
