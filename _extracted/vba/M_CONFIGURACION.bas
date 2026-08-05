Attribute VB_Name = "M_CONFIGURACION"
Option Explicit

'=====================================================
' WBV - CONFIGURACION ENGINE
'=====================================================
' Coordina la pantalla CONFIGURACI�N.
' No almacena datos.
' No conoce celdas.
' Cada motor actualiza su propio estado.
'=====================================================

'-----------------------------------------------------
' ACTUALIZAR CONFIGURACION COMPLETA
'-----------------------------------------------------

Public Sub ActualizarConfiguracion()

    Application.ScreenUpdating = False

    On Error GoTo Salida

    ActualizarEstadoConfiguracion

Salida:

    Application.ScreenUpdating = True

End Sub

'-----------------------------------------------------
' ACTUALIZAR PANEL CONFIGURACION
'-----------------------------------------------------

Public Sub ActualizarEstadoConfiguracion()

    On Error Resume Next

    EstadoSistema
    EstadoGmail
    EstadoDrive
    EstadoBackup
    EstadoOCR
    EstadoIA
    EstadoConfiguracionGeneral

End Sub

'=====================================================
' SISTEMA
'=====================================================

Public Sub EstadoSistema()

    On Error Resume Next

    Call ActualizarEstadoSistema

End Sub

'=====================================================
' GMAIL
'=====================================================

Public Sub EstadoGmail()

    On Error Resume Next

    Call ActualizarEstadoGmail

End Sub

'=====================================================
' DRIVE
'=====================================================

Public Sub EstadoDrive()

    On Error Resume Next

    Call ActualizarEstadoDrive

End Sub

'=====================================================
' BACKUP
'=====================================================

Public Sub EstadoBackup()

    On Error Resume Next

    Call ActualizarEstadoBackup

End Sub

'=====================================================
' OCR
'=====================================================

Public Sub EstadoOCR()

    On Error Resume Next

    Call ActualizarEstadoOCR

End Sub

'=====================================================
' IA
'=====================================================

Public Sub EstadoIA()

    On Error Resume Next

    Call ActualizarEstadoIA

End Sub

'=====================================================
' ESTADO GENERAL
'=====================================================

Public Sub EstadoConfiguracionGeneral()

    On Error Resume Next

    '--------------------------------------------------
    ' Aqu� calcularemos m�s adelante un estado global.
    '
    ' Ejemplo:
    '
    ' Gmail ............ OK
    ' Drive ............ OK
    ' Backup ........... OK
    ' OCR .............. OK
    ' IA ............... OK
    ' Usuarios ......... OK
    '
    ' Resultado:
    ' SISTEMA OPERATIVO
    '--------------------------------------------------

End Sub

'=====================================================
' COMPROBAR CONFIGURACION
'=====================================================

Public Sub ComprobarConfiguracion()

    ActualizarConfiguracion

End Sub

'=====================================================
' REINICIAR CONFIGURACION
'=====================================================

Public Sub ReiniciarConfiguracion()

    ActualizarConfiguracion

End Sub
