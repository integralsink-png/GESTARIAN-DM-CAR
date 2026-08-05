Attribute VB_Name = "MIS_DATOS"
Option Explicit

' Copia MIS DATOS F5:F11 a PRESUPUESTOS y FACTURAS I3:I7
' Solo escribe en la columna I (I3:I7). No toca H ni la fila 8. No crea shapes.
Public Sub ActualizarDatosEmpresa_ColumnaI_SoloI()
    On Error GoTo ErrHandler

    Dim wb As Workbook: Set wb = ThisWorkbook
    Dim shSrc As Worksheet
    Dim destNames As Variant: destNames = Array("PRESUPUESTOS", "FACTURAS")
    Dim shName As Variant, ws As Worksheet
    Dim v5 As String, v6 As String, v7 As String, v8 As String, v9 As String, v10 As String, v11 As String
    Dim lineaCP As String

    ' Hoja origen
    Set shSrc = wb.Worksheets("MIS DATOS")

    ' Leer valores (F5:F11)
    v5 = Trim$(NzEmpty(shSrc.Range("F5").Value))
    v6 = Trim$(NzEmpty(shSrc.Range("F6").Value))
    v7 = Trim$(NzEmpty(shSrc.Range("F7").Value))
    v8 = Trim$(NzEmpty(shSrc.Range("F8").Value))
    v9 = Trim$(NzEmpty(shSrc.Range("F9").Value))
    v10 = Trim$(NzEmpty(shSrc.Range("F10").Value))
    v11 = Trim$(NzEmpty(shSrc.Range("F11").Value))

    lineaCP = "CP: " & JoinNonEmpty(Array(v8, v9, v10), " ")

    For Each shName In destNames
        If Not SheetExists(wb, CStr(shName)) Then
            Debug.Print "Hoja no encontrada: " & CStr(shName)
            GoTo NextSheet
        End If

        Set ws = wb.Worksheets(CStr(shName))
        With ws
            ' Escribir SOLO en I3:I7
            .Range("I3").Value = v5
            .Range("I4").Value = "CIF: " & v6
            .Range("I5").Value = v7
            .Range("I6").Value = lineaCP
            .Range("I7").Value = v11
            ' NO tocar fila 8 ni columna H

            ' Formato: I3 Calibri Light 18; I4:I7 Calibri 14
            With .Range("I3")
                .Font.name = "Calibri Light"
                .Font.Size = 18
                .WrapText = False
                .ShrinkToFit = False
                .HorizontalAlignment = xlCenter
                .VerticalAlignment = xlCenter
            End With

            With .Range("I4:I7")
                .Font.name = "Calibri"
                .Font.Size = 12
                .WrapText = False
                .ShrinkToFit = False
                .HorizontalAlignment = xlCenter
                .VerticalAlignment = xlCenter
            End With

            ' Asegurar que la columna I sea editable si la hoja está protegida
            On Error Resume Next
            .Columns("I").Locked = False
            On Error GoTo 0
        End With

NextSheet:
    Next shName

   ' ... (todo tu código anterior hasta el Next shName)

    ' Avisar mediante el botón en lugar del MsgBox
    Call ActualizarBotonAviso(shSrc, "botonactualizardatos") ' Asegúrate de usar el nombre correcto de tu botón
    Call ActualizarEstadoSistema
    Exit Sub

ErrHandler:
    MsgBox "Error: " & Err.Number & " - " & Err.Description, vbExclamation
End Sub
' --- Módulo donde tengas el botón ---


' --- MÓDULO ESTÁNDAR (Asegúrate de no tener esto duplicado) ---

Sub ActualizarBotonAviso(ws As Worksheet, nombreBoton As String)
    Dim btn As Shape
    On Error Resume Next
    Set btn = ws.Shapes(nombreBoton)
    On Error GoTo 0
    
    If Not btn Is Nothing Then
        ' 1. Aplicar estado "VERDE PISTACHO"
        With btn
            .TextFrame.Characters.Text = "DATOS ACTUALIZADOS"
            .Fill.Transparency = 1 ' Relleno transparente
            .Line.ForeColor.RGB = RGB(153, 255, 51)
            .Line.Transparency = 0
            .Glow.Radius = 10
            .Glow.Color.RGB = RGB(153, 255, 51)
            .Glow.Transparency = 0.3
        End With
        
        ' 2. Programar la restauración para dentro de 2 segundos
        ' Nota: La sintaxis de la llamada debe ser exacta
        Application.OnTime Now + TimeValue("0:00:02"), "'RestaurarBotonAviso """ & ws.name & """, """ & nombreBoton & """'"
    End If
End Sub

Sub RestaurarBotonAviso(wsName As String, nombreBoton As String)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(wsName)
    
    If Not ws Is Nothing Then
        Dim btn As Shape
        Set btn = ws.Shapes(nombreBoton)
        If Not btn Is Nothing Then
            With btn
                .TextFrame.Characters.Text = "ACTUALIZAR DATOS"
                .Fill.Transparency = 1 ' Relleno transparente
                .Line.ForeColor.RGB = vbWhite
                .Line.Transparency = 0
                .Glow.Color.RGB = vbWhite
                .Glow.Radius = 5
                .Glow.Transparency = 0.6
            End With
        End If
    End If
    On Error GoTo 0
End Sub

' -----------------------
' Helpers
' -----------------------
Private Function NzEmpty(v As Variant) As String
    On Error Resume Next
    If IsError(v) Or IsNull(v) Then NzEmpty = "" Else NzEmpty = CStr(v)
End Function

Private Function JoinNonEmpty(items As Variant, sep As String) As String
    Dim out As String, i As Long, T As String
    out = ""
    For i = LBound(items) To UBound(items)
        T = Trim$(CStr(items(i)))
        If Len(T) > 0 Then
            If out = "" Then out = T Else out = out & sep & T
        End If
    Next i
    JoinNonEmpty = out
End Function

Private Function SheetExists(wb As Workbook, name As String) As Boolean
    On Error Resume Next
    Dim sh As Worksheet
    Set sh = Nothing
    Set sh = wb.Worksheets(name)
    SheetExists = Not sh Is Nothing
    On Error GoTo 0
End Function
