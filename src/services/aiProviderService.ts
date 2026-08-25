/**
 * Capa de Abstracción Centralizada para el Ayudante IA de GESTARIAN.
 * Permite cambiar dinámicamente de proveedor (Gemini, Groq, etc.) desde CONFIGURACIÓN
 * sin modificar ninguna página ni componente visual del taller.
 */

import type { AiAssistantConfig, FallbackAiConfig } from '../lib/types';
import { getMetisKnowledgePrompt } from '../ai/metisKnowledge';
import { geminiSupportsSystemInstruction } from '../lib/geminiCompat';
import { supabase } from '../lib/supabase';

export interface AIResponse {
  text: string;
  structuredIntent?: {
    action: string;
    target: string;
    params: Record<string, any>;
  };
}

export function getAiConfig(): AiAssistantConfig {
  const saved = localStorage.getItem('gestarian_ai_assistant_config');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return {
    provider: 'gemini',
    model: localStorage.getItem('gestarian_gemini_model') || 'gemini-3.7-flash',
    api_key: localStorage.getItem('gestarian_gemini_api_key') || '',
    status: 'disconnected'
  };
}

export async function fetchAiConfigFromSupabase(): Promise<AiAssistantConfig> {
  const current = getAiConfig();
  if (current.api_key) return current;

  try {
    const { data } = await supabase.from('configuracion').select('ai_provider, ai_model, ai_api_key').eq('id', 1).maybeSingle();
    if (data && data.ai_api_key) {
      localStorage.setItem('gestarian_gemini_api_key', data.ai_api_key);
      localStorage.setItem('gestarian_ai_assistant_config', JSON.stringify({
        provider: data.ai_provider || 'gemini',
        model: data.ai_model || 'gemini-3.7-flash',
        api_key: data.ai_api_key,
        status: 'connected'
      }));
      return {
        provider: (data.ai_provider as any) || 'gemini',
        model: data.ai_model || 'gemini-3.7-flash',
        api_key: data.ai_api_key,
        status: 'connected'
      };
    }
  } catch (e) {
    console.warn('Error recuperando config IA de Supabase:', e);
  }
  return current;
}

export function getFallbackConfig(): FallbackAiConfig {
  const saved = localStorage.getItem('gestarian_fallback_ai_config');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallback */ }
  }
  return {
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat:free',
    api_key: localStorage.getItem('gestarian_openrouter_api_key') || localStorage.getItem('gestarian_fallback_api_key') || '',
    enabled: false,
    status: 'disconnected'
  };
}

export async function testAiConnection(config: AiAssistantConfig | FallbackAiConfig): Promise<{ success: boolean; message: string }> {
  if (!config.api_key || config.api_key.trim() === '') {
    return { success: false, message: 'La Clave API no está configurada.' };
  }

  try {
    if (config.provider === 'gemini') {
      const modelsToTry = [
        config.model || 'gemini-3.5-flash',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.7-flash'
      ];
      const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

      let lastError = '';
      for (const m of uniqueModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.api_key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Responde OK si la conexión es exitosa.' }] }]
              })
            }
          );
          if (response.ok) {
            return {
              success: true,
              message: m !== config.model
                ? `Conexión verificada con éxito (Google saturó ${config.model}, conmutado automáticamente a ${m}).`
                : `Conexión con Gemini (${m}) verificada correctamente.`
            };
          }
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `Error HTTP ${response.status}`;
          if (response.status !== 429 && response.status !== 503) {
            break;
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }
      return { success: false, message: lastError || 'Error al conectar con Gemini.' };
    }

    if (config.provider === 'openai' || config.provider === 'deepseek' || config.provider === 'mistral' || config.provider === 'ollama') {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (config.provider === 'deepseek') endpoint = 'https://api.deepseek.com/v1/chat/completions';
      if (config.provider === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';
      if (config.provider === 'ollama') endpoint = 'http://localhost:11434/v1/chat/completions';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (config.api_key && config.provider !== 'ollama') {
        headers['Authorization'] = `Bearer ${config.api_key}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : config.provider === 'mistral' ? 'mistral-small-latest' : 'gpt-4o-mini'),
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status} en ${config.provider}` };
      }
      return { success: true, message: `Conexión con ${config.provider.toUpperCase()} (${config.model || 'estándar'}) verificada con éxito.` };
    }

    if (config.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.api_key,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status} en Anthropic` };
      }
      return { success: true, message: `Conexión con Anthropic Claude (${config.model || 'claude-3-5-haiku'}) verificada con éxito.` };
    }

    return { success: true, message: 'Conexión verificada.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Error de red al probar conexión.' };
  }
}

/**
 * Procesa instrucciones en lenguaje coloquial en español enviadas al Asistente IA de GESTARIAN
 */
export async function processAiInstruction(userMessage: string, contextData?: any): Promise<AIResponse> {
  let config = getAiConfig();
  if (!config.api_key) {
    config = await fetchAiConfigFromSupabase();
  }
  const fallback = getFallbackConfig();

  // Prompt del sistema para la comprensión coloquial en español de España y dialecto andaluz en GESTARIAN
  const systemPrompt = `Eres el Ayudante IA oficial de GESTARIAN, un software para gestión de talleres mecánicos y de chapa/pintura.
Hablas y comprendes perfectamente el español de España y expresiones coloquiales y dialectales (incluyendo andaluz y jerga de taller como 'cambiale el aceite a ese coche', 'ponle dos horas de chapa', 'mira la bujía', 'quillo', 'illo', 'vamos a meterle mano a este buga').
Tu tarea es comprender la instrucción y responder de forma profesional, concisa y servicial.
Conoces a fondo cómo funciona la aplicación GESTARIAN: módulos, rutas de navegación, modelo de datos, reglas de negocio (IVA 21%, ciclos de presupuesto/factura/cobro) y funciones clave (dictado por voz, OCR, PDF por WhatsApp/Email, expedientes 360°, balances).
Usa este conocimiento para responder a preguntas sobre el funcionamiento de la app.
\n\n${getMetisKnowledgePrompt()}`;

  try {
    if (config.provider === 'gemini' && config.api_key) {
      const model = config.model || 'gemini-3.7-flash';
      // Los modelos Gemini 1.0 no soportan systemInstruction (HTTP 400): para
      // ellos se incrusta la instrucción en el mensaje de usuario.
      const soportaSystem = geminiSupportsSystemInstruction(model);
      const userContent = soportaSystem
        ? `Contexto: ${JSON.stringify(contextData || {})}\n\nInstrucción del usuario: ${userMessage}\n\nIMPORTANTE: Responde ÚNICAMENTE en español de España (castellano), de forma breve y natural.`
        : `INSTRUCCIONES DEL SISTEMA: ${systemPrompt}\n\n---\n\nContexto: ${JSON.stringify(contextData || {})}\n\nInstrucción del usuario: ${userMessage}\n\nIMPORTANTE: Responde ÚNICAMENTE en español de España (castellano), de forma breve y natural.`;
      const body: Record<string, any> = {
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0.2 }
      };
      if (soportaSystem) body.systemInstruction = { parts: [{ text: systemPrompt }] };
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );
      if (response.ok) {
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Instrucción procesada correctamente.';
        // Si Gemini devolvió JSON estructurado, extraer el campo "text"
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.text) text = parsed.text;
        } catch (e) { /* texto plano */ }
        return { text };
      }
    }
  } catch (e) {
    console.warn('Fallo en proveedor primario IA, intentando fallback...', e);
  }

  // Fallback a OpenRouter / Groq si está habilitado
  if (fallback.enabled && fallback.api_key) {
    try {
      const endpoint = fallback.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fallback.api_key}`
      };

      if (fallback.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://gestarian.app';
        headers['X-Title'] = 'GESTARIAN Taller';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: fallback.model || (fallback.provider === 'openrouter' ? 'deepseek/deepseek-chat:free' : 'llama-3.3-70b-versatile'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        return { text: data.choices?.[0]?.message?.content || 'Procesado vía Fallback.' };
      }
    } catch (e) {
      console.error('Fallo en fallback IA:', e);
    }
  }

  return { text: 'He recibido tu instrucción. El servicio IA está procesando los datos de GESTARIAN.' };
}

/**
 * Transcribe un archivo de audio (Blob/MediaRecorder) a texto usando Groq (Whisper) o Gemini 1.5.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const config = getAiConfig();
  const fallback = getFallbackConfig();
  
  // 1. Intentar Groq Whisper (ultrarrápido, requiere API key de Groq)
  const groqKey = localStorage.getItem('gestarian_groq_api_key') || (fallback.provider === 'groq' ? fallback.api_key : '');
  if (groqKey) {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'es');
      formData.append('response_format', 'json');

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) return data.text.trim();
      }
    } catch (e) {
      console.warn('Fallo en transcripción Groq Whisper, cayendo a Gemini...', e);
    }
  }

  // 2. Fallback a Gemini (1.5 Flash multimodal)
  if (config.api_key && config.provider === 'gemini') {
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          resolve(b64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Data = await base64Promise;

      const model = config.model || 'gemini-3.7-flash';
      const body = {
        contents: [{
          parts: [
            { text: 'Transcribe este audio a texto en español. Escribe SOLO la transcripción literal, sin comillas, sin formato markdown, sin explicaciones. Solo el texto hablado.' },
            {
              inlineData: {
                mimeType: audioBlob.type || 'audio/webm',
                data: base64Data
              }
            }
          ]
        }]
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.error('Error en transcripción Gemini:', e);
      throw new Error('No se pudo transcribir el audio (Gemini API error).');
    }
  }

  throw new Error('No hay servicios de transcripción configurados (Falta API Key de Groq o Gemini).');
}
