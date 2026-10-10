
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lrdqisnuifbvrjfkwbzv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvhqlEdwBWAsF2byzIgiGA_u22rwsHg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
