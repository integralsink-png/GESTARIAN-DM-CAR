# GESTARIAN - Resumen de Análisis (sesión 20/07/2026)

## Stack confirmado
- React + Vite + PWA + Capacitor + Supabase
- Supabase como backend desde el MVP
- Monotaller estricto pero con `taller_id` preparado para futuro multiorg
- Auth con Supabase (email/password) + permisos por acción
- Tema oscuro + paleta de estados (verde/naranja/rojo/azul)
- Licencias/activación aplzadas
- Tablas hijas en la primera migración (líneas, notas, imágenes)
- **Framework móvil: React + Capacitor** (decisión 21/07, descarta ADR-001 Flutter)

## Decisiones del usuario (20/07)
- Notas de factura: acceso oculto/discreto, botón "ver notas" dentro de cada factura
- Sin cobros parciales por concepto: estado de pago como campo en `facturas_emitidas`, NO tabla hija
- El zip de capturas llegó vacío (0 bytes), pendiente de resubir

## Flujo de negocio confirmado (Módulo2.bas)
BASE DE DATOS → GenerarPresupuestoDesdeBaseDatos → hoja PRESUPUESTOS → Registrar_Presupuesto_DM (REGISTRO PRESUPUESTOS, estado PENDIENTE) → Toggle_Aceptar_Presupuesto (ACEPTADO) → Generar_Cita (valida ACEPTADO, importe×1,21, inserta en CITAS estado PENDIENTE) → Enviar_A_Reparaciones (valida "Confirmada", inserta en REPARACIONES, marca cita "Finalizada") → Generar_Factura (desde REPARACIONES) → Registrar_Factura_Desde_Facturas (REGISTRO FACTURAS + BALANCES)

## Hallazgos VBA clave
- **Facturas emitidas** (M_ESTADOS_FACTURAS.bas): estados PENDIENTE/EMAIL/EN MANO/ABONADA/PARCIAL/IMPAGADA. Sin desglose de importes por concepto.
- **Versiones de factura** (MOD_FACTURAS.bas:175): F00003 → F00003A → F00003B. Original archivada, nueva sustituye para gestoría, incidencia automática. Modelar `facturas_emitidas.version` o tabla de versiones.
- **Facturas recibidas** (PROVEEDORES.bas + REGISTRO FACTURAS PROVEEDORES): numeración 2026/101, base/IVA/total por fórmula, estado Pendiente/Validada. Separar `facturas_emitidas` / `facturas_recibidas`.
- **Incidencias** (MOD_INCIDENCIAS.bas): ID INC00001, tipos (sanción, queja, modificación factura), prioridad ALTA/MEDIA/BAJA con colores, estado ABIERTA/PENDIENTE, responsable. Entidad propia.
- **Usuarios** (M_USERS.bas): niveles numéricos (1, 9), dispositivo/usuario Windows, activar/desactivar. Sin passwords reales. **Reemplazado por modelo de permisos granular** (ver below).
- **Fotos** (MOD_FOTOS.bas): clasificación ANTES/DESPUÉS (2 fases, decisión usuario 21/07). Carpeta por matrícula. `reparacion_imagenes.fase = ANTES|DESPUES`.
- **Configuración** (MOD_CONFIG.bas): motor central por nombre de concepto (licencia, UUID, Gmail). Tabla config clave-valor.
- **Balances** (MOD_BALANCES.bas): filtra por trimestre/año y estado, informe IVA trimestral Excel+PDF. IVA repercutido (emitidas) vs soportado (recibidas). Vista calculada, no entidad. Tabla informes solo metadatos.

## Modelo de datos revisado
- `factura_cobros` RETIRADA. Estado de pago como campo en `facturas_emitidas`.
- `facturas_emitidas` y `facturas_recibidas` separadas.
- `reparacion_notas` como tabla hija, acceso vía botón oculto "ver notas".
- Versiones de factura modeladas.
- `incidencias` como entidad propia.
- `informes` solo metadatos; balances son vista calculada.

## Entidades principales (Document Master cap. 4)
CLIENTES, VEHICULOS, PRESUPUESTOS, CITAS, REPARACIONES, FACTURAS, PROVEEDORES, INFORMES, EXPEDIENTES DOCUMENTALES

## Reglas de integridad
- No facturas sin reparación
- No reparaciones sin presupuesto aceptado
- No vehículos sin cliente
- No citas sin vehículo
- No informes sin factura cuando correspondan

## Document Master cap. 7-15 + anexos (leídos 21/07)

### Cap. 7 - Roadmap de desarrollo
- Fase 0 (DM CAR): COMPLETADO. Fase 1 (Desktop): EN DESARROLLO.
- Fases 2-6: Mobile, IA, Gestoría, Cloud, Ecosistema.
- Prioridades: 1.Estabilidad 2.Facilidad 3.Automatización 4.IA 5.Escalabilidad.
- Regla: toda nueva función debe aportar valor, reducir trabajo admin e integrarse con arquitectura existente.
- Rev.1.1: Desktop=flujo administrativo, Mobile=flujo operativo. Misma arquitectura de datos.
- Rev.1.2: pantalla principal móvil = CAPTURA RÁPIDA (cámara, micro, OCR, IA).

### Cap. 8 - Backlog general
- P0 Arquitectura: IDs únicos (ID_EXPEDIENTE, ID_CLIENTE, etc.), revisar relaciones, eliminar duplicados, preparar estructura BD.
- P0 Desktop: limpiar VBA, eliminar duplicados, optimizar búsquedas.
- P0 Interfaz: revisar shapes, nombres, tamaños, Full HD, zoom 100%.
- P0 Documentación: finalizar Document Master, Roadmap, Backlog.
- P1: gestión documental, presupuestos (fotos, versiones, aceptación), reparaciones (fotos ANTES/DURANTE/DESPUÉS, estados), facturación (cobros, estados, vencimientos), gestoría (Drive, IVA, IRPF, Sage, A3), seguridad (licencias, activación).
- P2: Mobile (Flutter), OCR, IA, Cloud.
- P3: CRM, agenda inteligente, predictiva, cuadros de mando, marketplace, API pública.
- Rev.1.3: Desktop sube imágenes manualmente, Mobile captura automática.
- Rev.1.4: presupuesto con imágenes sin aceptar; reparaciones fotos ANTES/DESPUÉS (decisión usuario 21/07: 2 fases, no 3).
- Rev.1.5: única arquitectura de datos para todas las plataformas.

### Cap. 9 - Modelo comercial
- 90 días prueba gratuita Desktop.
- Plan Desktop: 20€/mes. Plan PRO: 60€/mes (Desktop+Mobile+OCR+IA+captura+sincronización).
- Sin permanencias. Cancelación flexible.
- Cliente objetivo: talleres independientes chapa y pintura → luego multimarca, mecánica, industriales, motos.

### Cap. 10 - Estrategia comercialización
- Red de agentes comerciales, partners estratégicos (distribuidores pintura/recambios), gestorías colaboradoras.
- Distribuidores por zona geográfica. Sistema de comisiones.
- Expansión sectorial post-automoción: fontanería, electricidad, construcción, etc.

### Cap. 11 - METIS (motor IA)
- Transversal a todas las plataformas. No sustituye criterio profesional.
- Módulos: OCR, Vision, Voice, Documents, Assistant, Accounting, Automation, Learning.
- Toda propuesta de IA debe poder aceptarse/modificarse/rechazarse.
- Rev.2.1: toda funcionalidad IA forma parte de METIS, no soluciones independientes.

### Cap. 12 - Seguridad y licencias
- Licencias por instalación (prueba, Desktop, PRO, multiusuario, multiempresa).
- Control de versiones, copias seguridad, control de acceso por niveles (admin, gerencia, recepción, operario, gestoría).
- Auditoría de operaciones relevantes.
- Rev.2.2: seguridad por fases, priorizar estabilidad primero.

### Cap. 13 - Estándares de desarrollo
- Arquitectura oficial: GESTARIAN → CORE → METIS → Desktop/Mobile/Cloud.
- IDs únicos obligatorios. No duplicar datos. Document Master = fuente de verdad.
- Rev.2.3: en conflicto código vs Document Master, prevalece Document Master.

### Cap. 14 - Principios no negociables
- Usuario es prioridad. Simplicidad. No duplicar. Una sola fuente de verdad.
- Escalabilidad, modularidad, compatibilidad (Desktop/Mobile/Cloud/METIS/CORE).
- Automatización con validación humana. UX limpia. Evolución controlada.
- Documentación obligatoria (Document Master, Roadmap, Backlog, revisiones).

### Cap. 15 - Visión estratégica 2026-2035
- Plataforma inteligente adaptable a sectores. Ecosistema: CORE, METIS, Desktop, Mobile, Cloud, Portales, APIs.
- Rev.3.0: Document Master completado, referencia oficial.

### Anexos
- **Anexo A**: Prompt maestro para IAs (respetar Document Master, no decisiones autónomas).
- **Anexo B**: Convenciones: carpetas en inglés, variables descriptivas, constantes MAYÚSCULAS, IDs con `ID_`, funciones <100 líneas, comentarios solo cuando necesarios.
- **Anexo C**: Reglas para Cursor (analizar antes de modificar, no eliminar funcionalidades, no cambios silenciosos, elegir solución más sencilla, comprobar compilación/errores/dependencias).
- **Anexo D**: Filosofía: ahorrar tiempo, no más funciones. Simplicidad como ventaja competitiva.
- **ADR-001** (17/07/2026): Migración Flet→Flutter. **DESCARTADO** (decisión 21/07): framework móvil = React + Capacitor.

### BACKLOG_1507.txt (resumen)
- BL-0001 a BL-0025. Alta: auditoría XLSM, clasificación CORE, docs funcional, flujos info, atribuciones, escalado, trazabilidad. Media: OCR, Mobile, IA, multiorg, supervisores. Baja: sync Drive, backlog/roadmap IA, panel ejecutivo, SaaS, Cloud, API pública.
- DEC-0001 a DEC-0005: GESTARIAN producto principal, DM CAR piloto, estructura documental numerada, Google Drive repositorio principal.
- Raíz documental: 00_DIRECCION, 01_IDENTIDAD, 02_CORE, 03_MOBILE, 04_OCR_ENGINE, 05_AI_ENGINE, 06_PILOTOS, 07_CLIENTES, 08_DEPLOYMENTS, 99_BACKUP.

### ROADMAP_GESTARIAN.txt (resumen)
- Fase 0 Fundación: [X] definiciones, [ ] auditoría XLSM, [ ] núcleo reutilizable.
- Fase 1 Consolidación piloto: [ ] auditoría VBA/UserForms/macros/shapes, [ ] clasificación CORE, [ ] limpieza, [ ] docs funcional.
- Fases 2-9: OCR, Mobile (Flutter), IA, Governance, Multiorg, Licitaciones, Primer cliente real, Escalado SaaS/Cloud/API.

### WBV_AUDITORIA_OBJETOS.txt (convertido a UTF-8, 632 líneas)
- Inventario completo de shapes/botones/ActiveX por hoja del XLSM (190714.xlsm).
- Hoja INICIO: ~26 objetos (botones navegación, radio, tooltip, media player, fullscreen).
- Pendiente de lectura detallada para mapear UI actual → MVP.

## DECISIONES RESUELTAS
1. **Fotos reparación** (21/07): ANTES/DESPUÉS (2 fases). El VBA (ANTERIORES/POSTERIORES) tenía razón. Document Master Rev.1.4 (3 fases) descartado.
2. **Framework móvil** (21/07): React + Capacitor. ADR-001 (Flutter) descartado.
3. **Roles y permisos MVP** (21/07): 3 roles + permisos por acción toggleable por usuario.

## CONFLICTOS PENDIENTES
(ninguno pendiente)

## Análisis VBA (módulos clave leídos 21/07)

### MOD_CLIENTES.bas - VACÍO
- Sólo atributo, sin código. La lógica de clientes no existe como módulo.
- Los datos de cliente se manejan por búsqueda directa en hoja BASE DE DATOS.

### MOD_FOTOS.bas (109 líneas)
- Cuenta fotos en carpetas ANTES/DESPUÉS por matrícula.
- Actualiza columna G de REPARACIONES con "Antes", "Después" o "Antes y después".
- **Decisión usuario 21/07**: 2 fases (ANTES/DESPUÉS). El VBA tenía razón.

### MOD_INCIDENCIAS.bas (180 líneas)
- ID formato: INC##### (SiguienteIDIncidencia).
- Hoja formulario: "ALTA INCIDENCIA" (shapes + rangos F5:F14).
- Hoja registro: "INCIDENCIAS" columnas B-L.
- Campos: ID, fecha, usuario, matrícula, vehículo, motivo, descripción, prioridad (ALTA/MEDIA/BAJA), responsable, estado (ABIERTA).
- Color por prioridad: ALTA=rojo, MEDIA=ámbar, BAJA=azul.
- Auto-orden descendente por ID.

### M_USERS.bas (166 líneas) - WBV USERS ENGINE v3.0 MODO DESARROLLO
- NivelActual=9 HARDCODED (todos los permisos). Sin login real.
- Usa Environ("COMPUTERNAME") y Environ("USERNAME") para identificar dispositivo/usuario.
- Activar/desactivar usuario por color de celda (verde=activo, rojo=inactivo).
- RegistrarDispositivo guarda equipo y usuario Windows en columnas H,I.
- TieneNivel(Minimo) compara NivelActual >= Minimo.
- **No hay autenticación real**: sólo identidad de Windows.

### MOD_CONFIG.bas (131 líneas) - WBV ENGINE
- Motor central de configuración. Hoja CONFIGURACION, columna D=concepto, E=valor.
- API limpia: cfg(Concepto), CFG_Write(Concepto, Valor), CFG_Existe(), CFG_Clear().
- Buen patrón: ningún módulo debe acceder directamente a celdas.

### MOD_SEGURIDAD.bas (22 líneas) - MINIMAL
- Proteger/Desproteger estructura del libro con password "1234".
- Sin encriptación, sin RLS, sin autenticación real.

### MOD_FACTURAS.bas (1063 líneas) - Módulo más grande
- **Generar_Factura**: desde fila de REPARACIONES, obtiene nF (F#####), carga cliente/vehículo de BASE DE DATOS por matrícula, importa líneas de REGISTRO PRESUPUESTOS.
- **SiguienteNumeroFactura**: F##### (scan REGISTRO FACTURAS, max+1).
- **SiguienteVersionFactura**: anexa A,B,C... para modificaciones.
- **Registrar_Factura_Desde_Facturas**: valida duplicados (mismo concepto + importe + matrícula), escribe en REGISTRO FACTURAS + BALANCES, auto-ordena desc, genera PDF.
- **Modificar_Factura**: flujo dos clics (1º marca MODIFY, 2º registra nueva versión).
- **CambiarEstadoFactura**: ciclo PENDIENTE→ABONADA→PARCIAL→IMPAGADA→PENDIENTE.
- **AutoGuardar_PDF**: guarda en Documents\TALLER MIGUEL\FACTURAS EMITIDAS\YYYY\TQ.
- **Estados factura**: PENDIENTE (negro), ABONADA (verde), PARCIAL (azul), IMPAGADA (rojo).
- **Detección duplicados**: concepto + importe + matrícula idénticos.
- **DUPLICACIÓN DE CÓDIGO**: RutaFacturasDM/RutaFacturasModificadasDM hardcodean "TALLER MIGUEL" en vez de usar MOD_RUTAS.

### MOD_RUTAS.bas (240 líneas) - WBV ENGINE v4.0 UNIFICADO
- Usa MOD_CONFIG para RUTA RAIZ LOCAL / RUTA RAIZ CLOUD.
- Funciones: RutaFacturasEmitidas, RutaFacturasRecibidas, RutaInformes, RutaVehiculoDM, RutaOCRFacturas.
- AsegurarRuta crea árbol completo. SincronizarCloud copia archivos.
- Crea carpetas ANTES/DESPUÉS automáticamente en RutaVehiculoDM.
- **PROBLEMA**: MOD_FACTURAS y MOD_BALANCES ignoran MOD_RUTAS y hardcodean sus propias rutas.

### MOD_BALANCES.bas (378 líneas)
- FiltrarBalanceTrimestral: filtra por trimestre/año + estado. Usa diccionarios para dedup.
- CicloFiltroEstadoBalances: TODAS→IMPAGADAS→PARCIAL→PENDIENTE→ABONADAS→TODAS.
- VerFacturaDesdeBalances: carga factura desde REGISTRO FACTURAS a hoja FACTURAS.
- Generar_Informe_IVA_Trimestral: crea Excel+PDF con IVA repercutido vs soportado.
- **BUG**: Range("B5:00") en ResetearDatosBalances (debería ser "B5:O2000").
- **DUPLICACIÓN**: RutaInformesTrimestralesDM hardcodeada (ignora MOD_RUTAS).

### INICIO_SISTEMA.bas (129 líneas)
- InicializarSistemaCompleto: orquesta arranque.
- Activos: backup automático, kiosk mode, users engine, monitor fiscal, estado sistema, alertas (facturas, citas), autoguardado 15min.
- Comentados (futuro): WBV Cloud, Configuración, Helper, IA, OCR, Voz.
- Autoguardado cada 15 min vía Application.OnTime.

### Hallazgos arquitectónicos VBA
- **Sin módulo de clientes**: MOD_CLIENTES vacío. Cliente se busca directo en BASE DE DATOS.
- **Sin auth real**: NivelActual=9 hardcoded, identidad Windows sólo.
- **Seguridad mínima**: password "1234".
- **Duplicación de rutas**: MOD_FACTURAS y MOD_BALANCES no usan MOD_RUTAS.
- **IDs**: INC##### (incidencias), F##### (facturas), P##### (presupuestos implícito).
- **Estados factura**: PENDIENTE/ABONADA/PARCIAL/IMPAGADA con colores.
- **Estados incidencia**: ABIERTA + prioridad ALTA/MEDIA/BAJA.
- **Almacenamiento**: todo en hojas Excel (BASE DE DATOS, REPARACIONES, FACTURAS, REGISTRO FACTURAS, REGISTRO PRESUPUESTOS, BALANCES, INCIDENCIAS, ALTA INCIDENCIA, CONFIGURACION, USUARIOS, MIS DATOS).
- **Bug**: typo Range("B5:00") en MOD_BALANCES.

### Mapeo hojas Excel → entidades MVP
| Hoja | Entidad | Columnas clave |
|------|---------|---------------|
| BASE DE DATOS | Vehículos + Clientes | C=matrícula, D=marca, E=modelo, H=cliente, I=DNI, J=dirección, K=teléfono |
| REPARACIONES | Reparaciones | B=nº presupuesto, C=matrícula, G=estado fotos |
| FACTURAS | Factura (form) | D9=nº factura, J9=fecha, J14=matrícula, C20:J37=líneas, J46-48=totales |
| REGISTRO FACTURAS | Líneas de factura | B=nº factura, C=cliente, D=matrícula, E/F=marca/modelo, G=concepto, H=cant, I=precio, J=importe, K=fecha, L=estado, M=nº presupuesto, N=flag modificación |
| REGISTRO PRESUPUESTOS | Líneas de presupuesto | B=nº presupuesto, G=concepto, H=cant, I=precio |
| BALANCES | Totales facturas emitidas/recibidas | B-F=emitidas, O-S=recibidas |
| INCIDENCIAS | Incidencias | B=ID, C=fecha, D=usuario, E=matrícula, F=vehículo, G=motivo, H=desc, I=prioridad, J=responsable, K=estado, L=notas |
| ALTA INCIDENCIA | Form incidencia | F5:F14 campos form, shape numeroincidencia |
| CONFIGURACION | Parámetros sistema | D=concepto, E=valor |
| USUARIOS | Usuarios | A=estado(color), H=dispositivo, I=usuario Windows |
| MIS DATOS | Datos empresa | F5=nombre, F6=CIF |

## Pendiente de leer (VBA)
- M_CONFIGURACION.bas, MIS_DATOS.bas (datos empresa)
- PROVEEDORES.bas, RFP.bas (facturas proveedores)
- MOD_DOCUMENTOS.bas, MOD_EMPRESA.bas
- MOD_ESTADO_SISTEMA.bas (monitor fiscal/dashboard)
- M_ESTADOS_FACTURAS.bas, M_ALERTAS_FACTURAS.bas
- M_DASHBOARD.bas, M_SINCRONIZACION.bas, M_WBV_CLOUD.bas
- MODULO_REPARACIONES_DM_CAR.bas (lógica reparaciones)
- MODULO_EMAIL_DM_CAR.bas (email)
- POPOVERS.bas, MODULO_POPOVERS.bas, POPOVER_ACTIONS.bas (UI)
- FULLSCREEN.bas, MOD_UI_CORE.bas, MOD_FORMS.bas
- MOD_VISOR_V2.bas, MOD_VISOR_FACTURAS.bas (visores)
- M_MEDIA.bas (media player)
- ThisWorkbook.cls (eventos libro)
- Hoja*.cls (eventos por hoja - 23 hojas)
- WBV_AUDITORIA_OBJETOS_utf8.txt (detalle shapes)
- Capturas de pantalla (resubir zip, llegó vacío)

## Modelo de roles y permisos (decisión 21/07)

### Roles
| Rol | Descripción |
|-----|-------------|
| **jefe** | Acceso total a todas las pantallas y acciones. Todas las acciones activadas por defecto. |
| **encargado** | Acceso operativo: cámara fotos reparaciones, micrófono audios trabajo, subir fotos facturas proveedores, email a clientes (no a gestoría). |
| **operario** | Acceso mínimo: solo cámara para subir fotos de reparaciones. |

### Pantallas por rol
- **5 pantallas base** (todas visibles para jefe): Inicio, Clientes, Reparaciones, Facturas, Incidencias
- **Pantallas adicionales solo jefe**: Usuarios, Configuración, Balances, Proveedores, Presupuestos, Citas, Datos Empresa
- **operario**: ve solo Reparaciones (con cámara)
- **encargado**: ve Reparaciones (cámara+micrófono), Facturas Recibidas (subir fotos), email a clientes

### Lista completa de acciones (permisos toggleable en página USUARIOS)
Cada usuario tiene todas las acciones con toggle ON/OFF. Defaults según rol.

| # | Acción (clave) | Descripción | operario | encargado | jefe |
|---|----------------|-------------|----------|-----------|------|
| 1 | `camara_reparacion` | Subir fotos de reparaciones (cámara) | ON | ON | ON |
| 2 | `micro_trabajo` | Subir audios de trabajo a realizar (micrófono) | OFF | ON | ON |
| 3 | `fotos_facturas_proveedores` | Subir fotos de facturas recibidas de proveedores | OFF | ON | ON |
| 4 | `email_clientes` | Enviar email a clientes | OFF | ON | ON |
| 5 | `email_gestoria` | Enviar email a gestoría | OFF | OFF | ON |
| 6 | `ver_clientes` | Ver/gestionar clientes y vehículos | OFF | OFF | ON |
| 7 | `ver_presupuestos` | Ver/gestionar presupuestos | OFF | OFF | ON |
| 8 | `ver_citas` | Ver/gestionar citas | OFF | OFF | ON |
| 9 | `ver_reparaciones` | Ver/gestionar reparaciones | ON | ON | ON |
| 10 | `ver_facturas_emitidas` | Ver/gestionar facturas emitidas | OFF | OFF | ON |
| 11 | `ver_facturas_recibidas` | Ver/gestionar facturas recibidas | OFF | ON | ON |
| 12 | `ver_balances` | Ver/gestionar balances e informes IVA | OFF | OFF | ON |
| 13 | `ver_incidencias` | Ver/gestionar incidencias | OFF | OFF | ON |
| 14 | `ver_proveedores` | Ver/gestionar proveedores | OFF | OFF | ON |
| 15 | `ver_usuarios` | Ver/gestionar usuarios y permisos | OFF | OFF | ON |
| 16 | `ver_configuracion` | Ver/gestionar configuración del sistema | OFF | OFF | ON |
| 17 | `ver_datos_empresa` | Ver/gestionar datos de la empresa | OFF | OFF | ON |
| 18 | `ver_notas_factura` | Ver notas internas de factura | OFF | OFF | ON |
| 19 | `cambiar_estado_factura` | Cambiar estado de pago de facturas | OFF | OFF | ON |
| 20 | `modificar_factura` | Modificar facturas ya registradas | OFF | OFF | ON |
| 21 | `imprimir_factura` | Imprimir facturas | OFF | OFF | ON |
| 22 | `generar_informe_iva` | Generar informes IVA trimestrales | OFF | OFF | ON |
| 23 | `registrar_incidencia` | Crear nuevas incidencias | OFF | ON | ON |
| 24 | `gestionar_usuarios` | Crear/editar/activar/desactivar usuarios | OFF | OFF | ON |
| 25 | `exportar_datos` | Exportar datos a Excel/PDF | OFF | OFF | ON |

### UI página USUARIOS
- Lista de usuarios (tabla).
- Click en un usuario → se despliega debajo un panel con todas las acciones (toggle ON/OFF cada una).
- Cambios se guardan en `usuario_permisos` (tabla Supabase).
- El jefe no puede desactivar sus propios permisos (lock de seguridad).
- Acceso a la página USUARIOS requiere permiso `ver_usuarios`.

### Esquema BD permisos
```sql
-- Tabla: usuarios (metadatos)
-- Tabla: usuario_permisos (usuario_id, accion, activa BOOL)
-- Defaults aplicados al crear usuario según rol
-- RLS: usuario ve sus permisos, jefe ve todos
```

## Archivos en el proyecto
- 190715.xlsm (6.7MB)
- LEEME_PRIMERO.docx, GESTARIAN_DOCUMENTO_MAESTRO.docx, BACKLOG_1507.docx, ROADMAP_GESTARIAN.docx
- WBV_AUDITORIA_OBJETOS.txt
- vba1907.zip
- capturas_GESTARIAN_desktop.zip (vacío)
- _extracted/ (textos extraídos + vba/ con 71 módulos)
