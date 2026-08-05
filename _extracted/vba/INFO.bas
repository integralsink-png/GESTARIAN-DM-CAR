Attribute VB_Name = "INFO"
Option Explicit

' ===== SONIDO TAP (PtrSafe para 64 bits) =====
#If VBA7 Then
    Private Declare PtrSafe Function PlaySound Lib "winmm.dll" Alias "PlaySoundA" _
        (ByVal lpszName As String, ByVal hModule As LongPtr, ByVal dwFlags As Long) As Long
#Else
    Private Declare Function PlaySound Lib "winmm.dll" Alias "PlaySoundA" _
        (ByVal lpszName As String, ByVal hModule As Long, ByVal dwFlags As Long) As Long
#End If
Public Sub TooltipDM()
    Dim ws As Worksheet
    Dim shpTooltip As Shape
    Dim shpBoton As Shape
    Dim fila As Variant
    Dim Texto As String
    Dim rutaSonido As String
Call EnsureTooltipOnTop(ws, shpTooltip)
Call FadeIn(shpTooltip)

    On Error GoTo ErrHandler
    Set ws = ActiveSheet

    ' Buscar bot�n; si no existe, salir
    On Error Resume Next
    Set shpBoton = ws.Shapes("boton_info")
    On Error GoTo ErrHandler
    If shpBoton Is Nothing Then Exit Sub

    ' Asegurar que exista tooltip_info en la hoja (si no, intentar copiar desde INICIO)
    On Error Resume Next
    Set shpTooltip = ws.Shapes("tooltip_info")
    On Error GoTo ErrHandler

    If shpTooltip Is Nothing Then
        On Error Resume Next
        ThisWorkbook.Worksheets("INICIO").Shapes("tooltip_info").Copy
        ws.Paste
        Set shpTooltip = ws.Shapes(ws.Shapes.Count)
        If Not shpTooltip Is Nothing Then
            shpTooltip.name = "tooltip_info"
            shpTooltip.Visible = msoFalse
            shpTooltip.ZOrder msoBringToFront
        End If
        On Error GoTo ErrHandler
        If shpTooltip Is Nothing Then Exit Sub
    End If

    ' Si ya est� visible: cerrarlo y salir (segundo clic)
    If shpTooltip.Visible = msoTrue Then
        On Error Resume Next
        Call FadeOut(shpTooltip)    ' animaci�n si existe
        shpTooltip.Visible = msoFalse
        ' Si prefieres eliminar la shape en lugar de ocultarla, usa:
        ' shpTooltip.Delete
        Exit Sub
    End If

    ' Obtener texto desde TOOLTIPS; si no hay fila o texto vac�o, no hacer nada
    fila = Application.Match(ws.name, ThisWorkbook.Worksheets("TOOLTIPS").Range("A:A"), 0)
    If IsError(fila) Then Exit Sub
    Texto = Trim(ThisWorkbook.Worksheets("TOOLTIPS").Range("B" & fila).Value & "")
    If Texto = "" Then Exit Sub

    ' Sonido opcional
    rutaSonido = "C:\Windows\Media\Windows Navigation Start.wav"
    On Error Resume Next
    If Len(Dir(rutaSonido)) > 0 Then PlaySound rutaSonido, 0, &H1
    On Error GoTo ErrHandler

    ' Poner texto y posicionar
    shpTooltip.TextFrame2.TextRange.Text = Texto
    shpTooltip.Left = shpBoton.Left - 100
    shpTooltip.Top = shpBoton.Top + 150
shpTooltip.TextFrame2.TextRange.Text = Texto
shpTooltip.Left = shpBoton.Left - 100
shpTooltip.Top = shpBoton.Top + 150

    ' Mostrar con fade si existe FadeIn (si no, mostrar directamente)
    On Error Resume Next
    Call FadeIn(shpTooltip)
    If Err.Number <> 0 Then
        Err.Clear
        shpTooltip.Visible = msoTrue
    End If
    On Error GoTo ErrHandler

    Exit Sub

ErrHandler:
    On Error Resume Next
    ' Para depuraci�n, descomenta la siguiente l�nea:
    ' MsgBox "TooltipDM error: " & Err.Number & " - " & Err.Description, vbExclamation
End Sub
' ============================
' Asegura que el tooltip quede siempre en la capa superior
' ============================
Public Sub EnsureTooltipOnTop(ws As Worksheet, shpTooltip As Shape)
    Dim s As Shape
    Dim tries As Integer

    On Error Resume Next

    ' 1) Si existe una shape de fondo con nombre conocido, enviarla al fondo
    For Each s In ws.Shapes
        If LCase(s.name) Like "*fondo*" Or LCase(s.name) Like "*fondoinicio*" Then
            s.ZOrder msoSendToBack
        End If
    Next s

    ' 2) Traer el tooltip al frente (varios intentos por si hay animaciones)
    For tries = 1 To 3
        shpTooltip.ZOrder msoBringToFront
        DoEvents
        ' peque�o retardo para permitir que Excel reordene la z-order
        Application.Wait Now + TimeSerial(0, 0, 0.01)
    Next tries

    ' 3) Asegurar que el tooltip est� visible encima de todo
    shpTooltip.Visible = msoTrue

    On Error GoTo 0
End Sub

' ============================================================
'   OCULTAR TOOLTIP
' ============================================================
Public Sub OcultarTooltip_Info()
    On Error Resume Next
    ActiveSheet.Shapes("tooltip_info").Visible = msoFalse
End Sub

' ============================================================
'   PAUSA EN MILISEGUNDOS
' ============================================================
Public Sub EsperarMS(ms As Long)
    Dim T As Double
    T = Timer + (ms / 1000)
    Do While Timer < T
        DoEvents
    Loop
End Sub

' ============================================================
'   FADE IN / OUT (para shapes tipo tooltip)
' ============================================================
Public Sub FadeIn(shp As Shape)
    Dim T As Single
    On Error Resume Next
    shp.Visible = msoTrue
    shp.TextFrame2.TextRange.Font.Fill.Transparency = 1
    shp.Line.Transparency = 1
    shp.Glow.Transparency = 1

    For T = 1 To 0 Step -0.05
        shp.TextFrame2.TextRange.Font.Fill.Transparency = T
        shp.Line.Transparency = T
        shp.Glow.Transparency = T
        EsperarMS 25
    Next T

    shp.TextFrame2.TextRange.Font.Fill.Transparency = 0
    shp.Line.Transparency = 0
    shp.Glow.Transparency = 0.6
End Sub

Public Sub FadeOut(shp As Shape)
    Dim T As Single
    On Error Resume Next
    For T = 0 To 1 Step 0.05
        shp.TextFrame2.TextRange.Font.Fill.Transparency = T
        shp.Line.Transparency = T
        shp.Glow.Transparency = T
        EsperarMS 25
    Next T
    shp.Visible = msoFalse
    shp.TextFrame2.TextRange.Font.Fill.Transparency = 0
    shp.Line.Transparency = 0
    shp.Glow.Transparency = 0.6
End Sub

' ============================================================
'   OBTENER TEXTO DESDE HOJA TOOLTIPS
' ============================================================
Public Function ObtenerTextoTooltip(NombreHoja As String) As String
    Dim fila As Variant
    On Error Resume Next
    fila = Application.Match(NombreHoja, ThisWorkbook.Worksheets("TOOLTIPS").Range("A:A"), 0)
    On Error GoTo 0
    If IsError(fila) Or fila = 0 Then
        ObtenerTextoTooltip = ""
    Else
        ObtenerTextoTooltip = ThisWorkbook.Worksheets("TOOLTIPS").Range("B" & fila).Value
    End If
End Function

' ============================================================
'   INSTALAR BOT�N EN TODAS LAS HOJAS
' ============================================================
Public Sub InsertarBotonInfoEnTodasLasHojas()
    Dim ws As Worksheet
    Dim shpOriginal As Shape
    Dim shpNuevo As Shape

    On Error Resume Next
    Set shpOriginal = ActiveSheet.Shapes("boton_info")
    On Error GoTo 0

    If shpOriginal Is Nothing Then
        MsgBox "No encuentro el bot�n 'boton_info' en la hoja activa.", vbCritical, "DM CAR"
        Exit Sub
    End If

    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next
        Set shpNuevo = ws.Shapes("boton_info")
        On Error GoTo 0

        If shpNuevo Is Nothing Then
            shpOriginal.Copy
            ws.Paste
            Set shpNuevo = ws.Shapes(ws.Shapes.Count)
            shpNuevo.name = "boton_info"
            shpNuevo.OnAction = "TooltipDM"
            shpNuevo.Left = shpOriginal.Left
            shpNuevo.Top = shpOriginal.Top
        End If
        Set shpNuevo = Nothing
    Next ws

    MsgBox "Bot�n 'boton_info' insertado en todas las hojas.", vbInformation, "DM CAR"
End Sub

' ============================================================
'   ASIGNAR MACRO A TODOS LOS BOTONES
' ============================================================
Public Sub AsignarMacroATodosLosBotones()
    Dim ws As Worksheet
    Dim shp As Shape
    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next
        Set shp = ws.Shapes("boton_info")
        On Error GoTo 0
        If Not shp Is Nothing Then shp.OnAction = "TooltipDM"
        Set shp = Nothing
    Next ws
    MsgBox "Macro TooltipDM asignada a todos los boton_info.", vbInformation, "DM CAR"
End Sub

' ============================================================
'   COPIAR TOOLTIP DESDE INICIO A TODAS LAS HOJAS
' ============================================================
Public Sub CopiarTooltipDesdeInicio()
    Dim wsOrigen As Worksheet
    Dim ws As Worksheet
    Dim shpOrigen As Shape
    Dim shpNuevo As Shape

    Application.EnableEvents = False
    Application.ScreenUpdating = False

    Set wsOrigen = ThisWorkbook.Worksheets("INICIO")
    On Error Resume Next
    Set shpOrigen = wsOrigen.Shapes("tooltip_info")
    On Error GoTo 0

    If shpOrigen Is Nothing Then
        MsgBox "En la hoja INICIO no existe un tooltip llamado 'tooltip_info'.", vbCritical, "DM CAR"
        GoTo Salida
    End If

    For Each ws In ThisWorkbook.Worksheets
        If ws.name <> "INICIO" Then
            On Error Resume Next
            ws.Shapes("tooltip_info").Delete
            On Error GoTo 0
            shpOrigen.Copy
            ws.Paste
            Set shpNuevo = ws.Shapes(ws.Shapes.Count)
            shpNuevo.name = "tooltip_info"
            shpNuevo.Left = shpOrigen.Left
            shpNuevo.Top = shpOrigen.Top
            shpNuevo.Visible = msoFalse
            shpNuevo.ZOrder msoBringToFront
        End If
    Next ws

    MsgBox "Tooltip 'tooltip_info' copiado correctamente a todas las hojas.", vbInformation, "DM CAR"

Salida:
    Application.EnableEvents = True
    Application.ScreenUpdating = True
End Sub

' ============================================================
'   SINCRONIZAR FORMATO DE TOOLTIPS DESDE INICIO (sin tocar textos)
' ============================================================
Public Sub SincronizarTooltips()
    Dim ws As Worksheet
    Dim shpOrigen As Shape
    Dim shpDestino As Shape
    Dim wsInicio As Worksheet

    Set wsInicio = ThisWorkbook.Worksheets("INICIO")
    On Error Resume Next
    Set shpOrigen = wsInicio.Shapes("tooltip_info")
    On Error GoTo 0
    If shpOrigen Is Nothing Then
        MsgBox "No hay tooltip en INICIO para sincronizar.", vbExclamation
        Exit Sub
    End If

    For Each ws In ThisWorkbook.Worksheets
        If ws.name <> "INICIO" Then
            On Error Resume Next
            Set shpDestino = ws.Shapes("tooltip_info")
            On Error GoTo 0
            If Not shpDestino Is Nothing Then
                With shpDestino
                    .Fill.Visible = msoTrue
                    .Fill.Solid
                    .Fill.ForeColor.RGB = shpOrigen.Fill.ForeColor.RGB
                    .Fill.Transparency = shpOrigen.Fill.Transparency
                    .Line.ForeColor.RGB = shpOrigen.Line.ForeColor.RGB
                    .Line.Weight = shpOrigen.Line.Weight
                    .Line.Transparency = shpOrigen.Line.Transparency
                    .Line.Visible = shpOrigen.Line.Visible
                    .Glow.Color.RGB = shpOrigen.Glow.Color.RGB
                    .Glow.Radius = shpOrigen.Glow.Radius
                    .Glow.Transparency = shpOrigen.Glow.Transparency
                    .TextFrame2.TextRange.Font.name = shpOrigen.TextFrame2.TextRange.Font.name
                    .TextFrame2.TextRange.Font.Size = shpOrigen.TextFrame2.TextRange.Font.Size
                    .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = shpOrigen.TextFrame2.TextRange.Font.Fill.ForeColor.RGB
                    On Error Resume Next
                    .Adjustments.Item(1) = shpOrigen.Adjustments.Item(1)
                    On Error GoTo 0
                    .Width = shpOrigen.Width
                    .Height = shpOrigen.Height
                    .Left = shpOrigen.Left
                    .Top = shpOrigen.Top
                End With
            End If
        End If
    Next ws

    MsgBox "Formato de todos los tooltips actualizado desde INICIO (sin tocar textos).", vbInformation, "DM CAR"
End Sub

' ============================================================
'   HELPER: A�ade o actualiza la fila en TOOLTIPS (�nico helper)
' ============================================================
Public Sub AddOrUpdateTooltipRow(sh As Worksheet, NombreHoja As String, Texto As String)
    Dim fila As Variant
    Dim lastRow As Long

    If sh Is Nothing Then Exit Sub

    fila = Application.Match(NombreHoja, sh.Range("A:A"), 0)
    If IsError(fila) Then
        lastRow = sh.Cells(sh.Rows.Count, "A").End(xlUp).Row + 1
        sh.Range("A" & lastRow).Value = NombreHoja
        sh.Range("B" & lastRow).Value = Texto
    Else
        sh.Range("B" & fila).Value = Texto
    End If
End Sub

' ============================================================
'   RELLENAR TOOLTIPs DESDE LISTA (seguro, editable)
' ============================================================
Public Sub RellenarTooltipsDesdeLista()
    Dim sh As Worksheet
    Dim NombreHoja As String
    Dim Texto As String

    On Error GoTo ErrHandler
    Set sh = ThisWorkbook.Worksheets("TOOLTIPS")

    NombreHoja = "INICIO"
    Texto = "SOFTWARE PROPIEDAD DE DM CAR." & vbCrLf & _
            "Prohibida su reproducci�n total o parcial sin consentimiento del titular." & vbCrLf & _
            "Desde aqu� accedes a todas las pantallas..."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "ALTA CLIENTE"
    Texto = "Formulario para dar de alta un nuevo cliente." & vbCrLf & _
            "1. Rellena todos los campos obligatorios." & vbCrLf & _
            "2. Pulsa ALTA CLIENTE para guardarlo."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "CLIENTES"
    Texto = "Esta es la base de datos de tus clientes, aqu� puedes consultar su tel�fono, email, direcci�n�y sus veh�culos."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "VEH�CULOS"
    Texto = "Tu base de datos de los veh�culos de los clientes, nada que no sepas ya�"
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "BASE DE DATOS"
    Texto = "En esta pantalla tienes todos los datos disponibles completos, de clientes y veh�culos. No borres nada aqu�."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "PRESUPUESTOS"
    Texto = "Aqu� empieza la funci�n. Rellena la fecha prevista y los conceptos; el presupuesto se calcula autom�ticamente."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "REGISTRO PRESUPUESTOS"
    Texto = "Aqu� puedes ver todos tus presupuestos registrados y su estado (ACEPTADO/PENDIENTE)."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "CITAS"
    Texto = "Estas son todas las citas de tus clientes. Cambia el estado a CONFIRMADA para poder enviar a REPARACIONES."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "REPARACIONES"
    Texto = "Registro de veh�culos en reparaci�n. Cambia a 'Terminado' para generar la factura."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "FACTURAS"
    Texto = "Aqu� aparece la factura generada; imprime o env�a por email y registra la factura si procede."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "BALANCES"
    Texto = "An�lisis econ�mico: balances, filtros por trimestre y generaci�n de informes."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "MIS DATOS"
    Texto = "Aqu� puedes revisar y actualizar tus datos personales y de la empresa."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "REGISTRO FACTURAS"
    Texto = "Aqu� ver�s las facturas registradas y su estado."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "INCIDENCIAS"
    Texto = "Registro de incidencias."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    NombreHoja = "GU�A OPERATIVA"
    Texto = "Gu�a operativa del sistema."
    AddOrUpdateTooltipRow sh, NombreHoja, Texto

    MsgBox "TOOLTIPS actualizados seg�n la lista proporcionada.", vbInformation, "TOOLTIPS"
    Exit Sub

ErrHandler:
    MsgBox "Error RellenarTooltipsDesdeLista: " & Err.Number & " - " & Err.Description, vbExclamation
End Sub

' ============================================================
'   DIAGN�STICOS
' ============================================================
Public Sub DiagnosticoBotonesInfo()
    Dim ws As Worksheet, shTool As Worksheet
    Dim fila As Variant, Texto As String
    Dim msg As String
    Set shTool = ThisWorkbook.Worksheets("TOOLTIPS")
    msg = "Diagn�stico boton_info:" & vbCrLf & vbCrLf

    For Each ws In ThisWorkbook.Worksheets
        If ws.name <> "TOOLTIPS" Then
            On Error Resume Next
            Dim shp As Shape
            Set shp = ws.Shapes("boton_info")
            On Error GoTo 0

            If shp Is Nothing Then
                msg = msg & ws.name & " ? NO tiene shape 'boton_info'." & vbCrLf
            Else
                fila = Application.Match(ws.name, shTool.Range("A:A"), 0)
                If IsError(fila) Then
                    msg = msg & ws.name & " ? No hay fila en TOOLTIPS para esta hoja." & vbCrLf
                Else
                    Texto = Trim(shTool.Range("B" & fila).Value & "")
                    If Texto = "" Then
                        msg = msg & ws.name & " ? boton_info existe PERO no hay texto asignado (celda B" & fila & ")." & vbCrLf
                    Else
                        msg = msg & ws.name & " ? OK (texto asignado)." & vbCrLf
                    End If
                End If
            End If
        End If
    Next ws

    MsgBox msg, vbInformation, "Diagn�stico boton_info"
End Sub

Public Sub DiagnosticoOnAction()
    Dim ws As Worksheet, shp As Shape, msg As String
    msg = "Shapes boton_info y OnAction:" & vbCrLf & vbCrLf
    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next
        Set shp = ws.Shapes("boton_info")
        On Error GoTo 0
        If Not shp Is Nothing Then
            msg = msg & ws.name & " ? OnAction: " & Nz(shp.OnAction) & vbCrLf
        End If
    Next ws
    MsgBox msg, vbInformation, "Diagn�stico OnAction"
End Sub

Private Function Nz(v As Variant) As String
    If IsError(v) Then Nz = "<error>" Else Nz = CStr(v)
End Function


