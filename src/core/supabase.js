const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY باید تنظیم شوند');
    }
    
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient;
}

module.exports = { getSupabase };