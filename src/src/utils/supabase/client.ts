import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton Supabase client instance
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  // Validate environment variables
  if (!projectId || !publicAnonKey) {
    console.error('Supabase configuration error: Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      return null;
    }
  }
  return supabaseClient;
}