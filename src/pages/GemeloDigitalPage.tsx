import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Cpu,
  Smartphone,
  ShieldCheck,
  FileSpreadsheet,
  Car,
  FolderOpen,
  Calendar,
  Wrench,
  Receipt,
  FileCheck,
  QrCode,
  Send,
  Zap,
  Mic,
  Maximize,
  Minimize,
  Compass,
  Eye,
  Radio,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  ArrowLeft
} from 'lucide-react'
import { speakSpanish, stopSpanishSpeech, initSpanishVoice } from '../services/voiceService'

// ─────────────────────────────────────────────────────────────
// ESTRUCTURA DE NODOS DEL GEMELO DIGITAL
// ─────────────────────────────────────────────────────────────
interface NodeAction {
  id: string
  title: string
  desc: string
  icon: string
  badge?: string
  color: string
}

interface DigitalNode {
  id: string
  label: string
  sublabel: string
  category: 'core' | 'taller' | 'cliente' | 'fiscal' | 'ai'
  x: number // Posición en canvas 3D virtual (-400 a 400)
  y: number // Posición (-300 a 300)
  z: number // Profundidad (-200 a 200)
  color: string
  glowColor: string
  icon: any
  summary: string
  stats?: string
  actions: NodeAction[]
  roadmapSteps?: {
    step: string
    title: string
    color: string
    desc: string
    possibilities: string[]
  }[]
}

const NODES_DATA: DigitalNode[] = [
  {
    id: 'core',
    label: 'NÚCLEO GESTARIAN',
    sublabel: 'Motor Central de Reactividad & Cloud Supabase',
    category: 'core',
    x: 0,
    y: 0,
    z: 0,
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.8)',
    icon: Cpu,
    summary: 'Orquestador central en tiempo real. Gestiona la sincronización multidireccional de expedientes, licencias criptográficas y permisos por roles.',
    stats: 'Latencia < 25ms · 99.99% Uptime',
    actions: [
      { id: 'c1', title: 'Multitenant Isolation', desc: 'Aislamiento de bases de datos por taller y cifrado en tránsito.', icon: 'ShieldCheck', color: '#06b6d4' },
      { id: 'c2', title: 'Event Bus Reactivo', desc: 'Transmisión instantánea de estados entre móvil, tablet y PC.', icon: 'Zap', color: '#38bdf8' },
      { id: 'c3', title: 'Smart Caching & PWA', desc: 'Funcionamiento offline resiliente con auto-sincronización.', icon: 'Database', color: '#22d3ee' }
    ]
  },
  {
    id: 'expediente',
    label: 'EXPEDIENTE 360° & ROADMAP',
    sublabel: 'Ciclo de Vida Unificado del Vehículo',
    category: 'taller',
    x: -280,
    y: -140,
    z: 40,
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    icon: FolderOpen,
    summary: 'El corazón operativo del taller. El número de expediente NO cambia nunca, guiando el vehículo desde el presupuesto hasta la factura final.',
    stats: '5 Paradas Maestras en Línea de Tiempo',
    actions: [
      { id: 'e1', title: 'Trazabilidad Absoluta', desc: 'Asociación inseparable de cliente, vehículo, citas y documentos.', icon: 'FolderOpen', color: '#3b82f6' },
      { id: 'e2', title: 'Recepción Fotográfica', desc: 'Inspección visual con hasta 10 fotos HD y daños marcados.', icon: 'Car', color: '#60a5fa' },
      { id: 'e3', title: 'Control de Tiempos', desc: 'Métricas de permanencia en taller y eficiencia mecánica.', icon: 'Calendar', color: '#93c5fd' }
    ],
    roadmapSteps: [
      {
        step: '1. PRESUPUESTO',
        title: 'Presupuesto Inicial',
        color: '#06b6d4',
        desc: 'Cotización detallada con desglose de mano de obra y piezas. Estado Pendiente o Aceptado.',
        possibilities: ['Aceptación digital por cliente', 'Modificación de precios/líneas', 'Extracción asistida con METIS AI', 'Envío directo por WhatsApp / Email']
      },
      {
        step: '2. CITA',
        title: 'Acuerdo & Confirmación',
        color: '#3b82f6',
        desc: 'Pacto de fecha/hora (Aceptada) y confirmación física al llegar el coche al taller (Confirmada).',
        possibilities: ['Propuesta de mañana / tarde', 'Confirmación de llegada del coche', 'Asignación de elevador/box', 'Notificación automática al cliente']
      },
      {
        step: '3. EN TALLER',
        title: 'Reparación en Curso',
        color: '#f59e0b',
        desc: 'El vehículo está siendo intervenido por los mecánicos con reporte de avances fotográficos.',
        possibilities: ['Galería interactiva en vivo con Likes', 'Añadir piezas adicionales', 'Control de incidencias de repuestos', 'Finalizar trabajo']
      },
      {
        step: '4. FINALIZADO',
        title: 'Control de Calidad',
        color: '#10b981',
        desc: 'Trabajo concluido con éxito. El vehículo queda listo para la entrega y liquidación de pagos.',
        possibilities: ['Aviso de recogida al cliente', 'Inspección final de salida', 'Paso a cobro y liquidación']
      },
      {
        step: '5. FACTURACIÓN',
        title: 'Liquidación & Cierre',
        color: '#a855f7',
        desc: 'Cobros parciales con Recibo/Proforma y emisión de la Factura Oficial VERIFACTU al 100%.',
        possibilities: ['Emisión de Recibo de Abono (Particulares)', 'Factura Proforma FPAA0000 (Empresas)', 'Factura Oficial FAA0000', 'QR de Verifactu AEAT']
      }
    ]
  },
  {
    id: 'cliente_portal',
    label: 'PORTAL CLIENTE FINAL',
    sublabel: 'Acceso Web Instantáneo & 1 Toque',
    category: 'cliente',
    x: 280,
    y: -140,
    z: 60,
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.8)',
    icon: Smartphone,
    summary: 'Experiencia premium para el cliente sin instalar apps obligatorias. Login con Email + DNI y entrada instantánea con 1 toque.',
    stats: '0 Descargas Requeridas · 100% Responsive',
    actions: [
      { id: 'cp1', title: 'Acceso 1 Toque', desc: 'Identificación segura por DNI y auto-completado en segundo plano.', icon: 'Smartphone', color: '#10b981' },
      { id: 'cp2', title: 'Galería con "Me Gusta"', desc: 'El cliente aprueba y da feedback a las fotos de su vehículo en tiempo real.', icon: 'Eye', color: '#34d399' },
      { id: 'cp3', title: 'Descarga Directa A4', desc: 'Visor y descarga en PDF de presupuestos, recibos, proformas y facturas.', icon: 'Receipt', color: '#6ee7b7' }
    ]
  },
  {
    id: 'abonos_fiscal',
    label: 'ABONOS & VERIFACTU',
    sublabel: 'Cumplimiento Legal, Proformas & AEAT',
    category: 'fiscal',
    x: 280,
    y: 160,
    z: -30,
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.8)',
    icon: QrCode,
    summary: 'Diferenciación estricta entre Recibos a cuenta, Facturas Proforma correlativas FPAA0000 y Factura Oficial con código QR VERIFACTU reglamentario.',
    stats: 'RD 1007/2023 & Orden HAC/1177/2024',
    actions: [
      { id: 'af1', title: 'Recibos Particulares', desc: 'Justificante de anticipo sin efecto fiscal para personas físicas.', icon: 'Receipt', color: '#3b82f6' },
      { id: 'af2', title: 'Facturas Proforma FPAA', desc: 'Documento mercantil con desglose de IVA para empresas y organismos.', icon: 'FileSpreadsheet', color: '#f59e0b' },
      { id: 'af3', title: 'QR VERIFACTU', desc: 'Cotejo en sede electrónica de la AEAT con alusión normativa cursiva.', icon: 'QrCode', color: '#10b981' },
      { id: 'af4', title: 'Cierre Fiscal a Gestoría', desc: 'Exportación trimestral automática en A3, SAGE, CSV y PDF el día 10.', icon: 'Send', color: '#eab308' }
    ]
  },
  {
    id: 'metis_ai',
    label: 'METIS NEURAL AI',
    sublabel: 'Voz Bidireccional & Visión OCR',
    category: 'ai',
    x: -280,
    y: 160,
    z: -20,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    icon: Mic,
    summary: 'Copiloto inteligente del taller. Escucha por voz, reconoce matrículas con la cámara del móvil y asiste en la redacción de órdenes de trabajo.',
    stats: 'Voz a Texto Bidireccional + Gemini Vision OCR',
    actions: [
      { id: 'm1', title: 'Llamada de Voz en Vivo', desc: 'Conversación natural bidireccional manos libres para el mecánico.', icon: 'Radio', color: '#a855f7' },
      { id: 'm2', title: 'Reconocimiento de Matrículas', desc: 'Lectura instantánea de caracteres por cámara sin teclear.', icon: 'Zap', color: '#c084fc' },
      { id: 'm3', title: 'Asistente de Presupuestos', desc: 'Desglose automático de síntomas descritos por el cliente en conceptos.', icon: 'Sparkles', color: '#e879f9' }
    ]
  }
]

// ─────────────────────────────────────────────────────────────
// GUION CINEMATOGRÁFICO DE PRESENTACIÓN (DIRECTOR SPIELBERG)
// ─────────────────────────────────────────────────────────────
const CINEMATIC_SCRIPT = [
  {
    time: 0,
    targetNodeId: 'core',
    camera: { x: 0, y: 0, z: 1.1, rotX: 5, rotY: 0 },
    title: 'EL NÚCLEO REACTIVO DE GESTARIAN',
    speech: 'Bienvenidos al gemelo digital de GESTARIAN. En el centro de todo late el Núcleo Reactivo: una arquitectura en la nube de alta disponibilidad que conecta en tiempo real a mecánicos, jefes de taller, clientes y gestorías.'
  },
  {
    time: 12,
    targetNodeId: 'expediente',
    camera: { x: -280, y: -120, z: 1.3, rotX: 12, rotY: 15 },
    title: 'EXPEDIENTE 360° Y EL ROADMAP VITAL',
    speech: 'Avanzamos hacia el motor de trabajo: el Expediente 360. El número de expediente es único e inmutable. A través de un Roadmap de cinco paradas maestras, el vehículo avanza desde el presupuesto inicial hasta la entrega final sin perder ni un solo dato.'
  },
  {
    time: 26,
    targetNodeId: 'cliente_portal',
    camera: { x: 280, y: -120, z: 1.3, rotX: 10, rotY: -15 },
    title: 'PORTAL WEB DE CLIENTE: ACCESO 1 TOQUE',
    speech: 'Observen el Portal del Cliente. Sin necesidad de descargar aplicaciones complejas, el propietario del vehículo accede con su DNI y entra con un solo toque para ver fotos en directo, dar "Me gusta", aprobar citas y consultar sus documentos en alta definición.'
  },
  {
    time: 40,
    targetNodeId: 'abonos_fiscal',
    camera: { x: 280, y: 140, z: 1.3, rotX: -8, rotY: -12 },
    title: 'ABONOS PARCIALES Y VERIFACTU',
    speech: 'En el cuadrante fiscal, GESTARIAN marca la pauta legal: emite recibos de abono para particulares, facturas proforma para sociedades, y la factura oficial con el código QR de VERIFACTU según el Real Decreto 1007/2023, con envíos automáticos a la gestoría.'
  },
  {
    time: 54,
    targetNodeId: 'metis_ai',
    camera: { x: -280, y: 140, z: 1.3, rotX: -8, rotY: 12 },
    title: 'METIS: LA INTELIGENCIA ARTIFICIAL EN EL TALLER',
    speech: 'Y finalmente, METIS: la inteligencia artificial integrada. Mediante conversación de voz bidireccional y reconocimiento óptico de matrículas, el mecánico puede operar con las manos libres mientras trabaja en el vehículo.'
  },
  {
    time: 68,
    targetNodeId: 'core',
    camera: { x: 0, y: 0, z: 0.9, rotX: 0, rotY: 0 },
    title: 'GESTARIAN: EL FUTURO DE LA GESTIÓN AUTOMOTRIZ',
    speech: 'Todo conectado. Todo sincronizado. Todo bajo control. Esto es GESTARIAN, la evolución definitiva en gestión integral para talleres.'
  }
]

export function GemeloDigitalPage() {
  const navigate = useNavigate()

  // Estados de Interacción & Vista 3D
  const [selectedNode, setSelectedNode] = useState<DigitalNode>(NODES_DATA[0])
  const [activeRoadmapIndex, setActiveRoadmapIndex] = useState<number>(0)
  const [rotation, setRotation] = useState({ x: 12, y: -15 })
  const [zoom, setZoom] = useState(1.0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Modo Director / Presentación Cinematográfica
  const [isPlayingTour, setIsPlayingTour] = useState(false)
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [subtitlesText, setSubtitlesText] = useState('')
  const [subtitlesTitle, setSubtitlesTitle] = useState('')

  // Puntero 3D Virtual del Director
  const [virtualPointer, setVirtualPointer] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tourTimerRef = useRef<any>(null)

  // ─────────────────────────────────────────────────────────────
  // EFECTOS DE SONIDO SINTETIZADOS CON WEB AUDIO API
  // ─────────────────────────────────────────────────────────────
  const playSoundEffect = (type: 'beep' | 'laser' | 'whoosh' | 'success' | 'node') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      if (type === 'node') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      } else if (type === 'whoosh') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'laser') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(1200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18)
        gain.gain.setValueAtTime(0.09, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      } else if (type === 'success') {
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08) // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)
        osc1.start()
        osc2.start(ctx.currentTime + 0.08)
        osc1.stop(ctx.currentTime + 0.3)
        osc2.stop(ctx.currentTime + 0.3)
      }
    } catch (e) {
      // AudioContext fallback
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOCUCIÓN CON SERVICIO UNIVERSAL EN ESPAÑOL
  // ─────────────────────────────────────────────────────────────
  const speakNarration = (text: string) => {
    if (!voiceEnabled) return
    speakSpanish(text, {
      rate: 1.04,
      pitch: 1.0,
      volume: 1.0
    })
  }

  // ─────────────────────────────────────────────────────────────
  // CONTROLADOR DEL TOUR CINEMATOGRÁFICO
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlayingTour) {
      stopSpanishSpeech()
      setVirtualPointer(prev => ({ ...prev, visible: false }))
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current)
      return
    }

    const step = CINEMATIC_SCRIPT[currentScriptIndex]
    if (!step) {
      setIsPlayingTour(false)
      return
    }

    const targetNode = NODES_DATA.find(n => n.id === step.targetNodeId) || NODES_DATA[0]
    setSelectedNode(targetNode)
    setSubtitlesTitle(step.title)
    setSubtitlesText(step.speech)

    // Ajustar cámara suavemente
    setRotation({ x: step.camera.rotX, y: step.camera.rotY })
    setZoom(step.camera.z)

    // Posicionar puntero virtual
    setVirtualPointer({
      x: targetNode.x + window.innerWidth / 2,
      y: targetNode.y + window.innerHeight / 2,
      visible: true
    })

    playSoundEffect('whoosh')
    speakNarration(step.speech)

    // Tiempo de permanencia en este paso antes de pasar al siguiente
    const duration = currentScriptIndex === CINEMATIC_SCRIPT.length - 1 ? 14000 : 13500
    tourTimerRef.current = setTimeout(() => {
      if (currentScriptIndex < CINEMATIC_SCRIPT.length - 1) {
        setCurrentScriptIndex(prev => prev + 1)
      } else {
        setIsPlayingTour(false)
        playSoundEffect('success')
      }
    }, duration)

    return () => {
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current)
    }
  }, [isPlayingTour, currentScriptIndex])

  // Iniciar / Detener Tour
  const togglePlayTour = () => {
    playSoundEffect('laser')
    if (isPlayingTour) {
      setIsPlayingTour(false)
      stopSpanishSpeech()
    } else {
      // Desbloqueo explícito de SpeechSynthesis en navegadores móviles (iOS/Android)
      // La API requiere que la primera invocación ocurra síncronamente dentro del gesto de usuario (click)
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
          }
          // Warm-up de desbloqueo táctil
          const warmup = new SpeechSynthesisUtterance('')
          warmup.volume = 0
          window.speechSynthesis.speak(warmup)
        }
      } catch (e) {}

      setCurrentScriptIndex(0)
      setIsPlayingTour(true)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CANVAS PARTICULAS Y RAYOS DE CONEXIÓN
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Partículas de fondo
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.2
    }))

    let pulseTime = 0

    const render = () => {
      ctx.clearRect(0, 0, width, height)
      pulseTime += 0.025

      // 1. Dibujar partículas
      ctx.fillStyle = '#06b6d4'
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // 2. Dibujar líneas de datos cuánticas entre el Núcleo y los demás nodos
      const coreNode = NODES_DATA[0]
      const coreScreenX = width / 2 + coreNode.x * zoom
      const coreScreenY = height / 2 + coreNode.y * zoom

      NODES_DATA.slice(1).forEach(node => {
        const nodeScreenX = width / 2 + node.x * zoom
        const nodeScreenY = height / 2 + node.y * zoom

        ctx.beginPath()
        ctx.moveTo(coreScreenX, coreScreenY)
        ctx.lineTo(nodeScreenX, nodeScreenY)
        ctx.strokeStyle = node.glowColor
        ctx.lineWidth = selectedNode.id === node.id ? 2.5 : 1
        ctx.globalAlpha = selectedNode.id === node.id ? 0.85 : 0.25
        ctx.setLineDash([6, 6])
        ctx.lineDashOffset = -pulseTime * 20
        ctx.stroke()
        ctx.setLineDash([])

        // Paquete de energía que viaja
        const packetProgress = (pulseTime * 0.8 + node.x * 0.01) % 1
        const packetX = coreScreenX + (nodeScreenX - coreScreenX) * packetProgress
        const packetY = coreScreenY + (nodeScreenY - coreScreenY) * packetProgress

        ctx.beginPath()
        ctx.arc(packetX, packetY, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.9
        ctx.fill()
      })

      ctx.globalAlpha = 1.0
      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [zoom, selectedNode])

  // ─────────────────────────────────────────────────────────────
  // MANIPULACIÓN ESPACIAL (DRAG 3D)
  // ─────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlayingTour) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isPlayingTour) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setRotation(prev => ({
      x: Math.max(-45, Math.min(45, prev.x - dy * 0.2)),
      y: Math.max(-60, Math.min(60, prev.y + dx * 0.2))
    }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="fixed inset-0 bg-[#030712] text-white overflow-hidden select-none font-sans"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ perspective: 1200 }}
    >
      {/* Canvas de Conexiones de Datos y Partículas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Grid de fondo holográfico */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: `rotateX(${rotation.x * 0.5}deg) rotateY(${rotation.y * 0.5}deg)`
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABECERA SUPERIOR: CONTROLES DEL DIRECTOR & ACCIONES */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-40 p-4 sm:p-6 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
            title="Volver a Inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono text-[10px] font-black tracking-widest uppercase">
                DIGITAL TWIN v3.0
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-white">
              GEMELO DIGITAL GESTARIAN
            </h1>
          </div>
        </div>

        {/* Panel de Mandos: Modo Cine / Director & Cámara */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              voiceEnabled
                ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'bg-slate-900/80 border-slate-700 text-slate-500'
            }`}
            title={voiceEnabled ? 'Locución de voz activada' : 'Locución desactivada'}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              setRotation({ x: 12, y: -15 })
              setZoom(1.0)
              playSoundEffect('whoosh')
            }}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all active:scale-95 cursor-pointer"
            title="Centrar Vista 3D"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Botón Principal: MODO DIRECTOR / TOUR GUIADO */}
          <button
            onClick={togglePlayTour}
            className={`px-4 sm:px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
              isPlayingTour
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
            }`}
          >
            {isPlayingTour ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-slate-950" />}
            <span>{isPlayingTour ? 'DETENER TOUR' : 'INICIAR TOUR GUIADO'}</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ESCENARIO 3D INTERACTIVO (MURAL CENTRAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `scale(${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {NODES_DATA.map((node) => {
          const isSelected = selectedNode.id === node.id
          const NodeIcon = node.icon

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation()
                playSoundEffect('node')
                setSelectedNode(node)
              }}
              className="absolute pointer-events-auto cursor-pointer transition-all duration-300 group"
              style={{
                transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px)`,
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Tarjeta Holográfica del Nodo */}
              <div
                className={`w-60 sm:w-64 p-4 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ${
                  isSelected
                    ? 'scale-110 shadow-[0_0_35px_rgba(6,182,212,0.6)] bg-slate-900/95'
                    : 'bg-slate-950/75 hover:bg-slate-900/90 hover:scale-105 shadow-xl opacity-80 hover:opacity-100'
                }`}
                style={{
                  borderColor: isSelected ? node.color : `${node.color}55`,
                  boxShadow: isSelected ? `0 0 35px ${node.glowColor}` : 'none'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: `${node.color}25`, color: node.color }}
                  >
                    <NodeIcon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border"
                    style={{ borderColor: `${node.color}40`, color: node.color, backgroundColor: `${node.color}15` }}
                  >
                    {node.category.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-sm font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                  {node.label}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {node.sublabel}
                </p>

                {/* Micro indicador de acciones */}
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>{node.actions.length} Capacidades</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Anillo de pulso exterior si está seleccionado */}
              {isSelected && (
                <div
                  className="absolute -inset-2 rounded-[32px] border pointer-events-none animate-pulse"
                  style={{ borderColor: node.color }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. PUNTERO LÁSER 3D VIRTUAL DEL DIRECTOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {virtualPointer.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: virtualPointer.x, top: virtualPointer.y }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 animate-ping" />
              <div className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_20px_#06b6d4] absolute top-3 left-3 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PANEL INFERIOR / LATERAL: ÁRBOL DE POSIBILIDADES DINÁMICO */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 pointer-events-none flex flex-col items-center">
        {/* Banner de Subtítulos de Cine durante el Tour */}
        <AnimatePresence>
          {isPlayingTour && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="max-w-3xl w-full bg-black/85 border-2 border-cyan-500/60 rounded-3xl p-4 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.4)] backdrop-blur-xl mb-4 text-center pointer-events-auto"
            >
              <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono font-black uppercase tracking-widest mb-1">
                <Radio className="w-4 h-4 animate-pulse text-rose-500" />
                <span>NARRACIÓN EN DIRECTO · {subtitlesTitle}</span>
              </div>
              <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                "{subtitlesText}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tarjeta Expandida: Árbol de Acciones y Roadmap */}
        {!isPlayingTour && selectedNode && (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-4xl w-full bg-slate-900/90 border-2 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl pointer-events-auto"
            style={{ borderColor: selectedNode.color }}
          >
            {/* Cabecera del Nodo Seleccionado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${selectedNode.color}25`, color: selectedNode.color }}
                >
                  <selectedNode.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                    <span>{selectedNode.label}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">({selectedNode.sublabel})</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedNode.summary}</p>
                </div>
              </div>

              {selectedNode.stats && (
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs font-bold text-center">
                  {selectedNode.stats}
                </div>
              )}
            </div>

            {/* SECCIÓN 1: ROADMAP INTERACTIVO (SI EL NODO ES EXPEDIENTE) */}
            {selectedNode.roadmapSteps && (
              <div className="mt-4 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  <span>Línea de Tiempo del Roadmap (Haz clic en cada parada para desplegar posibilidades)</span>
                </div>

                {/* Botonera de Paradas */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {selectedNode.roadmapSteps.map((s, idx) => (
                    <button
                      key={s.step}
                      onClick={() => {
                        playSoundEffect('beep')
                        setActiveRoadmapIndex(idx)
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        activeRoadmapIndex === idx
                          ? 'bg-slate-800 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-102'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono font-bold" style={{ color: s.color }}>
                        {s.step}
                      </div>
                      <div className="text-xs font-black text-white truncate">{s.title}</div>
                    </button>
                  ))}
                </div>

                {/* Detalle de la Parada Activa y Árbol de Acciones */}
                {selectedNode.roadmapSteps[activeRoadmapIndex] && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <p className="text-xs text-slate-300 font-medium">
                      {selectedNode.roadmapSteps[activeRoadmapIndex].desc}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedNode.roadmapSteps[activeRoadmapIndex].possibilities.map((pos, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-cyan-200 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{pos}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN 2: ÁRBOL DE CAPACIDADES PRINCIPALES */}
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Árbol de Capacidades Ejecutables</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedNode.actions.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="text-xs font-black text-white flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: act.color }} />
                      <span>{act.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{act.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. INSTRUCCIÓN FLOTANTE DE NAVEGACIÓN 3D */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-24 left-6 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 font-mono pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        <span>Arrastra con el ratón para rotar el espacio 3D</span>
      </div>
    </div>
  )
}
