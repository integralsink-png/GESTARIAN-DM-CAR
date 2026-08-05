import { useState, useEffect } from 'react'
import { getCommunicationHistory, retryFailedCommunication, CommunicationRecord } from '../services/communicationService'
import { X, Mail, RefreshCw, CheckCircle2, AlertTriangle, Clock, FileText, Bot, Search } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  documentId?: string
}

export function CommunicationHistoryModal({ isOpen, onClose, documentId }: Props) {
  const [history, setHistory] = useState<CommunicationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen, documentId])

  async function loadHistory() {
    setLoading(true)
    const records = await getCommunicationHistory(documentId ? { documentId } : undefined)
    setHistory(records)
    setLoading(false)
  }

  async function handleRetry(id: string) {
    setRetryingId(id)
    const res = await retryFailedCommunication(id)
    if (res.success) {
      alert('✅ Reintento completado con éxito')
      await loadHistory()
    } else {
      alert(`⚠️ Falló el reintento: ${res.error}`)
    }
    setRetryingId(null)
  }

  if (!isOpen) return null

  const filteredHistory = history.filter((r) => {
    const q = filterText.toLowerCase()
    return (
      r.id.toLowerCase().includes(q) ||
      (r.cliente_nombre || '').toLowerCase().includes(q) ||
      r.destinatario_email.toLowerCase().includes(q) ||
      r.asunto.toLowerCase().includes(q) ||
      r.tipo_documento.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-bg-900 border border-bg-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-800 bg-bg-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">HISTORIAL DE COMUNICACIONES</h2>
              <p className="text-xs text-slate-400">Registro auditado de envíos, documentos y estado del servidor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-bg-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 border-b border-bg-800 bg-bg-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por ID, cliente, email, documento..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-bg-800 border border-bg-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-800 hover:bg-bg-700 text-xs font-semibold text-white border border-bg-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando historial de comunicaciones...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay registros de envío {filterText ? 'que coincidan con la búsqueda' : 'todavía'}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-bg-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-bg-700">
                  <tr>
                    <th className="px-3 py-2.5">ID / Fecha</th>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Cliente / Email</th>
                    <th className="px-3 py-2.5">Documentos</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5">IA Status</th>
                    <th className="px-3 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-800">
                  {filteredHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-800/40 transition-colors">
                      <td className="px-3 py-3 font-mono">
                        <span className="text-indigo-400 font-bold block">{r.id}</span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {r.fecha} {r.hora}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {r.tipo_documento}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-white block">{r.cliente_nombre || 'Cliente General'}</span>
                        <span className="text-slate-400 text-[11px]">{r.destinatario_email}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.documentos_enviados || []).map((doc, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-800 text-[11px] text-indigo-300 border border-bg-700">
                              <FileText className="w-3 h-3" /> {doc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.estado === 'enviado' && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Enviado
                          </span>
                        )}
                        {r.estado === 'fallido' && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30 text-[11px] font-medium">
                              <AlertTriangle className="w-3 h-3" /> Fallido
                            </span>
                            {r.ultimo_error && <p className="text-[10px] text-red-400/80 mt-1 max-w-[150px] truncate" title={r.ultimo_error}>{r.ultimo_error}</p>}
                          </div>
                        )}
                        {r.estado === 'pendiente' && (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-[11px] font-medium">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30 text-[10px] font-medium" title="Preparado para notificaciones de voz METIS">
                          <Bot className="w-3 h-3" /> METIS Ready
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {r.estado === 'fallido' ? (
                          <button
                            onClick={() => handleRetry(r.id)}
                            disabled={retryingId === r.id}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] font-semibold border border-amber-500/40 transition-colors flex items-center gap-1 ml-auto"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingId === r.id ? 'animate-spin' : ''}`} /> Reintentar
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-bg-800 bg-bg-900/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-800 hover:bg-bg-700 text-white rounded-lg text-xs font-semibold border border-bg-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
