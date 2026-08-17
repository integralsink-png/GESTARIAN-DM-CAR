import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import type {
  Cliente,
  Vehiculo,
  Presupuesto,
  Concepto,
  Configuracion,
  Cita,
} from "../lib/types";
import { sendPresupuestoByEmail, generatePresupuestoPDF, getLocalidadFromCP } from "../lib/pdfGenerator";
import { fetchExpedienteFotos, saveExpedienteFoto } from "../lib/expedienteService";
import { shareDocumentoViaWhatsApp } from "../services/documentShareService";
import { getExpediente } from "../lib/utils";
import {
  PageHeader,
  Badge,
  EmptyState,
  MatriculaBadge,
} from "../components/UI";
import { getDropdownStaggerVariants, dropdownItemVariants, dropdownPanelVariants } from "../lib/dropdownAnimations";
import {
  Plus,
  Trash2,
  Mic,
  Printer,
  Check,
  X,
  FileText,
  Calendar,
  ArrowLeft,
  Search,
  Edit3,
  ImageIcon,
  Folder,
} from "lucide-react";
import { PresupuestoIcon, ExpedienteFolderIcon } from "../components/CustomIcons";
import { ImageViewer } from "../components/ImageViewer";
import { GlobalImageViewer } from "../components/GlobalImageViewer";
import { useVoice, parseVoiceToConceptos } from "../lib/useVoice";
import { useToast } from "../lib/ToastContext";

const IVA_RATE = 0.21;

function ConceptoMobileCard({
  concepto,
  onChange,
  onDelete,
}: {
  concepto: Concepto;
  onChange: (c: Concepto) => void;
  onDelete: () => void;
}) {
  const { listening, transcript, interim, supported, start, stop, reset } =
    useVoice();
  const [editingVoice, setEditingVoice] = useState(false);

  function finishVoiceEdit() {
    stop();
    const text = (transcript + " " + interim).trim();
    if (text) {
      const parsed = parseVoiceToConceptos(text);
      if (parsed.length > 0) {
        const p = parsed[0];
        onChange({
          ...concepto,
          descripcion: p.descripcion,
          cantidad: p.cantidad || concepto.cantidad,
          precio: p.precio || concepto.precio,
        });
      } else {
        onChange({ ...concepto, descripcion: text });
      }
    }
    reset();
    setEditingVoice(false);
  }

  function startVoiceEdit() {
    if (!supported) return;
    reset();
    setEditingVoice(true);
    start();
  }

  return (
    <div className="bg-white/90 rounded-lg p-3 border border-gray-300 space-y-2">
      <div className="flex items-start gap-2">
        <input
          type="text"
          placeholder="Descripción del trabajo..."
          value={concepto.descripcion}
          onChange={(e) =>
            onChange({ ...concepto, descripcion: e.target.value })
          }
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-gray-800 focus:outline-none min-w-0"
        />
        <button
          onClick={onDelete}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">
            Cantidad
          </label>
          <input
            type="number"
            value={concepto.cantidad === 0 ? "" : concepto.cantidad}
            placeholder="0"
            inputMode="decimal"
            onChange={(e) =>
              onChange({
                ...concepto,
                cantidad: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:border-gray-800 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">
            Precio €
          </label>
          <input
            type="number"
            value={concepto.precio === 0 ? "" : concepto.precio}
            placeholder="0"
            inputMode="decimal"
            onChange={(e) =>
              onChange({ ...concepto, precio: parseFloat(e.target.value) || 0 })
            }
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:border-gray-800 focus:outline-none"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-0.5">
            Importe
          </label>
          <p className="text-sm font-bold py-1.5">
            {(concepto.cantidad * concepto.precio).toFixed(2)} €
          </p>
        </div>
      </div>
      {supported && !editingVoice && (
        <button
          onClick={startVoiceEdit}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200"
        >
          <Mic className="w-3.5 h-3.5" /> Editar con voz
        </button>
      )}
      {editingVoice && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 py-2 bg-cyan-50 rounded-lg">
            <Mic className="w-4 h-4 text-cyan-600 animate-pulse" />
            <span className="text-xs text-cyan-700">
              {listening ? "Escuchando..." : "Procesando..."}
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[140px]">
              {transcript || interim}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={finishVoiceEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> Aplicar
            </button>
            <button
              onClick={() => {
                stop();
                reset();
                setEditingVoice(false);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PresupuestosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const navState = location.state as { clienteId?: string; vehiculoId?: string; openForm?: boolean; presupuestoId?: string } | null;
  const clienteIdFromNav = navState?.clienteId;
  const vehiculoIdFromNav = navState?.vehiculoId;
  const openFormFromNav = navState?.openForm;
  const presupuestoIdFromNav = navState?.presupuestoId;

  const [search, setSearch] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(clienteIdFromNav ?? null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [citadoId, setCitadoId] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [showForm, setShowForm] = useState(openFormFromNav ?? false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedVehiculoId, setSelectedVehiculoId] = useState("");
  const [conceptos, setConceptos] = useState<Concepto[]>([
    { descripcion: "", cantidad: 1, precio: 0 },
  ]);
  const defaultPresupuestoObs = "Puede acceder al seguimiento de su reparación en tiempo real online a través de nuestra aplicación donde también podrá descargar documentos.\nEl presente documento puede verse alterado por incidencias o nuevas circunstancias no contempladas en primera valoración\n\n";

  const [observaciones, setObservaciones] = useState(defaultPresupuestoObs);
  const [aplicarIva, setAplicarIva] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null);
  const [expedienteFotos, setExpedienteFotos] = useState<string[]>([]);
  const [showExpedienteViewer, setShowExpedienteViewer] = useState(false);
  const [expedienteViewerTitle, setExpedienteViewerTitle] = useState("Fotos del Expediente");
  const [showSentToast, setShowSentToast] = useState<string | null>(null);

  useEffect(() => {
    if (clienteIdFromNav) setSelectedClienteId(clienteIdFromNav);
    if (vehiculoIdFromNav) setSelectedVehiculoId(vehiculoIdFromNav);
    if (openFormFromNav && !presupuestoIdFromNav) setShowForm(true);

    if (presupuestoIdFromNav) {
      supabase
        .from("presupuestos")
        .select("*")
        .eq("id", presupuestoIdFromNav)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setEditingId(data.id);
            setSelectedClienteId(data.cliente_id);
            setSelectedVehiculoId(data.vehiculo_id ?? "");
            setConceptos(
              data.conceptos?.length
                ? data.conceptos
                : [{ descripcion: "", cantidad: 1, precio: 0 }],
            );
            setObservaciones(data.observaciones ?? "");
            setShowForm(true);
          }
        });
    }
  }, [clienteIdFromNav, vehiculoIdFromNav, openFormFromNav, presupuestoIdFromNav]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: showForm } }));
    return () => {
      window.dispatchEvent(new CustomEvent('gestarian-toggle-footer', { detail: { hide: false } }));
    };
  }, [showForm]);

  async function openExpedienteViewer(cliId?: string | null, vehId?: string | null, entityFotos: string[] = [], title: string = "Fotos del Expediente") {
    const fotos = await fetchExpedienteFotos(cliId, vehId, entityFotos)
    setExpedienteFotos(fotos)
    setExpedienteViewerTitle(title)
    setShowExpedienteViewer(true)
  }
  const { listening, transcript, reset } = useVoice();
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  // Función para que METIS hable
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1.1;
    // Buscar voz femenina en español si está disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoices = voices.filter((v) => v.lang.startsWith("es"));
    const femaleVoice = esVoices.find(
      (v) =>
        v.name.toLowerCase().includes("monica") ||
        v.name.toLowerCase().includes("paulina") ||
        v.name.toLowerCase().includes("female"),
    );
    if (femaleVoice) utterance.voice = femaleVoice;
    else if (esVoices.length > 0) utterance.voice = esVoices[0];

    window.speechSynthesis.speak(utterance);
  };

  // Pre-cargar voces
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    loadClientes();
    loadPresupuestos();
    loadCitas();
    loadConfig();
    if (clienteIdFromNav) {
      setSelectedClienteId(clienteIdFromNav);
    }
    function handleDictado(e: Event) {
      const conceptosNuevos = (e as CustomEvent<Concepto[]>).detail;
      if (!conceptosNuevos.length) return;
      setShowForm(true);
      setConceptos((prev) => {
        const vacias = prev.filter((c) => !c.descripcion.trim());
        const llenas = prev.filter((c) => c.descripcion.trim());
        return [...llenas, ...conceptosNuevos, ...vacias];
      });
    }
    window.addEventListener("metis-dictado-presupuesto", handleDictado);
    function handleOpenDocument(e: Event) {
      const { id, tipo } = (e as CustomEvent).detail;
      if (tipo === "presupuesto" && id) {
        supabase
          .from("presupuestos")
          .select("*")
          .eq("id", id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setEditingId(data.id);
              setSelectedClienteId(data.cliente_id);
              setSelectedVehiculoId(data.vehiculo_id ?? "");
              setConceptos(
                data.conceptos?.length
                  ? data.conceptos
                  : [{ descripcion: "", cantidad: 1, precio: 0 }],
              );
              setObservaciones(data.observaciones ?? "");
              setShowForm(true);
            }
          });
      }
    }
    window.addEventListener("gestarian-open-document", handleOpenDocument);
    return () => {
      window.removeEventListener("metis-dictado-presupuesto", handleDictado);
      window.removeEventListener("gestarian-open-document", handleOpenDocument);
    };
  }, []);

  useEffect(() => {
    if (selectedClienteId) {
      supabase
        .from("vehiculos")
        .select("*")
        .eq("cliente_id", selectedClienteId)
        .then(({ data }) => {
          const vehs = data ?? [];
          setVehiculos(vehs);
          if (vehs.length === 1) {
            setSelectedVehiculoId(vehs[0].id);
          } else {
            setSelectedVehiculoId("");
          }
        });
    } else {
      setVehiculos([]);
      setSelectedVehiculoId("");
    }
  }, [selectedClienteId]);



  async function loadClientes() {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre");
    setClientes(data ?? []);
  }

  async function loadPresupuestos() {
    const { data } = await supabase
      .from("presupuestos")
      .select("*")
      .order("created_at", { ascending: false });
    setPresupuestos((data ?? []).map(p => ({
      ...p,
      enviado_email_at: (p as any).enviado_email_at || localStorage.getItem(`presupuesto_${p.id}_email_at`),
      enviado_whatsapp_at: (p as any).enviado_whatsapp_at || localStorage.getItem(`presupuesto_${p.id}_wa_at`)
    })));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadCitas() {
    const { data } = await supabase.from("citas").select("*");
    setCitas(data ?? []);
  }

  // Efecto para abrir el presupuesto automáticamente si viene desde navegación
  useEffect(() => {
    if (presupuestoIdFromNav && presupuestos.length > 0 && !editingId) {
      const p = presupuestos.find(p => p.id === presupuestoIdFromNav);
      if (p) {
        editPresupuesto(p);
      }
    }
  }, [presupuestos, presupuestoIdFromNav, editingId]);

  async function loadData() {
    await Promise.all([
      loadClientes(),
      loadPresupuestos(),
      loadCitas(),
      loadConfig()
    ]);
  }

  async function loadConfig() {
    const { data } = await supabase
      .from("configuracion")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    setConfig(data);
  }

  const subtotal = conceptos.reduce((sum, c) => sum + c.cantidad * c.precio, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  async function handleSave() {
    if (!selectedClienteId) return;
    const cleanConceptos = conceptos.filter((c) => c.descripcion.trim());

    // Generar formato P3T260001 (P + [Trimestre]T + 2 dígitos del año + 4 dígitos de secuencia)
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYearSuffix = now.getFullYear().toString().slice(-2);
    const prefix = `P${quarter}T${currentYearSuffix}`;
    
    // Buscar la máxima secuencia de presupuestos del año en curso
    // Se contemplan ambos formatos: P261234 (antiguo) y P3T260001 (nuevo)
    let maxSeq = 0;
    let maxExpSeq = 0;

    presupuestos.forEach((p) => {
      let seq = 0;
      if (p.numero && p.numero.includes(`T${currentYearSuffix}`)) {
        const numPart = p.numero.substring(5);
        seq = parseInt(numPart, 10);
      } else if (p.numero && p.numero.startsWith(`P${currentYearSuffix}`)) {
        const numPart = p.numero.substring(3);
        seq = parseInt(numPart, 10);
      }
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }

      // Buscar también la secuencia máxima de expedientes
      if (p.expediente_id) {
        const expNumPart = p.expediente_id.substring(p.expediente_id.length - 4);
        const expSeq = parseInt(expNumPart, 10);
        if (!isNaN(expSeq) && expSeq > maxExpSeq) {
          maxExpSeq = expSeq;
        }
      } else {
        // Fallback a la secuencia del presupuesto si no tiene expediente_id
        if (!isNaN(seq) && seq > maxExpSeq) {
          maxExpSeq = seq;
        }
      }
    });

    const numero = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
    
    const cliente = clientes.find(c => c.id === selectedClienteId);
    let clienteNum = '';
    if (cliente) {
      if (cliente.numero) {
        clienteNum = cliente.numero.toString();
      } else {
        const sorted = [...clientes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const idx = sorted.findIndex(c => c.id === cliente.id);
        if (idx !== -1) clienteNum = (idx + 1).toString();
      }
    }
    const expediente_id = `${clienteNum}E${currentYearSuffix}${String(maxExpSeq + 1).padStart(4, '0')}`;

    if (editingId) {
      const { error } = await supabase
        .from("presupuestos")
        .update({
          cliente_id: selectedClienteId,
          vehiculo_id: selectedVehiculoId || null,
          conceptos: cleanConceptos,
          total: total,
          observaciones: observaciones || null,
        })
        .eq("id", editingId);
        
      if (error) {
        console.error("Error actualizando presupuesto:", error);
        showToast("Error al guardar presupuesto: " + error.message, "error");
        return;
      }
      showToast("PRESUPUESTO GUARDADO", "success");
    } else {
      const { error } = await supabase.from("presupuestos").insert({
        numero,
        expediente_id,
        cliente_id: selectedClienteId,
        vehiculo_id: selectedVehiculoId || null,
        conceptos: cleanConceptos,
        total,
        observaciones: observaciones || null,
        fotos: navState?.initialFotos || [],
        estado: "pendiente",
      });
      
      if (error) {
        console.error("Error creando presupuesto:", error);
        showToast("Error al guardar presupuesto: " + error.message, "error");
        return;
      }
      showToast("PRESUPUESTO GUARDADO", "success");
      resetForm();
    }
    await loadPresupuestos();
  }

  function resetForm() {
    setShowForm(false);
    setConceptos([{ descripcion: "", cantidad: 1, precio: 0 }]);
    setObservaciones(defaultPresupuestoObs);
    setSelectedClienteId("");
    setSelectedVehiculoId("");
    setEditingId(null);
  }

  function editPresupuesto(p: Presupuesto) {
    setEditingId(p.id);
    setSelectedClienteId(p.cliente_id);
    setSelectedVehiculoId(p.vehiculo_id ?? "");
    setConceptos(
      p.conceptos?.length
        ? p.conceptos
        : [{ descripcion: "", cantidad: 1, precio: 0 }],
    );
    setObservaciones(p.observaciones || defaultPresupuestoObs);
    setShowForm(true);
  }

  function clienteData(id: string) {
    return clientes.find((c) => c.id === id);
  }

  function vehiculoData(id: string | null) {
    if (!id) return null;
    return vehiculos.find((v) => v.id === id);
  }

  // Helper to mark form as edited
  const handleChangeConcepto = (next: Concepto[]) => {
    setConceptos(next);
  };
  const handleChangeObservaciones = (val: string) => {
    setObservaciones(val);
  };
  const handleChangeCliente = (val: string) => {
    setSelectedClienteId(val);
  };
  const handleChangeVehiculo = (val: string) => {
    setSelectedVehiculoId(val);
  };

  // METIS Conversacional Logic
  useEffect(() => {
    if (listening && transcript) {
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = setTimeout(() => {
        const text = transcript.toLowerCase();
        reset(); // Clear transcript so it doesn't re-trigger

        // Check intents
        if (
          text.includes("borra") ||
          text.includes("elimina") ||
          text.includes("quita")
        ) {
          // Intent: Remove concept
          // A very simple heuristic: find a concept that matches a word in the transcript
          const palabras = text
            .replace(/borra|elimina|quita/g, "")
            .trim()
            .split(/\s+/);
          if (palabras.length > 0) {
            let found = false;
            setConceptos((prev) => {
              const next = prev.filter((c) => {
                if (!c.descripcion) return true;
                const match = palabras.some(
                  (p) =>
                    p.length > 3 && c.descripcion.toLowerCase().includes(p),
                );
                if (match) found = true;
                return !match;
              });
              return next.length
                ? next
                : [{ descripcion: "", cantidad: 1, precio: 0 }];
            });
            if (found) speak("Concepto eliminado del presupuesto.");
            else speak("No he encontrado ese concepto para borrarlo.");
          }
        } else {
          // Default Intent: Add new concept
          const nuevos = parseVoiceToConceptos(text);
          if (nuevos.length > 0) {
            handleChangeConcepto([
              ...conceptos.filter((c) => c.descripcion.trim()),
              ...nuevos,
              ...conceptos.filter((c) => !c.descripcion.trim()),
            ]);
            const desc = nuevos[0].descripcion;
            speak(`He añadido ${desc} al presupuesto.`);
          } else {
            speak(
              "No te he entendido bien. Prueba a decir el concepto y el precio.",
            );
          }
        }
      }, 2500);
    }
    return () => {
      if (voiceTimerRef.current) clearTimeout(voiceTimerRef.current);
    };
  }, [transcript, listening, reset]);

  return (
    <div>
      {/* Cabecera unificada: Título PRESUPUESTOS (tamaño x1.2) con logo corporativo a la izquierda y botón VOLVER */}
      <PageHeader title="PRESUPUESTOS" titleClassName="text-[21.6px] md:text-[23px] text-xl font-bold">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Barra de búsqueda y botón de nuevo presupuesto */}
      {!showForm && !clienteIdFromNav && (
        <div className="mb-4 flex gap-4 items-center w-full">
          {showSearchInput ? (
            <div className="relative flex-1 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, matrícula o número de presupuesto..."
                className="flex-1 bg-bg-800 border border-bg-600 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  setSearch('');
                }}
                className="text-slate-400 hover:text-white p-2 shrink-0"
                title="Cerrar búsqueda"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-12 h-12 flex items-center justify-center text-slate-450 hover:text-white shrink-0 transition-transform active:scale-95 bg-transparent border-0 outline-none p-0"
                title="Buscar"
              >
                <Search className="w-8 h-8" />
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex-1 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 font-extrabold shadow-[0_0_12px_rgba(8,145,178,0.3)] gap-1.5 uppercase text-sm tracking-wider"
                title="Añadir nuevo presupuesto"
                aria-label="Añadir nuevo presupuesto"
              >
                <Plus className="w-5 h-5" /> NUEVO PRESUPUESTO
              </button>
            </>
          )}
        </div>
      )}

      {/* Hoja A4 del presupuesto */}
      {showForm && (
        <div className="mb-6">
          <div className="gestarian-paper rounded-lg shadow-2xl mx-auto max-w-[210mm] p-8 sm:p-12 print:shadow-none print:max-w-none">
            {/* Cabecera: logo + datos empresa + número */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-800">
              <div className="flex items-center gap-3">
                {config?.logo_bn ? (
                  <img
                    src={config.logo_bn}
                    alt="Logo"
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100 p-1 hidden md:block"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 hidden md:flex items-center justify-center text-white font-bold text-lg">
                    {config?.nombre_empresa?.charAt(0) ?? "D"}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">
                    {config?.nombre_empresa ?? "DM CAR"}
                  </h2>
                  <p className="text-xs gestarian-paper-muted">
                    {config?.cif ?? "B-12345678"}
                  </p>
                  <p className="text-xs gestarian-paper-muted">
                    {config?.direccion ?? ""}
                  </p>
                  {config?.telefono && (
                    <p className="text-xs gestarian-paper-muted">
                      Tel: {config.telefono}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-lg md:text-2xl font-bold uppercase tracking-wide">
                  Presupuesto
                </h3>
                <p className="text-sm gestarian-paper-muted mt-1">
                  {editingId
                    ? presupuestos.find((p) => p.id === editingId)?.numero
                    : `P${new Date().getFullYear().toString().slice(-2)}${String(presupuestos.filter(p => p.numero?.startsWith('P' + new Date().getFullYear().toString().slice(-2))).length + 1).padStart(4, "0")}`}
                </p>
                <p className="text-xs gestarian-paper-muted">
                  {new Date().toLocaleDateString("es-ES")}
                </p>
              </div>
            </div>

            {/* Datos cliente + vehículo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs gestarian-paper-muted uppercase font-semibold mb-1">
                  Cliente
                </p>
                <select
                  value={selectedClienteId}
                  onChange={(e) => handleChangeCliente(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2 focus:border-gray-800 focus:outline-none"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {selectedClienteId &&
                  (() => {
                    const c = clienteData(selectedClienteId);
                    return c ? (
                      <div className="text-xs gestarian-paper-muted space-y-0.5">
                        {c.dni && <p>DNI: {c.dni}</p>}
                        {c.direccion && <p>{c.direccion}</p>}
                        {c.cp && <p>CP: {c.cp} {getLocalidadFromCP(c.cp) ? `(${getLocalidadFromCP(c.cp)})` : ''}</p>}
                        {c.telefono && <p>Tel: {c.telefono}</p>}
                        {c.email && <p>{c.email}</p>}
                      </div>
                    ) : null;
                  })()}
              </div>
              <div>
                <p className="text-xs gestarian-paper-muted uppercase font-semibold mb-1">
                  Vehículo
                </p>
                <select
                  value={selectedVehiculoId}
                  onChange={(e) => handleChangeVehiculo(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2 focus:border-gray-800 focus:outline-none"
                  disabled={!selectedClienteId}
                >
                  <option value="">Sin vehículo</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.matricula} — {v.marca} {v.modelo ?? ""}
                    </option>
                  ))}
                </select>
                {selectedVehiculoId &&
                  (() => {
                    const v = vehiculoData(selectedVehiculoId);
                    return v ? (
                      <div className="text-xs gestarian-paper-muted space-y-0.5">
                        <p>Matrícula: {v.matricula}</p>
                        {v.marca && (
                          <p>
                            {v.marca} {v.modelo ?? ""}
                          </p>
                        )}
                        {v.anio && <p>Año: {v.anio}</p>}
                        {v.vin && <p>VIN: {v.vin}</p>}
                      </div>
                    ) : null;
                  })()}
              </div>
            </div>

            {/* Tabla conceptos — desktop */}
            <table className="w-full text-sm mb-4 hidden sm:table">
              <thead>
                <tr className="border-b-2 border-gray-800 text-left text-xs uppercase gestarian-paper-muted">
                  <th className="py-2 w-1/2">Descripción</th>
                  <th className="py-2 text-center w-16">Cant.</th>
                  <th className="py-2 text-right w-24">Precio</th>
                  <th className="py-2 text-right w-28">Importe</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map((c, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-1.5">
                      <input
                        type="text"
                        placeholder="Descripción del trabajo..."
                        value={c.descripcion}
                        onChange={(e) => {
                          const next = [...conceptos];
                          next[i] = { ...c, descripcion: e.target.value };
                          handleChangeConcepto(next);
                        }}
                        className="w-full bg-transparent border-0 px-1 py-1 text-sm focus:outline-none focus:bg-gray-100 rounded"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={c.cantidad === 0 ? "" : c.cantidad}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const next = [...conceptos];
                          next[i] = {
                            ...c,
                            cantidad: parseFloat(e.target.value) || 0,
                          };
                          handleChangeConcepto(next);
                        }}
                        className="w-14 bg-transparent border-0 px-1 py-1 text-sm text-center focus:outline-none focus:bg-gray-100 rounded"
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        value={c.precio === 0 ? "" : c.precio}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const next = [...conceptos];
                          next[i] = {
                            ...c,
                            precio: parseFloat(e.target.value) || 0,
                          };
                          handleChangeConcepto(next);
                        }}
                        className="w-20 bg-transparent border-0 px-1 py-1 text-sm text-right focus:outline-none focus:bg-gray-100 rounded"
                      />
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {(c.cantidad * c.precio).toFixed(2)} €
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() =>
                          handleChangeConcepto(
                            conceptos.filter((_, idx) => idx !== i),
                          )
                        }
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tarjetas conceptos — móvil */}
            <div className="sm:hidden mb-4 space-y-3">
              {conceptos.map((c, i) => (
                <ConceptoMobileCard
                  key={i}
                  concepto={c}
                  onChange={(updated) => {
                    const next = [...conceptos];
                    next[i] = updated;
                    handleChangeConcepto(next);
                  }}
                  onDelete={() =>
                    handleChangeConcepto(
                      conceptos.filter((_, idx) => idx !== i),
                    )
                  }
                />
              ))}
            </div>

            <button
              onClick={() =>
                handleChangeConcepto([
                  ...conceptos,
                  { descripcion: "", cantidad: 1, precio: 0 },
                ])
              }
              className="flex items-center gap-1 text-sm gestarian-paper-muted hover:text-gray-800 mb-4"
            >
              <Plus className="w-4 h-4" /> Añadir línea
            </button>

            {/* El Panel de dictado clásico se ha eliminado a favor del Icono Flotante METIS */}

            {/* Totales */}
            {(() => {
              const subtotal = conceptos.reduce((acc, c) => acc + (c.cantidad * c.precio), 0);
              const iva = aplicarIva ? subtotal * IVA_RATE : 0;
              const total = subtotal + iva;

              return (
                <div className="flex justify-end mb-6">
                  <div className="w-64 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="gestarian-paper-muted">Base imponible</span>
                      <span className="font-medium">{subtotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none gestarian-paper-muted hover:text-gray-800">
                        <input
                          type="checkbox"
                          checked={aplicarIva}
                          onChange={(e) => setAplicarIva(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-400 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span>IVA (21%)</span>
                      </label>
                      <span className="font-medium">{iva.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1.5">
                      <span>TOTAL</span>
                      <span>{total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Observaciones */}
            <div className="mb-6">
              <p className="text-xs gestarian-paper-muted uppercase font-semibold mb-1">
                Observaciones
              </p>
              <textarea
                value={observaciones}
                onChange={(e) => handleChangeObservaciones(e.target.value)}
                placeholder="Notas internas..."
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
              />
            </div>

            {/* Botones de acción inferiores con la distribución unificada */}
            <div className="border-t-2 border-gray-800 pt-6 space-y-6">
              {(() => {
                const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null
                const cliente = selectedClienteId ? clienteData(selectedClienteId) : null
                const veh = selectedVehiculoId ? vehiculoData(selectedVehiculoId) : null

                const emailSentAt = currentP?.enviado_email_at
                const whatsappSentAt = currentP?.enviado_whatsapp_at

                const formatSentDate = (isoStr: string) => {
                  try {
                    const d = new Date(isoStr)
                    return `${d.toLocaleDateString('es-ES')} A LAS ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  } catch {
                    return isoStr
                  }
                }

                return (
                  <div className="space-y-6">
                    {/* DOS LÍNEAS DE ACCIONES CENTRADAS */}
                    <div className="space-y-4">
                      {/* LÍNEA 1: EMAIL | IMÁGENES | IMPRIMIR | WHATSAPP */}
                      <div className="flex items-center justify-center gap-3 sm:gap-5">
                        {/* 1. EMAIL (Flotante sin recuadro) */}
                        {!emailSentAt && (
                          <button
                            onClick={async () => {
                              const numero = currentP?.numero || "BORRADOR"
                              const numExpediente = getExpediente(currentP || {}, cliente, clientes)
                              await sendPresupuestoByEmail({ numero, conceptos, observaciones, aplicarIva }, cliente, veh, config, numExpediente)
                              if (currentP?.id) {
                                const nowIso = new Date().toISOString()
                                localStorage.setItem(`presupuesto_${currentP.id}_email_at`, nowIso)
                                await supabase.from('presupuestos').update({ enviado_email_at: nowIso }).eq('id', currentP.id)
                                await loadPresupuestos()
                              }
                              playSuccessSound()
                              setShowSentToast("ENVIADO!!")
                              setTimeout(() => setShowSentToast(null), 3500)
                            }}
                            className="p-1 hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="ENVIAR POR EMAIL"
                            aria-label="ENVIAR POR EMAIL"
                          >
                            <svg className="w-16 h-16 sm:w-20 sm:h-20 text-[#ea4335] drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                        )}

                        {/* 2. IMÁGENES (Muestra TODAS las fotos del expediente) */}
                        <button
                          onClick={() => {
                            const cId = selectedClienteId || currentP?.cliente_id
                            const vId = selectedVehiculoId || currentP?.vehiculo_id
                            const eFotos = currentP?.fotos || []
                            openExpedienteViewer(cId, vId, eFotos, `Expediente Presupuesto ${currentP?.numero || ''}`)
                          }}
                          className="w-16 h-16 rounded-2xl bg-slate-800 text-amber-400 border border-slate-700 hover:bg-slate-700 flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
                          title="IMÁGENES DEL EXPEDIENTE"
                          aria-label="IMÁGENES DEL EXPEDIENTE"
                        >
                          <ImageIcon className="w-8 h-8 text-amber-400" />
                        </button>

                        {/* 3. IMPRIMIR */}
                        <button
                          onClick={() => window.print()}
                          className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
                          title="IMPRIMIR"
                          aria-label="IMPRIMIR"
                        >
                          <Printer className="w-8 h-8 text-slate-300" />
                        </button>

                        {/* 4. WHATSAPP (Bocadillo verde) */}
                        {!whatsappSentAt && (
                          <button
                            onClick={async () => {
                              try {
                                const numStr = currentP?.numero || 'BORRADOR'
                                const numExpediente = getExpediente(currentP || {}, cliente, clientes)
                                const doc = generatePresupuestoPDF({ numero: numStr, conceptos, observaciones, aplicarIva }, cliente, veh, config, numExpediente)
                                const pdfBlob = doc.output('blob')

                                const res = await shareDocumentoViaWhatsApp({
                                  tipo: 'presupuesto',
                                  numero: numStr,
                                  pdfBlob,
                                  cliente,
                                  matricula: veh?.matricula,
                                })

                                if (res.success) {
                                  if (currentP?.id) {
                                    const nowIso = new Date().toISOString()
                                    localStorage.setItem(`presupuesto_${currentP.id}_wa_at`, nowIso)
                                    const { error: dbError } = await supabase.from('presupuestos').update({ enviado_whatsapp_at: nowIso }).eq('id', currentP.id)
                                    if (dbError) {
                                      alert('Error guardando en la base de datos: ' + dbError.message + '\n(Se guardará localmente en el dispositivo actual)')
                                    }
                                    await loadPresupuestos()
                                    playSuccessSound()
                                    setShowSentToast("ENVIADO!!")
                                    setTimeout(() => setShowSentToast(null), 3500)
                                  }
                                }
                                } catch (e: any) {
                                  console.error('[WhatsApp Presupuesto Error]', e)
                                  alert('No se ha podido preparar el documento para WhatsApp: ' + e.message)
                                }
                            }}
                            className="hover:scale-110 transition-transform active:scale-95 shrink-0"
                            title="ENVIAR POR WHATSAPP"
                            aria-label="ENVIAR POR WHATSAPP"
                          >
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                              <svg className="w-full h-full drop-shadow-md" viewBox="0 0 48 48" fill="none">
                                <path
                                  d="M24 4C12.95 4 4 12.95 4 24C4 27.84 5.08 31.43 6.96 34.5L4 44L13.82 41.13C16.76 42.97 20.26 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4Z"
                                  fill="#25D366"
                                />
                              </svg>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="absolute inset-0 m-auto w-8 h-8 sm:w-10 sm:h-10 text-white">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                              </svg>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* ESTADOS DE ENVÍO */}
                      {(emailSentAt || whatsappSentAt) && (
                        <div className="flex flex-col items-center justify-center gap-2 mt-4">
                          {whatsappSentAt && (
                            <div className="w-full max-w-sm text-center font-bold text-green-400 bg-green-500/10 px-4 py-3 rounded-xl border-2 border-green-500 shadow-sm uppercase">
                              ENVIADO POR WHATSAPP EL {formatSentDate(whatsappSentAt)}
                            </div>
                          )}
                          {emailSentAt && (
                            <div className="w-full max-w-sm text-center font-bold text-green-400 bg-green-500/10 px-4 py-3 rounded-xl border-2 border-green-500 shadow-sm uppercase">
                              ENVIADO POR EMAIL EL {formatSentDate(emailSentAt)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LÍNEA 2: GUARDAR | EDITAR | VOLVER */}
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase shadow transition-all active:scale-95"
                        >
                          GUARDAR
                        </button>

                        <button
                          onClick={() => {
                            const firstInput = document.querySelector('.gestarian-paper input') as HTMLInputElement
                            if (firstInput) firstInput.focus()
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 shadow transition-all active:scale-95 flex items-center justify-center"
                          title="EDITAR"
                          aria-label="EDITAR"
                        >
                          <Edit3 className="w-5 h-5 text-cyan-400" />
                        </button>

                        <button
                          onClick={resetForm}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs tracking-wider uppercase shadow transition-all active:scale-95"
                        >
                          VOLVER
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Listado agrupado por Clientes */}
      {!showForm && (
        <motion.div layout className="space-y-3">
          {(() => {
            const query = search.trim().toLowerCase();

            // Filtrar clientes con sus presupuestos
            const clientesConPresupuestos = clientes.map(cliente => {
              const clientPresups = presupuestos.filter(p => p.cliente_id === cliente.id);
              return { cliente, clientPresups };
            }).filter(({ cliente, clientPresups }) => {
              if (clienteIdFromNav && cliente.id !== clienteIdFromNav) return false;
              if (!query && clientPresups.length === 0) return false;
              if (!query) return true;

              const nombreMatch = (cliente.nombre || '').toLowerCase().includes(query);
              const presupMatch = clientPresups.some(p => {
                const numMatch = p.numero?.toLowerCase().includes(query);
                const veh = p.vehiculo_id ? vehiculos.find(v => v.id === p.vehiculo_id) : null;
                const matMatch = veh?.matricula?.toLowerCase().includes(query);
                return numMatch || matMatch;
              });

              return nombreMatch || presupMatch;
            });

            if (clientesConPresupuestos.length === 0) {
              return (
                <EmptyState
                  icon={<FileText className="w-12 h-12 text-cyan-400" />}
                  title={clienteIdFromNav ? "Sin presupuestos para este cliente" : "No se encontraron presupuestos"}
                  subtitle="Crea un presupuesto o intenta otra búsqueda"
                />
              );
            }

            // Ordenar alfabéticamente por nombre de cliente
            clientesConPresupuestos.sort((a, b) =>
              (a.cliente.nombre || '').localeCompare(b.cliente.nombre || '', 'es', { sensitivity: 'base' })
            );

            return clientesConPresupuestos.map(({ cliente, clientPresups }) => {
              const isExpanded = expandedClienteId === cliente.id;
              const nombreDisplay = cliente.nombre || 'Cliente sin nombre';

              return (
                <motion.div
                  layout
                  key={cliente.id}
                  transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
                  className={`rounded-2xl border transition-all duration-300 shadow-md ${
                    isExpanded
                      ? 'border-cyan-500/60 bg-bg-800 ring-1 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] z-10'
                      : expandedClienteId
                      ? 'border-bg-700/60 bg-bg-800/70 opacity-70 brightness-[0.70]'
                      : 'border-bg-700 bg-bg-800/90 hover:border-bg-600'
                  }`}
                >
                  {/* Fila del cliente: solo el nombre completo del cliente */}
                  <div
                    onClick={() => setExpandedClienteId(isExpanded ? null : cliente.id)}
                    className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-bg-700/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="font-bold text-white text-2xl leading-tight truncate">
                        {nombreDisplay}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30 min-w-[28px] text-center">
                        {clientPresups.length}
                      </span>
                    </div>
                  </div>

                  {/* Historial desplegable de presupuestos del cliente con animación fluida y stagger (1.5s total) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="dropdown"
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        variants={dropdownPanelVariants}
                        className="overflow-hidden"
                      >
                        <motion.div
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          variants={getDropdownStaggerVariants(clientPresups.length, 1.5)}
                          className="p-3 bg-bg-950/80 border-t border-bg-700/80 space-y-2.5"
                        >
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 text-center">Historial de presupuestos</p>
                          {clientPresups.map((p, index) => {
                            const veh = p.vehiculo_id ? vehiculos.find(x => x.id === p.vehiculo_id) : null;
                            const estadoColor = p.estado === 'aceptado' ? 'green' : p.estado === 'rechazado' ? 'red' : 'yellow';

                            return (
                              <motion.div
                                key={p.id}
                                variants={dropdownItemVariants}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editPresupuesto(p);
                                }}
                                className="rounded-xl border border-bg-700 bg-bg-900 p-3 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col gap-3 justify-center"
                              >
                                {/* Línea 1: Expediente, Fecha, Estado y Acciones centradas */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                                  <div className="flex items-center justify-center gap-3">
                                    <span className="text-sm font-mono text-cyan-400 font-bold">
                                      {getExpediente(p, cliente, clientes)}
                                    </span>
                                    <span className="text-xs text-slate-300 font-semibold">
                                      {new Date(p.created_at).toLocaleDateString('es-ES')}
                                    </span>
                                    <Badge text={p.estado} color={estadoColor} />
                                  </div>
                                  
                                  <div className="flex items-center justify-center gap-3">
                                    {(() => {
                                      // Restricción: solo se puede dar cita una vez por presupuesto
                                      const cita = citas.find(c => c.presupuesto_id === p.id);
                                      
                                      if (p.estado !== 'aceptado') {
                                        return (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', p.id);
                                              await loadPresupuestos();
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.2)] shrink-0"
                                          >
                                            ACEPTAR
                                          </button>
                                        );
                                      }

                                      if (cita) {
                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate('/citas');
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.2)] shrink-0"
                                          >
                                            CITADO
                                          </button>
                                        );
                                      }

                                      const isCitado = citadoId === p.id;
                                      return (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCitadoId(p.id);
                                            setTimeout(() => {
                                              setCitadoId(null);
                                              navigate('/citas', {
                                                state: { presupuestoId: p.id, clienteId: p.cliente_id, vehiculoId: p.vehiculo_id }
                                              });
                                            }, 500);
                                          }}
                                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 ${isCitado ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)] animate-pulse'}`}
                                        >
                                          {isCitado ? 'CITADO' : <><Calendar className="w-3.5 h-3.5 mr-1" /> CITAR</>}
                                        </button>
                                      );
                                    })()}

                                    {/* Botón Ver Presupuesto: Icono flotante P en hoja A4 (x2) sin envoltorio con animación */}
                                    <motion.button
                                      whileHover={{ scale: 1.12 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        editPresupuesto(p);
                                      }}
                                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0"
                                      title="Ver Presupuesto"
                                      aria-label="Ver Presupuesto"
                                    >
                                      <PresupuestoIcon className="w-12 h-12" />
                                    </motion.button>

                                    {/* Botón Ver Expediente: Carpeta amarilla con una E adentro (x3) con animación */}
                                    <motion.button
                                      whileHover={{ scale: 1.12 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/expedientes', { state: { search: cliente.nombre || veh?.matricula || '' } });
                                      }}
                                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0"
                                      title="Ver Expediente"
                                      aria-label="Ver Expediente"
                                    >
                                      <ExpedienteFolderIcon className="w-12 h-12" />
                                    </motion.button>
                                  </div>
                                </div>

                                {/* Línea 2: Marca y modelo, Matrícula */}
                                {veh && (
                                  <div className="flex items-center justify-between mt-1 border-t border-bg-700/50 pt-2">
                                    <span className="text-xs text-slate-400 uppercase font-medium truncate pr-2">
                                      {veh.marca} {veh.modelo}
                                    </span>
                                    <MatriculaBadge matricula={veh.matricula} />
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            });
          })()}
        </motion.div>
      )}

      <ImageViewer
        open={!!viewerMatricula}
        matricula={viewerMatricula ?? ""}
        onClose={() => setViewerMatricula(null)}
      />

      <GlobalImageViewer
        isOpen={showExpedienteViewer}
        onClose={() => setShowExpedienteViewer(false)}
        images={expedienteFotos}
        onAddImage={async (dataUrl) => {
          const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null
          const cId = selectedClienteId || currentP?.cliente_id
          const vId = selectedVehiculoId || currentP?.vehiculo_id
          await saveExpedienteFoto(dataUrl, cId, vId)
          setExpedienteFotos(prev => [...prev, dataUrl])
        }}
        onDeleteImage={async (index) => {
          setExpedienteFotos(prev => prev.filter((_, i) => i !== index))
        }}
        title={expedienteViewerTitle}
      />
      {showSentToast && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
          <div className="bg-emerald-600 text-white font-black text-xl sm:text-2xl px-10 py-5 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.7)] border-4 border-white animate-bounce flex items-center gap-4">
            <span className="text-3xl sm:text-4xl">✓</span>
            <span>{showSentToast}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


