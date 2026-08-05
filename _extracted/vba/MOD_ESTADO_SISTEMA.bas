Attribute VB_Name = "MOD_ESTADO_SISTEMA"
Option Explicit

'=========================================================
'      DM CAR V2
'      PANEL DE ESTADO DEL SISTEMA
'=========================================================

Public Enum EstadoSistema

    EstadoRojo = 0
    EstadoVerde = 1
    EstadoAmarillo = 2

End Enum

'=========================================================
' ACTUALIZA TODO EL PANEL
'=========================================================

Public Sub ActualizarEstadoSistema()

    ActualizarEstadoGmail
    ActualizarEstadoEmail
    ActualizarEstadoDrive
    ActualizarEstadoLicencia
    ActualizarEstadoBackup
    ActualizarEstadoActualizacion
    ActualizarEstadoIA
    ActualizarEstadoOCR

End Sub
Private Sub CambiarEstado( _
        ByVal NombreShape As String, _
        ByVal Texto As String, _
        ByVal Estado As EstadoSistema)

    Dim sp As Shape

    On Error Resume Next
    Set sp = Sheets("CONFIGURACION").Shapes(NombreShape)
    On Error GoTo 0

    If sp Is Nothing Then Exit Sub

    With sp

        .TextFrame.Characters.Text = Texto

        .TextFrame.Characters.Font.Bold = True
        .TextFrame.Characters.Font.Color = RGB(255, 255, 255)

        .Fill.Visible = msoFalse

        .Line.Weight = 0.5

        Select Case Estado

            Case EstadoVerde

                .Line.ForeColor.RGB = RGB(153, 255, 51)
                .Glow.Color.RGB = RGB(153, 255, 51)

            Case EstadoRojo

                .Line.ForeColor.RGB = RGB(255, 60, 60)
                .Glow.Color.RGB = RGB(255, 60, 60)

            Case EstadoAmarillo

                .Line.ForeColor.RGB = RGB(255, 180, 0)
                .Glow.Color.RGB = RGB(255, 180, 0)

        End Select

        .Glow.Radius = 2
        .Glow.Transparency = 0.6

    End With

End Sub
'=========================================================
' GMAIL
'=========================================================

Public Sub ActualizarEstadoGmail()

    Dim pass As String

    pass = Trim(CStr(Sheets("MIS DATOS").Range("F14").Value))

    If pass = "" Then

        CambiarEstado "estado_gmail", _
                      "GMAIL SIN CONFIGURAR", _
                      EstadoRojo
        Exit Sub

    End If

    If Len(pass) < 6 Then

        CambiarEstado "estado_gmail", _
                      "CREDENCIALES INCOMPLETAS", _
                      EstadoAmarillo

    Else

        CambiarEstado "estado_gmail", _
                      "GMAIL LISTO", _
                      EstadoVerde

    End If

End Sub

'=========================================================
' EMAIL
'=========================================================

Public Sub ActualizarEstadoEmail()

    Dim email As String

    email = Trim(CStr(Sheets("MIS DATOS").Range("F13").Value))

    If email = "" Then

        CambiarEstado "estado_email", _
                      "EMAIL NO CONFIGURADO", _
                      EstadoRojo
        Exit Sub

    End If

    If InStr(email, "@") = 0 Then

        CambiarEstado "estado_email", _
                      "EMAIL INV�LIDO", _
                      EstadoRojo

    Else

        CambiarEstado "estado_email", _
                      "EMAIL OK", _
                      EstadoVerde

    End If

End Sub

'=========================================================
' GOOGLE DRIVE
'=========================================================

Public Sub ActualizarEstadoDrive()

    Dim ruta As String

    ruta = Trim(CStr(Sheets("CONFIGURACION").Range("E28").Value))

    If ruta = "" Then

        CambiarEstado "estado_drive", _
                      "GOOGLE DRIVE NO CONFIGURADO", _
                      EstadoRojo
        Exit Sub

    End If

    ' Enlace de Google Drive
    If InStr(1, ruta, "http", vbTextCompare) > 0 Then

        CambiarEstado "estado_drive", _
                      "GOOGLE DRIVE OK", _
                      EstadoVerde
        Exit Sub

    End If

    ' Carpeta local sincronizada
    If Dir(ruta, vbDirectory) = "" Then

        CambiarEstado "estado_drive", _
                      "RUTA LOCAL NO EXISTE", _
                      EstadoRojo

    Else

        CambiarEstado "estado_drive", _
                      "GOOGLE DRIVE OK", _
                      EstadoVerde

    End If

End Sub

'=========================================================
' LICENCIA
'=========================================================

Public Sub ActualizarEstadoLicencia()

    CambiarEstado "estado_licencia", _
                  "LICENCIA PENDIENTE", _
                  EstadoAmarillo

End Sub

'=========================================================
' BACKUP
'=========================================================

Public Sub ActualizarEstadoBackup()

    CambiarEstado "estado_backup", _
                  "BACKUP NO CONFIGURADO", _
                  EstadoAmarillo

End Sub

'=========================================================
' ACTUALIZACIONES
'=========================================================

Public Sub ActualizarEstadoActualizacion()

    CambiarEstado "estado_actualizacion", _
                  "ACTUALIZACON SIN COMPROBAR", _
                  EstadoAmarillo

End Sub

'=========================================================
' IA
'=========================================================

Public Sub ActualizarEstadoIA()

    CambiarEstado "estado_ia", _
                  "IA CONVERSACION NO DISPONIBLE", _
                  EstadoAmarillo

End Sub

'=========================================================
' OCR
'=========================================================

Public Sub ActualizarEstadoOCR()

    CambiarEstado "estado_OCR", _
                  "OCR MOVIL NO INSTALADO", _
                  EstadoAmarillo

End Sub
'=========================================================
' REFRESCA EL PANEL COMPLETO
'=========================================================

Public Sub RefrescarEstadoSistema()

    ActualizarEstadoSistema

End Sub
