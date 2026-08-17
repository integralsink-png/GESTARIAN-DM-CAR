import { supabase } from './supabase'
import { parseVoiceToConceptos } from './useVoice'
import type { Concepto } from './types'
import OpenAI from 'openai'

export interface MetisContext {
  tipo: 'presupuesto' | 'cita' | 'reparacion' | 'factura' | 'cliente' | 'vehiculo'
  id?: string
  numero?: string
  matricula?: string
  cliente_nombre?: string
  data?: any
}

export interface MetisActionResult {
  type: 'presupuesto_creado' | 'presupuesto_actualizado' | 'presupuesto_aceptado' | 'cita_creada' | 'reparacion_actualizada' | 'busqueda_realizada' | 'info'
  title: string
  details: string
  item?: any
  navigationPath?: string
  actions?: { label: string; onClickEvent: string; payload?: any }[]
}

export interface MetisResponse {
  text: string
  actionResult?: MetisActionResult
}

export function extractMatricula(text: string): string | null {
  const clean = text.toUpperCase().replace(/\s+/g, ' ')
  const matchStandard = clean.match(/\b(\d{4})\s*([B-DF-HJ-NP-TV-Z]{3})\b/)
  if (matchStandard) return `${matchStandard[1]}${matchStandard[2]}`
  const matchProv = clean.match(/\b([A-Z]{1,2})\s*(\d{4})\s*([A-Z]{1,2})\b/)
  if (matchProv) return `${matchProv[1]}${matchProv[2]}${matchProv[3]}`
  const matchLoose = clean.match(/MATR[IÍ]CULA\s*([A-Z0-9\s]{4,10})/i)
  if (matchLoose) {
    const raw = matchLoose[1].replace(/\s+/g, '')
    if (raw.length >= 6) return raw.slice(0, 7)
  }
  return null
}

function extractConceptosFromParagraph(text: string): Concepto[] {
  const simpleParsed = parseVoiceToConceptos(text)
  if (simpleParsed.length > 0 && simpleParsed.some(c => c.precio > 0)) return simpleParsed

  const conceptos: Concepto[] = []
  const lower = text.toLowerCase()
  const wordToNum: Record<string, number> = {
    cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
    diez: 10, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
    'ciento veinte': 120, 'ciento cincuenta': 150, 'ciento ochenta': 180, 'doscientos cincuenta': 250
  }
  const items = lower.split(/(?:,|\by\b|\btambién\b|\bademás\b)/)
  for (const part of items) {
    const trimmed = part.trim()
    if (!trimmed) continue
    let price = 0
    const digitMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:euros?|€)?/)
    if (digitMatch) {
      price = parseFloat(digitMatch[1].replace(',', '.'))
    } else {
      for (const [w, val] of Object.entries(wordToNum)) {
        if (trimmed.includes(w)) { price = val; break }
      }
    }
    let desc = trimmed
      .replace(/\b(le vamos a cobrar|vamos a cobrar|cobrar|euros?|€|por|el|la|los|las|un|una|para|pintar|reparar|cambiar)\b/gi, ' ')
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    if (trimmed.includes('capó')) desc = 'Pintar capó'
    else if (trimmed.includes('paragolpes delantero') || trimmed.includes('parachoques delantero')) desc = 'Pintar paragolpes delantero'
    else if (trimmed.includes('paragolpes trasero') || trimmed.includes('parachoques trasero')) desc = 'Pintar paragolpes trasero'
    else if (trimmed.includes('aleta')) desc = 'Reparar/Pintar aleta'
    else if (trimmed.includes('puerta')) desc = 'Reparar/Pintar puerta'
    else if (trimmed.includes('aceite')) desc = 'Cambio de aceite y filtro'
    else if (trimmed.includes('frenos')) desc = 'Sustitución de frenos'
    else if (desc.length > 2) desc = desc.charAt(0).toUpperCase() + desc.slice(1)

    if (desc && price > 0) conceptos.push({ descripcion: desc, cantidad: 1, precio: price })
  }
  if (conceptos.length === 0) {
    const numbers = text.match(/\d+/g)
    if (numbers && numbers.length > 0) conceptos.push({ descripcion: 'Trabajo de taller', cantidad: 1, precio: parseFloat(numbers[0]) })
  }
  return conceptos
}

import { getMetisKnowledgePrompt } from '../ai/metisKnowledge'
import { getWorkshopCase } from '../ai/metisWorkshopCase'

// Obtener snapshot completo de datos del taller piloto para consulta cruzada de METIS
async function getFullWorkshopSnapshot(userText?: string): Promise<string> {
  try {
    // Si la pregunta incluye una matrícula o nombre, enriquecer con el caso específico
    let specificCaseInfo = ''
    if (userText) {
      const mat = extractMatricula(userText)
      const caseData = await getWorkshopCase(mat || userText)
      if (caseData) {
        specificCaseInfo = `\n--- DETALLE PROFUNDO DEL CASO CONSULTADO ---\n${caseData.resumenTexto}\n`
      }
    }

    const [
      { data: clientes },
      { data: vehiculos },
      { data: presupuestos },
      { data: facturas },
      { data: cobros },
      { data: citas },
      { data: reparaciones },
      { data: config }
    ] = await Promise.all([
      supabase.from('clientes').select('id, numero, nombre, dni, telefono, email, direccion, localidad').limit(50),
      supabase.from('vehiculos').select('id, cliente_id, matricula, marca, modelo, codigo_color, vin').limit(50),
      supabase.from('presupuestos').select('id, numero, cliente_id, vehiculo_id, total, base_imponible, estado, fecha, conceptos, observaciones, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('facturas').select('id, numero, cliente_id, vehiculo_id, total, base_imponible, estado_cobro, fecha, conceptos, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('cobros').select('id, factura_id, importe, fecha').order('fecha', { ascending: false }).limit(30),
      supabase.from('citas').select('id, cliente_id, vehiculo_id, fecha, hora, estado, observaciones').order('fecha', { ascending: true }).limit(30),
      supabase.from('reparaciones').select('id, vehiculo_id, cliente_id, estado, fecha_entrada, fecha_estimada_entrega, descripcion, created_at').in('estado', ['pendiente', 'en_curso']).limit(30),
      supabase.from('configuracion').select('nombre_empresa, cif, direccion, telefono, email').eq('id', 1).maybeSingle()
    ])

    // Análisis del ritmo de taller y vehículos retrasados
    const now = new Date()
    const reparacionesRetrasadas = (reparaciones || []).map(r => {
      const entrada = new Date(r.fecha_entrada || r.created_at)
      const diasEnTaller = Math.floor((now.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24))
      return { ...r, diasEnTaller }
    }).filter(r => r.diasEnTaller >= 4) // alerta si lleva 4 o más días

    return `
${getMetisKnowledgePrompt()}

--- BASE DE DATOS Y ESTADO OPERATIVO DEL TALLER (DM CAR / GESTARIAN) ---
TALLER: ${config?.nombre_empresa || 'DM CAR'} (CIF: ${config?.cif || '—'}, Dir: ${config?.direccion || '—'})
${specificCaseInfo}
CAPACIDAD Y RITMO ACTUAL:
- Vehículos actualmente en reparación activa: ${reparaciones?.length || 0}
- Citas próximas agendadas: ${citas?.length || 0}
${reparacionesRetrasadas.length > 0 ? `ALERTA DE RETRASO EN TALLER:\n${reparacionesRetrasadas.map(r => `* Reparación #${r.id} (VehID: ${r.vehiculo_id}) lleva ${r.diasEnTaller} DÍAS en taller (${r.descripcion || 'Sin descripción'}).`).join('\n')}` : 'Todos los vehículos en taller están dentro del plazo normal.'}

CITAS AGENDADAS (${citas?.length || 0}):
${(citas || []).map(ct => `- Cita [ClienteID: ${ct.cliente_id}, VehID: ${ct.vehiculo_id}]: Fecha: ${ct.fecha} ${ct.hora || ''}, Estado: ${ct.estado}, Obs: ${ct.observaciones || '—'}`).join('\n')}

REPARACIONES EN CURSO (${reparaciones?.length || 0}):
${(reparaciones || []).map(r => `- Reparación #${r.id} [VehID: ${r.vehiculo_id}]: Estado: ${r.estado}, Entrada: ${r.fecha_entrada || r.created_at}, Descr: ${r.descripcion || '—'}`).join('\n')}

CLIENTES REGISTRADOS (${clientes?.length || 0}):
${(clientes || []).map(c => `- Cliente #${c.numero} [ID: ${c.id}]: "${c.nombre}", Tel: ${c.telefono || '—'}, DNI: ${c.dni || '—'}, Dir/Loc: ${c.direccion || ''} ${c.localidad || ''}`).join('\n')}

VEHÍCULOS (${vehiculos?.length || 0}):
${(vehiculos || []).map(v => `- Vehículo [ID: ${v.id}, ClienteID: ${v.cliente_id}]: Matrícula: ${v.matricula}, ${v.marca || ''} ${v.modelo || ''}, Color: ${v.codigo_color || '—'}, VIN: ${v.vin || '—'}`).join('\n')}

PRESUPUESTOS RECIENTES (${presupuestos?.length || 0}):
${(presupuestos || []).map(p => `- Presupuesto ${p.numero} [ClienteID: ${p.cliente_id}, VehID: ${p.vehiculo_id}]: Fecha: ${p.fecha || p.created_at}, Total: ${p.total}€, Estado: ${p.estado}. Conceptos: ${JSON.stringify(p.conceptos || [])}`).join('\n')}

FACTURAS EMITIDAS Y COBROS (${facturas?.length || 0}):
${(facturas || []).map(f => {
  const facCobros = (cobros || []).filter(c => c.factura_id === f.id)
  const totalCobrado = facCobros.reduce((acc, c) => acc + (Number(c.importe) || 0), 0)
  return `- Factura ${f.numero} [ClienteID: ${f.cliente_id}, VehID: ${f.vehiculo_id}]: Fecha: ${f.fecha || f.created_at}, Total: ${f.total}€ (Cobrado: ${totalCobrado}€ - Estado: ${f.estado_cobro}). Conceptos: ${JSON.stringify(f.conceptos || [])}`
}).join('\n')}
------------------------------------------------------------
`
  } catch (e) {
    console.warn('No se pudo cargar el snapshot completo de la BD para METIS:', e)
    return '--- Base de datos no disponible temporalmente ---'
  }
}

// MAIN ENTRY POINT
export async function processMetisMessage(
  userText: string,
  context?: MetisContext
): Promise<MetisResponse> {
  // 1. Prefer Google Gemini API key if configured
  const geminiKey = localStorage.getItem('gestarian_gemini_api_key')?.trim()
  if (geminiKey) {
    try {
      return await processWithGemini(geminiKey, userText, context)
    } catch (e: any) {
      console.error('Error con Gemini API:', e)
    }
  }

  // 2. Prefer Hugging Face Inference API if configured
  const hfKey = localStorage.getItem('gestarian_hf_api_key')?.trim()
  if (hfKey) {
    try {
      return await processWithHuggingFace(hfKey, userText, context)
    } catch (e: any) {
      console.error('Error con Hugging Face Inference API:', e)
    }
  }

  // 3. Groq (Llama 3) if API key present
  const groqKey = localStorage.getItem('gestarian_groq_api_key')?.trim()
  if (groqKey) {
    try {
      return await processWithGroq(groqKey, userText, context)
    } catch (e: any) {
      console.error('Error con Groq API:', e)
    }
  }

  return processWithBasicEngine(userText, context)
}

// ── GEMINI INFERENCE ENGINE ──
async function processWithGemini(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  const dbSnapshot = await getFullWorkshopSnapshot(userText)

  const systemInstruction = `Eres METIS, el cerebro de inteligencia artificial y asistente experto de GESTARIAN para el taller piloto DM CAR.
Tienes acceso directo y en tiempo real a toda la base de datos operativa del taller (clientes, vehículos, presupuestos, facturas, cobros, citas e histórico de reparaciones).

PERSONALIDAD Y VOZ:
- Hablas un Español de España impecable, natural, fluido y castizo (como alguien culto y directo de Valladolid o Madrid). Nada de tono robótico, nada de "¡Hola! ¿En qué puedo ayudarte hoy?". Ve directo al grano, con seguridad técnica y amabilidad profesional de taller.
- Tu respuesta en el campo "text" será reproducida POR VOZ ALTA con síntesis de voz humana. Por ello, redacta frases naturales, fáciles de escuchar, sin listas de asteriscos, sin código JSON ni signos raros en el texto hablado.
- CRUCE INTELIGENTE DE DATOS: Cuando te pregunten cosas como "¿Cuánto se le cobró por pintar el coche a Manolo el de Fuengirola la semana pasada?", busca en el snapshot de clientes (Manolo/Manuel, Fuengirola), localiza su vehículo, sus facturas o presupuestos y los conceptos de pintura, calcula los importes exactos y responde con total precisión: "A Manolo de Fuengirola se le cobraron 240 euros el martes pasado por el pintado del capó y aleta en la factura FAC-0012."
- Si el usuario te pide crear un presupuesto, cita o navegar, genera la respuesta con el formato JSON:
{
  "text": "Respuesta explicativa en perfecto español de España para ser leída por voz.",
  "actionResult": {
    "type": "presupuesto_creado" | "cita_creada" | "busqueda_realizada" | "info",
    "title": "Título de la acción",
    "details": "Detalles relevantes",
    "navigationPath": "/presupuestos" | "/citas" | "/clientes" | "/expedientes"
- Si es una consulta o conversación, devuelve el JSON con "text" respondiendo directamente con la información cruzada de la base de datos.`

  const aiConfig = localStorage.getItem('gestarian_ai_assistant_config')
  let selectedModel = 'gemini-2.0-flash'
  if (aiConfig) {
    try {
      const parsed = JSON.parse(aiConfig)
      if (parsed.model) selectedModel = parsed.model
    } catch (e) {}
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `${systemInstruction}\n\n${dbSnapshot}\n\nContexto UI actual: ${JSON.stringify(context || {})}\n\nPregunta / Orden del jefe de taller: "${userText}"` }] }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    }
  )

  if (!response.ok) {
    const errTxt = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errTxt}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

  try {
    const parsed = JSON.parse(cleanJsonText)
    const text = parsed.text || parsed.respuesta || rawText
    let actionResult = parsed.actionResult

    // Si Gemini generó una acción de creación de presupuesto o similar, ejecutarla en Base de Datos
    if (parsed.action && typeof parsed.action === 'object') {
      const act = parsed.action
      if (act.type === 'create_presupuesto' || act.type === 'presupuesto_creado') {
        // 1. Buscar o vincular cliente
        let targetClienteId: string | null = null
        let targetVehiculoId: string | null = null

        // Buscar por nombre si viene en la orden
        if (act.cliente_nombre || userText) {
          const searchName = act.cliente_nombre || userText.match(/(?:para|a|de)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:\s+por|\s+pa|\s+con|\s+el|\s+un|\s*\d|$)/i)?.[1]?.trim()
          if (searchName) {
            const { data: matchedClis } = await supabase.from('clientes').select('id, nombre').ilike('nombre', `%${searchName}%`).limit(1)
            if (matchedClis && matchedClis.length > 0) {
              targetClienteId = matchedClis[0].id
            }
          }
        }

        // Si no se encontró por nombre, buscar vehículo
        if (act.matricula || userText) {
          const mat = act.matricula || extractMatricula(userText)
          if (mat) {
            const { data: matchedVehs } = await supabase.from('vehiculos').select('id, cliente_id').ilike('matricula', `%${mat}%`).limit(1)
            if (matchedVehs && matchedVehs.length > 0) {
              targetVehiculoId = matchedVehs[0].id
              if (!targetClienteId) targetClienteId = matchedVehs[0].cliente_id
            }
          }
        }

        // Si aún no hay cliente, usar el primero disponible o crear
        if (!targetClienteId) {
          const { data: firstCli } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
          targetClienteId = firstCli?.id || null
        }

        if (targetClienteId && !targetVehiculoId) {
          const { data: vehList } = await supabase.from('vehiculos').select('id').eq('cliente_id', targetClienteId).limit(1)
          if (vehList && vehList.length > 0) targetVehiculoId = vehList[0].id
        }

        // 2. Extraer conceptos e importes
        let conceptosList = act.conceptos || []
        if (!conceptosList.length) {
          // Extraer precio del texto si no vino estructurado
          const priceMatch = userText.match(/(\d+(?:[.,]\d+)?)\s*(?:€|euro|euros)/i)
          const precio = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0
          const descMatch = userText.match(/(?:pa|para|de)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)(?:,\s*el|\s+el|\s*\d|$)/i)
          const descripcion = descMatch ? descMatch[1].trim() : 'Trabajo de chapa y pintura'
          conceptosList = [{ descripcion, cantidad: 1, precio }]
        }

        const subtotal = conceptosList.reduce((acc: number, c: any) => acc + ((Number(c.cantidad) || 1) * (Number(c.precio) || 0)), 0)
        const total = Math.round(subtotal * 1.21 * 100) / 100
        const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

        const { data: newPres, error: presErr } = await supabase.from('presupuestos').insert({
          numero: nextNum,
          cliente_id: targetClienteId,
          vehiculo_id: targetVehiculoId,
          estado: 'pendiente',
          conceptos: conceptosList.map((c: any) => ({ descripcion: c.descripcion, cantidad: c.cantidad || 1, precio: c.precio || 0 })),
          total,
          base_imponible: subtotal,
          observaciones: act.observaciones || 'Presupuesto generado automáticamente por METIS'
        }).select().single()

        if (!presErr && newPres) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: newPres.id, tipo: 'presupuesto' } }))
            }, 300)
          }

          actionResult = {
            type: 'presupuesto_creado',
            title: `Presupuesto ${nextNum} Creado`,
            details: `Importe Total: ${total.toFixed(2)} € (IVA incl.)`,
            item: newPres,
            navigationPath: '/presupuestos'
          }
        }
      }
    }

    return { text, actionResult }
  } catch (e) {
    return { text: rawText || 'Instrucción procesada con éxito.' }
  }
}


// ── HUGGING FACE INFERENCE ENGINE ──
async function processWithHuggingFace(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  // Choose a sensible default model that is widely available on Hugging Face.
  // `meta-llama/Llama-2-7b-chat` is a high quality open-source chat model (may require acceptance of license on HF).
  // If you prefer a smaller model, override via `gestarian_hf_model` in localStorage.
  const defaultModel = localStorage.getItem('gestarian_hf_model') || 'meta-llama/Llama-2-7b-chat'

  const systemInstruction = `Eres METIS, un asistente experto en gestión empresarial y fiscalidad en España. Responde siempre en español de España y, cuando proceda, produce una salida JSON con la estructura esperada por la app (campo "text" y opcional "action"). Sé conciso, directo y profesional. IMPORTANTE: El usuario puede hablar español de Andalucía. Interpreta el lenguaje coloquial andaluz y sus particularidades fonéticas. No confundas una pronunciación relajada, pérdida o aspiración de sonidos, contracciones o palabras parcialmente pronunciadas con una palabra diferente cuando el contexto permita determinar la intención. Deduce el significado correcto apoyándote en el contexto del taller.`

  // Build a compact prompt combining system + UI context + user text
  const matriculaDetected = extractMatricula(userText) || context?.matricula
  const dbInfoParts: string[] = []
  if (matriculaDetected) dbInfoParts.push(`Matrícula detectada: ${matriculaDetected}`)
  if (context) dbInfoParts.push(`Contexto UI: ${JSON.stringify(context)}`)
  const prompt = `${systemInstruction}\n\n${dbInfoParts.join(' | ')}\n\nUsuario: ${userText}`

  const url = `https://api-inference.huggingface.co/models/${defaultModel}`
  const body = {
    inputs: prompt,
    parameters: { max_new_tokens: 512, temperature: 0.2 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Hugging Face API error: ${res.status} ${txt}`)
  }

  const data = await res.json()
  // HF can respond with an array or object; try the common fields
  let textOutput = ''
  if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
    textOutput = data[0].generated_text
  } else if (data.generated_text) {
    textOutput = data.generated_text
  } else if (typeof data === 'string') {
    textOutput = data
  } else if (Array.isArray(data) && data[0]?.body) {
    textOutput = data[0].body
  } else {
    textOutput = JSON.stringify(data)
  }

  // Try to parse a JSON response from the model; otherwise return plain text
  let parsed: any
  try {
    parsed = JSON.parse(textOutput)
  } catch (e) {
    // If the model didn't return JSON, wrap the reply as text
    return { text: textOutput }
  }

  const text = parsed.text || parsed.respuesta || parsed.mensaje || (typeof parsed === 'string' ? parsed : '')
  const action = parsed.action
  if (action && action.type === 'navigate' && typeof window !== 'undefined' && action.navigationPath) {
    window.dispatchEvent(new CustomEvent('metis-navigate', { detail: { path: action.navigationPath } }))
  }
  return { text: text || (typeof parsed === 'string' ? parsed : 'Entendido.'), actionResult: parsed.actionResult }
}

// ── GROQ ADVANCED ENGINE (Llama 3) ──
async function processWithGroq(apiKey: string, userText: string, context?: MetisContext): Promise<MetisResponse> {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true
  })

  const systemInstruction = `Eres METIS, un asistente experto en gestión empresarial, fiscalidad, contabilidad e impuestos en España. Tienes un dominio absoluto de la legislación fiscal, la creación de presupuestos, balances y gestión de autónomos y pymes en España. Eres la inteligencia artificial avanzada de GESTARIAN.

REGLAS DE ORO (ESTRICTAS):
1. Responde con precisión técnica cuando se trate de negocios, fiscalidad, contabilidad o la app, pero mantén un trato fluido, natural y capaz de adaptarte a cualquier otro contexto que el usuario requiera.
2. PROTEGE EL NEGOCIO. Si el usuario pide un descuento abusivo (mayor al 15%), borrar datos masivamente, o acciones financieras perjudiciales, RECHAZA LA ACCIÓN y advierte de que no es beneficioso. Explica por qué.
3. El usuario puede pedirte avanzar en el flujo de trabajo:
   - Crear un presupuesto -> Aceptarlo -> Dar cita -> Comenzar reparación -> Facturar -> Cobrar.
   - Entiende en qué punto está y avanza al siguiente paso si te lo piden (ej: "Pasa esto a reparación", "Crea la factura", "Ha pagado 100€").
4. El usuario puede pedirte abrir un documento (ej: "Abre el presupuesto de la matrícula 1234ABC"). Si es así, responde con action.type = "navigate" y usa targetId si lo tienes.
5. El usuario puede pedir modificar un documento (ej: "modifica pintar techo por pintar capó por 100€"). Aplica el cambio en los conceptos usando "action": "update".
6. DEBES responder SIEMPRE EN ESPAÑOL DE ESPAÑA (CASTELLANO). NUNCA respondas en inglés, chino u otro idioma.
7. DEBES responder SIEMPRE con un JSON VÁLIDO. No incluyas markdown, solo el objeto JSON crudo.
8. ADAPTACIÓN AL HABLA ANDALUZA: El usuario puede hablar español de Andalucía. Interpreta el lenguaje coloquial andaluz y sus particularidades fonéticas. No confundas una pronunciación relajada, pérdida o aspiración de sonidos, contracciones o palabras parcialmente pronunciadas con una palabra diferente cuando el contexto de GESTARIAN permita determinar la intención. Deduce el significado real a partir del contexto (nombres, matrículas, vehículos, piezas, facturación) frente a posibles errores fonéticos en la transcripción de voz.

Estructura del JSON obligatoria:
{
  "text": "Tu respuesta hablada. Debe ser concisa, profesional y directa. Aquí darás la explicación si te niegas a hacer algo.",
  "action": {
    "type": "create_presupuesto" | "update_presupuesto" | "delete_presupuesto" | "accept_presupuesto" | "create_cita" | "start_reparacion" | "create_factura" | "register_cobro" | "navigate" | "none",
    "conceptos": [{"descripcion": "string", "precio": 0, "action": "add" | "update" | "remove"}],
    "matricula": "string (la que encuentres en el texto o contexto)",
    "targetId": "string (el ID del documento a actualizar, eliminar o abrir, si lo conoces)",
    "navigationPath": "string (ej: /presupuestos)",
    "observations": "string",
    "cita_details": {"fecha": "YYYY-MM-DD", "hora": "HH:MM"},
    "cobro_details": {"importe": 0, "metodo": "efectivo" | "tarjeta" | "transferencia"}
  }
}`

  // DB lookup to enrich context
  let dbInfo = ""
  const matriculaDetected = extractMatricula(userText) || context?.matricula
  let vehiculoId: string | null = null
  let clienteId: string | null = null
  let presupuestoActivo = null

  if (matriculaDetected) {
      const { data: veh } = await supabase.from('vehiculos').select('id, matricula, cliente_id, clientes(id, nombre)').ilike('matricula', `%${matriculaDetected}%`).maybeSingle()
      if (veh) {
        vehiculoId = veh.id
        clienteId = veh.cliente_id
        dbInfo += `Vehículo encontrado en DB: Matrícula ${veh.matricula}, Cliente: ${(veh as any).clientes?.nombre}. `
      }
   }

   // Fetch presupuestos for this vehicle if found
   if (vehiculoId) {
      const { data: pres } = await supabase.from('presupuestos').select('*').eq('vehiculo_id', vehiculoId).order('created_at', {ascending: false}).limit(1).maybeSingle()
      if (pres) {
         presupuestoActivo = pres
         dbInfo += `\nÚltimo presupuesto para este vehículo en DB: ID ${pres.id}, Nro ${pres.numero}, Conceptos: ${JSON.stringify(pres.conceptos)}.`
      }
   }

   if (context?.id && context?.tipo === 'presupuesto') {
      const { data: pres } = await supabase.from('presupuestos').select('*').eq('id', context.id).maybeSingle()
      if (pres) {
        presupuestoActivo = pres
        dbInfo += `\nEl usuario tiene ABIERTO en pantalla el presupuesto: ID ${pres.id}, Nro ${pres.numero}, Conceptos: ${JSON.stringify(pres.conceptos)}.`
      }
   }

   const prompt = `Contexto de la interfaz (lo que el usuario está viendo o tocando): ${JSON.stringify(context || 'Ninguno')}
Datos extraídos de la Base de Datos: ${dbInfo || 'No hay datos relevantes previos.'}

Mensaje del usuario: "${userText}"`
  
   const response = await openai.chat.completions.create({
     model: "llama-3.3-70b-versatile",
     messages: [
       { role: "system", content: systemInstruction },
       { role: "user", content: prompt }
     ],
     response_format: { type: "json_object" }
   })

   const textOutput = response.choices[0].message.content || "{}"

   let parsed: any
   try {
     parsed = JSON.parse(textOutput)
   } catch(e) {
     console.error("Failed to parse Groq output", textOutput)
     return { text: textOutput.replace(/```json/g, '').replace(/```/g, '').trim() || "Ha ocurrido un error al interpretar la respuesta." }
   }

   // Extract text from text, respuesta, mensaje, or raw object
   const text = parsed.text || parsed.respuesta || parsed.mensaje || (typeof parsed === 'string' ? parsed : "Entendido. ¿En qué más puedo ayudarte?")
   const action = parsed.action
   const actionType = (typeof action === 'object' && action?.type) ? action.type : (typeof action === 'string' ? action : 'none')

   // REJECT / GENERAL CONVERSATION ACTION
   if (actionType === 'none' || !['navigate', 'delete_presupuesto', 'update_presupuesto', 'create_presupuesto', 'accept_presupuesto', 'create_cita', 'start_reparacion', 'create_factura', 'register_cobro'].includes(actionType)) {
       return { text }
   }

   // DISPATCH NAVIGATION / OPEN DOCUMENT
   if (action.type === 'navigate') {
      if (typeof window !== 'undefined') {
         if (action.navigationPath) {
           window.dispatchEvent(new CustomEvent('metis-navigate', { detail: { path: action.navigationPath } }))
         }
         const target = action.targetId || presupuestoActivo?.id
         if (target) {
             setTimeout(() => {
               window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: target, tipo: 'presupuesto' } }))
             }, 300)
         }
      }
      return { text, actionResult: { type: 'info', title: 'Navegación', details: 'Abriendo documento...', navigationPath: action.navigationPath } }
   }

   // DELETE
   if (action.type === 'delete_presupuesto') {
      const pId = action.targetId || presupuestoActivo?.id || context?.id
      if (pId) {
         await supabase.from('presupuestos').delete().eq('id', pId)
         if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
         return { text, actionResult: { type: 'info', title: 'Eliminado', details: 'Presupuesto borrado.', navigationPath: '/presupuestos' } }
      }
      return { text: "No he encontrado el presupuesto a eliminar en la base de datos." }
   }

   // UPDATE
   if (action.type === 'update_presupuesto') {
      const pId = action.targetId || presupuestoActivo?.id || context?.id
      if (pId) {
         const { data: existing } = await supabase.from('presupuestos').select('*').eq('id', pId).maybeSingle()
         if (existing) {
            let nuevos = existing.conceptos || []
            
            if (action.conceptos && Array.isArray(action.conceptos)) {
               for (const c of action.conceptos) {
                  if (c.action === 'add') {
                      nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
                  } else if (c.action === 'remove') {
                      nuevos = nuevos.filter((nc: any) => !nc.descripcion.toLowerCase().includes(c.descripcion.toLowerCase()))
                  } else if (c.action === 'update') {
                      const match = nuevos.find((nc: any) => nc.descripcion.toLowerCase().includes(c.descripcion.toLowerCase()) || c.descripcion.toLowerCase().includes(nc.descripcion.toLowerCase()))
                      if (match) {
                         match.descripcion = c.descripcion
                         if (c.precio > 0) match.precio = c.precio
                      } else {
                         nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
                      }
                  } else {
                      nuevos.push({ descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0 })
                  }
               }
            }
            
            const subtotal = nuevos.reduce((acc: number, c: any) => acc + c.cantidad * c.precio, 0)
            const total = Math.round((subtotal * 1.21) * 100) / 100

            const { data: updated } = await supabase.from('presupuestos').update({
              conceptos: nuevos,
              total,
              observaciones: action.observations || existing.observaciones
            }).eq('id', pId).select().single()

            if (typeof window !== 'undefined') {
               window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
               setTimeout(() => {
                 window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: pId, tipo: 'presupuesto' } }))
               }, 300)
            }
            
            return {
              text,
              actionResult: {
                 type: 'presupuesto_actualizado',
                 title: `Presupuesto ${existing.numero} Actualizado`,
                 details: `Nuevo total: ${total} €`,
                 item: updated,
                 navigationPath: '/presupuestos'
              }
            }
         }
      }
      return { text: "No he encontrado el presupuesto para modificar." }
   }

   // CREATE
   if (action.type === 'create_presupuesto') {
      let cId = clienteId
      if (!cId) {
         const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
         cId = firstCliente?.id
      }
      
      const subtotal = (action.conceptos || []).reduce((acc: number, c: any) => acc + (1 * c.precio), 0)
      const total = Math.round((subtotal * 1.21) * 100) / 100
      const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

      const { data } = await supabase.from('presupuestos').insert({
         numero: nextNum, 
         cliente_id: cId, 
         vehiculo_id: vehiculoId,
         estado: 'pendiente', 
         conceptos: (action.conceptos || []).map((c:any) => ({descripcion: c.descripcion, cantidad: 1, precio: c.precio || 0})),
         total, 
         observaciones: action.observations || 'Generado por METIS'
      }).select().single()

      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
          if (data?.id) {
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: data.id, tipo: 'presupuesto' } }))
              }, 300)
          }
      }

      return {
        text,
        actionResult: {
          type: 'presupuesto_creado', title: `Presupuesto ${nextNum}`, details: `Total: ${total} €`, item: data, navigationPath: '/presupuestos'
        }
      }
   }

   // ACCEPT PRESUPUESTO
   if (action.type === 'accept_presupuesto') {
      const pId = action.targetId || presupuestoActivo?.id || context?.id
      if (pId) {
         const { data: updated } = await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', pId).select().single()
         if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: pId, tipo: 'presupuesto' } }))
            }, 300)
         }
         return {
           text,
           actionResult: {
              type: 'presupuesto_aceptado',
              title: 'Presupuesto Aceptado',
              details: updated ? `Nro: ${updated.numero}` : '',
              item: updated,
              navigationPath: '/presupuestos'
           }
         }
      }
      return { text: "No he encontrado el presupuesto para aceptar." }
   }

   // CREATE CITA
   if (action.type === 'create_cita') {
      let cId = clienteId
      if (!cId && presupuestoActivo?.cliente_id) cId = presupuestoActivo.cliente_id
      if (!cId) {
         const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
         cId = firstCliente?.id
      }
      
      const fecha = action.cita_details?.fecha || new Date().toISOString().split('T')[0]
      const hora = action.cita_details?.hora || '09:00'
      const pId = action.targetId || presupuestoActivo?.id || context?.id || null

      const { data } = await supabase.from('citas').insert({
         cliente_id: cId,
         vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
         presupuesto_id: pId,
         fecha: fecha,
         hora: hora,
         estado: 'pendiente',
         observaciones: action.observations || 'Cita programada por METIS'
      }).select().single()

      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'citas' } }))
      }

      return {
        text,
        actionResult: {
          type: 'cita_creada',
          title: 'Cita Programada',
          details: `${fecha} a las ${hora}`,
          item: data,
          navigationPath: '/citas'
        }
      }
   }

   // START REPARACION
   if (action.type === 'start_reparacion') {
      let cId = clienteId
      if (!cId && presupuestoActivo?.cliente_id) cId = presupuestoActivo.cliente_id
      if (!cId) {
         const { data: firstCliente } = await supabase.from('clientes').select('id, nombre').limit(1).maybeSingle()
         cId = firstCliente?.id
      }
      
      const { data } = await supabase.from('reparaciones').insert({
         cliente_id: cId,
         vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
         cita_id: context?.tipo === 'cita' ? context.id : null,
         estado: 'en_proceso',
         descripcion: action.observations || 'Iniciada por METIS'
      }).select().single()

      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'reparaciones' } }))
      }

      return {
        text,
        actionResult: {
          type: 'info',
          title: 'Reparación Iniciada',
          details: 'En proceso',
          item: data,
          navigationPath: '/reparaciones'
        }
      }
   }

   // CREATE FACTURA
   if (action.type === 'create_factura') {
      let cId = clienteId || presupuestoActivo?.cliente_id
      if (!cId) {
         const { data: firstCliente } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
         cId = firstCliente?.id
      }
      const conceptos = action.conceptos && action.conceptos.length > 0 ? action.conceptos : (presupuestoActivo?.conceptos || [])
      const subtotal = conceptos.reduce((acc: number, c: any) => acc + (c.cantidad * c.precio), 0)
      const total = Math.round((subtotal * 1.21) * 100) / 100

      const year = new Date().getFullYear()
      const prefix = `FAC-${year}-`
      const { data: allFacs } = await supabase.from('facturas').select('numero').like('numero', `${prefix}%`)
      let maxNum = 0
      ;(allFacs || []).forEach((f: any) => {
        const parts = f.numero.split('-')
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      })
      const newNum = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`

      const { data } = await supabase.from('facturas').insert({
         numero: newNum,
         cliente_id: cId,
         vehiculo_id: vehiculoId || (presupuestoActivo?.vehiculo_id) || null,
         conceptos,
         total,
         total_abonado: 0,
         estado_cobro: 'pendiente',
         fecha: new Date().toISOString().split('T')[0]
      }).select().single()

      if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'facturas' } }))
      }

      return {
        text,
        actionResult: {
          type: 'info',
          title: `Factura ${newNum}`,
          details: `Total: ${total} €`,
          item: data,
          navigationPath: '/facturas'
        }
      }
   }

   // REGISTER COBRO
   if (action.type === 'register_cobro') {
      const importe = action.cobro_details?.importe || 0
      const metodo = action.cobro_details?.metodo || 'efectivo'
      const fId = action.targetId || (context?.tipo === 'factura' ? context.id : null)
      if (fId && importe > 0) {
         const { data: factura } = await supabase.from('facturas').select('*').eq('id', fId).maybeSingle()
         if (factura) {
             const nuevoAbonado = (factura.total_abonado || 0) + importe
             const estadoCobro = nuevoAbonado >= factura.total ? 'pagada' : 'parcial'
             await supabase.from('cobros').insert({
                 factura_id: fId,
                 importe,
                 fecha: new Date().toISOString().split('T')[0],
                 metodo
             })
             const { data: updated } = await supabase.from('facturas').update({ total_abonado: nuevoAbonado, estado_cobro: estadoCobro }).eq('id', fId).select().single()
             
             if (typeof window !== 'undefined') {
                 window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'facturas' } }))
                 window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'cobros' } }))
             }
             return {
               text,
               actionResult: {
                 type: 'info',
                 title: 'Cobro Registrado',
                 details: `${importe} € (${metodo})`,
                 item: updated,
                 navigationPath: '/facturas'
               }
             }
         }
      }
      return { text: "No he encontrado la factura para registrar el cobro, o el importe no es válido." }
   }

   return { text }
}


// ── FALLBACK RULE-BASED ENGINE ──
async function processWithBasicEngine(userText: string, context?: MetisContext): Promise<MetisResponse> {
  const lower = userText.toLowerCase().trim()
  const matriculaDetected = extractMatricula(userText) || context?.matricula

  const isDelete = lower.includes('eliminar') || lower.includes('borrar')
  const isEdit = lower.includes('editar') || lower.includes('modificar') || lower.includes('actualizar') || lower.includes('añadir') || lower.includes('cambiar')

  if (
    lower.includes('presupuesto') ||
    lower.includes('presupuestar') ||
    lower.includes('cotización') ||
    lower.includes('cobrar') ||
    lower.includes('pintar') ||
    lower.includes('reparar') ||
    context?.tipo === 'presupuesto'
  ) {
    if (isDelete && context?.id) {
      await supabase.from('presupuestos').delete().eq('id', context.id)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
      return { text: `Presupuesto eliminado correctamente.`, actionResult: { type: 'info', title: 'Eliminado', details: 'Presupuesto borrado.', navigationPath: '/presupuestos' } }
    }

    const conceptos = extractConceptosFromParagraph(userText)

    if ((isEdit || context?.id) && context?.id && !isDelete) {
      const { data: existing } = await supabase.from('presupuestos').select('*').eq('id', context.id).maybeSingle()
      if (existing) {
        let nuevosConceptos = existing.conceptos || []
        if (conceptos.length > 0) nuevosConceptos = [...nuevosConceptos, ...conceptos]
        const subtotal = nuevosConceptos.reduce((acc: number, c: any) => acc + c.cantidad * c.precio, 0)
        const total = Math.round((subtotal * 1.21) * 100) / 100
        const { data: updated } = await supabase.from('presupuestos').update({ conceptos: nuevosConceptos, total, observaciones: existing.observaciones }).eq('id', context.id).select().single()
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
        return { text: `Presupuesto actualizado. Total: ${total} €.`, actionResult: { type: 'presupuesto_actualizado', title: 'Actualizado', details: `Total: ${total} €`, item: updated, navigationPath: '/presupuestos' } }
      }
    }

    const mat = matriculaDetected || '1234ABC'
    let clienteId = null; let vehiculoId = null
    if (mat) {
      const { data: veh } = await supabase.from('vehiculos').select('id, cliente_id').ilike('matricula', `%${mat}%`).maybeSingle()
      if (veh) { vehiculoId = veh.id; clienteId = veh.cliente_id }
    }
    if (!clienteId) {
      const { data: firstCliente } = await supabase.from('clientes').select('id').limit(1).maybeSingle()
      if (firstCliente) clienteId = firstCliente.id
    }

    const subtotal = conceptos.reduce((acc, c) => acc + c.cantidad * c.precio, 0)
    const total = Math.round((subtotal * 1.21) * 100) / 100
    const nextNum = `PAA${Math.floor(1000 + Math.random() * 9000)}`

    let createdItem = null
    if (clienteId) {
      const { data } = await supabase.from('presupuestos').insert({ numero: nextNum, cliente_id: clienteId, vehiculo_id: vehiculoId, estado: 'pendiente', conceptos, total, observaciones: 'Por voz' }).select().single()
      createdItem = data
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gestarian-db-updated', { detail: { type: 'presupuestos' } }))
    return { text: `Presupuesto ${nextNum} creado.`, actionResult: { type: 'presupuesto_creado', title: 'Creado', details: `Total: ${total} €`, item: createdItem, navigationPath: '/presupuestos' } }
  }

  if (lower.includes('cita')) return { text: "Cita creada.", actionResult: { type: 'cita_creada', title: "Nueva cita", details: "Pendiente", navigationPath: '/citas' } }
  if (lower.includes('reparación')) return { text: "Reparación en proceso.", actionResult: { type: 'reparacion_actualizada', title: "Estado", details: "En proceso", navigationPath: '/reparaciones' } }
  if (lower.includes('buscar')) return { text: "Buscando...", actionResult: { type: 'busqueda_realizada', title: "Búsqueda", details: "Redirigiendo", navigationPath: '/clientes' } }

  return { text: `Hola, soy METIS. He escuchado: "${userText}". Para acciones complejas debes configurar la API Key en Configuración.` }
}

export async function generateFinancialReport(datosTrimestrales: any[], maxTokens: number = 2000): Promise<string> {
  const { data: config } = await supabase.from('configuracion').select('api_key').eq('id', 1).maybeSingle()
  const apiKey = config?.api_key || localStorage.getItem('groq_api_key')

  if (!apiKey) {
    return "## Error\\n\\nNo se ha configurado la API Key de Groq en la sección de Configuración. No puedo generar el informe."
  }

  const groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    dangerouslyAllowBrowser: true,
  })

  const systemPrompt = `Eres METIS, el analista financiero experto de GESTARIAN. Se te proporcionará un resumen de los últimos 4 trimestres fiscales del taller.
Tu objetivo es escribir un breve informe ejecutivo en formato Markdown. Analiza los ingresos, gastos, beneficios e IVA.
Destaca:
1. Tendencia de ingresos y gastos.
2. Salud financiera (márgenes).
3. Recomendaciones fiscales u operativas prácticas.
Usa listas y negritas para mejorar la legibilidad. Sé muy profesional, directo y conciso.
REGLA DE ORO: Responde SIEMPRE en Español de España. NUNCA respondas en otro idioma.`

  const prompt = `Estos son los datos trimestrales:\\n${JSON.stringify(datosTrimestrales, null, 2)}\\n\\nGenera el informe.`

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
    })

    return res.choices[0]?.message?.content || "No se pudo generar el informe."
  } catch (err: any) {
    console.error("METIS AI Engine error:", err)
    return `## Error en la generación\\nOcurrió un error al contactar con el modelo de IA: ${err.message}`
  }
}
