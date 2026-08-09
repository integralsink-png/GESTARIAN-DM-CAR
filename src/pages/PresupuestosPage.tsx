import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type {
  Cliente,
  Vehiculo,
  Presupuesto,
  Concepto,
  Configuracion,
} from "../lib/types";
import { sendPresupuestoByEmail, downloadPresupuestoPDF } from "../lib/pdfGenerator";
import {
  PageHeader,
  Badge,
  EmptyState,
} from "../components/UI";
import {
  Plus,
  Trash2,
  Mic,
  Printer,
  Check,
  X,
  FileText,
  Camera,
  Calendar,
  Mail,
  MessageCircle,
  ArrowLeft,
  Search,
  Edit3,
} from "lucide-react";
import { ImageViewer } from "../components/ImageViewer";
import { GlobalImageViewer } from "../components/GlobalImageViewer";
import { useVoice, parseVoiceToConceptos } from "../lib/useVoice";

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
  const navState = location.state as { clienteId?: string; openForm?: boolean } | null;
  const clienteIdFromNav = navState?.clienteId;
  const openFormFromNav = navState?.openForm;

  const [search, setSearch] = useState("");
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(clienteIdFromNav ?? null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [showForm, setShowForm] = useState(openFormFromNav ?? false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedVehiculoId, setSelectedVehiculoId] = useState("");
  const [conceptos, setConceptos] = useState<Concepto[]>([
    { descripcion: "", cantidad: 1, precio: 0 },
  ]);
  const [observaciones, setObservaciones] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null);
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null);
  const [escaneandoOCR, setEscaneandoOCR] = useState(false);
  const { listening, transcript, reset } = useVoice();
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  async function handleDeletePresupuestoFoto(id: string, index: number) {
    if (!confirm('¿Eliminar esta foto?')) return;
    const p = presupuestos.find(x => x.id === id);
    if (!p) return;

    const nuevasFotos = [...(p.fotos ?? [])];
    nuevasFotos.splice(index, 1);

    try {
      const { error } = await supabase.from('presupuestos').update({ fotos: nuevasFotos }).eq('id', id);
      if (error) throw error;
      await loadPresupuestos();
    } catch (err) {
      console.error(err);
      alert('Error eliminando foto');
    }
  }

  async function handleScanOCR(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (!e.target.files || e.target.files.length === 0) return;
    setEscaneandoOCR(true);
    try {
      const file = e.target.files[0];
      const dataUrl = await fileToDataUrl(file);
      
      const { extractTextFromImage } = await import('../lib/ocrService');
      const text = await extractTextFromImage(dataUrl);
      
      if (text.trim()) {
        const { processMetisMessage } = await import('../lib/metisAiEngine');
        const p = presupuestos.find(x => x.id === id);
        if (p) {
          const res = await processMetisMessage(
            `He escaneado un ticket. Añade los conceptos encontrados a este presupuesto. Texto OCR: ${text}`,
            { tipo: 'presupuesto', id: p.id, data: p }
          );
          alert(`OCR Procesado:\n${res.text}`);
          await loadPresupuestos();
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error al escanear OCR. Puede que Tesseract tarde un poco en cargar.');
    } finally {
      setEscaneandoOCR(false);
    }
  }

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
    setPresupuestos(data ?? []);
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

    // Generar formato PAA12345 (P + 2 dígitos del año + 5 dígitos de secuencia)
    const currentYearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = `P${currentYearSuffix}`;
    const presupuestosDelAño = presupuestos.filter((p) => p.numero && p.numero.startsWith(prefix));
    
    let maxSeq = 0;
    presupuestosDelAño.forEach((p) => {
      const numPart = p.numero.substring(3); // extrae la secuencia tras PAA
      const seq = parseInt(numPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });

    const numero = `${prefix}${String(maxSeq + 1).padStart(5, '0')}`;

    if (editingId) {
      await supabase
        .from("presupuestos")
        .update({
          cliente_id: selectedClienteId,
          vehiculo_id: selectedVehiculoId || null,
          conceptos: cleanConceptos,
          total: total,
          observaciones: observaciones || null,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("presupuestos").insert({
        numero,
        cliente_id: selectedClienteId,
        vehiculo_id: selectedVehiculoId || null,
        conceptos: cleanConceptos,
        total,
        observaciones: observaciones || null,
        estado: "pendiente",
      });
      resetForm();
      await loadPresupuestos();
    }
  }

  function resetForm() {
    setShowForm(false);
    setConceptos([{ descripcion: "", cantidad: 1, precio: 0 }]);
    setObservaciones("");
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
    setObservaciones(p.observaciones ?? "");
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
      {/* Cabecera unificada: Título PRESUPUESTOS con logo corporativo a la izquierda y botón VOLVER (navigate(-1)) a la derecha */}
      <PageHeader title="PRESUPUESTOS">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Segunda línea: Recuadro de búsqueda para buscar presupuesto / cliente + botón Añadir nuevo presupuesto */}
      {!showForm && (
        <div className="mb-4 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, matrícula o número de presupuesto..."
              className="w-full bg-bg-800 border border-bg-600 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors shadow-inner"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 flex items-center justify-center hover:bg-cyan-500/30 transition-transform active:scale-95 shrink-0 shadow-[0_0_12px_rgba(8,145,178,0.3)]"
            title="Añadir nuevo presupuesto"
            aria-label="Añadir nuevo presupuesto"
          >
            <Plus className="w-7 h-7" />
          </button>
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
                    className="w-16 h-16 rounded-lg object-cover bg-gray-100 p-1"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-white font-bold text-lg">
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
                <h3 className="text-2xl font-bold uppercase tracking-wide">
                  Presupuesto
                </h3>
                <p className="text-sm gestarian-paper-muted mt-1">
                  {editingId
                    ? presupuestos.find((p) => p.id === editingId)?.numero
                    : `PRES-${String(presupuestos.length + 1).padStart(4, "0")}`}
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
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="gestarian-paper-muted">Base imponible</span>
                  <span className="font-medium">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="gestarian-paper-muted">IVA (21%)</span>
                  <span className="font-medium">{iva.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t-2 border-gray-800 pt-1.5">
                  <span>TOTAL</span>
                  <span>{total.toFixed(2)} €</span>
                </div>
              </div>
            </div>

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

            {/* Botones de acción inferiores con iconos únicamente (sin texto) */}
            <div className="border-t-2 border-gray-800 pt-5 space-y-4">
              {(() => {
                const currentP = editingId ? presupuestos.find(p => p.id === editingId) : null
                const cliente = selectedClienteId ? clienteData(selectedClienteId) : null
                const veh = selectedVehiculoId ? vehiculoData(selectedVehiculoId) : null

                const emailSentAt = currentP?.enviado_email_at
                const whatsappSentAt = currentP?.enviado_whatsapp_at

                const formatSentDate = (isoStr: string) => {
                  try {
                    const d = new Date(isoStr)
                    return `${d.toLocaleDateString('es-ES')} a las ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  } catch {
                    return isoStr
                  }
                }

                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      {/* EDITAR */}
                      <button
                        onClick={() => {
                          const firstInput = document.querySelector('.gestarian-paper input') as HTMLInputElement
                          if (firstInput) firstInput.focus()
                        }}
                        className="w-12 h-12 rounded-2xl bg-slate-800 text-cyan-400 border border-slate-700 hover:bg-slate-700 flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
                        title="EDITAR"
                        aria-label="EDITAR"
                      >
                        <Edit3 className="w-6 h-6 text-cyan-400" />
                      </button>

                      {/* IMPRIMIR */}
                      <button
                        onClick={() => window.print()}
                        className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
                        title="IMPRIMIR"
                        aria-label="IMPRIMIR"
                      >
                        <Printer className="w-6 h-6 text-slate-300" />
                      </button>

                      {/* GUARDAR (Solo si no ha sido guardado previamente) */}
                      {!editingId && (
                        <button
                          onClick={handleSave}
                          className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow transition-all active:scale-95 shrink-0"
                          title="GUARDAR"
                          aria-label="GUARDAR"
                        >
                          <Check className="w-6 h-6" />
                        </button>
                      )}

                      {/* EMAIL */}
                      <button
                        onClick={async () => {
                          const numero = currentP?.numero || "BORRADOR"
                          await sendPresupuestoByEmail({ numero, conceptos, observaciones }, cliente, veh, config)
                          if (currentP?.id) {
                            const nowIso = new Date().toISOString()
                            await supabase.from('presupuestos').update({ enviado_email_at: nowIso }).eq('id', currentP.id)
                            await loadPresupuestos()
                          }
                        }}
                        className="w-12 h-12 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)] transition-all active:scale-95 shrink-0"
                        title="ENVIAR POR EMAIL"
                        aria-label="ENVIAR POR EMAIL"
                      >
                        <Mail className="w-6 h-6 text-indigo-400" />
                      </button>

                      {/* WHATSAPP */}
                      <button
                        onClick={async () => {
                          const matricula = veh?.matricula || ''
                          const numStr = currentP?.numero || 'BORRADOR'
                          const message = `Hola ${cliente?.nombre || ''}, le informamos que su presupuesto ${numStr} para el vehículo ${matricula} está disponible por un importe de ${total.toFixed(2)}€. Adjunto el PDF del presupuesto. Saludos, DM CAR`
                          const phone = cliente?.telefono?.replace(/\s/g, '') || ''
                          if (phone) {
                            await downloadPresupuestoPDF({ numero: numStr, conceptos, observaciones }, cliente, veh, config)
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
                            if (currentP?.id) {
                              const nowIso = new Date().toISOString()
                              await supabase.from('presupuestos').update({ enviado_whatsapp_at: nowIso }).eq('id', currentP.id)
                              await loadPresupuestos()
                            }
                            setTimeout(() => {
                              alert('El PDF del presupuesto se ha descargado. Por favor, adjúntalo al mensaje de WhatsApp.')
                            }, 500)
                          } else {
                            alert('El cliente no tiene un número de teléfono registrado.')
                          }
                        }}
                        className="w-12 h-12 rounded-2xl bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.2)] transition-all active:scale-95 shrink-0"
                        title="ENVIAR POR WHATSAPP"
                        aria-label="ENVIAR POR WHATSAPP"
                      >
                        <MessageCircle className="w-6 h-6 text-green-400" />
                      </button>

                      {/* CERRAR */}
                      <button
                        onClick={resetForm}
                        className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white flex items-center justify-center shadow transition-all active:scale-95 ml-auto shrink-0"
                        title="CERRAR"
                        aria-label="CERRAR"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Avisos de fecha de envío si existen */}
                    {(emailSentAt || whatsappSentAt) && (
                      <div className="space-y-0.5 pt-1">
                        {emailSentAt && (
                          <p className="text-[11px] text-center text-emerald-400 font-medium">
                            ✓ ENVIADO POR EMAIL: {formatSentDate(emailSentAt)}
                          </p>
                        )}
                        {whatsappSentAt && (
                          <p className="text-[11px] text-center text-emerald-400 font-medium">
                            ✓ ENVIADO POR WHATSAPP: {formatSentDate(whatsappSentAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Listado agrupado por Clientes */}
      {!showForm && (
        <div className="space-y-3">
          {(() => {
            const query = search.trim().toLowerCase();

            // Filtrar clientes con sus presupuestos
            const clientesConPresupuestos = clientes.map(cliente => {
              const clientPresups = presupuestos.filter(p => p.cliente_id === cliente.id);
              return { cliente, clientPresups };
            }).filter(({ cliente, clientPresups }) => {
              if (clienteIdFromNav && cliente.id !== clienteIdFromNav) return false;
              if (!query) return true;

              const nombreMatch = cliente.nombre.toLowerCase().includes(query);
              const presupMatch = clientPresups.some(p => {
                const numMatch = p.numero?.toLowerCase().includes(query);
                const veh = p.vehiculo_id ? vehiculos.find(v => v.id === p.vehiculo_id) : null;
                const matMatch = veh?.matricula.toLowerCase().includes(query);
                return numMatch || matMatch;
              });

              return nombreMatch || presupMatch;
            });

            if (clientesConPresupuestos.length === 0) {
              return (
                <EmptyState
                  icon={<FileText className="w-12 h-12" />}
                  title={clienteIdFromNav ? "Sin presupuestos para este cliente" : "No se encontraron presupuestos"}
                  subtitle="Crea un presupuesto o intenta otra búsqueda"
                />
              );
            }

            return clientesConPresupuestos.map(({ cliente, clientPresups }) => {
              const isExpanded = expandedClienteId === cliente.id;

              return (
                <div key={cliente.id} className="rounded-2xl border border-bg-700 bg-bg-800/90 overflow-hidden transition-all duration-200 shadow-md">
                  {/* Fila del cliente: solo el nombre completo del cliente */}
                  <div
                    onClick={() => setExpandedClienteId(isExpanded ? null : cliente.id)}
                    className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-bg-700/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-white text-base leading-tight truncate">
                        {cliente.nombre}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/30 min-w-[28px] text-center">
                        {clientPresups.length}
                      </span>
                    </div>
                  </div>

                  {/* Historial desplegable de presupuestos del cliente */}
                  {isExpanded && (
                    <div className="p-3 bg-bg-950/80 border-t border-bg-700/80 space-y-2.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Historial de presupuestos</p>
                      {clientPresups.map((p) => {
                        const veh = p.vehiculo_id ? vehiculos.find(x => x.id === p.vehiculo_id) : null;
                        const estadoColor = p.estado === 'aceptado' ? 'green' : p.estado === 'rechazado' ? 'red' : 'yellow';

                        return (
                          <div
                            key={p.id}
                            className="rounded-xl border border-bg-700 bg-bg-900 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/40 transition-all"
                          >
                            {/* Número y Matrícula */}
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 font-semibold">
                                {p.numero}
                              </span>
                              {veh && (
                                <span className="text-xs text-slate-300 font-medium">
                                  {veh.matricula}
                                </span>
                              )}
                              <span className="text-xs font-bold text-white ml-1">
                                {p.total.toFixed(2)} €
                              </span>
                            </div>

                            {/* Estado y Botones de Acción */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge text={p.estado} color={estadoColor} />

                              {/* Botón ACEPTAR que se convierte en CITAR si está aceptado */}
                              {p.estado !== 'aceptado' ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', p.id);
                                    await loadPresupuestos();
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-[11px] font-bold transition-all flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.2)] shrink-0"
                                >
                                  ACEPTAR
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/citas', {
                                      state: { presupuestoId: p.id, clienteId: p.cliente_id, vehiculoId: p.vehiculo_id }
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30 text-xs font-bold transition-all flex items-center gap-1 shadow-[0_0_8px_rgba(168,85,247,0.2)] animate-pulse"
                                >
                                  <Calendar className="w-3.5 h-3.5" /> CITAR
                                </button>
                              )}

                              {/* Botón VER a pantalla completa */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editPresupuesto(p);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-slate-700/80 text-white border border-slate-600 hover:bg-slate-600 text-xs font-bold transition-all flex items-center justify-center"
                              >
                                VER
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      <ImageViewer
        open={!!viewerMatricula}
        matricula={viewerMatricula ?? ""}
        onClose={() => setViewerMatricula(null)}
      />

      <GlobalImageViewer
        isOpen={!!fotosExpandida}
        onClose={() => setFotosExpandida(null)}
        images={presupuestos.find(p => p.id === fotosExpandida)?.fotos ?? []}
        onAddImage={async (dataUrl) => {
          if (!fotosExpandida) return;
          const p = presupuestos.find(x => x.id === fotosExpandida);
          if (p) {
            const nuevasFotos = [...(p.fotos ?? []), dataUrl];
            await supabase.from('presupuestos').update({ fotos: nuevasFotos }).eq('id', fotosExpandida);
            await loadPresupuestos();
          }
        }}
        onDeleteImage={async (index) => {
          if (fotosExpandida) await handleDeletePresupuestoFoto(fotosExpandida, index)
        }}
        title={`Presupuesto ${presupuestos.find(p => p.id === fotosExpandida)?.numero ?? ''}`}
        customAction={
          <label className={`cursor-pointer flex items-center justify-center w-full h-full text-xs transition-colors font-medium ${escaneandoOCR ? 'text-amber-400' : 'text-amber-500 hover:text-amber-400'}`}>
            <div className="flex flex-col items-center justify-center gap-1 bg-amber-500/10 border-2 border-dashed border-amber-500/30 hover:bg-amber-500/20 rounded-xl w-20 h-20 p-1 text-center leading-tight">
              <Camera className="w-6 h-6" />
              {escaneandoOCR ? 'OCR...' : 'OCR'}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => fotosExpandida && handleScanOCR(e, fotosExpandida)} disabled={escaneandoOCR} />
          </label>
        }
      />
    </div>
  );
}
