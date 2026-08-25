/**
 * Catálogo Universal de Proveedores y Modelos de Inteligencia Artificial para GESTARIAN.
 * Mantiene la lista de modelos activos, filtra los deprecados y realiza comprobaciones
 * periódicas de salud (health check) al abrir la aplicación.
 */

import { supabase } from '../lib/supabase';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  badge?: 'Recomendado' | 'Ultra-Rápido' | 'Gratuito' | 'Visión/OCR' | 'Razonamiento' | 'Popular';
  isMultimodal?: boolean;
  contextWindow?: string;
  status: 'active' | 'deprecated' | 'testing' | 'offline';
}

export interface ProviderInfo {
  id: string;
  name: string;
  logo: string;
  baseUrl: string;
  keyPrefix?: string;
  websiteUrl: string;
  models: ModelInfo[];
}

export const AI_CATALOG: Record<string, ProviderInfo> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    logo: '✨',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyPrefix: 'AIzaSy',
    websiteUrl: 'https://aistudio.google.com/',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Alta velocidad, cuota amplia de 15 RPM en free tier y excelente para OCR.', badge: 'Recomendado', isMultimodal: true, status: 'active' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Nueva generación rápida con soporte nativo de imagen y audio.', badge: 'Ultra-Rápido', isMultimodal: true, status: 'active' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Motor optimizado de última hornada para respuestas en tiempo real.', badge: 'Popular', isMultimodal: true, status: 'active' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Alta velocidad y eficiencia en extracción de conceptos.', badge: 'Ultra-Rápido', isMultimodal: true, status: 'active' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Máxima capacidad analítica para razonamiento complejo y análisis de documentos largos.', badge: 'Razonamiento', isMultimodal: true, status: 'active' },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Modelo híbrido experimental de última generación (requiere cuota disponible).', isMultimodal: true, status: 'active' }
    ]
  },

  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Fast LPU)',
    logo: '⚡',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyPrefix: 'gsk_',
    websiteUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', description: 'El modelo insignia de código abierto a más de 300 tokens/segundo.', badge: 'Recomendado', status: 'active' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Inferencia ultra-rápida casi instantánea para comandos cortos.', badge: 'Ultra-Rápido', status: 'active' },
      { id: 'llama3-70b-8192', name: 'Llama 3 70B (8k)', description: 'Gran precisión y comprensión del dialecto y jerga de taller.', badge: 'Popular', status: 'active' },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B (8k)', description: 'Ligero y de bajísima latencia.', status: 'active' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', description: 'Arquitectura MoE con ventana de contexto de 32.000 tokens.', status: 'active' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B Instruct', description: 'Modelo compacto y afinado por Google para instrucciones.', status: 'active' },
      { id: 'whisper-large-v3', name: 'Groq Whisper Large v3', description: 'Transcripción de voz ultra-rápida en español con precisión del 99%.', badge: 'Ultra-Rápido', status: 'active' }
    ]
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    logo: '🟢',
    baseUrl: 'https://api.openai.com/v1',
    keyPrefix: 'sk-',
    websiteUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Omni)', description: 'Modelo insignia insignia con visión multimodal y velocidad extrema.', badge: 'Recomendado', isMultimodal: true, status: 'active' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Económico, ultra-rápido y con soporte completo de visión.', badge: 'Ultra-Rápido', isMultimodal: true, status: 'active' },
      { id: 'o1-mini', name: 'OpenAI o1 Mini', description: 'Razonamiento profundo paso a paso para cálculos matemáticos y presupuestos.', badge: 'Razonamiento', status: 'active' },
      { id: 'o1-preview', name: 'OpenAI o1 Preview', description: 'Máxima potencia de razonamiento de OpenAI.', badge: 'Razonamiento', status: 'active' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Modelo potente con ventana de 128k tokens.', status: 'active' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Clásico rápido para tareas estándar.', status: 'active' }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    logo: '🟣',
    baseUrl: 'https://api.anthropic.com/v1',
    keyPrefix: 'sk-ant-',
    websiteUrl: 'https://console.anthropic.com/',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Líder de la industria en redacción en español, lectura OCR de facturas y código.', badge: 'Recomendado', isMultimodal: true, status: 'active' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'El modelo más rápido de Anthropic, ideal para respuestas en directo.', badge: 'Ultra-Rápido', status: 'active' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Modelo de máximo tamaño para análisis exhaustivos.', status: 'active' }
    ]
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (Multi-Proveedor & Free)',
    logo: '🌐',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyPrefix: 'sk-or-',
    websiteUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek Chat (Gratis)', description: 'Acceso 100% gratuito a DeepSeek sin coste alguno.', badge: 'Gratuito', status: 'active' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Gratis)', description: 'Llama 3.3 70B gratuito con alta comprensión en español.', badge: 'Gratuito', status: 'active' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Gratis)', description: 'Gemini 2.0 Flash gratuito a través de OpenRouter.', badge: 'Gratuito', isMultimodal: true, status: 'active' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Potente modelo con excelente comprensión técnica y contable.', status: 'active' },
      { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Razonador (Gratis)', description: 'Modelo de razonamiento paso a paso gratuito.', badge: 'Gratuito', status: 'active' }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek AI (Directo)',
    logo: '🐳',
    baseUrl: 'https://api.deepseek.com/v1',
    keyPrefix: 'sk-',
    websiteUrl: 'https://platform.deepseek.com/',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', description: 'Modelo conversacional de gran rendimiento y coste extremadamente bajo.', badge: 'Recomendado', status: 'active' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', description: 'Razonamiento lógico paso a paso antes de emitir la respuesta.', badge: 'Razonamiento', status: 'active' }
    ]
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    logo: '🔶',
    baseUrl: 'https://api.mistral.ai/v1',
    websiteUrl: 'https://console.mistral.ai/',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'El modelo insignia europeo de alta precisión.', badge: 'Recomendado', status: 'active' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Rápido, económico y muy ágil para tareas diarias.', badge: 'Ultra-Rápido', status: 'active' },
      { id: 'open-mistral-nemo', name: 'Mistral Nemo (12k)', description: 'Modelo desarrollado conjuntamente con NVIDIA.', status: 'active' },
      { id: 'pixtral-12b-2409', name: 'Pixtral 12B (Visión)', description: 'Modelo multimodal de Mistral con soporte nativo de imágenes y facturas.', badge: 'Visión/OCR', isMultimodal: true, status: 'active' }
    ]
  },

  ollama: {
    id: 'ollama',
    name: 'Ollama (Servidor Local / Privado)',
    logo: '🦙',
    baseUrl: 'http://localhost:11434/v1',
    websiteUrl: 'https://ollama.ai/',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2 (Local)', description: 'Ejecutado 100% en local en el ordenador del taller sin conexión a internet.', badge: 'Gratuito', status: 'active' },
      { id: 'mistral', name: 'Mistral 7B (Local)', description: 'Privacidad absoluta local en tu propia red.', badge: 'Gratuito', status: 'active' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B (Local)', description: 'Razonador local privado.', badge: 'Razonamiento', status: 'active' }
    ]
  }
};

/**
 * Realiza un escaneo y comprobación periódica de salud de los modelos configurados
 * para detectar fallos, saturaciones o modelos deprecados y corregir automáticamente.
 */
export async function runAiHealthCheck(): Promise<{ status: 'ok' | 'degraded' | 'error'; report: string[] }> {
  const report: string[] = [];
  let degraded = false;

  try {
    // 1. Obtener la configuración actual de Supabase
    const { data: config } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle();
    if (!config) return { status: 'ok', report: ['Sin configuración que escanear'] };

    // 2. Verificar IA principal si es Gemini
    if (config.ai_api_key && config.ai_provider === 'gemini') {
      const currentModel = config.ai_model || 'gemini-1.5-flash';
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${config.ai_api_key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
          }
        );

        if (!res.ok) {
          if (res.status === 429 || res.status === 503) {
            report.push(`Modelo principal ${currentModel} saturado (HTTP ${res.status}). Conmutando automáticamente a gemini-1.5-flash.`);
            degraded = true;
            // Sincronizar en local el modelo de rescate estable
            localStorage.setItem('gestarian_gemini_model', 'gemini-1.5-flash');
          } else if (res.status === 404 || res.status === 410) {
            report.push(`Modelo ${currentModel} deprecado por Google. Migrado automáticamente a gemini-1.5-flash.`);
            degraded = true;
            await supabase.from('configuracion').update({ ai_model: 'gemini-1.5-flash' }).eq('id', 1);
            localStorage.setItem('gestarian_gemini_model', 'gemini-1.5-flash');
          }
        } else {
          report.push(`IA Principal Gemini (${currentModel}): Operativo ✓`);
        }
      } catch (e: any) {
        report.push(`Error de red al comprobar Gemini: ${e.message}`);
      }
    }

    // 3. Verificar Fallback de Groq si está activo
    if (config.fallback_api_key && config.fallback_provider === 'groq') {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.fallback_api_key}`
          },
          body: JSON.stringify({
            model: config.fallback_model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });

        if (res.ok) {
          report.push(`IA Fallback Groq (${config.fallback_model || 'llama-3.3-70b-versatile'}): Operativo ✓`);
        } else if (res.status === 404 || res.status === 400) {
          // Si el modelo de Groq ya no existe (por ejemplo modelos antiguos), migrar a llama-3.3-70b-versatile
          report.push(`Modelo Groq no disponible. Migrando a llama-3.3-70b-versatile.`);
          degraded = true;
          await supabase.from('configuracion').update({ fallback_model: 'llama-3.3-70b-versatile' }).eq('id', 1);
          localStorage.setItem('gestarian_fallback_ai_config', JSON.stringify({
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
            api_key: config.fallback_api_key,
            enabled: true,
            status: 'connected'
          }));
        }
      } catch (e: any) {
        report.push(`Aviso de red comprobando Groq: ${e.message}`);
      }
    }

    return {
      status: degraded ? 'degraded' : 'ok',
      report
    };
  } catch (err: any) {
    console.warn('Error en escaneo de IA:', err);
    return { status: 'error', report: [err.message || 'Error en health check'] };
  }
}
