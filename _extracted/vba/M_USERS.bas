Attribute VB_Name = "M_USERS"
Option Explicit

'=====================================================
' WBV USERS ENGINE v3.0
' MODO DESARROLLO
'=====================================================

Public NivelActual As Integer
Public UsuarioActual As String
Public DispositivoActual As String

'=====================================================
' OBTENER DISPOSITIVO
'=====================================================

Public Function ObtenerDispositivo() As String

    ObtenerDispositivo = Environ$("COMPUTERNAME")

End Function

'=====================================================
' OBTENER USUARIO WINDOWS
'=====================================================

Public Function ObtenerUsuarioWindows() As String

    ObtenerUsuarioWindows = Environ$("USERNAME")

End Function

'=====================================================
' ACTIVAR / DESACTIVAR USUARIO
'=====================================================

Public Sub ActivarDesactivarUsuario()

    Dim sh As Worksheet
    Dim fila As Long

    Set sh = Sheets("USUARIOS")

    fila = ActiveCell.Row

    If fila < 5 Then Exit Sub

    With sh.Cells(fila, "A")

        If .Interior.Color = vbGreen Then
            .Interior.Color = vbRed
        Else
            .Interior.Color = vbGreen
        End If

    End With

    ActualizarBotonUsuarios

End Sub

'=====================================================
' ACTUALIZAR BOT�N ACTIVAR / DESACTIVAR
'=====================================================

Public Sub ActualizarBotonUsuarios()

    On Error Resume Next

    Dim sh As Worksheet
    Dim fila As Long

    Set sh = Sheets("USUARIOS")

    fila = ActiveCell.Row

    If fila < 5 Then Exit Sub

    With sh.Shapes("activardesactivar")

        If sh.Cells(fila, "A").Interior.Color = vbGreen Then

            .TextFrame.Characters.Text = "DESACTIVAR"

        Else

            .TextFrame.Characters.Text = "ACTIVAR"

        End If

    End With

    On Error GoTo 0

End Sub

'=====================================================
' REGISTRAR DISPOSITIVO ACTUAL
'=====================================================

Public Sub RegistrarDispositivo()

    Dim fila As Long

    fila = ActiveCell.Row

    If fila < 5 Then Exit Sub

    With Sheets("USUARIOS")

        .Cells(fila, "H").Value = ObtenerDispositivo
        .Cells(fila, "I").Value = ObtenerUsuarioWindows

    End With

    MsgBox _
        "Dispositivo registrado correctamente." & vbCrLf & vbCrLf & _
        "Equipo: " & ObtenerDispositivo() & vbCrLf & _
        "Usuario Windows: " & ObtenerUsuarioWindows(), _
        vbInformation, _
        "GESTARIAN"

End Sub

'=====================================================
' COMPROBAR NIVEL
'=====================================================

Public Function TieneNivel(Minimo As Integer) As Boolean

    TieneNivel = (NivelActual >= Minimo)

End Function

'=====================================================
' ACTUALIZAR PANEL USUARIOS
'=====================================================

Public Sub ActualizarUsuarios()

    On Error Resume Next

    ActualizarBotonUsuarios

    On Error GoTo 0

End Sub

'=====================================================
' INICIALIZAR USERS ENGINE
'=====================================================

Public Sub IniciarSistemaUsuarios()

    On Error Resume Next

    UsuarioActual = ObtenerUsuarioWindows()
    DispositivoActual = ObtenerDispositivo()
    NivelActual = 9

    ActualizarUsuarios

    On Error GoTo 0

End Sub

