import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Bot, Mic, MicOff, ArrowRight, CheckCircle2, FileText, Power, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import { useVoice, getMicSettingsUrl } from '../lib/useVoice'
import { useSpeechSynthesis } from '../lib/useSpeechSynthesis'
import { processMetisMessage, MetisContext, MetisActionResult } from '../lib/metisAiEngine'

import { CronFiscalService } from '../lib/cronFiscalService'
import { enviarTrimestreGestoriaAutomático } from '../services/gestoriaExportService'

interface Message {
  id: string
  role: 'user' | 'metis'
  text: string
  actionResult?: MetisActionResult
  cronAction?: { avisoId: string }
}

export function MetisAssistant() {
  const { playSound } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [activeContext, setActiveContext] = useState<MetisContext | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'metis',
      text: 'Hola, soy METIS, tu compañero experto en la oficina de GESTARIAN. Puedes hablarme o escribirme para gestionar presupuestos, citas, reparaciones, clientes y facturas. ¿En qué te ayudo?'
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [voiceInputActive, setVoiceInputActive] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  const { listening, transcript, interim, supported, start, stop, reset, dispose, error, permissionDenied, pending, requestPermission } = useVoice()
  const { speak, stop: stopSpeech } = useSpeechSynthesis()

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing, interim, transcript])

  // Listen for global custom events (e.g. from row buttons or footer mic button)
  useEffect(() => {
    function handleOpenWithContext(e: Event) {
      const detail = (e as CustomEvent).detail as { context?: MetisContext; autoMic?: boolean } | undefined
      setOpen(true)
      if (detail?.context) {
        setActiveContext(detail.context)
        const ctxMsg = `Contexto fijado en ${detail.context.tipo.toUpperCase()} ${detail.context.numero || detail.context.matricula || ''}. ¿Qué cambio o gestión deseas hacer?`
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'metis', text: ctxMsg }])
        speak(ctxMsg)
      }
      if (detail?.autoMic && supported) {
        setVoiceInputActive(true)
        reset()
        start()
      }
    }

    function handleTriggerMic() {
      setOpen(true)
      setVoiceInputActive(true)
      reset()
      start()
    }
    
    function handleTogglePanel() {
      setOpen(o => {
        if (!o) setHasUnread(false)
        return !o
      })
    }

    window.addEventListener('metis-open-context', handleOpenWithContext)
    window.addEventListener('metis-trigger-mic', handleTriggerMic)
    window.addEventListener('metis-toggle-panel', handleTogglePanel)
    return () => {
      window.removeEventListener('metis-open-context', handleOpenWithContext)
      window.removeEventListener('metis-trigger-mic', handleTriggerMic)
      window.removeEventListener('metis-toggle-panel', handleTogglePanel)
    }
  }, [supported, start, reset, speak])

  // Lógica del calendario fiscal automático
  useEffect(() => {
    let checking = false
    const checkCron = async () => {
      if (checking) return
      checking = true
      try {
        const evento = CronFiscalService.checkCurrentDate()
        if (evento) {
          const avisoId = CronFiscalService.getAvisoId(evento.tipo)
          
          if (evento.tipo === 'envio_10') {
            const exito = await enviarTrimestreGestoriaAutomático()
            CronFiscalService.markAsDone(avisoId)
            const text = exito 
              ? evento.mensaje 
              : "Ha ocurrido un error al intentar enviar el informe trimestral. Por favor, revisa la configuración."
            setMessages(prev => [...prev, { id: avisoId, role: 'metis', text }])
            setHasUnread(true)
            speak(text)
          } else {
            CronFiscalService.markAsDone(avisoId)
            setMessages(prev => [...prev, {
              id: avisoId,
              role: 'metis',
              text: evento.mensaje,
              cronAction: evento.requierePermiso ? { avisoId } : undefined
            }])
            setHasUnread(true)
            speak(evento.mensaje)
          }
        }
      } finally {
        checking = false
      }
    }

    // Comprobar al iniciar y cada 5 minutos
    checkCron()
    const interval = setInterval(checkCron, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [speak])

  const handleCronPermission = async () => {
    CronFiscalService.darPermiso()
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: "Sí, tienes mi permiso para enviarlo." }])
    
    // Al dar permiso, enviar automáticamente ya que está cerrado
    const exito = await enviarTrimestreGestoriaAutomático()
    if (exito) {
      const respText = "¡Perfecto! Acabo de enviar los informes del trimestre a la gestoría."
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'metis', text: respText }])
      speak(respText)
    } else {
      const respText = "Hubo un error al intentar enviar los informes. Revisa tu email de gestoría en Configuración."
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'metis', text: respText }])
      speak(respText)
    }
  }

  const [conversationalMode, setConversationalMode] = useState(false)

  // Al cerrar el panel (o desmontar el componente) apagar el micrófono por completo:
  // así nunca se queda el reconocedor "conectado" corriendo en segundo plano ni el
  // estado de voz pillado en "escuchando".
  useEffect(() => {
    if (!open) {
      dispose()
      setVoiceInputActive(false)
      setConversationalMode(false)
    }
  }, [open, dispose])

  useEffect(() => {
    return () => dispose()
  }, [dispose])

  // Process completed voice transcript when user stops speaking or transcript freezes
  const handleSendMessage = useCallback(async (textToSend?: string, isVoice = false) => {
    const text = (textToSend || input).trim()
    if (!text) return

    playSound('click')
    const userMsgId = Date.now().toString()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text }])
    setInput('')
    setTyping(true)

    try {
      const response = await processMetisMessage(text, activeContext || undefined)
      setTyping(false)
      const metisMsgId = (Date.now() + 1).toString()
      setMessages(prev => [
        ...prev,
        { id: metisMsgId, role: 'metis', text: response.text, actionResult: response.actionResult }
      ])
      
      setHasUnread(!open)

      // Reproducir voz y si está en modo conversacional continuo, reabrir el micro automáticamente al terminar de hablar
      if (isVoice || voiceInputActive || conversationalMode) {
        speak(response.text, () => {
          if (conversationalMode || voiceInputActive) {
            // Reabrir escucha continua manos libres como ChatGPT Voice o Gemini Live
            setTimeout(() => {
              reset()
              start()
            }, 300)
          }
        })
      }
    } catch {
      setTyping(false)
    }
  }, [input, activeContext, playSound, voiceInputActive, conversationalMode, speak, open, reset, start])

  const toggleMic = useCallback(() => {
    playSound('click')
    // Mientras el navegador muestra la pregunta del permiso no tocar nada
    if (pending) return
    if (listening) {
      stop()
      dispose()
      setVoiceInputActive(false)
      setConversationalMode(false)
      if (transcript.trim()) {
        handleSendMessage(transcript, true)
      }
    } else {
      reset()
      stopSpeech()
      setVoiceInputActive(true)
      setConversationalMode(true) // Activar modo manos libres continuo
      start()
    }
  }, [listening, pending, playSound, stop, dispose, reset, stopSpeech, start, transcript, handleSendMessage])

  // El micrófono no se ha activado por falta de permiso: primero se vuelve a pedir
  // el permiso (mostrará la pregunta del navegador y el usuario pulsa "Permitir");
  // si sigue bloqueado, se abre la pantalla de ajustes del sistema/navegador.
  const handleOpenMicSettings = useCallback(async () => {
    playSound('click')
    // Abrimos los ajustes de forma síncrona para que el navegador no bloquee la ventana
    const url = getMicSettingsUrl()
    const win = url ? window.open(url, '_blank') : null
    // Y reintentamos pedir permiso: si el usuario ya lo ha concedido, arrancamos directamente
    const perm = await requestPermission()
    if (perm === 'granted') {
      if (win) { try { win.close() } catch { /* ignorar */ } }
      reset()
      start()
    }
  }, [playSound, requestPermission, reset, start])

  // Auto-finish listening when transcript stops changing after a pause
  useEffect(() => {
    if (listening && transcript.trim().length > 3) {
      const timer = setTimeout(() => {
        stop()
        setVoiceInputActive(false)
        handleSendMessage(transcript, true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [listening, transcript, stop, handleSendMessage])

  useEffect(() => {
    if (transcript) {
      setInput(transcript)
    }
  }, [transcript])

  // Handle native end of speech (for Android where it closes aggressively)
  useEffect(() => {
    if (!listening && !pending && voiceInputActive) {
      setVoiceInputActive(false)
      if (transcript.trim()) {
        handleSendMessage(transcript, true)
      }
    }
  }, [listening, pending, voiceInputActive, transcript, handleSendMessage])

  return (
    <>
      {/* Main METIS drawer / panel */}
      <button
        onClick={() => { playSound('click'); setOpen(!open); setHasUnread(false); }}
        className={`hidden lg:flex fixed bottom-4 right-6 z-50 items-center justify-center gap-2 px-5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-all backdrop-blur-md cursor-pointer ${
          hasUnread
            ? 'bg-[#1c1c1e]/90 border border-[#f97316] text-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.9)] animate-pulse'
            : 'bg-[#1c1c1e]/90 border border-[#22c55e] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.6)] hover:border-[#22c55e] hover:shadow-[0_0_18px_rgba(34,197,94,0.8)]'
        }`}
        title="ON/OFF Avisos METIS"
      >
        <Power className="w-4 h-4" />
        <span>AVISOS METIS</span>
      </button>

      {/* Main METIS drawer / panel */}
      {open && (
        <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-50 w-full sm:w-[420px] h-[80vh] sm:h-[560px] bg-bg-900/95 backdrop-blur-xl border border-bg-700 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col gestarian-metis-panel">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-bg-700 bg-bg-900/95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">METIS IA</p>
                  {activeContext && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {activeContext.tipo.toUpperCase()} {activeContext.numero || activeContext.matricula || ''}
                    </span>
                  )}
                </div>
                <p className={`text-xs flex items-center gap-1 ${listening ? 'text-red-400' : 'text-white/50'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${listening ? 'bg-red-400 animate-pulse' : 'bg-white/30'}`} />
                  {listening ? 'Escuchando tu voz...' : 'METIS disponible'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleMic}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                  listening ? 'bg-red-500/30 text-red-400 animate-pulse border border-red-500/50' : 'text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                aria-label="Hablar a METIS"
                title={listening ? 'Detener micrófono' : 'Hablar directamente a METIS'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => { playSound('click'); stopSpeech(); setOpen(false) }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Context bar if attached */}
          {activeContext && (
            <div className="bg-cyan-950/95 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-cyan-200">
              <span>Trabajando sobre: <strong>{activeContext.tipo}</strong> {activeContext.numero || activeContext.matricula}</span>
              <button
                onClick={() => setActiveContext(null)}
                className="text-[10px] underline hover:text-white"
              >
                Limpiar contexto
              </button>
            </div>
          )}

          {/* Chat message stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line leading-relaxed border ${
                    m.role === 'user'
                      ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/30'
                      : 'bg-bg-800/80 lg:bg-bg-800 text-white/90 border-bg-700 animate-border-breathe-metis lg:animate-none'
                  }`}
                >
                  {m.text}
                </div>

                {/* Interactive Action Card inside METIS chat */}
                {m.actionResult && (
                  <div className="mt-2.5 max-w-[90%] w-full bg-cyan-950/95 border border-cyan-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                      <span>{m.actionResult.title}</span>
                    </div>
                    <p className="text-xs text-white/70">{m.actionResult.details}</p>

                    <div className="pt-2 flex flex-wrap gap-2">
                      {m.actionResult.navigationPath && (
                        <button
                          onClick={() => {
                            playSound('click')
                            setOpen(false)
                            const item = m.actionResult?.item
                            if (item?.id) {
                              navigate(m.actionResult!.navigationPath!, {
                                state: {
                                  presupuestoId: item.id,
                                  clienteId: item.cliente_id,
                                  vehiculoId: item.vehiculo_id,
                                  openForm: true
                                }
                              })
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('gestarian-open-document', { detail: { id: item.id, tipo: 'presupuesto' } }))
                              }, 150)
                            } else {
                              navigate(m.actionResult!.navigationPath!)
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-white font-medium text-xs flex items-center gap-1.5 transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" /> Ver en módulo
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Acciones interactivas para el cron fiscal (Envío de informe trimestral) */}
                {m.cronAction && (
                  <div className="mt-2.5 max-w-[95%] w-full bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                    <div className="flex flex-col gap-2 mt-1">
                      <button
                        onClick={handleCronPermission}
                        className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex justify-center items-center gap-1.5 transition-all shadow cursor-pointer text-center"
                      >
                        ENVIAR INFORME TRIMESTRAL A GESTORIA
                      </button>

                      <button
                        onClick={() => { playSound('click'); setOpen(false) }}
                        className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex justify-center items-center transition-all border border-slate-700 cursor-pointer text-center"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Live speech dictation indicator */}
            {listening && (
              <div className="flex justify-start">
                <div className="bg-bg-800 border border-red-500/40 rounded-2xl px-4 py-3 w-full">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-400 font-semibold">METIS escuchando...</span>
                  </div>
                  {interim && <p className="text-xs text-white/50 italic mb-1">{interim}</p>}
                  {transcript && <p className="text-sm font-medium text-white/90">{transcript}</p>}
                </div>
              </div>
            )}

            {/* Error de micrófono visible para el usuario */}
            {error && !listening && (
              <div className="flex justify-start">
                <div className="bg-red-950/80 border border-red-500/40 rounded-2xl px-4 py-3 w-full space-y-3">
                  <div className="flex items-start gap-2">
                    <MicOff className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
                  </div>

                  {permissionDenied ? (
                    <>
                      <button
                        onClick={handleOpenMicSettings}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-100 text-xs font-bold hover:bg-red-500/30 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Activar micrófono (abrir ajustes)
                      </button>
                      <p className="text-[11px] text-red-300/70 leading-relaxed">
                        Se abrirán los ajustes del sistema/navegador. Activa el micrófono y permite el acceso a tu navegador.
                        Si sigue fallando, pulsa el candado de la barra de direcciones → Permisos → Micrófono → Permitir.
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => { reset(); start() }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-bg-800 border border-bg-700 text-white/80 text-xs font-semibold hover:text-white hover:border-cyan-500/40 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-bg-800 border border-bg-700 rounded-2xl px-4 py-3 flex gap-1.5">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          {messages.length <= 2 && !listening && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {[
                'Metis, presupuesta capó 100€ y paragolpes 120€ a 1234ABC',
                'Agendar cita para matrícula 5678DEF',
                '¿Cómo facturar un presupuesto?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-bg-800 border border-bg-700 text-white/70 hover:text-cyan-300 hover:border-cyan-500/40 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Indicador de voz activa + transcripción en vivo (feedback de que el micrófono OYE) */}
          {voiceInputActive && (
            <div className="px-4 pt-2 flex items-center gap-2 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${listening ? 'bg-red-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
              <span className={listening ? 'text-red-300' : 'text-amber-300'}>
                {listening ? 'Escuchando... di tu orden a METIS.' : 'Conectando el micrófono...'}
              </span>
              {(interim || transcript) && (
                <span className="text-white/50 italic truncate flex-1 text-right">“{interim || transcript}”</span>
              )}
            </div>
          )}

          {/* Bottom input area */}
          <div className="p-3 pr-16 border-t border-bg-700 flex gap-2 bg-bg-900/80">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
              placeholder={listening ? 'Escuchando voz...' : 'Habla o escribe tu orden a METIS...'}
              className="flex-1 bg-bg-800 border border-bg-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              aria-label="Enviar orden"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
