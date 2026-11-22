// Cliente único do Supabase, compartilhado por todos os módulos.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SB_URL, SB_KEY } from './config.js';
export const sb = createClient(SB_URL, SB_KEY);
