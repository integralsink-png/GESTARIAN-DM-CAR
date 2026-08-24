import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, EmptyState, Badge } from '../components/UI'
import { UserCog, Plus, ArrowLeft, Edit2, ShieldAlert, Sparkles, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import { usuarioService } from '../services/usuarioService'
import { configuracionService } from '../services/configuracionService'
import { getPerfil, hasRole } from '../services/authService'
import { useToast } from '../lib/ToastContext'
import type { Usuario, Configuracion } from '../lib/types'

export function UsuariosPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)

  const perfil = getPerfil()
  const esAdminOJefe = perfil?.esDeveloper || hasRole('ADMIN') || hasRole('JEFE_TALLER') || perfil?.rol?.toUpperCase().includes('JEFE') || perfil?.rol?.toUpperCase().includes('ADMIN')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [usersData, configData] = await Promise.all([
        usuarioService.obtenerUsuarios(),
        configuracionService.obtenerConfiguracion().catch(() => null)
      ])
      setUsuarios(usersData)
      setConfig(configData)
    } catch (err: any) {
      console.error('Error cargando usuarios:', err)
      showToast('Error al cargar la lista de usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActivo(u: Usuario) {
    const nuevoEstado = !u.activo
    try {
      await usuarioService.toggleActivo(u.id, nuevoEstado)
      setUsuarios((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, activo: nuevoEstado } : item))
      )
      showToast(nuevoEstado ? 'Usuario reactivado' : 'Usuario desactivado', 'success')
    } catch (err: any) {
      showToast('Error al cambiar estado del usuario', 'error')
    }
  }

  const limiteFree = config?.limite_usuarios_free ?? 3
  const proActivo = config?.pro_activo ?? false
  const totalUsuarios = usuarios.length
  const limiteSuperado = !proActivo && totalUsuarios >= limiteFree

  const rolColor = (r?: string | null): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
    const rolUpper = (r || '').toUpperCase()
    if (rolUpper.includes('ADMIN')) return 'red'
    if (rolUpper.includes('JEFE')) return 'blue'
    if (rolUpper.includes('ENCARGADO')) return 'yellow'
    if (rolUpper.includes('OPERARIO')) return 'green'
    return 'gray'
  }

  if (!esAdminOJefe) {
    return (
      <div>
        <PageHeader title="Autorizados" subtitle="Personal y empleados autorizados del taller">
          <button
            onClick={() => navigate('/configuracion')}
            className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            title="Volver a Configuración"
            aria-label="Volver"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
        </PageHeader>
        <Card className="p-8 text-center bg-rose-950/20 border-2 border-rose-500/40 rounded-3xl mt-4">
          <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Solo el usuario titular del taller (jefe/administrador) puede gestionar los empleados autorizados.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Personal Autorizado" subtitle="Empleados, mecánicos y operarios autorizados por el titular del taller">
        <button
          onClick={() => navigate('/configuracion')}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver a Configuración"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Banner de Estado del Plan y Contador de Empleados */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
            proActivo
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          }`}>
            {proActivo ? <Sparkles className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">
                PLAN GESTARIAN: {proActivo ? 'MODO PRO (ACTIVADO)' : 'MODO FREE'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                proActivo ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-slate-800 text-slate-300'
              }`}>
                {proActivo ? 'AUTORIZADOS ILIMITADOS' : `${totalUsuarios} / ${limiteFree} AUTORIZADOS`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {proActivo
                ? 'Suscripción PRO activa: puedes dar de alta empleados y operarios sin límite.'
                : `Plan gratuito: limitado a un máximo de ${limiteFree} empleados autorizados.`}
            </p>
          </div>
        </div>

        {/* Botón Nuevo Autorizado */}
        <button
          onClick={() => {
            if (limiteSuperado) {
              showToast(`Límite del plan FREE alcanzado (${limiteFree} autorizados). Pasa a PRO para dar de alta más empleados.`, 'warning')
              return
            }
            navigate('/autorizado-edit/nuevo')
          }}
          className={`px-5 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all uppercase tracking-wider shadow-lg active:scale-95 shrink-0 ${
            limiteSuperado
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 border border-white/40 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          }`}
          title={limiteSuperado ? 'Límite FREE superado' : 'Añadir nuevo empleado autorizado'}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Autorizado</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Cargando empleados autorizados del taller...
        </div>
      ) : usuarios.length === 0 ? (
        <EmptyState
          icon={<UserCog className="w-12 h-12 text-cyan-400" />}
          title="No hay empleados autorizados registrados"
          subtitle="Crea los empleados y asigna roles (jefe, encargados, mecánicos, etc.)"
        />
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => {
            const rolNombre = u.roles?.nombre || u.rol || 'OPERARIO'
            const espNombre = u.especialidades?.nombre?.replace('_', ' ') || 'General'
            const jefeNombre = u.jefe?.nombre || (u.jefe_id ? 'Jefe asignado' : '—')

            return (
              <Card
                key={u.id}
                className={`p-4 sm:p-5 border-2 transition-all rounded-2xl bg-slate-900/90 ${
                  !u.activo
                    ? 'border-slate-800 opacity-60'
                    : 'border-slate-800/80 hover:border-cyan-500/50 shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Datos del Usuario */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-extrabold text-white text-base sm:text-lg tracking-wide">
                        {u.nombre}
                      </span>
                      <Badge text={rolNombre} color={rolColor(rolNombre)} />
                      {u.es_pro && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          PRO
                        </span>
                      )}
                      {u.es_practicas && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          EN PRÁCTICAS
                        </span>
                      )}
                      {!u.activo && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          INACTIVO
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 mt-2">
                      <div>
                        <span className="text-slate-500 font-semibold block">Email / Contacto:</span>
                        <span className="text-slate-300">{u.email}</span>
                        {u.telefono && <span className="text-slate-400 ml-1">· {u.telefono}</span>}
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block">Especialidad:</span>
                        <span className="text-cyan-300 font-bold uppercase">{espNombre}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block">Jefe Directo:</span>
                        <span className="text-slate-300">{jefeNombre}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-0 border-slate-800 shrink-0">
                    <button
                      onClick={() => navigate(`/autorizado-edit/${u.id}`)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                      title="Editar usuario y permisos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleActivo(u)}
                      className={`px-3.5 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                        u.activo
                          ? 'bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      }`}
                      title={u.activo ? 'Desactivar acceso' : 'Reactivar acceso'}
                    >
                      {u.activo ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Desactivar</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Reactivar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
