Attribute VB_Name = "INICIO_SISTEMA"
Option Explicit

Public HoraAutoGuardado As Date

'=====================================================
' WBV - INICIALIZACI�N GENERAL DEL SISTEMA
'=====================================================

Public Sub InicializarSistemaCompleto()

    On Error Resume Next

    '=================================================
    ' 1. SEGURIDAD
    '=================================================

    Call IniciarBackupAutomatico
    Call Kiosko_ON

    '=================================================
    ' 2. USERS ENGINE
    '=================================================

    Call IniciarSistemaUsuarios

    '=================================================
    ' 3. MONITOR FISCAL
    '=================================================

    Call EjecutarMonitorFiscal

    '=================================================
    ' 4. SINCRONIZACI�N GENERAL
    '=================================================

    Call ActualizarEstadoSistema

    '=================================================
    ' 5. DASHBOARD
    '=================================================

    Call ActualizarAlertaFacturas
    Call ActualizarAlertaCitas
   '=================================================
' FUTURO MOTOR FISCAL
'=================================================
'
' ActualizarEstadoBotonesFiscales
'
' - IVA pendiente
' - Modelo 303
' - Modelo 130
' - Gastos pendientes
' - Facturas sin cobrar
' - Recordatorios fiscales
'
' Se implementar� dentro de M_FISCAL
'
    '=================================================
    ' 6. AUTOGUARDADO
    '=================================================

    Call ProgramarSiguienteAutoguardado

    '=================================================
    ' 7. WBV CLOUD
    '=================================================

    'Call ActualizarEstadoWBVCloud

    '=================================================
    ' 8. CONFIGURACI�N
    '=================================================

    'Call ActualizarEstadoConfiguracion

    '=================================================
    ' 9. WBV HELPER
    '=================================================

    'Call InicializarHelper

    '=================================================
    '10. IA
    '=================================================

    'Call InicializarIA

    '=================================================
    '11. OCR
    '=================================================

    'Call InicializarOCR

    '=================================================
    '12. VOZ
    '=================================================

    'Call InicializarVoice

    '=================================================
    '13. PANTALLA INICIAL
    '=================================================

    ThisWorkbook.Worksheets("INICIO").Activate

    On Error GoTo 0

End Sub

'=====================================================
' PROGRAMA EL SIGUIENTE AUTOGUARDADO
'=====================================================

Public Sub ProgramarSiguienteAutoguardado()

    On Error Resume Next

    HoraAutoGuardado = Now + TimeValue("00:15:00")

    Application.OnTime _
        EarliestTime:=HoraAutoGuardado, _
        Procedure:="AutoGuardado_Si_Hay_Cambios"

    On Error GoTo 0

End Sub

