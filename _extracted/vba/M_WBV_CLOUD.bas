Attribute VB_Name = "M_WBV_CLOUD"
Option Explicit

'=====================================================
' WBV CLOUD ENGINE v1.0
'=====================================================
' Motor de servicios online
' Licencias
' Suscripciones
' Productos
' Dispositivos
' Sincronizaci�n
'=====================================================

'-----------------------------------------------------
' ACTUALIZAR WBV CLOUD
'-----------------------------------------------------

Public Sub ActualizarWBVCloud()

    Application.ScreenUpdating = False

    On Error GoTo Salida

    Call EstadoCloud
    Call EstadoLicencia
    Call EstadoSuscripcion
    Call EstadoProductos
    Call EstadoDispositivos
    Call EstadoServidor
    Call EstadoSincronizacion
    Call EstadoGeneralCloud

Salida:

    Application.ScreenUpdating = True

End Sub

'=====================================================
' CLOUD
'=====================================================

Public Sub EstadoCloud()

    On Error Resume Next

    'Comprobaci�n conexi�n WBV Cloud

End Sub

'=====================================================
' LICENCIA
'=====================================================

Public Sub EstadoLicencia()

    On Error Resume Next

    'Licencia local

End Sub

'=====================================================
' SUSCRIPCI�N
'=====================================================

Public Sub EstadoSuscripcion()

    On Error Resume Next

    'Comprobaci�n suscripci�n

End Sub

'=====================================================
' PRODUCTOS
'=====================================================

Public Sub EstadoProductos()

    On Error Resume Next

    'Productos contratados

End Sub

'=====================================================
' DISPOSITIVOS
'=====================================================

Public Sub EstadoDispositivos()

    On Error Resume Next

    'Equipos registrados

End Sub

'=====================================================
' SERVIDOR
'=====================================================

Public Sub EstadoServidor()

    On Error Resume Next

    'Estado servidor WBV

End Sub

'=====================================================
' SINCRONIZACI�N
'=====================================================

Public Sub EstadoSincronizacion()

    On Error Resume Next

    'Estado sincronizaci�n

End Sub

'=====================================================
' ESTADO GENERAL
'=====================================================

Public Sub EstadoGeneralCloud()

    On Error Resume Next

    'Calcular estado global

End Sub

'=====================================================
' COMPROBAR LICENCIA
'=====================================================

Public Function ComprobarLicencia() As Boolean

    On Error Resume Next

    ComprobarLicencia = True

End Function

'=====================================================
' COMPROBAR SUSCRIPCI�N
'=====================================================

Public Function ComprobarSuscripcion() As Boolean

    On Error Resume Next

    ComprobarSuscripcion = True

End Function

'=====================================================
' COMPROBAR DISPOSITIVOS
'=====================================================

Public Function ComprobarDispositivos() As Boolean

    On Error Resume Next

    ComprobarDispositivos = True

End Function

'=====================================================
' COMPROBAR PRODUCTOS
'=====================================================

Public Function ComprobarProductos() As Boolean

    On Error Resume Next

    ComprobarProductos = True

End Function

'=====================================================
' REGISTRAR DISPOSITIVO CLOUD
'=====================================================

Public Sub RegistrarDispositivoCloud()

    On Error Resume Next

    'Pendiente servidor

End Sub

'=====================================================
' SINCRONIZAR CLOUD
'=====================================================

Public Sub SincronizarCloud()

    Call ActualizarWBVCloud

End Sub

'=====================================================
' DIAGN�STICO CLOUD
'=====================================================

Public Sub DiagnosticoCloud()

    Call ActualizarWBVCloud

End Sub
