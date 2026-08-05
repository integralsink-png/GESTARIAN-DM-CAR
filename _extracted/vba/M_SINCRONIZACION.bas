Attribute VB_Name = "M_SINCRONIZACION"
Option Explicit

'=====================================================
' WBV - MOTOR DE SINCRONIZACI�N
'=====================================================
' Coordina la actualizaci�n de todos los motores
' del sistema.
'=====================================================

'-----------------------------------------------------
' SINCRONIZACI�N GENERAL
'-----------------------------------------------------

Public Sub SincronizarSistema()

    Application.ScreenUpdating = False
    Application.EnableEvents = False

    On Error GoTo Salida

    Call SincronizarEmpresa
    Call SincronizarConfiguracion
    Call SincronizarUsuarios
    Call SincronizarCloud
    Call SincronizarFotografias
    Call ActualizarEstados

Salida:

    Application.EnableEvents = True
    Application.ScreenUpdating = True

End Sub

'-----------------------------------------------------
' EMPRESA
'-----------------------------------------------------

Public Sub SincronizarEmpresa()

    On Error Resume Next

    Call ActualizarDatosEmpresa_ColumnaI_SoloI

End Sub

'-----------------------------------------------------
' CONFIGURACION
'-----------------------------------------------------

Public Sub SincronizarConfiguracion()

    On Error Resume Next

    'Preparado para futuras funciones
    'Call ActualizarConfiguracion

End Sub

'-----------------------------------------------------
' USERS ENGINE
'-----------------------------------------------------

Public Sub SincronizarUsuarios()

    On Error Resume Next

    'Preparado para futuras funciones
    'Call ActualizarUsuarios

End Sub

'-----------------------------------------------------
' WBV CLOUD
'-----------------------------------------------------

Public Sub SincronizarCloud()

    On Error Resume Next

    'Preparado para futuras funciones
    'Call ActualizarEstadoWBVCloud

End Sub

'-----------------------------------------------------
' FOTOGRAF�AS
'-----------------------------------------------------

Public Sub SincronizarFotografias()

    On Error Resume Next

    Call IndexarImagenes

End Sub

'-----------------------------------------------------
' ESTADOS
'-----------------------------------------------------

Public Sub ActualizarEstados()

    On Error Resume Next

    Call ActualizarEstadoSistema

End Sub

'-----------------------------------------------------
' SINCRONIZACI�N COMPLETA
'-----------------------------------------------------

Public Sub SincronizacionCompleta()

    Call SincronizarSistema

End Sub
