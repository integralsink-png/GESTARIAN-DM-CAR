import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(name: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;
  return data.value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const token = await getSecret("PLATE_RECOGNIZER_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "PLATE_RECOGNIZER_TOKEN no configurado" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { image } = body;
    if (!image) {
      return new Response(
        JSON.stringify({ error: "Falta el campo 'image'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip data URL prefix if present and build form data
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("upload", blob, "plate.jpg");
    formData.append("regions", "es"); // prioritize Spain

    const response = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Plate Recognizer error ${response.status}: ${errText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Extract best result
    if (!data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({ plate: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const best = data.results.reduce((a: any, b: any) =>
      (b.score ?? 0) > (a.score ?? 0) ? b : a
    );

    return new Response(
      JSON.stringify({
        plate: best.plate?.toUpperCase() ?? null,
        score: best.score ?? 0,
        region: best.region?.code ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
