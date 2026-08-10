import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('facturas').select('id, enviado_email_at').limit(1);
  console.log("SELECT result:", { data, error });
  
  if (data && data.length > 0) {
    const id = data[0].id;
    const { data: updateData, error: updateError } = await supabase.from('facturas')
      .update({ enviado_email_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    console.log("UPDATE result:", { updateData, updateError });
  }
}
test();
