Attribute VB_Name = "FULLSCREEN"
Option Explicit

'==============================================================
' WBV ENGINE
' FULLSCREEN v2.0
'==============================================================

'--------------------------------------------------------------
' API WINDOWS
'--------------------------------------------------------------

Private Declare PtrSafe Function FindWindow _
Lib "user32" Alias "FindWindowA" _
(ByVal lpClassName As String, _
 ByVal lpWindowName As String) As LongPtr

Private Declare PtrSafe Function SetWindowLong _
Lib "user32" Alias "SetWindowLongA" _
(ByVal hWnd As LongPtr, _
 ByVal nIndex As Long, _
 ByVal dwNewLong As Long) As Long

Private Declare PtrSafe Function SetWindowPos _
Lib "user32" _
(ByVal hWnd As LongPtr, _
 ByVal hWndInsertAfter As LongPtr, _
 ByVal x As Long, _
 ByVal y As Long, _
 ByVal cx As Long, _
 ByVal cy As Long, _
 ByVal uFlags As Long) As Long

'--------------------------------------------------------------
' CONSTANTES
'--------------------------------------------------------------

Private Const GWL_STYLE As Long = -16

Private Const WS_POPUP As Long = &H80000000
Private Const WS_OVERLAPPEDWINDOW As Long = &HCF0000

Private Const HWND_NOTOPMOST As Long = -2

Private Const SWP_FRAMECHANGED As Long = &H20

'--------------------------------------------------------------
' ESTADO GLOBAL
'--------------------------------------------------------------

Public Kiosko As Boolean

'--------------------------------------------------------------
' CONTROL DE ZOOM M�NIMO POR HOJA
'--------------------------------------------------------------

Public ZoomMinimoActual As Integer
Public UltimaColumnaVisible As String

' ACTIVAR / DESACTIVAR
'==============================================================

Public Sub ToggleKiosko()

    If Kiosko Then
        Kiosko_OFF
    Else
        Kiosko_ON
    End If

End Sub

'==============================================================
' ACTIVAR MODO KIOSKO
'==============================================================

Public Sub Kiosko_ON()

    Dim hWnd As LongPtr

    Kiosko = True

    '----------------------------------------------------------
    ' ENTORNO EXCEL
    '----------------------------------------------------------

    Application.DisplayFullScreen = True

    Application.ExecuteExcel4Macro _
        "SHOW.TOOLBAR(""Ribbon"",False)"

    Application.DisplayFormulaBar = False
    Application.DisplayStatusBar = False

    '----------------------------------------------------------
    ' VENTANA ACTIVA
    '----------------------------------------------------------

    With ActiveWindow

        .DisplayHeadings = False
        .DisplayWorkbookTabs = False

        .DisplayHorizontalScrollBar = False

        ' IMPORTANTE:
        ' mantener scroll vertical para tablas largas
        .DisplayVerticalScrollBar = False

    End With

    '----------------------------------------------------------
    ' CAPTURAR EXCEL
    '----------------------------------------------------------

    hWnd = FindWindow("XLMAIN", Application.Caption)

    '----------------------------------------------------------
    ' QUITAR MARCO SUPERIOR
    '----------------------------------------------------------

    SetWindowLong _
        hWnd, _
        GWL_STYLE, _
        WS_POPUP

    '----------------------------------------------------------
    ' PERMITIR BARRA DE TAREAS
    '----------------------------------------------------------

    SetWindowPos _
        hWnd, _
        HWND_NOTOPMOST, _
        0, 0, 0, 0, _
        SWP_FRAMECHANGED

    '----------------------------------------------------------
    ' MAXIMIZAR
    '----------------------------------------------------------

    Application.WindowState = xlMaximized

    '----------------------------------------------------------
    ' SALIDA R�PIDA
    '----------------------------------------------------------

    Application.OnKey "{ESC}", "Kiosko_OFF"

End Sub

'==============================================================
' DESACTIVAR MODO KIOSKO
'==============================================================

Public Sub Kiosko_OFF()

    Dim hWnd As LongPtr

    Kiosko = False

    '----------------------------------------------------------
    ' CAPTURAR EXCEL
    '----------------------------------------------------------

    hWnd = FindWindow("XLMAIN", Application.Caption)

    '----------------------------------------------------------
    ' RESTAURAR VENTANA
    '----------------------------------------------------------

    SetWindowLong _
        hWnd, _
        GWL_STYLE, _
        WS_OVERLAPPEDWINDOW

    SetWindowPos _
        hWnd, _
        HWND_NOTOPMOST, _
        0, 0, 0, 0, _
        SWP_FRAMECHANGED

    '----------------------------------------------------------
    ' ENTORNO EXCEL
    '----------------------------------------------------------

    Application.DisplayFullScreen = False

    Application.ExecuteExcel4Macro _
        "SHOW.TOOLBAR(""Ribbon"",True)"

    Application.DisplayFormulaBar = True
    Application.DisplayStatusBar = True

    '----------------------------------------------------------
    ' ELEMENTOS VISUALES
    '----------------------------------------------------------

    With ActiveWindow

        .DisplayHeadings = True
        .DisplayWorkbookTabs = True

        .DisplayHorizontalScrollBar = True
        .DisplayVerticalScrollBar = True

    End With

    Application.WindowState = xlMaximized

    '----------------------------------------------------------
    ' RESTAURAR TECLA ESC
    '----------------------------------------------------------

    Application.OnKey "{ESC}"

End Sub
'==============================================================
' AJUSTE AUTOM�TICO DE ANCHO DE PANTALLA
'==============================================================

Private Sub AjustarAnchoPantalla(ByVal ColumnaFinal As String)

    On Error Resume Next

    Dim AnchoObjetivo As Double
    Dim AnchoVisible As Double
    Dim NuevoZoom As Integer
    Dim ColFinal As Long

    ColFinal = Columns(ColumnaFinal).Column

    '----------------------------------------------------------
    ' Comenzar desde zoom est�ndar
    '----------------------------------------------------------

    ActiveWindow.Zoom = 100
    DoEvents

    '----------------------------------------------------------
    ' Ancho total dise�ado (A hasta columna final)
    '----------------------------------------------------------

    AnchoObjetivo = _
        Range(Cells(1, 1), Cells(1, ColFinal)).Width

    '----------------------------------------------------------
    ' Ancho realmente visible de la ventana
    '----------------------------------------------------------

    AnchoVisible = ActiveWindow.VisibleRange.Width

    '----------------------------------------------------------
    ' Calcular zoom para dejar peque�o margen lateral
    '----------------------------------------------------------

    If AnchoObjetivo > 0 Then

        NuevoZoom = Int((AnchoVisible / AnchoObjetivo) * 95)

        If NuevoZoom < 40 Then NuevoZoom = 40
        If NuevoZoom > 300 Then NuevoZoom = 300

        ActiveWindow.Zoom = NuevoZoom

        ZoomMinimoActual = NuevoZoom
        UltimaColumnaVisible = ColumnaFinal

    End If

    On Error GoTo 0

End Sub
'==============================================================
' SCROLL VERTICAL
'==============================================================

Public Sub OcultarScrollVertical()

    ActiveWindow.DisplayVerticalScrollBar = False

End Sub

Public Sub MostrarScrollVertical()

    ActiveWindow.DisplayVerticalScrollBar = True

End Sub
'==============================================================
' WBV UI ENGINE
'==============================================================

Public Sub AplicarVistaHoja(ByVal NombreHoja As String)

    On Error Resume Next

    MostrarTodo

    Select Case UCase(NombreHoja)

        Case "INICIO"
            ConfigurarVista "O", 65, True, 100, False

        Case "MIS DATOS"
            ConfigurarVista "O", 24, False, 90, True

        Case "CONFIGURACION"
            ConfigurarVista "F", 80, False, 110, True

        Case "USUARIOS"
            ConfigurarVista "I", 0, False, 95, True

        Case "WBV CLOUD"
            ConfigurarVista "F", 0, False, 110, True

        Case "ALTA CLIENTE"
            ConfigurarVista "O", 0, False, 90, True

        Case "CLIENTES"
            ConfigurarVista "J", 0, False, 95, True

        Case "VEHICULOS"
            ConfigurarVista "J", 0, False, 95, True

        Case "BASE DE DATOS"
            ConfigurarVista "L", 0, False, 85, True

        Case "PRESUPUESTOS"
            ConfigurarVista "L", 0, False, 92, True

        Case "REGISTRO PRESUPUESTOS"
            ConfigurarVista "M", 0, False, 88, True

        Case "CITAS"
            ConfigurarVista "L", 0, False, 92, True

        Case "REPARACIONES"
            ConfigurarVista "P, 0, False, 92, True"

        Case "FACTURAS"
            ConfigurarVista "L", 0, False, 92, True

        Case "REGISTRO FACTURAS"
            ConfigurarVista "N", 0, False, 88, True

        Case "TRABAJOS"
            ConfigurarVista "K", 38, True, 92, True

        Case "BALANCES"
            ConfigurarVista "T", 0, False, 80, True

        Case "PROVEEDORES"
            ConfigurarVista "J", 0, False, 95, True

        Case "REGISTRO FACTURAS PROVEEDORES"
            ConfigurarVista "K", 0, False, 92, True

        Case "INCIDENCIAS"
            ConfigurarVista "K", 0, False, 92, True

        Case "TOOLTIPS"

            If NivelActual < 9 Then

                Sheets("TOOLTIPS").Visible = xlSheetVeryHidden
                Sheets("INICIO").Activate
                Exit Sub

            End If

            ConfigurarVista "L", 0, False, 100, True

        Case "GUIA OPERATIVA"
            ConfigurarVista "S", 52, True, 82, True

    End Select
'----------------------------------------------------------
' PROTEGER ZOOM M�NIMO
'----------------------------------------------------------

If ActiveWindow.Zoom < ZoomMinimoActual Then
    ActiveWindow.Zoom = ZoomMinimoActual
End If
    On Error GoTo 0

End Sub

'==============================================================
' CONFIGURAR VISTA HOJA
'==============================================================
Private Sub ConfigurarVista( _
ByVal UltimaColumna As String, _
Optional ByVal UltimaFila As Long = 0, _
Optional ByVal BloqueoTotal As Boolean = False, _
Optional ByVal ZoomObjetivo As Integer = 100, _
Optional ByVal ScrollVertical As Boolean = True)

    On Error Resume Next

    Dim ColFinal As Long

    ColFinal = Columns(UltimaColumna).Column

    '----------------------------------------------------------
    ' OCULTAR COLUMNAS FUERA DEL �REA DE TRABAJO
    '----------------------------------------------------------

    If ColFinal < Columns.Count Then
        Range(Columns(ColFinal + 1), Columns(Columns.Count)).EntireColumn.Hidden = True
    End If

    '----------------------------------------------------------
    ' SCROLLS
    '----------------------------------------------------------

    ActiveWindow.DisplayHorizontalScrollBar = False
    ActiveWindow.DisplayVerticalScrollBar = ScrollVertical

    '----------------------------------------------------------
' AJUSTE AUTOM�TICO AL ANCHO DE DISE�O
'----------------------------------------------------------

UltimaColumnaVisible = UltimaColumna

AjustarAnchoPantalla UltimaColumna

'----------------------------------------------------------
' EL USUARIO PUEDE AUMENTAR EL ZOOM MANUALMENTE
' PERO NO REDUCIRLO POR DEBAJO DEL M�NIMO CALCULADO
'----------------------------------------------------------

If ActiveWindow.Zoom < ZoomMinimoActual Then
    ActiveWindow.Zoom = ZoomMinimoActual
End If
    '----------------------------------------------------------
    ' RESPETAR INMOVILIZAR PANELES EXISTENTE
    '----------------------------------------------------------
    ' No se modifica FreezePanes para conservar
    ' encabezados y zonas bloqueadas configuradas
    ' manualmente en cada hoja.

    '----------------------------------------------------------
    ' BLOQUEO INFERIOR
    '----------------------------------------------------------

    If BloqueoTotal And UltimaFila > 0 Then
        Rows((UltimaFila + 1) & ":" & Rows.Count).Hidden = True
    End If

    '----------------------------------------------------------
    ' POSICI�N INICIAL
    '----------------------------------------------------------

    ActiveWindow.ScrollColumn = 1
    ActiveWindow.ScrollRow = 1

    On Error GoTo 0

End Sub
Public Sub MostrarTooltips()

    If NivelActual < 9 Then
        MsgBox "Acceso restringido.", vbExclamation
        Exit Sub
    End If

    With Sheets("TOOLTIPS")
        .Visible = xlSheetVisible
        .Activate
    End With

End Sub


Public Sub OcultarTooltips()

    Sheets("TOOLTIPS").Visible = xlSheetVeryHidden

End Sub

Private Sub MostrarTodo()

    Cells.EntireColumn.Hidden = False
    Cells.EntireRow.Hidden = False

End Sub
'==============================================================
' RESTAURAR ZOOM M�NIMO SI EL USUARIO SE ALEJA DEMASIADO
'==============================================================

Public Sub ComprobarZoomMinimo()

    On Error Resume Next

    If ActiveWindow.Zoom < ZoomMinimoActual Then

        ActiveWindow.Zoom = ZoomMinimoActual

    End If

    On Error GoTo 0

End Sub
