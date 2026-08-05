Attribute VB_Name = "RADIO"
Option Explicit

' --- CONSTANTES (Señal MP3 oficial y estable) ---
Private Const URL_STREAMING As String = "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40.mp3"
Private Const NOMBRE_HOJA   As String = "INICIO"
Private Const NOMBRE_SHAPE  As String = "onof"

' --- ESTADO GLOBAL ---
Public RadioEncendida As Boolean

' --- TOGGLE PRINCIPAL ---
Sub Radio_Los40_Toggle()
    Dim wsh As Object
    
    ' Acceso directo al sistema operativo Windows
    On Error Resume Next
    Set wsh = CreateObject("WScript.Shell")
    On Error GoTo 0
    
    If wsh Is Nothing Then
        MsgBox "Error al conectar con el controlador de Windows.", vbCritical
        Exit Sub
    End If

    If Not RadioEncendida Then
        ' --- ACCIÓN: ENCENDER ---
        ' Ejecuta la música en segundo plano absoluto (parámetro 0)
        wsh.Run "wmplayer.exe """ & URL_STREAMING & """", 0, False
        
        RadioEncendida = True
        Call ActualizarEstiloIndicador(True)
    Else
        ' --- ACCIÓN: APAGAR ---
        ' Cierre forzado del proceso en Windows
        wsh.Run "taskkill /F /IM wmplayer.exe", 0, True
        
        RadioEncendida = False
        Call ActualizarEstiloIndicador(False)
    End If
End Sub

' --- GESTIÓN DE ESTILOS DEL BOTÓN ---
Private Sub ActualizarEstiloIndicador(ByVal EstadoOn As Boolean)
    Dim s As Shape
    On Error Resume Next
    Set s = Sheets(NOMBRE_HOJA).Shapes(NOMBRE_SHAPE)
    If s Is Nothing Then Exit Sub
    
    Application.ScreenUpdating = False
    With s.Glow
        .Radius = 6
        If EstadoOn Then
            .Color.RGB = RGB(57, 255, 20)  ' Verde Pistacho
            .Transparency = 0.2
        Else
            .Color.RGB = RGB(255, 0, 0)    ' Rojo
            .Transparency = 0.3
        End If
    End With
    Application.ScreenUpdating = True
End Sub

' --- RESETEO AL ARRANCAR Y CERRAR ---
Sub InicializarRadioAlArranque()
    Dim wsh As Object
    RadioEncendida = False
    Call ActualizarEstiloIndicador(False)
    
    ' Cierra cualquier proceso colgado en Windows de forma limpia
    On Error Resume Next
    Set wsh = CreateObject("WScript.Shell")
    wsh.Run "taskkill /F /IM wmplayer.exe", 0, True
    On Error GoTo 0
End Sub

