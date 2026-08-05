Attribute VB_Name = "AlertasInicio"
Sub ActualizarAlertaFacturas()
    Dim shI As Worksheet: Set shI = ThisWorkbook.Sheets("INICIO")
    Dim shR As Worksheet: Set shR = ThisWorkbook.Sheets("REGISTRO FACTURAS")
    Dim btn As Shape
    Dim i As Long, ult As Long
    Dim hayRojo As Boolean, hayAzul As Boolean
    
    ' 1. Referencia al objeto (si no existe, salimos)
    On Error Resume Next
    Set btn = shI.Shapes("BTN_REGISTRO_FACTURAS")
    On Error GoTo 0
    If btn Is Nothing Then Exit Sub

    ' 2. ESCANEO PURO DE COLORES (Columna L)
    ' Buscamos hasta la �ltima fila con datos en la columna B
    ult = shR.Cells(shR.Rows.Count, "B").End(xlUp).Row
    
    hayRojo = False
    hayAzul = False

    ' Escaneamos celda por celda el color de relleno
    For i = 5 To ult
        Select Case shR.Cells(i, "L").Interior.Color
            Case 255, RGB(255, 0, 0) ' Rojo
                hayRojo = True
                Exit For ' Si hay uno rojo, prioridad m�xima, dejamos de buscar
            Case 12615680, RGB(0, 112, 192) ' Azul
                hayAzul = True
        End Select
    Next i

    ' 3. ACTUALIZACI�N GR�FICA DEL OBJETO
    ' DoEvents ayuda a que Excel "respire" y procese el cambio visual
    DoEvents
    
    With btn
        ' Reset del brillo para obligar a Excel a redibujarlo
        .Glow.Radius = 0
        
        If hayRojo Then
            .Glow.Color.RGB = RGB(255, 0, 0)
            .Glow.Radius = 4
            .Glow.Transparency = 0.6
        ElseIf hayAzul Then
            .Glow.Color.RGB = RGB(0, 112, 192)
            .Glow.Radius = 4
            .Glow.Transparency = 0.6
        Else
            ' Si no hay ni rojo ni azul, apagamos el brillo
            .Glow.Radius = 0
        End If
    End With
    
    DoEvents
End Sub
Sub ActualizarAlertaCitas()
    Dim shI As Worksheet: Set shI = Sheets("INICIO")
    Dim shC As Worksheet: Set shC = Sheets("CITAS")
    Dim objCI As Shape
    Dim UltFila As Long, i As Long
    Dim hayCitaHoy As Boolean
    Dim estadoCita As String

    On Error Resume Next
    Set objCI = shI.Shapes("BTN_CITAS")
    On Error GoTo 0
    
    If objCI Is Nothing Then Exit Sub

    ' Escaneo de Citas
    UltFila = shC.Cells(shC.Rows.Count, "C").End(xlUp).Row
    hayCitaHoy = False

    For i = 5 To UltFila
        If IsDate(shC.Cells(i, "C").Value) Then
            If Int(shC.Cells(i, "C").Value) = Date Then
                estadoCita = UCase(Trim(shC.Cells(i, "B").Value))
                If estadoCita = "PENDIENTE" Then
                    hayCitaHoy = True
                    Exit For
                End If
            End If
        End If
    Next i

    ' Actualizar Apariencia BTN_CITAS
    
    With objCI
        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = vbWhite
        .Fill.Visible = msoFalse ' Preserva tu imagen de fondo
        
        If hayCitaHoy Then
            .Glow.Color.RGB = RGB(255, 140, 0) ' NARANJA
            .Glow.Radius = 4
            .Glow.Transparency = 0.6
        Else
            .Glow.Radius = 0
        End If
    End With
    
    DoEvents ' Fuerza el refresco visual en pantalla
End Sub
