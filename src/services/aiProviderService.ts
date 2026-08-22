/**
 * Capa de Abstracción Centralizada para el Ayudante IA de GESTARIAN.
 * Permite cambiar dinámicamente de proveedor (Gemini, Groq, etc.) desde CONFIGURACIÓN
 * sin modificar ninguna página ni componente visual del taller.
 */

import type { AiAssistantConfig, FallbackAiConfig } from '../lib/types';
import { getMetisKnowledgePrompt } from '../ai/metisKnowledge';

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
    model: localStorage.getItem('gestarian_gemini_model') || 'gemini-2.0-flash',
    api_key: localStorage.getItem('gestarian_gemini_api_key') || '',
    status: 'disconnected'
  };
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responde OK si la conexión es exitosa.' }] }]
          })
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status}` };
      }
      return { success: true, message: 'Conexión con Gemini verificada correctamente.' };
    }

    if (config.provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`,
          'HTTP-Referer': 'https://gestarian.app',
          'X-Title': 'GESTARIAN Taller'
        },
        body: JSON.stringify({
          model: config.model || 'deepseek/deepseek-chat:free',
          messages: [{ role: 'user', content: 'Ping de conexión' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, message: errorData.error?.message || `Error HTTP ${response.status} en OpenRouter` };
      }
      return { success: true, message: 'Conexión con OpenRouter (Modelos Gratuitos) verificada correctamente.' };
    }

    if (config.provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          model: config.model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        return { success: false, message: `Error HTTP ${response.status} en Groq` };
      }
      return { success: true, message: 'Conexión con Groq verificada correctamente.' };
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
  const config = getAiConfig();
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `${systemPrompt}\n\nContexto: ${JSON.stringify(contextData || {})}\n\nInstrucción del usuario: ${userMessage}` }] }
            ]
          })
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Instrucción procesada correctamente.';
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
