Attribute VB_Name = "MOD_FACTURAS"
Option Explicit

'============================================================
' DECLARACIONES DE API DE WINDOWS PARA SONIDOS Y SISTEMA
'============================================================
Private Declare PtrSafe Function PlaySound Lib "winmm.dll" Alias "PlaySoundA" _
(ByVal lpszName As String, ByVal hModule As LongPtr, ByVal dwFlags As Long) As Long

Private Const SND_ASYNC As Long = &H1
Private Const SND_ALIAS As Long = &H10000

'============================================================
' RUTINAS DE GENERACIÓN DE FACTURAS (DESDE DIFERENTES HOJAS)
'============================================================
Sub TestSonido()
    Call PlaySound("SystemAsterisk", 0, &H1)
End Sub

Sub Generar_Factura()

    Dim shR As Worksheet: Set shR = Sheets("REPARACIONES")
    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim shB As Worksheet: Set shB = Sheets("BASE DE DATOS")
    Call CargarDatosEmpresaFactura
    Dim shp As Worksheet: Set shp = Sheets("REGISTRO PRESUPUESTOS")

    Dim r As Long
    Dim nF As String
    Dim nP As String
    Dim Mat As String

    Dim f As Range
    Dim j As Long

    r = ActiveCell.Row

    '============================================================
    ' VALIDACIONES INICIALES
    '============================================================
    If ActiveSheet.name <> "REPARACIONES" Then Exit Sub
    If r < 5 Then Exit Sub

    nP = Trim(shR.Cells(r, "B").Value)
    Mat = Trim(shR.Cells(r, "C").Value)

    If nP = "" Then
        MsgBox "No hay número de presupuesto en la fila seleccionada.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    ' Obtener el correlativo secuencial libre
    nF = SiguienteNumeroFactura()

    Application.ScreenUpdating = False

    '============================================================
    ' ESTADO VISUAL DE LA FACTURA
    '============================================================
    With shF.Shapes("SHAPE_ESTADO_FACTURA")
        .Fill.ForeColor.RGB = RGB(0, 0, 0)
        .Line.ForeColor.RGB = RGB(200, 200, 200)
        .Glow.Radius = 0
        .TextFrame2.TextRange.Text = "PENDIENTE"
        .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
    End With

    '============================================================
    ' LIMPIEZA DE CELDAS REUTILIZABLES
    '============================================================
    With shF
        .Range("C20:J37").ClearContents
        .Range("C14,D15,C17,D18,J14:J16").ClearContents
        .Range("J46:J48").ClearContents

        ' Asignación de metadatos de cabecera
        .Range("D9").Value = nF
        Call ActualizarShapeVersionFactura(nF)
        .Range("J9").Value = Date
        .Range("M9").Value = nP

        '========================================================
        ' BÚSQUEDA Y VOLCADO DE DATOS DEL CLIENTE / VEHÍCULO
        '========================================================
        Set f = shB.Columns("C").Find(Mat, LookAt:=xlWhole)

        If Not f Is Nothing Then
            .Range("J14").Value = Mat
            .Range("J15").Value = shB.Cells(f.Row, "D").Value
            .Range("J16").Value = shB.Cells(f.Row, "E").Value
            .Range("C14").Value = shB.Cells(f.Row, "H").Value
            .Range("D15").Value = shB.Cells(f.Row, "I").Value
            .Range("C17").Value = shB.Cells(f.Row, "J").Value
            .Range("D18").Value = shB.Cells(f.Row, "K").Value
        End If

        '========================================================
        ' IMPORTACIÓN DE LÍNEAS DESDE REGISTRO DE PRESUPUESTOS
        '========================================================
        Set f = shp.Columns("B").Find(nP, LookAt:=xlWhole)

        If Not f Is Nothing Then
            Dim filaIni As Long
            filaIni = f.Row
            j = 0

            Do While shp.Cells(filaIni + j, "G").Value <> ""
                If j > 0 Then
                    If shp.Cells(filaIni + j, "B").Value <> "" _
                    And shp.Cells(filaIni + j, "B").Value <> nP Then Exit Do
                End If

                .Cells(20 + j, "C").Value = shp.Cells(filaIni + j, "G").Value
                .Cells(20 + j, "H").Value = shp.Cells(filaIni + j, "H").Value
                .Cells(20 + j, "I").Value = shp.Cells(filaIni + j, "I").Value

                j = j + 1
                If j > 17 Then Exit Do
            Loop
        End If
    End With

    ' Recalcular impuestos automáticamente
    On Error Resume Next
    Application.Run "Hoja5.Calcular_IVA_DMCAR"
    On Error GoTo 0

    Application.ScreenUpdating = True
    Call PlaySound("SystemAsterisk", 0, &H1)
    shF.Activate

   
End Sub

Function SiguienteNumeroFactura() As String

    Dim shRegF As Worksheet
    Dim UltFila As Long
    Dim Codigo As String
    Dim Numero As Long
    Dim MaxNumero As Long
    Dim i As Long

    Set shRegF = Sheets("REGISTRO FACTURAS")

    UltFila = shRegF.Cells(shRegF.Rows.Count, "B").End(xlUp).Row

    MaxNumero = 0

    For i = 5 To UltFila

        Codigo = Trim(shRegF.Cells(i, "B").Value)

        If Codigo <> "" Then

            'Ignora posibles versiones A,B,C...
            Codigo = Replace(Codigo, "F", "")

            Do While Len(Codigo) > 0 And Not IsNumeric(Right(Codigo, 1))
                Codigo = Left(Codigo, Len(Codigo) - 1)
            Loop

            If IsNumeric(Codigo) Then
                Numero = CLng(Codigo)
                If Numero > MaxNumero Then MaxNumero = Numero
            End If

        End If

    Next i

    SiguienteNumeroFactura = "F" & Format(MaxNumero + 1, "00000")

End Function
Function SiguienteVersionFactura(ByVal CodigoFactura As String) As String

    Dim sh As Worksheet
    Dim UltFila As Long
    Dim i As Long

    Dim CodigoBase As String
    Dim Codigo As String

    Dim UltimaLetra As String

    Set sh = Sheets("REGISTRO FACTURAS")

    CodigoFactura = Trim(UCase(CodigoFactura))

    If CodigoFactura = "" Then Exit Function

    '------------------------------------------
    ' Código base
    '------------------------------------------

    If Right(CodigoFactura, 1) Like "#" Then
        CodigoBase = CodigoFactura
    Else
        CodigoBase = Left(CodigoFactura, Len(CodigoFactura) - 1)
    End If

    UltimaLetra = ""

    UltFila = sh.Cells(sh.Rows.Count, "B").End(xlUp).Row

    For i = 5 To UltFila

        Codigo = Trim(UCase(sh.Cells(i, "B").Value))

        If Left(Codigo, Len(CodigoBase)) = CodigoBase Then

            If Len(Codigo) > Len(CodigoBase) Then

                If Right(Codigo, 1) > UltimaLetra Then
                    UltimaLetra = Right(Codigo, 1)
                End If

            End If

        End If

    Next i

    '------------------------------------------
    ' Nunca se modificó
    '------------------------------------------

    If UltimaLetra = "" Then

        SiguienteVersionFactura = CodigoBase & "A"

    Else

        SiguienteVersionFactura = CodigoBase & Chr(Asc(UltimaLetra) + 1)

    End If

End Function
Public Sub Modificar_Factura()

    Dim shF As Worksheet
    Set shF = Sheets("FACTURAS")

    '----------------------------------------------------
    'PRIMER PULSADO
    '----------------------------------------------------

    If shF.Range("B2").Value = "" Then

        If MsgBox( _
            "Va a modificar una factura ya registrada." & vbCrLf & vbCrLf & _
            "La factura original permanecerá archivada." & vbCrLf & _
            "La nueva versión sustituirá a la anterior para Gestoría." & vbCrLf & vbCrLf & _
            "¿Desea continuar?", _
            vbQuestion + vbYesNo + vbDefaultButton2) = vbNo Then Exit Sub

        shF.Range("B2").Value = "MODIFICAR"

        With shF.Shapes("BTN_MODIFICAR_FACTURA")

            .TextFrame2.TextRange.Text = "PULSA TRAS MODIFICAR"

            .Line.Visible = msoTrue
            .Line.ForeColor.RGB = RGB(180, 220, 255)
            .Line.Weight = 1.25

            .Glow.Color.RGB = RGB(0, 170, 255)
            .Glow.Radius = 10
            .Glow.Transparency = 0.5

        End With

        MsgBox _
        "Realice ahora las modificaciones necesarias." & vbCrLf & vbCrLf & _
        "Cuando termine vuelva a pulsar este mismo botón.", _
        vbInformation

        Exit Sub

    End If

    '----------------------------------------------------
    'SEGUNDO PULSADO
    '----------------------------------------------------

    If shF.Range("B2").Value = "MODIFICAR" Then

        Registrar_Factura_Desde_Facturas

    End If

End Sub
'============================================================
' PROCESO PRINCIPAL: ENTRADA Y REGISTRO AL HISTORIAL
'============================================================
Sub Registrar_Factura_Desde_Facturas()

    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim shRegF As Worksheet: Set shRegF = Sheets("REGISTRO FACTURAS")
    Dim shBal As Worksheet: Set shBal = Sheets("BALANCES")

    Dim nF As String
    Dim Mat As String
    Dim nP As String

    Dim filaReg As Long
    Dim filaBal As Long

    Dim i As Long, k As Long
    Dim ultFilaReg As Long
    Dim primeraLinea As Boolean
    
    Dim conceptoActual As String
    Dim importeActual As Double
    Dim conceptoReg As String
    Dim importeReg As Double

    ' Obtención de metadatos de cabecera
    nF = Trim(shF.Range("D9").Value)
    Dim EsModificacion As Boolean

EsModificacion = (shF.Range("B2").Value = "MODIFICAR")

If EsModificacion Then

    nF = SiguienteVersionFactura(nF)

    shF.Range("D9").Value = nF
    Call ActualizarShapeVersionFactura(nF)

End If
    Mat = Trim(shF.Range("J14").Value)
    
    If Trim(shF.Range("M9").Value) = "" Or UCase(Trim(shF.Range("M9").Value)) = "SIN PRESUPUESTO" Then
        nP = "SIN PRESUPUESTO"
    Else
        nP = Trim(shF.Range("M9").Value)
    End If

    If nF = "" Or Mat = "" Then
        MsgBox "Faltan datos críticos para registrar la factura (Nº Factura o Matrícula).", vbExclamation, "DM CAR"
        Exit Sub
    End If

  '============================================================
' CONTROL DE DUPLICADOS
' (Solo para facturas nuevas)
'============================================================

If Not EsModificacion Then

    ultFilaReg = shRegF.Cells(shRegF.Rows.Count, "G").End(xlUp).Row

    For i = 20 To 37

        conceptoActual = Trim(shF.Cells(i, "C").Value)
        importeActual = Round(Val(shF.Cells(i, "J").Value), 2)

        If conceptoActual <> "" Then

            For k = 5 To ultFilaReg

                If Trim(shRegF.Cells(k, "D").Value) = Mat Then

                    conceptoReg = Trim(shRegF.Cells(k, "G").Value)
                    importeReg = Round(Val(shRegF.Cells(k, "J").Value), 2)

                    If UCase(conceptoReg) = UCase(conceptoActual) _
                    And importeReg = importeActual Then

                        Application.ScreenUpdating = True

                        Call PlaySound("SystemExclamation", 0, &H1)
                        Call EstiloBoton(shF.Shapes("BTN_REGISTRAR_FACTURA"), "DUPLICADA")

                        Dim msgErr As String

                        msgErr = _
                        "¡ATENCIÓN: DETECTADO DUPLICADO!" & vbCrLf & vbCrLf & _
                        "El trabajo '" & conceptoActual & "' con importe " & _
                        Format(importeActual, "0.00") & " € ya fue registrado anteriormente para la matrícula " & _
                        Mat & "." & vbCrLf & vbCrLf & _
                        "El proceso de registro se ha cancelado."

                        MsgBox msgErr, vbExclamation, "GESTARIAN"

                        Exit Sub

                    End If

                End If

            Next k

        End If

    Next i

End If

    ' Proceso de guardado tras pasar la validación
    Application.ScreenUpdating = False
    primeraLinea = True

    For i = 20 To 37

        If Trim(shF.Cells(i, "C").Value) <> "" Then

            filaReg = shRegF.Cells(shRegF.Rows.Count, "G").End(xlUp).Row + 1
            If filaReg < 5 Then filaReg = 5

            With shRegF

                ' Volcado de datos estructurales a cada línea de desglose
                .Cells(filaReg, "B").Value = nF
                .Cells(filaReg, "C").Value = shF.Range("C14").Value
                .Cells(filaReg, "E").Value = shF.Range("J15").Value
                .Cells(filaReg, "F").Value = shF.Range("J16").Value
                .Cells(filaReg, "D").Value = Mat
                .Cells(filaReg, "K").Value = Date
                .Cells(filaReg, "M").Value = nP
                
                ' Las celdas de control inician completamente limpias
                .Cells(filaReg, "L").Value = ""
                .Cells(filaReg, "N").Value = ""

                ' Estética original DM CAR (Fondo negro y texto blanco)
                With .Range(.Cells(filaReg, "B"), .Cells(filaReg, "N"))
                    .Interior.Color = RGB(0, 0, 0)
                    .Font.Color = vbWhite
                End With

                ' Tratamiento estético de?ultación para líneas secundarias
                If primeraLinea = False Then
                    .Range("B" & filaReg & ":F" & filaReg).Font.Color = RGB(0, 0, 0)
                    .Range("K" & filaReg & ":N" & filaReg).Font.Color = RGB(0, 0, 0)
                Else
                    With .Cells(filaReg, "L")
                        .Font.Bold = True
                        .HorizontalAlignment = xlCenter
                    End With
                    With .Cells(filaReg, "N")
                        .Font.Bold = True
                        .HorizontalAlignment = xlCenter
                    End With
                    primeraLinea = False
                End If

                ' Datos económicos e importes del concepto
                .Cells(filaReg, "G").Value = shF.Cells(i, "C").Value
                .Cells(filaReg, "H").Value = shF.Cells(i, "H").Value
                .Cells(filaReg, "I").Value = shF.Cells(i, "I").Value
                .Cells(filaReg, "J").Value = shF.Cells(i, "J").Value

            End With

        End If

    Next i

    ' Registro paralelo en hoja de balances
    filaBal = shBal.Cells(shBal.Rows.Count, "B").End(xlUp).Row + 1
    If filaBal < 5 Then filaBal = 5

    With shBal
        .Cells(filaBal, "B").Value = nF
        .Cells(filaBal, "C").Value = Date
        .Cells(filaBal, "D").Value = shF.Range("J46").Value
        .Cells(filaBal, "E").Value = shF.Range("J47").Value
        .Cells(filaBal, "F").Value = shF.Range("J48").Value
    End With

    ' Ordenaciones descendentes automáticas
    Dim ultimaFilaBal As Long
    ultimaFilaBal = shBal.Cells(shBal.Rows.Count, "B").End(xlUp).Row
    
    With shBal.Sort
        .SortFields.Clear
        .SortFields.Add Key:=shBal.Range("B5:B" & ultimaFilaBal), SortOn:=xlSortOnValues, Order:=xlDescending
        .SetRange shBal.Range("B5:F" & ultimaFilaBal)
        .Header = xlNo: .Apply
    End With

    Dim UltimaFila As Long
    UltimaFila = shRegF.Cells(shRegF.Rows.Count, "G").End(xlUp).Row
    
    With shRegF.Sort
        .SortFields.Clear
        .SortFields.Add Key:=shRegF.Range("B5:B" & UltimaFila), SortOn:=xlSortOnValues, Order:=xlDescending
        .SetRange shRegF.Range("B5:N" & UltimaFila)
        .Header = xlNo: .Apply
    End With

    Call EstiloBoton(shF.Shapes("BTN_REGISTRAR_FACTURA"), "OK")
    Application.ScreenUpdating = True
    
    If EsModificacion Then
    '-------------------------------------------------------
' REGISTRAR INCIDENCIA
'-------------------------------------------------------

Dim shInc As Worksheet
Dim filaInc As Long

Set shInc = Sheets("INCIDENCIAS")

filaInc = shInc.Cells(shInc.Rows.Count, "B").End(xlUp).Row + 1
If filaInc < 5 Then filaInc = 5

With shInc

    .Cells(filaInc, "B").Value = nF
    .Cells(filaInc, "C").Value = Date
    .Cells(filaInc, "D").Value = shF.Range("C14").Value
    .Cells(filaInc, "E").Value = shF.Range("J14").Value

    .Cells(filaInc, "F").Value = _
        "Factura " & nF & _
        " modificada. Más información en la carpeta FACTURAS MODIFICADAS."

    .Cells(filaInc, "G").Value = "ABIERTA"

End With

    With shF.Shapes("BTN_MODIFICAR_FACTURA")

        .TextFrame2.TextRange.Text = "FACTURA MODIFICADA"

        .Line.ForeColor.RGB = RGB(220, 255, 220)
        .Line.Weight = 1.25

        .Glow.Color.RGB = RGB(0, 255, 0)
        .Glow.Radius = 10
        .Glow.Transparency = 0.5

    End With

    shF.Range("B2").Value = "MODIFICADA"

End If
    ' Archivo digital de seguridad automático en PDF al registrar
    Call AutoGuardar_PDF_Al_Registrar(nF)
End Sub



Public Function RutaFacturasDM(Optional FechaFactura As Date) As String

    Dim RutaBase As String
    Dim Anio As String
    Dim Tri As String

    If FechaFactura = 0 Then FechaFactura = Date

    Anio = Year(FechaFactura)
    Tri = "T" & WorksheetFunction.RoundUp(Month(FechaFactura) / 3, 0)

    RutaBase = Environ("USERPROFILE") & "\Documents\TALLER MIGUEL\FACTURAS EMITIDAS"

    If Dir(RutaBase, vbDirectory) = "" Then MkDir RutaBase
    If Dir(RutaBase & "\" & Anio, vbDirectory) = "" Then MkDir RutaBase & "\" & Anio
    If Dir(RutaBase & "\" & Anio & "\" & Tri, vbDirectory) = "" Then MkDir RutaBase & "\" & Anio & "\" & Tri

    RutaFacturasDM = RutaBase & "\" & Anio & "\" & Tri

End Function


Public Function RutaFacturasModificadasDM(Optional FechaFactura As Date) As String

    Dim RutaBase As String
    Dim Anio As String
    Dim Tri As String

    If FechaFactura = 0 Then FechaFactura = Date

    Anio = Year(FechaFactura)
    Tri = "T" & WorksheetFunction.RoundUp(Month(FechaFactura) / 3, 0)

    RutaBase = Environ("USERPROFILE") & "\Documents\TALLER MIGUEL\FACTURAS MODIFICADAS"

    If Dir(RutaBase, vbDirectory) = "" Then MkDir RutaBase
    If Dir(RutaBase & "\" & Anio, vbDirectory) = "" Then MkDir RutaBase & "\" & Anio
    If Dir(RutaBase & "\" & Anio & "\" & Tri, vbDirectory) = "" Then MkDir RutaBase & "\" & Anio & "\" & Tri

    RutaFacturasModificadasDM = RutaBase & "\" & Anio & "\" & Tri

End Function

Public Function RutaInformesTrimestralesDM(Anio As Long, Trimestre As Integer) As String
    Dim rb As String: rb = Environ("USERPROFILE") & "\Documents\TALLER MIGUEL\INFORMES"
    Dim ra As String: ra = rb & "\" & Anio
    Dim rf As String: rf = ra & "\T" & Trimestre
    If Dir(rb, vbDirectory) = "" Then MkDir rb
    If Dir(ra, vbDirectory) = "" Then MkDir ra
    If Dir(rf, vbDirectory) = "" Then MkDir rf
    RutaInformesTrimestralesDM = rf
End Function

'============================================================
' RUTINA EXCLUSIVA PARA GENERACIÓN AUTOMÁTICA DE COPIA EN PDF
'============================================================
Private Sub AutoGuardar_PDF_Al_Registrar(ByVal NumFactura As String)

    On Error GoTo ErrPDF

    Dim shF As Worksheet
    Set shF = Sheets("FACTURAS")

    Dim ruta As String
    Dim archivo As String
    Dim nombreLimpio As String

    '--------------------------------------------------------
    ' ELEGIR CARPETA SEGÚN EL TIPO DE FACTURA
    '--------------------------------------------------------

    If UCase(Trim(shF.Range("B2").Value)) = "MODIFICAR" Then

        ruta = RutaFacturasModificadasDM()

    Else

        ruta = RutaFacturasDM()

    End If

    If Len(Dir(ruta, vbDirectory)) > 0 Then

        nombreLimpio = NumFactura

        nombreLimpio = Replace(nombreLimpio, "/", "-")
        nombreLimpio = Replace(nombreLimpio, "\", "-")
        nombreLimpio = Replace(nombreLimpio, ":", "-")
        nombreLimpio = Replace(nombreLimpio, "*", "-")
        nombreLimpio = Replace(nombreLimpio, "?", "-")
        nombreLimpio = Replace(nombreLimpio, """", "-")
        nombreLimpio = Replace(nombreLimpio, "<", "-")
        nombreLimpio = Replace(nombreLimpio, ">", "-")
        nombreLimpio = Replace(nombreLimpio, "|", "-")

        archivo = ruta & "\Factura_" & nombreLimpio & ".pdf"

        shF.Range("C3:J48").ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=archivo, _
            Quality:=xlQualityStandard, _
            OpenAfterPublish:=False

        If UCase(Trim(shF.Range("B2").Value)) = "MODIFICAR" Then

            MsgBox "Factura modificada archivada correctamente.", _
                   vbInformation, "DM CAR"

        Else

            MsgBox "Factura " & NumFactura & _
                   " registrada y archivada correctamente.", _
                   vbInformation, "DM CAR"

        End If

    End If

    Exit Sub

ErrPDF:

    MsgBox "La factura se registró, pero no pudo generarse el PDF." & _
           vbCrLf & vbCrLf & _
           Err.Description, _
           vbExclamation, "DM CAR"

End Sub

'============================================================
' ACCIÓN EXCLUSIVA DE IMPRESIÓN FÍSICA Y CONFIGURACION LIBRE
'============================================================
Sub Imprimir_Factura_Boton_V()
    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim nF As String
    Dim imprimio As Boolean

    nF = Trim(shF.Range("D9").Value)
    
    If nF = "" Then
        MsgBox "No hay ninguna factura en pantalla para mandar a la impresora.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    ' Lanzamiento de la ventana estándar e independiente de impresión
    shF.Range("C3:J48").Select
    imprimio = Application.Dialogs(xlDialogPrint).Show
    
    shF.Range("C20").Select
End Sub

'============================================================
' INTERFACES Y COMPONENTES VISUALES (TOOLTIPS Y BOTONES)
'============================================================
Sub Tooltip(mensaje As String)

    Dim ws As Worksheet: Set ws = Sheets("FACTURAS")
    Dim shp As Shape
    Dim btn As Shape: Set btn = ws.Shapes("BTN_REGISTRAR_FACTURA")

    On Error Resume Next
    ws.Shapes("TooltipTemp").Delete
    On Error GoTo 0

    Set shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, _
                                 btn.Left - 10, btn.Top - 90, _
                                 220, 80)

    With shp
        .name = "TooltipTemp"
        .Fill.Visible = msoTrue
        .Fill.Solid
        .Fill.ForeColor.RGB = RGB(0, 0, 0)
        .Fill.Transparency = 0.15

        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = RGB(255, 255, 255)
        .Line.Weight = 1

        On Error Resume Next
        .Adjustments.Item(1) = 0.2
        On Error GoTo 0

        With .Glow
            .Color.RGB = RGB(0, 255, 255)
            .Radius = 40
            .Transparency = 0.6
        End With

        With .TextFrame2
            .TextRange.Text = mensaje
            .TextRange.Font.name = "Candara"
            .TextRange.Font.Size = 18
            .TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
            .TextRange.ParagraphFormat.Alignment = msoAlignCenter
            .VerticalAnchor = msoAnchorMiddle
        End With

        .ZOrder msoBringToFront
    End With

    Application.OnTime Now + TimeValue("00:00:03"), "EliminarTooltip"

End Sub

Sub EliminarTooltip()
    On Error Resume Next
    Sheets("FACTURAS").Shapes("TooltipTemp").Delete
End Sub

Sub EstiloBoton(btn As Shape, modo As String)

    btn.Fill.Visible = msoFalse
    btn.Line.Visible = msoTrue
    btn.Line.ForeColor.RGB = RGB(255, 255, 255)
    btn.Line.Weight = 1

    Select Case modo

        Case "OK"
            btn.Glow.Color.RGB = RGB(173, 255, 47)
            btn.Glow.Radius = 10
            btn.Glow.Transparency = 0.6

            With btn.TextFrame2
                .TextRange.Delete
                .TextRange.Text = "REGISTRADA Y GUARDADA"
                .TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
                .TextRange.Font.Bold = True
                .TextRange.ParagraphFormat.Alignment = msoAlignCenter
        
            End With

        Case "DUPLICADA"
            btn.Glow.Color.RGB = RGB(255, 0, 0)
            btn.Glow.Radius = 10
            btn.Glow.Transparency = 0.6

            With btn.TextFrame2
                .TextRange.Delete
                .TextRange.Text = "REGISTRADA ANTERIORMENTE"
                .TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
                .TextRange.Font.Bold = True
                .TextRange.ParagraphFormat.Alignment = msoAlignCenter
            End With

    End Select

    Application.OnTime Now + TimeValue("00:00:02"), "RestaurarBoton"

End Sub

Sub RestaurarBoton()

    Dim btn As Shape
    On Error Resume Next
    Set btn = Sheets("FACTURAS").Shapes("BTN_REGISTRAR_FACTURA")
    If btn Is Nothing Then Exit Sub
    On Error GoTo 0

    btn.Fill.Visible = msoFalse
    btn.Line.Visible = msoTrue
    btn.Line.ForeColor.RGB = RGB(255, 255, 255)
    btn.Line.Weight = 1
    btn.Glow.Radius = 0

    With btn.TextFrame2
        .TextRange.Delete
        .TextRange.Text = "REGISTRAR FACTURA"
        .TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
        .TextRange.Font.Bold = True
        .TextRange.ParagraphFormat.Alignment = msoAlignCenter
    End With

End Sub

'============================================================
' CAMBIO DE ESTADO DINÁMICO DE LA FACTURA (COLUMNA L Y N)
'============================================================
Sub CambiarEstadoFactura()

    Dim shF As Worksheet
    Dim shRegF As Worksheet
    Dim shBal As Worksheet

    Dim obj As Shape
    Dim txt As String
    Dim nFactura As String

    Dim NuevoEstado As String
    Dim nuevoColor As Long

    Dim i As Long
    Dim ultFilaReg As Long
    Dim filaBal As Variant

    Set shF = Sheets("FACTURAS")
    Set shRegF = Sheets("REGISTRO FACTURAS")
    Set shBal = Sheets("BALANCES")

    Set obj = shF.Shapes("SHAPE_ESTADO_FACTURA")

    txt = Trim(UCase(obj.TextFrame2.TextRange.Text))
    nFactura = Trim(shF.Range("D9").Value)

    If nFactura = "" Then Exit Sub

    Select Case txt

        Case "PENDIENTE"
            NuevoEstado = "ABONADA"
            nuevoColor = RGB(0, 176, 80)

        Case "ABONADA"
            NuevoEstado = "PARCIAL"
            nuevoColor = RGB(0, 112, 192)

        Case "PARCIAL"
            NuevoEstado = "IMPAGADA"
            nuevoColor = RGB(255, 0, 0)

        Case Else
            NuevoEstado = "PENDIENTE"
            nuevoColor = RGB(0, 0, 0)

    End Select

    On Error Resume Next
    Dim soundMacro As String
    soundMacro = "SonidoBotonDM"
    Application.Run soundMacro
    On Error GoTo 0

    Call ApplyingEsteticaEstado(obj, NuevoEstado, nuevoColor)

    Application.ScreenUpdating = False
    
    ultFilaReg = shRegF.Cells(shRegF.Rows.Count, "B").End(xlUp).Row

    For i = 5 To ultFilaReg
        If Trim(shRegF.Cells(i, "B").Value) = nFactura Then
            
            ' 1. Guardar el nuevo Estado en la columna L
            With shRegF.Cells(i, "L")
                .Value = NuevoEstado
                .Interior.Color = nuevoColor
                .Font.Color = vbWhite
                .Font.Bold = True
                .HorizontalAlignment = xlCenter
            End With
            
            ' 2. Control estricto de la columna N según el estado
            With shRegF.Cells(i, "N")
                .Interior.Color = RGB(0, 0, 0) ' Mantiene el fondo negro corporativo
                
                If NuevoEstado = "PENDIENTE" Then
                    .Value = ""
                Else
                    .Value = "SI"
                    .Font.Color = vbWhite ' Forzamos texto blanco para que sea visible en todas las líneas
                    .Font.Bold = True
                    .HorizontalAlignment = xlCenter
                End If
            End With
            
        End If
    Next i

    ' Actualización en la hoja de Balances
    filaBal = Application.Match(nFactura, shBal.Columns("B"), 0)

    If Not IsError(filaBal) Then
        With shBal.Cells(filaBal, "B")
            .Interior.Color = nuevoColor
            .Font.Color = vbWhite
            .Font.Bold = True
            .HorizontalAlignment = xlCenter
        End With
    End If

    Application.ScreenUpdating = True

    On Error Resume Next
    Dim alertMacro As String
    alertMacro = "ActualizarAlertaFacturas"
    Application.Run alertMacro
    On Error GoTo 0

End Sub
Private Sub ApplyingEsteticaEstado(obj As Shape, Texto As String, colorIlum As Long)
    With obj.TextFrame2.TextRange
        .Text = Texto
        With .Font
            .name = "Candara"
            .Size = 14
            .Fill.ForeColor.RGB = vbWhite
            .Bold = msoFalse
        End With
        .ParagraphFormat.Alignment = msoAlignCenter
    End With

    With obj
        .TextFrame2.VerticalAnchor = msoAnchorMiddle
        .Fill.Visible = msoTrue
        .Fill.ForeColor.RGB = RGB(0, 0, 0)
        .Fill.Transparency = 0

        With .Line
            .Visible = msoTrue
            .ForeColor.RGB = colorIlum
            .Transparency = 0.25
            .Weight = 1.5
        End With

        If Texto = "PENDIENTE" Then
            .Glow.Radius = 0
        Else
            With .Glow
                .Color.RGB = colorIlum
                .Radius = 15
                .Transparency = 0.3
            End With
        End If
    End With

    DoEvents
End Sub

'============================================================
' CONTROLES AUXILIARES DE DUPLICADOS Y LOGICA DE NEGOCIO
'============================================================
Function ExisteFacturaDePresupuesto(nP As String) As Boolean

    Dim shReg As Worksheet
    Dim UltFila As Long
    Dim i As Long
    Dim valorCelda As String

    If Trim(nP) = "" Or UCase(Trim(nP)) = "SIN PRESUPUESTO" Then
        ExisteFacturaDePresupuesto = False
        Exit Function
    End If

    Set shReg = Sheets("REGISTRO FACTURAS")
    UltFila = shReg.Cells(shReg.Rows.Count, "M").End(xlUp).Row

    For i = 5 To UltFila
        valorCelda = Trim(shReg.Cells(i, "M").Value)
        
        If valorCelda <> "" And UCase(valorCelda) <> "SIN PRESUPUESTO" Then
            If UCase(valorCelda) = UCase(Trim(nP)) Then
                ExisteFacturaDePresupuesto = True
                Exit Function
            End If
        End If
    Next i

    ExisteFacturaDePresupuesto = False

End Function

Function FacturaDuplicada(Matricula As String, FechaFactura As Date, importeTotal As Double) As Boolean

    Dim shReg As Worksheet
    Dim UltFila As Long
    Dim i As Long
    Dim NumFactura As String
    Dim sumaFactura As Double
    Dim fechaReg As Date
    Dim matriculaReg As String

    Set shReg = Sheets("REGISTRO FACTURAS")
    UltFila = shReg.Cells(shReg.Rows.Count, "B").End(xlUp).Row

    For i = 5 To UltFila
        NumFactura = Trim(shReg.Cells(i, "B").Value)

        If NumFactura <> "" Then
            matriculaReg = Trim(UCase(shReg.Cells(i, "D").Value))
            fechaReg = shReg.Cells(i, "K").Value

            If matriculaReg = Trim(UCase(Matricula)) Then
                If Int(fechaReg) = Int(FechaFactura) Then

                    sumaFactura = Application.WorksheetFunction.SumIf( _
                                    shReg.Range("B:B"), _
                                    NumFactura, _
                                    shReg.Range("J:J"))

                    If Round(sumaFactura, 2) = Round(importeTotal, 2) Then
                        FacturaDuplicada = True
                        Exit Function
                    End If

                End If
            End If
        End If
    Next i

    FacturaDuplicada = False

End Function

'============================================================
' ACCIÓN: ABRIR CARPETA DE FACTURAS EMITIDAS
'============================================================
Sub Abrir_Carpeta_Facturas()
    Dim ruta As String
    ruta = RutaFacturasDM()
    
    If Len(Dir(ruta, vbDirectory)) > 0 Then
        Shell "explorer.exe """ & ruta & """", vbNormalFocus
    Else
        MsgBox "La carpeta de facturas no se encuentra disponible o no se ha creado todavía.", vbExclamation, "DM CAR"
    End If
End Sub

