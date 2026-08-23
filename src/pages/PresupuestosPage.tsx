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
import { getExpediente, formatDateShort } from "../lib/utils";
import {
  PageHeader,
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
  ArrowLeft,
  Search,
  UserPlus,
  ImageIcon,
  FolderOpen,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { PresupuestoIcon, ExpedienteFolderIcon } from "../components/CustomIcons";
import { GlobalImageViewer } from "../components/GlobalImageViewer";
import { useVoice, parseVoiceToConceptos } from "../lib/useVoice";
import { useToast } from "../lib/ToastContext";

const IVA_RATE = 0.21;

function ConceptoMobileCard({
  concepto,
  onChange,
  onDelete,
  animarDescripcion,
  animarCantidad,
  animarPrecio,
  readOnly,
}: {
  concepto: Concepto;
  onChange: (c: Concepto) => void;
  onDelete: () => void;
  animarDescripcion?: boolean;
  animarCantidad?: boolean;
  animarPrecio?: boolean;
  readOnly?: boolean;
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

  if (readOnly) {
    return (
      <div className="bg-white rounded-2xl p-3.5 border border-gray-300 shadow-sm space-y-2">
        <div className="text-sm font-bold text-gray-900">
          {concepto.descripcion}
        </div>
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-100">
          <div className="text-gray-600">
            <span className="font-semibold text-gray-800">Cant:</span> {concepto.cantidad}
          </div>
          <div className="text-gray-600">
            <span className="font-semibold text-gray-800">Precio:</span> {concepto.precio.toFixed(2)} €
          </div>
          <div className="font-black text-blue-900 text-sm">
            {(concepto.cantidad * concepto.precio).toFixed(2)} €
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-300 shadow-sm space-y-2">
      {/* Fila descripción */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Descripción del trabajo..."
          value={concepto.descripcion}
          onChange={(e) =>
            onChange({ ...concepto, descripcion: e.target.value })
          }
          className={`flex-1 bg-white !bg-white text-black !text-black placeholder:text-gray-400 border rounded-xl px-3 py-2 text-sm focus:border-blue-700 focus:outline-none min-w-0 font-medium transition-all ${animarDescripcion
              ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
              : "border-gray-300"
            }`}
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
          <label className="text-[10px] text-black !text-black uppercase font-bold block mb-0.5">
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
            className={`w-full bg-white !bg-white text-black !text-black placeholder:text-gray-400 border rounded-xl px-2 py-1.5 text-sm text-center focus:border-blue-700 focus:outline-none font-bold transition-all ${animarCantidad
                ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                : "border-gray-300"
              }`}
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-black !text-black uppercase font-bold block mb-0.5">
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
            className={`w-full bg-white !bg-white text-black !text-black placeholder:text-gray-400 border rounded-xl px-2 py-1.5 text-sm text-center focus:border-blue-700 focus:outline-none font-bold transition-all ${animarPrecio
                ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                : "border-gray-300"
              }`}
          />
        </div>
        <div className="flex-shrink-0">
          <label className="text-[10px] text-black !text-black uppercase font-bold block mb-0.5">
            Importe
          </label>
          <div className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white !bg-white text-black !text-black font-black text-sm text-center shadow-inner">
            {(concepto.cantidad * concepto.precio).toFixed(2)} €
          </div>
        </div>
      </div>
      {supported && !editingVoice && (
        <button
          onClick={startVoiceEdit}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-blue-400 text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95"
        >
          <Mic className="w-4 h-4 text-blue-600" /> <span>EDITAR CON VOZ</span>
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

type SortOption = 'nuevos' | 'antiguos' | 'pendientes' | 'confirmados' | 'cerrados' | 'nombre';

const SORT_LABELS: Record<SortOption, string> = {
  nuevos: 'Más nuevos',
  antiguos: 'Más antiguos',
  pendientes: 'Pendientes',
  confirmados: 'Confirmados',
  cerrados: 'Cerrados',
  nombre: 'Por nombre',
};

export function PresupuestosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const navState = location.state as { clienteId?: string; vehiculoId?: string; openForm?: boolean; presupuestoId?: string; initialFotos?: string[] } | null;
  const clienteIdFromNav = navState?.clienteId;
  const vehiculoIdFromNav = navState?.vehiculoId;
  const openFormFromNav = navState?.openForm;
  const presupuestoIdFromNav = navState?.presupuestoId;

  const [search, setSearch] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOption>('nuevos');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(clienteIdFromNav ?? null);
  const [allVehiculos, setAllVehiculos] = useState<Record<string, Vehiculo>>({});
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [showForm, setShowForm] = useState(openFormFromNav ?? false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [clienteSearchText, setClienteSearchText] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
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
  const [modalEnvioOpen, setModalEnvioOpen] = useState(false);
  const [showSentToast, setShowSentToast] = useState<string | null>(null);
  const [animarEnvioPostSave, setAnimarEnvioPostSave] = useState(false);

  const handleVolver = () => {
    if (navState) {
      navigate(-1);
    } else {
      resetForm();
    }
  };

  useEffect(() => {
    if (clienteIdFromNav) {
      setSelectedClienteId(clienteIdFromNav);
      setExpandedClienteId(clienteIdFromNav);
    }
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
    loadReparaciones();
    loadAllVehiculos();
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
          setAllVehiculos((prev) => {
            const next = { ...prev };
            vehs.forEach((v: Vehiculo) => { next[v.id] = v; });
            return next;
          });
          if (vehiculoIdFromNav && vehs.some((v) => v.id === vehiculoIdFromNav)) {
            setSelectedVehiculoId(vehiculoIdFromNav);
          } else if (vehs.length === 1) {
            setSelectedVehiculoId(vehs[0].id);
          } else {
            setSelectedVehiculoId((prev) => (vehs.some((v) => v.id === prev) ? prev : ""));
          }
        });
    } else {
      setVehiculos([]);
      setSelectedVehiculoId("");
    }
  }, [selectedClienteId, vehiculoIdFromNav]);



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

  async function loadReparaciones() {
    const { data } = await supabase.from("reparaciones").select("*");
    setReparaciones(data ?? []);
  }

  async function loadAllVehiculos() {
    const { data } = await supabase.from("vehiculos").select("*");
    const map: Record<string, Vehiculo> = {};
    (data ?? []).forEach((v: Vehiculo) => {
      map[v.id] = v;
    });
    setAllVehiculos(map);
  }

  async function loadFacturas() {
    const { data } = await supabase.from("facturas").select("id, numero, vehiculo_id, cliente_id, reparacion_id, created_at");
    setFacturas(data ?? []);
  }

  async function loadData() {
    await Promise.all([
      loadClientes(),
      loadPresupuestos(),
      loadCitas(),
      loadReparaciones(),
      loadAllVehiculos(),
      loadFacturas(),
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
      const { data: updatedPres, error } = await supabase
        .from("presupuestos")
        .update({
          cliente_id: selectedClienteId,
          vehiculo_id: selectedVehiculoId || null,
          conceptos: cleanConceptos,
          total: total,
          observaciones: observaciones || null,
        })
        .eq("id", editingId)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error actualizando presupuesto:", error);
        showToast("Error al guardar presupuesto: " + error.message, "error");
        return;
      }
      playSuccessSound();
      setShowSentToast("Presupuesto guardado, puede enviarlo al cliente por Email o Watsapp.");
      setAnimarEnvioPostSave(false);
      setTimeout(() => {
        setShowSentToast(null);
        setAnimarEnvioPostSave(true);
      }, 5000);
      if (updatedPres?.id) setEditingId(updatedPres.id);
    } else {
      const { data: newPres, error } = await supabase.from("presupuestos").insert({
        numero,
        expediente_id,
        cliente_id: selectedClienteId,
        vehiculo_id: selectedVehiculoId || null,
        conceptos: cleanConceptos,
        total,
        observaciones: observaciones || null,
        fotos: navState?.initialFotos || [],
        estado: "pendiente",
      }).select().maybeSingle();

      if (error) {
        console.error("Error creando presupuesto:", error);
        showToast("Error al guardar presupuesto: " + error.message, "error");
        return;
      }
      playSuccessSound();
      setShowSentToast("Presupuesto guardado, puede enviarlo al cliente por Email o Watsapp.");
      setAnimarEnvioPostSave(false);
      setTimeout(() => {
        setShowSentToast(null);
        setAnimarEnvioPostSave(true);
      }, 5000);
      if (newPres?.id) {
        setEditingId(newPres.id);
      }
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
    return allVehiculos[id] || vehiculos.find((v) => v.id === id) || null;
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

      {/* Barra de búsqueda, botón de nuevo presupuesto centrado y desplegable de orden */}
      {!showForm && !clienteIdFromNav && (
        <div className="mb-4 flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full">
            {/* 1. Lupa a la izquierda */}
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 shrink-0 ${
                showSearchInput
                  ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/60 shadow-[0_0_12px_rgba(8,145,178,0.4)]'
                  : 'text-slate-400 hover:text-white bg-bg-800/80 border border-slate-700 hover:bg-bg-750'
              }`}
              title={showSearchInput ? "Ocultar búsqueda" : "Buscar presupuestos"}
              aria-label="Buscar"
            >
              <Search className="w-6 h-6" />
            </button>

            {/* 2. Botón de nuevo presupuesto centrado en la pantalla (a la derecha de la lupa) */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="w-full max-w-xs h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 font-black shadow-[0_0_12px_rgba(8,145,178,0.3)] gap-2 uppercase text-xs sm:text-sm tracking-wider px-3"
                title="Añadir nuevo presupuesto"
                aria-label="Añadir nuevo presupuesto"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span className="truncate">NUEVO PRESUPUESTO</span>
              </button>
            </div>

            {/* 3. Botón desplegable para seleccionar el orden */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className={`h-12 px-3 sm:px-4 rounded-2xl border flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 text-xs sm:text-sm font-black uppercase tracking-wider ${
                  showSortDropdown
                    ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-bg-800/80 hover:bg-bg-750 text-slate-200 border-slate-700 hover:border-slate-600'
                }`}
                title="Seleccionar orden de los presupuestos"
                aria-label="Ordenar presupuestos"
              >
                <ArrowUpDown className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">{SORT_LABELS[sortOrder]}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showSortDropdown ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Menú Desplegable con opciones de orden */}
              <AnimatePresence>
                {showSortDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSortDropdown(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-14 z-50 w-52 bg-slate-900/95 backdrop-blur-md border-2 border-amber-400/60 rounded-2xl p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)] flex flex-col gap-1 select-none"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-black text-amber-400/80 uppercase tracking-widest border-b border-slate-800">
                        Ordenar por
                      </div>
                      {(['nuevos', 'antiguos', 'pendientes', 'confirmados', 'cerrados', 'nombre'] as SortOption[]).map((opt) => {
                        const isSelected = sortOrder === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              setSortOrder(opt);
                              setShowSortDropdown(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-left uppercase tracking-wide ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-400/50'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span>{SORT_LABELS[opt]}</span>
                            {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Campo de búsqueda expandible */}
          <AnimatePresence>
            {showSearchInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center gap-2 w-full pt-1 overflow-hidden"
              >
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, matrícula o número de presupuesto..."
                  className="flex-1 bg-bg-800 border border-bg-600 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all shrink-0"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearch('');
                  }}
                  className="text-slate-400 hover:text-white p-2 shrink-0"
                  title="Cerrar búsqueda"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
            {(() => {
              const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null;
              const hasCliente = !!selectedClienteId;
              const hasVehiculo = !!selectedVehiculoId || vehiculos.length === 0;
              const isSaved = !!(editingId || currentP?.id);
              const isSent = !!(currentP?.enviado_email_at || currentP?.enviado_whatsapp_at);

              // Comprobar si este presupuesto específico ha completado su roadmap hasta CONFIRMAR factura
              const pId = editingId || currentP?.id;
              const citaVinculada = citas.find(c => c.presupuesto_id === pId);
              const repVinculada = citaVinculada ? reparaciones.find(r => r.cita_id === citaVinculada.id) : null;
              const tieneFacturaConfirmada = (() => {
                if (!pId) return false;
                if (repVinculada) {
                  return facturas.some(f => f.reparacion_id === repVinculada.id && !!f.numero && f.id !== 'draft');
                }
                return false;
              })();

              const firstConcept = conceptos[0] || { descripcion: "", cantidad: 1, precio: 0 };
              const hasImporte = conceptos.some(c => (c.cantidad * c.precio) > 0);

              // ── SECUENCIA LÓGICA DE ANIMACIÓN EN CLIENTE Y VEHÍCULO ──
              const animarCliente = !hasCliente;
              const animarVehiculo = hasCliente && !hasVehiculo;

              const ocultarSelectoresCliente = !!clienteIdFromNav || !!editingId;
              const ocultarSelectorVehiculo = (!!clienteIdFromNav && vehiculos.length === 1) || !!editingId;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs gestarian-paper-muted uppercase font-semibold mb-1">
                        Cliente
                      </p>
                      {/* Selectores y búsqueda de cliente se ocultan si venimos con el cliente forzado o es un presupuesto existente */}
                      {!ocultarSelectoresCliente && (
                        <>
                          {/* Selector de cliente clásico (ancho completo, mismo formato) */}
                          <div className="mb-2">
                            <select
                              value={selectedClienteId}
                              onChange={(e) => handleChangeCliente(e.target.value)}
                              className={`w-full bg-white text-blue-900 border rounded-xl px-3 py-2 text-xs mb-2 focus:border-blue-700 focus:outline-none font-bold transition-all ${animarCliente
                                  ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                                  : "border-gray-300"
                                }`}
                              style={{ fontSize: '0.80rem' }}
                            >
                              <option value="" className="text-xs" style={{ fontSize: '90%' }}>Seleccionar cliente...</option>
                              {clientes.map((c) => (
                                <option key={c.id} value={c.id} className="text-xs" style={{ fontSize: '90%' }}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="relative mb-2">
                            <input
                              type="text"
                              value={clienteSearchText}
                              onChange={(e) => {
                                setClienteSearchText(e.target.value);
                                setShowClientDropdown(true);
                                if (!e.target.value) {
                                  handleChangeCliente("");
                                }
                              }}
                              onFocus={() => setShowClientDropdown(true)}
                              placeholder="Buscar cliente (escribe para filtrar)..."
                              className={`w-full bg-white text-blue-900 border rounded-xl px-3 py-2 text-xs focus:border-blue-700 focus:outline-none font-bold transition-all ${animarCliente
                                  ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                                  : "border-gray-300"
                                }`}
                              style={{ fontSize: '0.80rem' }}
                            />
                            {showClientDropdown && clienteSearchText && (
                              <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-xl shadow-lg">
                                {clientes
                                  .filter(c => c.nombre.toLowerCase().includes(clienteSearchText.toLowerCase()) || (c.dni && c.dni.toLowerCase().includes(clienteSearchText.toLowerCase())))
                                  .map(c => (
                                    <div
                                      key={c.id}
                                      onClick={() => {
                                        handleChangeCliente(c.id);
                                        setClienteSearchText(c.nombre);
                                        setShowClientDropdown(false);
                                      }}
                                      className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 font-semibold text-blue-900 flex justify-between items-center"
                                      style={{ fontSize: '0.80rem' }}
                                    >
                                      <span>{c.nombre}</span>
                                      {c.dni && <span className="text-[10px] text-gray-500">{c.dni}</span>}
                                    </div>
                                  ))}
                                {clientes.filter(c => c.nombre.toLowerCase().includes(clienteSearchText.toLowerCase()) || (c.dni && c.dni.toLowerCase().includes(clienteSearchText.toLowerCase()))).length === 0 && (
                                  <div className="px-3 py-2 text-xs text-gray-500 text-center" style={{ fontSize: '0.80rem' }}>No se encontraron clientes</div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/clientes', { state: { openNewModal: true } })}
                            className="w-full py-1.5 px-3 bg-emerald-500/10 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 mb-2 shadow-sm"
                            style={{ fontSize: '0.80rem' }}
                          >
                            <UserPlus className="w-4 h-4" /> Nuevo cliente
                          </button>
                        </>
                      )}
                      {selectedClienteId &&
                        (() => {
                          const c = clienteData(selectedClienteId);
                          return c ? (
                            <div className="text-xs gestarian-paper-muted space-y-1">
                              <p className="font-extrabold text-gray-900 text-sm">{c.nombre}</p>
                              {c.dni && <p><span className="font-semibold text-gray-700">DNI:</span> {c.dni}</p>}
                              {c.direccion && <p><span className="font-semibold text-gray-700">Dirección:</span> {c.direccion}</p>}
                              {c.cp && <p><span className="font-semibold text-gray-700">CP:</span> {c.cp} {getLocalidadFromCP(c.cp) ? `(${getLocalidadFromCP(c.cp)})` : ''}</p>}
                              {c.telefono && <p><span className="font-semibold text-gray-700">Tel:</span> {c.telefono}</p>}
                              {c.email && <p><span className="font-semibold text-gray-700">Email:</span> {c.email}</p>}
                            </div>
                          ) : null;
                        })()}
                    </div>
                    <div>
                      <p className="text-xs gestarian-paper-muted uppercase font-semibold mb-1">
                        Vehículo
                      </p>
                      {!ocultarSelectorVehiculo && (
                        <select
                          value={selectedVehiculoId}
                          onChange={(e) => handleChangeVehiculo(e.target.value)}
                          className={`w-full bg-white text-blue-900 border rounded-xl px-3 py-2 text-sm mb-2 focus:border-blue-700 focus:outline-none font-bold transition-all ${animarVehiculo
                              ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                              : "border-gray-300"
                            }`}
                          disabled={!selectedClienteId}
                        >
                          <option value="">
                            {!selectedClienteId
                              ? "Seleccione cliente primero..."
                              : vehiculos.length > 1
                                ? "Selecciona vehículo..."
                                : "Sin vehículo"}
                          </option>
                          {vehiculos.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.matricula} — {v.marca} {v.modelo ?? ""}
                            </option>
                          ))}
                        </select>
                      )}
                      {selectedVehiculoId &&
                        (() => {
                          const v = vehiculoData(selectedVehiculoId);
                          return v ? (
                            <div className="text-xs gestarian-paper-muted space-y-1">
                              <p className="font-extrabold text-gray-900 text-sm">{v.matricula} {v.marca ? `— ${v.marca} ${v.modelo ?? ''}` : ''}</p>
                              {v.anio && <p><span className="font-semibold text-gray-700">Año:</span> {v.anio}</p>}
                              {v.vin && <p><span className="font-semibold text-gray-700">VIN:</span> {v.vin}</p>}
                            </div>
                          ) : null;
                        })()}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Tabla conceptos — desktop */}
            {(() => {
              const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null;
              const hasCliente = !!selectedClienteId;
              const hasVehiculo = !!selectedVehiculoId || vehiculos.length === 0;
              const isSaved = !!(editingId || currentP?.id);
              const firstConcept = conceptos[0] || { descripcion: "", cantidad: 1, precio: 0 };
              const hasImporte = conceptos.some(c => (c.cantidad * c.precio) > 0);

              const pId = editingId || currentP?.id;
              const citaVinculada = citas.find(c => c.presupuesto_id === pId);
              const repVinculada = citaVinculada ? reparaciones.find(r => r.cita_id === citaVinculada.id) : null;
              const tieneFacturaConfirmada = (() => {
                if (!pId) return false;
                if (repVinculada) {
                  return facturas.some(f => f.reparacion_id === repVinculada.id && !!f.numero && f.id !== 'draft');
                }
                return false;
              })();

              const animarDescripcion = hasCliente && hasVehiculo && !isSaved && !firstConcept.descripcion.trim();
              const animarCantidad = hasCliente && hasVehiculo && !isSaved && !!firstConcept.descripcion.trim() && firstConcept.cantidad === 0;
              const animarPrecio = hasCliente && hasVehiculo && !isSaved && !!firstConcept.descripcion.trim() && firstConcept.cantidad > 0 && firstConcept.precio === 0;
              const animarAddLinea = hasCliente && hasVehiculo && hasImporte && !isSaved && conceptos.length === 1;

              return (
                <>
                  <table className="w-full text-sm mb-4 hidden sm:table border-separate border-spacing-y-1.5">
                    <thead>
                      <tr className="border-b-2 border-gray-800 text-left text-xs uppercase gestarian-paper-muted">
                        <th className="py-2 w-1/2">Descripción</th>
                        <th className="py-2 text-center w-20">Cant.</th>
                        <th className="py-2 text-right w-24">Precio</th>
                        <th className="py-2 text-right w-28">Importe</th>
                        <th className="py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {conceptos.map((c, i) => {
                        const isFirst = i === 0;
                        return (
                          <tr key={i}>
                            <td className="py-1">
                              {tieneFacturaConfirmada ? (
                                <div className="py-2 px-3 text-sm font-semibold text-gray-900 bg-gray-50/50 rounded-xl">
                                  {c.descripcion}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Descripción del trabajo..."
                                  value={c.descripcion}
                                  onChange={(e) => {
                                    const next = [...conceptos];
                                    next[i] = { ...c, descripcion: e.target.value };
                                    handleChangeConcepto(next);
                                  }}
                                  className={`w-full bg-white !bg-white text-black !text-black placeholder:text-gray-400 border px-3 py-1.5 text-sm rounded-xl focus:outline-none focus:border-blue-700 font-medium transition-all ${isFirst && animarDescripcion
                                      ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                                      : "border-gray-300"
                                    }`}
                                />
                              )}
                            </td>
                            <td className="py-1 text-center">
                              {tieneFacturaConfirmada ? (
                                <div className="py-2 px-2 text-sm text-center font-bold text-gray-900">
                                  {c.cantidad}
                                </div>
                              ) : (
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
                                  className={`w-16 bg-white !bg-white text-black !text-black placeholder:text-gray-400 border px-2 py-1.5 text-sm text-center rounded-xl focus:outline-none focus:border-blue-700 font-bold transition-all ${isFirst && animarCantidad
                                      ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                                      : "border-gray-300"
                                    }`}
                                />
                              )}
                            </td>
                            <td className="py-1 text-right">
                              {tieneFacturaConfirmada ? (
                                <div className="py-2 px-2 text-sm text-right font-bold text-gray-900">
                                  {c.precio.toFixed(2)} €
                                </div>
                              ) : (
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
                                  className={`w-24 bg-white !bg-white text-black !text-black placeholder:text-gray-400 border px-2 py-1.5 text-sm text-right rounded-xl focus:outline-none focus:border-blue-700 font-bold transition-all ${isFirst && animarPrecio
                                      ? "border-blue-600 animated-contour-border-blue shadow-[0_0_12px_rgba(37,99,235,0.7)]"
                                      : "border-gray-300"
                                    }`}
                                />
                              )}
                            </td>
                            <td className="py-1 text-right">
                              <div className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white !bg-white text-black !text-black font-black text-right shadow-inner">
                                {(c.cantidad * c.precio).toFixed(2)} €
                              </div>
                            </td>
                            <td className="py-1 text-center">
                              {!tieneFacturaConfirmada && (
                                <button
                                  onClick={() =>
                                    handleChangeConcepto(
                                      conceptos.filter((_, idx) => idx !== i),
                                    )
                                  }
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Tarjetas conceptos — móvil */}
                  <div className="sm:hidden mb-4 space-y-3">
                    {conceptos.map((c, i) => (
                      <ConceptoMobileCard
                        key={i}
                        concepto={c}
                        readOnly={tieneFacturaConfirmada}
                        animarDescripcion={i === 0 && animarDescripcion}
                        animarCantidad={i === 0 && animarCantidad}
                        animarPrecio={i === 0 && animarPrecio}
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

                  {/* Botón AÑADIR LÍNEA centrado (oculto si la factura está confirmada) */}
                  {!tieneFacturaConfirmada && (
                    <div className="flex justify-center my-4">
                      <button
                        onClick={() =>
                          handleChangeConcepto([
                            ...conceptos,
                            { descripcion: "", cantidad: 1, precio: 0 },
                          ])
                        }
                        className={`px-6 py-2.5 rounded-xl bg-[#f0f9ff] text-blue-900 font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 border-2 ${animarAddLinea
                            ? "border-blue-600 animated-contour-border-blue shadow-[0_0_16px_rgba(37,99,235,0.7)]"
                            : "border-blue-300 hover:border-blue-400"
                          }`}
                        title="Añadir nueva línea"
                      >
                        <Plus className="w-4 h-4 text-blue-600 font-black" />
                        <span>Añadir línea</span>
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

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
              {(() => {
                const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null;
                const pId = editingId || currentP?.id;
                const citaVinculada = citas.find(c => c.presupuesto_id === pId);
                const repVinculada = citaVinculada ? reparaciones.find(r => r.cita_id === citaVinculada.id) : null;
                const tieneFacturaConfirmada = (() => {
                  if (!pId) return false;
                  if (repVinculada) {
                    return facturas.some(f => f.reparacion_id === repVinculada.id && !!f.numero && f.id !== 'draft');
                  }
                  return false;
                })();

                return tieneFacturaConfirmada ? (
                  <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                    {observaciones || "Sin observaciones"}
                  </div>
                ) : (
                  <textarea
                    value={observaciones}
                    onChange={(e) => handleChangeObservaciones(e.target.value)}
                    placeholder="Notas internas..."
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
                  />
                );
              })()}
            </div>

            {/* Botones de acción inferiores con la distribución unificada */}
            <div className="border-t-2 border-gray-800 pt-6 space-y-6">
              {(() => {
                const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null
                const cliente = selectedClienteId ? clienteData(selectedClienteId) : null
                const veh = selectedVehiculoId ? vehiculoData(selectedVehiculoId) : null

                const emailSentAt = currentP?.enviado_email_at
                const whatsappSentAt = currentP?.enviado_whatsapp_at

                // Comprobar si este presupuesto específico ha completado su roadmap hasta CONFIRMAR factura
                const pId = editingId || currentP?.id
                const vId = selectedVehiculoId || currentP?.vehiculo_id
                const cId = selectedClienteId || currentP?.cliente_id

                // Un presupuesto solo se bloquea si su expediente ha llegado a FACTURA -> GENERAR FACTURA -> BORRADOR -> CONFIRMAR
                const tieneFacturaConfirmada = (() => {
                  if (!pId) return false;
                  // Comprobar si hay una factura confirmada (con número emitido) generada desde la reparación de este presupuesto
                  const citaVinculada = citas.find(c => c.presupuesto_id === pId);
                  const repVinculada = citaVinculada ? reparaciones.find(r => r.cita_id === citaVinculada.id) : null;
                  if (repVinculada) {
                    return facturas.some(f => f.reparacion_id === repVinculada.id && !!f.numero);
                  }
                  return false;
                })();

                // Estado de animación única
                const hasCliente = !!selectedClienteId;
                const hasVehiculo = !!selectedVehiculoId || vehiculos.length === 0;
                const hasImporte = conceptos.some(c => (c.cantidad * c.precio) > 0);
                const isSaved = !!(editingId || currentP?.id);
                const isSent = !!(emailSentAt || whatsappSentAt);

                // Guardar se anima si hay cliente, vehículo, importe y no está guardado aún (y ya no se anima añadir línea)
                const animarGuardar = hasCliente && hasVehiculo && hasImporte && !isSaved && (conceptos.length > 1 || conceptos.some(c => c.descripcion.trim().length > 3));
                // Envío se anima (alternando asíncronamente Email y WhatsApp con 10% crecimiento) si está guardado y aún no se ha enviado (y no está mostrándose el toast inicial)
                const animarEnvio = (isSaved || animarEnvioPostSave) && !isSent && !showSentToast;

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
                    {/* DOS LÍNEAS DE ACCIONES */}
                    <div className="space-y-4">
                      {/* LÍNEA 1: EMAIL | IMÁGENES | EXPEDIENTE (EN EL CENTRO) | IMPRIMIR | WHATSAPP */}
                      <div className="flex items-center justify-center gap-3 sm:gap-4">
                        {/* 1. EMAIL (Flotante sin recuadro con animación alternada) */}
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
                              setModalEnvioOpen(true)
                            }}
                            className={`p-1 hover:scale-110 transition-transform active:scale-95 shrink-0 ${animarEnvio ? "animated-send-email-alt" : ""
                              }`}
                            title="ENVIAR POR EMAIL"
                            aria-label="ENVIAR POR EMAIL"
                          >
                            <svg className="w-14 h-14 sm:w-16 sm:h-16 text-[#ea4335] drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                          </button>
                        )}

                        {/* 2. IMÁGENES (Gris 80%) */}
                        <button
                          onClick={() => {
                            const cIdSel = selectedClienteId || currentP?.cliente_id
                            const vIdSel = selectedVehiculoId || currentP?.vehiculo_id
                            const eFotos = currentP?.fotos || []
                            openExpedienteViewer(cIdSel, vIdSel, eFotos, `Expediente Presupuesto ${currentP?.numero || ''}`)
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/80 hover:bg-gray-500 text-amber-400 border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="IMÁGENES DEL EXPEDIENTE"
                          aria-label="IMÁGENES DEL EXPEDIENTE"
                        >
                          <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                        </button>

                        {/* 3. BOTÓN EXPEDIENTE EN EL CENTRO DE LA PRIMERA LÍNEA (Gris 80% con Carpeta Abierta Amarilla) */}
                        <button
                          onClick={() => {
                            navigate('/expedientes', {
                              state: {
                                expandPresupuestoId: pId,
                                expandVehiculoId: vId,
                                clienteId: cId
                              }
                            });
                          }}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/80 hover:bg-gray-500 text-amber-400 border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="VER EXPEDIENTE COMPLETO / ROADMAP"
                          aria-label="EXPEDIENTE"
                        >
                          <FolderOpen className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 fill-amber-400/30" />
                        </button>

                        {/* 4. IMPRIMIR (Gris 80%) */}
                        <button
                          onClick={() => window.print()}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-500/80 hover:bg-gray-500 text-white border border-gray-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                          title="IMPRIMIR"
                          aria-label="IMPRIMIR"
                        >
                          <Printer className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </button>

                        {/* 5. WHATSAPP (Bocadillo verde con animación alternada) */}
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
                                    setModalEnvioOpen(true)
                                  }
                                }
                              } catch (e: any) {
                                console.error('[WhatsApp Presupuesto Error]', e)
                                alert('No se ha podido preparar el documento para WhatsApp: ' + e.message)
                              }
                            }}
                            className={`hover:scale-110 transition-transform active:scale-95 shrink-0 ${animarEnvio ? "animated-send-wa-alt" : ""
                              }`}
                            title="ENVIAR POR WHATSAPP"
                            aria-label="ENVIAR POR WHATSAPP"
                          >
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                              <svg className="w-full h-full drop-shadow-md" viewBox="0 0 48 48" fill="none">
                                <path
                                  d="M24 4C12.95 4 4 12.95 4 24C4 27.84 5.08 31.43 6.96 34.5L4 44L13.82 41.13C16.76 42.97 20.26 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4Z"
                                  fill="#25D366"
                                />
                              </svg>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="absolute inset-0 m-auto w-7 h-7 sm:w-8 sm:h-8 text-white">
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

                      {/* AVISO DE PRESUPUESTO BLOQUEADO SI YA EXISTE FACTURA CONFIRMADA */}
                      {tieneFacturaConfirmada && (
                        <div className="w-full text-center text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/30">
                          PRESUPUESTO CERRADO: FACTURA DE EXPEDIENTE YA CONFIRMADA
                        </div>
                      )}

                      {/* LÍNEA 2: VOLVER Y GUARDAR CENTRADOS SIMÉTRICAMENTE (Tamaño x0.80, contorno verde) */}
                      <div className="flex items-center justify-center gap-6 pt-2 px-2">
                        {/* BOTÓN VOLVER */}
                        <button
                          onClick={resetForm}
                          className="px-4 py-2 rounded-xl bg-white !bg-white text-emerald-600 !text-emerald-600 border-2 border-emerald-500 hover:bg-emerald-50 font-black tracking-wider uppercase shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          style={{ fontSize: '0.80rem' }}
                        >
                          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>VOLVER</span>
                        </button>

                        {/* BOTÓN GUARDAR */}
                        <button
                          onClick={handleSave}
                          disabled={tieneFacturaConfirmada}
                          className={`px-4 py-2 rounded-xl font-black tracking-wider uppercase shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 bg-white !bg-white text-[#25D366] !text-[#25D366] border-2 border-[#25D366] ${tieneFacturaConfirmada
                              ? 'bg-gray-100 !bg-gray-100 text-gray-400 !text-gray-400 border-gray-300 cursor-not-allowed opacity-60'
                              : animarGuardar
                                ? 'animated-guardar-whatsapp'
                                : 'hover:bg-green-50'
                            }`}
                          style={{ fontSize: '0.80rem' }}
                          title={tieneFacturaConfirmada ? "Presupuesto cerrado por factura confirmada" : "GUARDAR PRESUPUESTO"}
                        >
                          <Check className="w-3.5 h-3.5 text-[#25D366] stroke-[3]" />
                          <span className="text-[#25D366] font-black">GUARDAR</span>
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

            // Helper para determinar si un presupuesto está cerrado
            const isPresupuestoCerrado = (p: Presupuesto) => {
              if (p.estado === 'cerrado') return true;
              return facturas.some(f => f.presupuesto_id === p.id || (f.vehiculo_id === p.vehiculo_id && f.confirmada));
            };

            const getClientTimestamp = (clientPresups: Presupuesto[], mode: 'max' | 'min') => {
              if (clientPresups.length === 0) return 0;
              const times = clientPresups.map(p => new Date(p.created_at || 0).getTime());
              return mode === 'max' ? Math.max(...times) : Math.min(...times);
            };

            // 1. Ordenar presupuestos individuales dentro de cada cliente
            clientesConPresupuestos.forEach(({ clientPresups }) => {
              clientPresups.sort((a, b) => {
                const timeA = new Date(a.created_at || 0).getTime();
                const timeB = new Date(b.created_at || 0).getTime();
                if (sortOrder === 'antiguos') {
                  return timeA - timeB;
                }
                if (sortOrder === 'pendientes') {
                  const aPend = a.estado !== 'aceptado';
                  const bPend = b.estado !== 'aceptado';
                  if (aPend && !bPend) return -1;
                  if (!aPend && bPend) return 1;
                  return timeB - timeA;
                }
                if (sortOrder === 'confirmados') {
                  const aConf = a.estado === 'aceptado';
                  const bConf = b.estado === 'aceptado';
                  if (aConf && !bConf) return -1;
                  if (!aConf && bConf) return 1;
                  return timeB - timeA;
                }
                if (sortOrder === 'cerrados') {
                  const aCerr = isPresupuestoCerrado(a);
                  const bCerr = isPresupuestoCerrado(b);
                  if (aCerr && !bCerr) return -1;
                  if (!aCerr && bCerr) return 1;
                  return timeB - timeA;
                }
                // default ('nuevos' y 'nombre')
                return timeB - timeA;
              });
            });

            // 2. Ordenar las tarjetas de cliente según el criterio seleccionado
            clientesConPresupuestos.sort((a, b) => {
              if (sortOrder === 'nombre') {
                return (a.cliente.nombre || '').localeCompare(b.cliente.nombre || '', 'es', { sensitivity: 'base' });
              }
              if (sortOrder === 'antiguos') {
                const minA = getClientTimestamp(a.clientPresups, 'min');
                const minB = getClientTimestamp(b.clientPresups, 'min');
                return minA - minB;
              }
              if (sortOrder === 'pendientes') {
                const hasPendA = a.clientPresups.some(p => p.estado !== 'aceptado');
                const hasPendB = b.clientPresups.some(p => p.estado !== 'aceptado');
                if (hasPendA && !hasPendB) return -1;
                if (!hasPendA && hasPendB) return 1;
                const maxA = getClientTimestamp(a.clientPresups, 'max');
                const maxB = getClientTimestamp(b.clientPresups, 'max');
                return maxB - maxA;
              }
              if (sortOrder === 'confirmados') {
                const hasConfA = a.clientPresups.some(p => p.estado === 'aceptado');
                const hasConfB = b.clientPresups.some(p => p.estado === 'aceptado');
                if (hasConfA && !hasConfB) return -1;
                if (!hasConfA && hasConfB) return 1;
                const maxA = getClientTimestamp(a.clientPresups, 'max');
                const maxB = getClientTimestamp(b.clientPresups, 'max');
                return maxB - maxA;
              }
              if (sortOrder === 'cerrados') {
                const hasCerrA = a.clientPresups.some(isPresupuestoCerrado);
                const hasCerrB = b.clientPresups.some(isPresupuestoCerrado);
                if (hasCerrA && !hasCerrB) return -1;
                if (!hasCerrA && hasCerrB) return 1;
                const maxA = getClientTimestamp(a.clientPresups, 'max');
                const maxB = getClientTimestamp(b.clientPresups, 'max');
                return maxB - maxA;
              }
              // default: 'nuevos'
              const maxA = getClientTimestamp(a.clientPresups, 'max');
              const maxB = getClientTimestamp(b.clientPresups, 'max');
              return maxB - maxA;
            });

            return clientesConPresupuestos.map(({ cliente, clientPresups }) => {
              const isExpanded = expandedClienteId === cliente.id;
              const nombreDisplay = cliente.nombre || 'Cliente sin nombre';

              // Lógica de color de borde para la tarjeta general de cliente (3px):
              // - Si hay algún presupuesto individual azul (enviado sin aceptar), PREVALECE AZUL.
              // - Si no hay azul pero hay algún naranja (sin enviar/pendiente sin aceptar), PREVALECE NARANJA.
              // - Si todos están aceptados, VERDE.
              const hasAzul = clientPresups.some(p => p.estado !== 'aceptado' && !!(p.enviado_email_at || p.enviado_whatsapp_at || (p.estado as string) === 'enviado' || (p as any).enviado));
              const hasNaranja = clientPresups.some(p => p.estado !== 'aceptado' && !p.enviado_email_at && !p.enviado_whatsapp_at && (p.estado as string) !== 'enviado' && !(p as any).enviado);
              const allVerde = clientPresups.length > 0 && clientPresups.every(p => p.estado === 'aceptado');

              let generalBorderColor = 'border-[3px] border-bg-700 bg-bg-800/90';
              if (hasAzul) {
                generalBorderColor = 'border-[3px] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)] bg-bg-800';
              } else if (hasNaranja) {
                generalBorderColor = 'border-[3px] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] bg-bg-800';
              } else if (allVerde) {
                generalBorderColor = 'border-[3px] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-bg-800';
              }

              const cardClasses = isExpanded
                ? `${generalBorderColor} ring-1 ring-white/20 z-10`
                : expandedClienteId
                  ? `${generalBorderColor} opacity-70 brightness-[0.70]`
                  : `${generalBorderColor} hover:border-cyan-400/80`;

              return (
                <motion.div
                  layout
                  key={cliente.id}
                  transition={{ layout: { duration: 0.28, ease: "easeInOut" } }}
                  className={`rounded-2xl transition-all duration-300 shadow-md ${cardClasses}`}
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
                          className="p-3 bg-bg-950/80 border-t border-bg-700/80 space-y-3"
                        >
                          <p className="text-base sm:text-lg font-black text-slate-300 uppercase tracking-wider px-1 text-center">Historial de presupuestos</p>
                          {clientPresups.map((p) => {
                            const veh = p.vehiculo_id
                              ? (allVehiculos[p.vehiculo_id] || vehiculos.find(x => x.id === p.vehiculo_id))
                              : Object.values(allVehiculos).find(v => v.cliente_id === cliente.id) || null;

                            let borderClass = 'border-[3px] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            if (p.estado === 'aceptado') {
                              borderClass = 'border-[3px] border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            } else if ((p.estado as string) === 'enviado' || (p as any).enviado) {
                              borderClass = 'border-[3px] border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            }

                            const totalPresupuesto = (p.total ?? 0).toFixed(2);

                            return (
                              <motion.div
                                key={p.id}
                                variants={dropdownItemVariants}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editPresupuesto(p);
                                }}
                                className={`rounded-2xl ${borderClass} bg-bg-900/90 p-4 transition-all cursor-pointer flex flex-col gap-2.5 justify-center select-none`}
                              >
                                {/* Línea 1: Marca y Modelo a la izquierda, Matrícula a la derecha (preferencia matrícula) */}
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-slate-300 text-sm sm:text-base uppercase truncate flex-1 min-w-0">
                                    {veh ? (
                                      <span>{veh.marca || ''} {veh.modelo || ''}</span>
                                    ) : (
                                      <span className="text-slate-500 italic">Sin datos vehículo</span>
                                    )}
                                  </div>
                                  {veh?.matricula && (
                                    <div className="shrink-0 scale-100 sm:scale-105 origin-right">
                                      <MatriculaBadge matricula={veh.matricula} size="md" />
                                    </div>
                                  )}
                                </div>

                                {/* Línea 2: ID de Presupuesto a la izquierda (x1.2), 3 iconos centrados (x1.3) */}
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                                  {/* Izquierda: Número de presupuesto */}
                                  <div className="shrink-0">
                                    <span className="text-xl sm:text-2xl font-mono text-cyan-400 font-black tracking-wide">
                                      {p.numero}
                                    </span>
                                  </div>

                                  {/* Centro / Espacio restante: 3 iconos de acción en tamaño x1.3 */}
                                  <div className="flex-1 flex items-center justify-center gap-6 sm:gap-10 ml-2 sm:ml-4">
                                    {/* Botón Ver Expediente: Carpeta amarilla con una E adentro */}
                                    <motion.button
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/expedientes', { state: { search: cliente.nombre || veh?.matricula || '' } });
                                      }}
                                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0 text-yellow-500 hover:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] cursor-pointer"
                                      title="Ver Expediente"
                                      aria-label="Ver Expediente"
                                    >
                                      <ExpedienteFolderIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                                    </motion.button>

                                    {/* Botón Ver Presupuesto: Hoja A4 cyan con P adentro */}
                                    <motion.button
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        editPresupuesto(p);
                                      }}
                                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0 text-cyan-400 hover:text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] cursor-pointer"
                                      title="Ver Presupuesto"
                                      aria-label="Ver Presupuesto"
                                    >
                                      <PresupuestoIcon className="w-12 h-12 sm:w-14 sm:h-14" />
                                    </motion.button>

                                    {/* Botón Imágenes */}
                                    <motion.button
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.92 }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const fotos = await fetchExpedienteFotos(cliente.id, p.vehiculo_id, [], { presupuestoId: p.id });
                                        setExpedienteFotos(fotos);
                                        setViewerMatricula(veh?.matricula || null);
                                        setExpedienteViewerTitle(`Fotos Presupuesto ${p.numero || ''}`);
                                        setShowExpedienteViewer(true);
                                      }}
                                      className="bg-transparent border-0 p-0 outline-none flex items-center justify-center shrink-0 text-violet-400 hover:text-violet-300 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] cursor-pointer"
                                      title="Ver Imágenes"
                                      aria-label="Ver Imágenes"
                                    >
                                      <ImageIcon className="w-12 h-12 sm:w-14 sm:h-14 stroke-[1.5]" />
                                    </motion.button>
                                  </div>
                                </div>

                                {/* Línea 3: Número de expediente tamaño x1.2 en naranja, Fecha en negrita rosa claro en el centro, Importe total gris claro a la derecha */}
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                                  {/* Izquierda: Número de expediente en naranja (mismo tamaño que ID presupuesto) */}
                                  <span className="text-xl sm:text-2xl font-mono text-amber-500 font-black tracking-wide shrink-0">
                                    {getExpediente(p, cliente, clientes)}
                                  </span>

                                  {/* Centro: Fecha en negrita rosa claro en formato dd/mm/aa */}
                                  <span className="text-sm sm:text-base text-pink-300 font-black tracking-wide">
                                    {formatDateShort(p.created_at)}
                                  </span>

                                  {/* Derecha: Importe total sin recuadro en gris claro */}
                                  <span className="text-slate-300 text-sm sm:text-base font-black tracking-wide shrink-0">
                                    {totalPresupuesto} €
                                  </span>
                                </div>
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

      {showSentToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 border-2 border-emerald-500 text-white px-6 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-4 font-bold w-[90%] sm:w-auto max-w-md text-center animate-bounce">
          <p className="text-sm sm:text-base leading-relaxed">{showSentToast}</p>
          <button
            onClick={() => {
              setShowSentToast(null);
              setAnimarEnvioPostSave(true);
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg border border-emerald-400 uppercase tracking-wider cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      )}

      <GlobalImageViewer
        isOpen={showExpedienteViewer || !!viewerMatricula}
        onClose={() => {
          setShowExpedienteViewer(false);
          setViewerMatricula(null);
        }}
        matricula={viewerMatricula || (selectedVehiculoId ? vehiculoData(selectedVehiculoId)?.matricula : undefined)}
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
      {/* Modal Informativo de Presupuesto Guardado (5 segundos, centrado sin animación, con sonido y botón aceptar) */}
      {showSentToast && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-[3px] border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.3)] text-center text-white">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-6">
              {showSentToast}
            </h3>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowSentToast(null);
                  setAnimarEnvioPostSave(true);
                }}
                className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg leading-none border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Informativo de Presupuesto Enviado Directo con botón VER EXPEDIENTE */}
      {modalEnvioOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key="modal-envio-presupuesto"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="bg-slate-900 border-[3px] border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.3)] text-center text-white"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white mb-6">
                PRESUPUESTO ENVIADO CORRECTAMENTE
              </h3>

              <div className="flex flex-col gap-3">
                {/* Botón VER EXPEDIENTE para acceder directamente al Roadmap */}
                <button
                  onClick={() => {
                    setModalEnvioOpen(false);
                    const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null;
                    const pId = editingId || currentP?.id;
                    const vId = selectedVehiculoId || currentP?.vehiculo_id;
                    const cId = selectedClienteId || currentP?.cliente_id;
                    const veh = vehiculos.find(v => v.id === vId);
                    const cli = clientes.find(c => c.id === cId);
                    navigate('/expedientes', {
                      state: {
                        expandPresupuestoId: pId,
                        expandVehiculoId: vId,
                        clienteId: cId,
                        search: veh?.matricula || cli?.nombre || ''
                      }
                    });
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xl sm:text-2xl leading-none border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider"
                >
                  <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-amber-200 fill-amber-200/40 shrink-0" />
                  <span>VER EXPEDIENTE</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setModalEnvioOpen(false);
                      handleVolver();
                    }}
                    className="py-3.5 sm:py-4 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg sm:text-xl leading-none border border-slate-700 hover:border-slate-600 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    VOLVER
                  </button>
                  <button
                    onClick={() => {
                      setModalEnvioOpen(false);
                    }}
                    className="py-3.5 sm:py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg sm:text-xl leading-none border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    ACEPTAR
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}


