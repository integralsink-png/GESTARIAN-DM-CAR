Attribute VB_Name = "SONIDOS"
Option Explicit

Private Declare PtrSafe Function sndPlaySound Lib "winmm.dll" _
    Alias "sndPlaySoundA" _
    (ByVal lpszSoundName As String, _
     ByVal uFlags As Long) As Long

Private Const SND_ASYNC As Long = &H1
Private Const SND_NODEFAULT As Long = &H2


Sub SonidoDMCAR(Optional Tipo As String = "CLICK")

    Dim ruta As String
    ruta = Environ$("WINDIR") & "\Media\"

    Select Case UCase(Tipo)

        Case "CLICK"
            sndPlaySound ruta & "Windows Navigation Start.wav", _
                         SND_ASYNC Or SND_NODEFAULT

        Case "OK"
            sndPlaySound ruta & "Windows Notify System Generic.wav", _
                         SND_ASYNC Or SND_NODEFAULT

        Case "ERROR"
            sndPlaySound ruta & "Windows Critical Stop.wav", _
                         SND_ASYNC Or SND_NODEFAULT

    End Select

End Sub
Sub PruebaSonido()
    SonidoDMCAR "CLICK"
End Sub

