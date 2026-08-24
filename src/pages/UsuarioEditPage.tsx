import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, Card, Button, Input } from '../components/UI'
import { ArrowLeft, Save, ShieldAlert, KeyRound, Briefcase, Award, CheckSquare, Square, Sparkles } from 'lucide-react'
import { usuarioService } from '../services/usuarioService'
import { configuracionService } from '../services/configuracionService'
import { getPerfil, hasRole } from '../services/authService'
import { useToast } from '../lib/ToastContext'
import type { Usuario, Rol, Especialidad, EpigrafeIAE, Permiso, Configuracion } from '../lib/types'

export function UsuarioEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'nuevo'
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Catálogos
  const [roles, setRoles] = useState<Rol[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [epigrafes, setEpigrafes] = useState<EpigrafeIAE[]>([])
  const [todosPermisos, setTodosPermisos] = useState<Permiso[]>([])
  const [posiblesJefes, setPosiblesJefes] = useState<Usuario[]>([])
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [totalUsuariosExistentes, setTotalUsuariosExistentes] = useState(0)

  // Formulario
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    rol_id: '',
    especialidad_id: '',
    epigrafe_iae_id: '',
    jefe_id: '',
    es_practicas: false,
    es_pro: false,
    activo: true,
    salario_base: 0,
    fecha_contratacion: new Date().toISOString().split('T')[0]
  })

  // Permisos seleccionados (IDs)
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([])

  const perfil = getPerfil()
  const esAdminOJefe = perfil?.esDeveloper || hasRole('ADMIN') || hasRole('JEFE_TALLER') || perfil?.rol?.toUpperCase().includes('JEFE') || perfil?.rol?.toUpperCase().includes('ADMIN')

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [rolesData, espData, epiData, permData, usersData, configData] = await Promise.all([
        usuarioService.obtenerRoles(),
        usuarioService.obtenerEspecialidades(),
        usuarioService.obtenerEpigrafesIAE(),
        usuarioService.obtenerTodosPermisos(),
        usuarioService.obtenerUsuarios(),
        configuracionService.obtenerConfiguracion().catch(() => null)
      ])

      setRoles(rolesData)
      setEspecialidades(espData)
      setEpigrafes(epiData)
      setTodosPermisos(permData)
      setConfig(configData)
      setTotalUsuariosExistentes(usersData.length)

      // Filtrar posibles jefes (usuarios con rol ADMIN, JEFE o ENCARGADO)
      const jefesFiltrados = usersData.filter(
        (u) =>
          u.id !== id &&
          (u.es_developer ||
            u.roles?.nombre?.toUpperCase().includes('JEFE') ||
            u.roles?.nombre?.toUpperCase().includes('ADMIN') ||
            u.roles?.nombre?.toUpperCase().includes('ENCARGADO'))
      )
      setPosiblesJefes(jefesFiltrados)

      // Si es edición, cargar datos del usuario
      if (!isNew && id) {
        const u = await usuarioService.obtenerUsuarioPorId(id)
        if (u) {
          setForm({
            nombre: u.nombre || '',
            email: u.email || '',
            telefono: u.telefono || '',
            password: '',
            rol_id: u.rol_id || '',
            especialidad_id: u.especialidad_id || '',
            epigrafe_iae_id: u.epigrafe_iae_id || '',
            jefe_id: u.jefe_id || '',
            es_practicas: u.es_practicas || false,
            es_pro: u.es_pro || false,
            activo: u.activo ?? true,
            salario_base: u.salario_base || 0,
            fecha_contratacion: u.fecha_contratacion ? u.fecha_contratacion.split('T')[0] : ''
          })

          const userPerms = await usuarioService.obtenerPermisos(id)
          setPermisosSeleccionados(userPerms)
        }
      } else {
        // En nuevo usuario, asignar el primer rol por defecto si existe
        if (rolesData.length > 0) {
          const defaultRol = rolesData.find((r) => r.nombre === 'OPERARIO_MECANICA') || rolesData[0]
          setForm((prev) => ({ ...prev, rol_id: defaultRol.id }))
        }
        if (espData.length > 0) {
          setForm((prev) => ({ ...prev, especialidad_id: espData[0].id }))
        }
      }
    } catch (err: any) {
      console.error('Error cargando datos de edición de usuario:', err)
      showToast('Error al cargar datos del formulario', 'error')
    } finally {
      setLoading(false)
    }
  }

  const limiteFree = config?.limite_usuarios_free ?? 3
  const proActivo = config?.pro_activo ?? false
  const limiteSuperado = isNew && !proActivo && totalUsuariosExistentes >= limiteFree

  const togglePermiso = (permisoId: string) => {
    setPermisosSeleccionados((prev) =>
      prev.includes(permisoId) ? prev.filter((p) => p !== permisoId) : [...prev, permisoId]
    )
  }

  const toggleAllPermisos = () => {
    if (permisosSeleccionados.length === todosPermisos.length) {
      setPermisosSeleccionados([])
    } else {
      setPermisosSeleccionados(todosPermisos.map((p) => p.id))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) {
      showToast('Por favor introduce el nombre y el correo electrónico', 'warning')
      return
    }

    if (isNew && limiteSuperado) {
      showToast(`Has alcanzado el límite de ${limiteFree} usuarios del plan FREE. Activa PRO para añadir más.`, 'error')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Usuario> = {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        rol_id: form.rol_id || null,
        especialidad_id: form.especialidad_id || null,
        epigrafe_iae_id: form.epigrafe_iae_id || null,
        jefe_id: form.jefe_id || null,
        es_practicas: form.es_practicas,
        es_pro: form.es_pro,
        activo: form.activo,
        salario_base: Number(form.salario_base) || 0,
        fecha_contratacion: form.fecha_contratacion || null
      }

      // Obtener el nombre del rol para mantener compatibilidad
      const selectedRolObj = roles.find((r) => r.id === form.rol_id)
      if (selectedRolObj) {
        payload.rol = selectedRolObj.nombre
      }

      let targetUserId = id
      if (isNew) {
        const nuevo = await usuarioService.crearUsuario({
          ...payload,
          password: form.password || undefined
        })
        targetUserId = nuevo.id
        showToast('Usuario creado correctamente', 'success')
      } else if (id) {
        await usuarioService.actualizarUsuario(id, payload)
        showToast('Usuario actualizado correctamente', 'success')
      }

      if (targetUserId) {
        await usuarioService.asignarPermisos(targetUserId, permisosSeleccionados)
      }

      navigate('/autorizados')
    } catch (err: any) {
      console.error('Error guardando usuario:', err)
      showToast('Error al guardar usuario: ' + (err.message || ''), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!esAdminOJefe) {
    return (
      <div>
        <PageHeader title="Editar Autorizado" subtitle="Acceso denegado">
          <button
            onClick={() => navigate('/autorizados')}
            className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
        </PageHeader>
        <Card className="p-8 text-center bg-rose-950/20 border-2 border-rose-500/40 rounded-3xl mt-4">
          <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Acceso No Autorizado</h2>
          <p className="text-sm text-slate-400">Solo administradores y jefes pueden gestionar empleados.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <PageHeader
        title={isNew ? 'Nuevo Autorizado (Empleado del Taller)' : `Editar Autorizado: ${form.nombre || ''}`}
        subtitle="Definición de rol jerárquico, especialidad, jefe directo y permisos del taller"
      >
        <button
          onClick={() => navigate('/autorizados')}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver a la lista de Autorizados"
          aria-label="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      {/* Alerta de Límite FREE si aplica */}
      {isNew && limiteSuperado && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-500/80 flex items-center gap-3 text-amber-200 text-sm">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block">Límite de autorizados del Plan FREE superado</span>
            <span>Has alcanzado el tope de {limiteFree} empleados autorizados. Pasa a la versión PRO en Configuración para añadir autorizados ilimitados.</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando datos del usuario...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Datos Personales y de Contacto */}
          <Card className="p-6 space-y-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Briefcase className="w-4 h-4" />
              <span>1. Datos Personales y Acceso</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Carlos Martínez"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico (Login) *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="carlos@dmcar.es"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="600 000 000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
                />
              </div>

              {isNew && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-cyan-400 outline-none"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 2. Jerarquía, Especialidad y Epígrafe IAE */}
          <Card className="p-6 space-y-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Award className="w-4 h-4" />
              <span>2. Jerarquía, Rol y Especialidad</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Rol Jerárquico */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Rol en el Taller</label>
                <select
                  value={form.rol_id}
                  onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} {r.descripcion ? `— ${r.descripcion}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Especialidad */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Especialidad</label>
                <select
                  value={form.especialidad_id}
                  onChange={(e) => setForm({ ...form, especialidad_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                >
                  <option value="">Sin especialidad específica</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jefe Directo */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Jefe / Responsable Directo</label>
                <select
                  value={form.jefe_id}
                  onChange={(e) => setForm({ ...form, jefe_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                >
                  <option value="">Sin jefe asignado (Autónomo / Jefe General)</option>
                  {posiblesJefes.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} ({j.roles?.nombre || j.rol || 'Jefe'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Epígrafe IAE */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Epígrafe IAE</label>
                <select
                  value={form.epigrafe_iae_id}
                  onChange={(e) => setForm({ ...form, epigrafe_iae_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:border-cyan-400 outline-none"
                >
                  <option value="">Seleccionar epígrafe IAE...</option>
                  {epigrafes.map((epi) => (
                    <option key={epi.id} value={epi.id}>
                      Epígrafe {epi.codigo} — {epi.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Switches de Estado y Modalidad */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
              {/* Acceso PRO */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.es_pro}
                  onChange={(e) => setForm({ ...form, es_pro: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Acceso PRO</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">Habilita funciones avanzadas</span>
                </div>
              </label>

              {/* En Prácticas */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.es_practicas}
                  onChange={(e) => setForm({ ...form, es_practicas: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Personal en Prácticas</span>
                  <span className="text-[10px] text-slate-400 block">Supervisión obligatoria</span>
                </div>
              </label>

              {/* Estado Activo */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-white block">Usuario Activo</span>
                  <span className="text-[10px] text-slate-400 block">Permite inicio de sesión</span>
                </div>
              </label>
            </div>
          </Card>

          {/* 3. Permisos Granulares */}
          <Card className="p-6 space-y-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>3. Permisos Específicos Granulares</span>
              </h3>
              <button
                type="button"
                onClick={toggleAllPermisos}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {permisosSeleccionados.length === todosPermisos.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>

            {todosPermisos.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay catálogo de permisos cargado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todosPermisos.map((p) => {
                  const isChecked = permisosSeleccionados.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePermiso(p.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="mt-0.5 text-cyan-400">
                        {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block uppercase tracking-wide">
                          {p.clave.replace('_', ' ')}
                        </span>
                        {p.descripcion && (
                          <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                            {p.descripcion}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Botones de Guardar / Cancelar */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || (isNew && limiteSuperado)}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Usuario'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
