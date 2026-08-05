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
import { sendPresupuestoByEmail, downloadPresupuestoPDF, sendPresupuestoWhatsApp } from "../lib/pdfGenerator";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  MetisRowButton,
} from "../components/UI";
import {
  Plus,
  Trash2,
  List,
  Printer,
  Check,
  X,
  FileText,
  ImageIcon,
  Mic,
  MicOff,
  Camera,
  Eye,
  Calendar,
  Mail,
  MessageCircle,
  Download,
  ArrowLeft,
} from "lucide-react";
import { ImageViewer } from "../components/ImageViewer";
import { GlobalImageViewer } from "../components/GlobalImageViewer";
import { useVoice, parseVoiceToConceptos } from "../lib/useVoice";
import { openCameraWithPlate } from "../lib/navigation";

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
  const clienteIdFromNav = (location.state as { clienteId?: string })
    ?.clienteId;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedVehiculoId, setSelectedVehiculoId] = useState("");
  const [conceptos, setConceptos] = useState<Concepto[]>([
    { descripcion: "", cantidad: 1, precio: 0 },
  ]);
  const [observaciones, setObservaciones] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewerMatricula, setViewerMatricula] = useState<string | null>(null);
  const [fotosExpandida, setFotosExpandida] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [escaneandoOCR, setEscaneandoOCR] = useState(false);
  const [wasEdited, setWasEdited] = useState(false); // Tracks if changes were made since opening
  const { listening, transcript, interim, supported, start, stop, reset } =
    useVoice();
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [metisHablando, setMetisHablando] = useState(false);

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

    utterance.onstart = () => setMetisHablando(true);
    utterance.onend = () => setMetisHablando(false);
    utterance.onerror = () => setMetisHablando(false);
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
      setShowForm(true);
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
              setWasEdited(false);
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
  function toggleFotos(id: string) {
    if (fotosExpandida === id) {
      setFotosExpandida(null);
    } else {
      setFotosExpandida(id);
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  async function handleUploadPresupuestoFoto(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    if (!e.target.files || e.target.files.length === 0) return;
    setSubiendoFoto(true);
    try {
      const file = e.target.files[0];
      const dataUrl = await fileToDataUrl(file);
      
      const p = presupuestos.find(x => x.id === id);
      if (!p) return;
      
      const fotosActuales = p.fotos ?? [];
      const nuevasFotos = [...fotosActuales, dataUrl];

      const { error } = await supabase.from('presupuestos').update({ fotos: nuevasFotos }).eq('id', id);
      if (error) throw error;
      await loadPresupuestos();
    } catch (err) {
      console.error(err);
      alert('Error subiendo foto');
    } finally {
      setSubiendoFoto(false);
    }
  }

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
          const res = await processMetisMessage(`He escaneado un ticket. Añade los conceptos encontrados a este presupuesto. Texto OCR: ${text}`, p, null, null);
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
    const count = presupuestos.length + 1;
    const numero = `PRES-${String(count).padStart(4, "0")}`;

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

  async function deletePresupuesto(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este presupuesto?"))
      return;
    await supabase.from("presupuestos").delete().eq("id", id);
    await loadPresupuestos();
  }

  function resetForm() {
    setShowForm(false);
    setConceptos([{ descripcion: "", cantidad: 1, precio: 0 }]);
    setObservaciones("");
    setSelectedClienteId("");
    setSelectedVehiculoId("");
    setEditingId(null);
    setWasEdited(false);
  }

  async function descargarPDF() {
    if (!selectedClienteId) return;
    const cliente = clienteData(selectedClienteId);
    const veh = vehiculoData(selectedVehiculoId);
    
    let numero = "BORRADOR";
    if (editingId) {
      const p = presupuestos.find(p => p.id === editingId);
      if (p) numero = p.numero;
    } else {
      const count = presupuestos.length + 1;
      numero = `PAA${String(count).padStart(4, "0")}`;
    }

    const currentPresupuesto: Partial<Presupuesto> = {
      numero,
      conceptos,
      observaciones
    };
    await downloadPresupuestoPDF(currentPresupuesto, cliente, veh, config);
  }

  async function cicloEstado(p: Presupuesto) {
    const estados: ("pendiente" | "aceptado" | "rechazado")[] = [
      "pendiente",
      "aceptado",
      "rechazado",
    ];
    const nextIdx = (estados.indexOf(p.estado) + 1) % estados.length;
    await supabase
      .from("presupuestos")
      .update({ estado: estados[nextIdx] })
      .eq("id", p.id);
    loadPresupuestos();
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
    setWasEdited(false);
    setShowForm(true);
  }

  function clienteData(id: string) {
    return clientes.find((c) => c.id === id);
  }

  function vehiculoData(id: string | null) {
    if (!id) return null;
    return vehiculos.find((v) => v.id === id);
  }

  function toggleVoice() {
    if (!supported) return;
    if (listening) {
      stop();
    } else {
      reset();
      setShowVoicePanel(true);
      start();
    }
  }

  function finishVoice() {
    stop();
    const nuevos = parseVoiceToConceptos(transcript + " " + interim);
    if (nuevos.length > 0) {
      setConceptos((prev) => {
        const vacias = prev.filter((c) => !c.descripcion.trim());
        const llenas = prev.filter((c) => c.descripcion.trim());
        return [...llenas, ...nuevos, ...vacias];
      });
    }
    reset();
    setShowVoicePanel(false);
  }

  // Helper to mark form as edited
  const handleChangeConcepto = (next: Concepto[]) => {
    setConceptos(next);
    setWasEdited(true);
  };
  const handleChangeObservaciones = (val: string) => {
    setObservaciones(val);
    setWasEdited(true);
  };
  const handleChangeCliente = (val: string) => {
    setSelectedClienteId(val);
    setWasEdited(true);
  };
  const handleChangeVehiculo = (val: string) => {
    setSelectedVehiculoId(val);
    setWasEdited(true);
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
              setWasEdited(true);
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
      <PageHeader
        title="Presupuestos"
        subtitle="Generar y gestionar presupuestos"
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> VOLVER
            </span>
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo
            </span>
          </Button>
        </div>
      </PageHeader>

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

            {/* Botones de acción */}
            <div className="flex flex-wrap gap-3 border-t-2 border-gray-800 pt-4 items-center">
              <button
                onClick={handleSave}
                className="gestarian-paper-btn-primary gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all"
              >
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />{" "}
                  {editingId ? "Actualizar" : "Guardar"}
                </span>
              </button>
              {editingId && wasEdited && (
                <>
                  <button
                    onClick={() =>
                      window.open(
                        `https://wa.me/?text=Adjunto%20su%20presupuesto`,
                        "_blank",
                      )
                    }
                    className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const cliente = selectedClienteId ? clienteData(selectedClienteId) : null;
                      const veh = selectedVehiculoId ? vehiculoData(selectedVehiculoId) : null;
                      let numero = "BORRADOR";
                      if (editingId) {
                        const p = presupuestos.find(p => p.id === editingId);
                        if (p) numero = p.numero;
                      }
                      sendPresupuestoByEmail({ numero, conceptos, observaciones }, cliente, veh, config);
                    }}
                    className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all flex items-center gap-2 bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20"
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                </>
              )}
              {selectedVehiculoId && (
                <button
                  onClick={() => {
                    const v = vehiculoData(selectedVehiculoId);
                    if (v) setViewerMatricula(v.matricula);
                  }}
                  className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all flex items-center gap-2 text-cyan-700 border border-cyan-400 hover:bg-cyan-50"
                >
                  <ImageIcon className="w-4 h-4" /> Imágenes
                </button>
              )}              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => window.print()}
                  className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimir
                  </span>
                </button>
                <button
                  onClick={descargarPDF}
                  className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" /> PDF
                  </span>
                </button>
              </div>
              <button
                onClick={resetForm}
                className="gestarian-paper-btn font-semibold rounded-lg px-4 py-2.5 text-sm transition-all"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4" /> Cancelar
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de presupuestos recientes */}
      {!showForm && (
        <div className="space-y-2">
          {presupuestos.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-12 h-12" />}
              title="No hay presupuestos"
              subtitle="Crea el primer presupuesto"
            />
          ) : (
            presupuestos.slice(0, 10).map((p) => {
              const c = clienteData(p.cliente_id);
              return (
                <Card
                  key={p.id}
                  className="p-4 border-bg-600 cursor-pointer hover:border-bg-500 transition-colors"
                  onClick={() => editPresupuesto(p)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {p.numero}
                        </span>
                        <span className="text-lg font-bold text-white bg-bg-800 px-2 py-0.5 rounded-lg border border-bg-700">
                          {p.total.toFixed(2)} €
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {c?.nombre ?? "—"}
                        {p.vehiculo_id &&
                          (() => {
                            const v = vehiculos.find(
                              (x) => x.id === p.vehiculo_id,
                            );
                            return v ? ` · ${v.matricula}` : "";
                          })()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {/* ESTADO Interactivo */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cicloEstado(p);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          p.estado === "aceptado"
                            ? "bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30"
                            : p.estado === "rechazado"
                              ? "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30"
                        }`}
                      >
                        {p.estado.toUpperCase()}
                      </button>

                      {/* GENERAR CITA (Solo si Aceptado) */}
                      {p.estado === "aceptado" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/citas", {
                              state: {
                                presupuestoId: p.id,
                                clienteId: p.cliente_id,
                                vehiculoId: p.vehiculo_id,
                              },
                            });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold border border-emerald-500"
                        >
                          <Calendar className="w-3.5 h-3.5" /> GENERAR CITA
                        </button>
                      )}

                      {/* VER Presupuesto */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editPresupuesto(p);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-700 hover:bg-bg-600 text-white text-xs font-semibold border border-bg-600"
                      >
                        <Eye className="w-3.5 h-3.5" /> VER
                      </button>

                      {/* ENVIAR EMAIL */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const veh = p.vehiculo_id ? vehiculos.find(v => v.id === p.vehiculo_id) : null;
                          sendPresupuestoByEmail(p, c, veh, config);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-semibold border border-indigo-500/40"
                      >
                        <Mail className="w-3.5 h-3.5" /> EMAIL
                      </button>

                      {/* WHATSAPP */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const veh = p.vehiculo_id ? vehiculos.find(v => v.id === p.vehiculo_id) : null;
                          await sendPresupuestoWhatsApp(p, c, veh, config);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold border border-green-500/40"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WHATSAPP
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFotos(p.id); }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          fotosExpandida === p.id 
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' 
                            : 'bg-bg-700 hover:bg-bg-600 text-cyan-400 border-bg-600'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> 
                        {fotosExpandida === p.id ? 'OCULTAR' : 'FOTOS'}
                        {(p.fotos ?? []).length > 0 && <span className="ml-1 px-1.5 bg-cyan-500/20 rounded-full">{(p.fotos ?? []).length}</span>}
                      </button>

                      {/* ELIMINAR Presupuesto */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePresupuesto(p.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-700 hover:bg-bg-600 text-red-400 text-xs font-semibold border border-bg-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div onClick={(e) => e.stopPropagation()}>
                        <MetisRowButton
                          tipo="presupuesto"
                          id={p.id}
                          numero={p.numero}
                          matricula={
                            p.vehiculo_id
                              ? vehiculos.find((x) => x.id === p.vehiculo_id)
                                  ?.matricula
                              : undefined
                          }
                          cliente_nombre={c?.nombre}
                          data={p}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inline photos block replaced by GlobalImageViewer */}
                </Card>
              );
            })
          )}
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
