import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('facturas').select('*').limit(1);
  console.log("Facturas columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
  
  const { data: pData, error: pError } = await supabase.from('presupuestos').select('*').limit(1);
  console.log("Presupuestos columns:", pData && pData.length > 0 ? Object.keys(pData[0]) : "No data");
}
test();
