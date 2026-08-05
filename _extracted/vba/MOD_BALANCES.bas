Attribute VB_Name = "MOD_BALANCES"
Option Explicit

Public EstadoFiltroBalances As String

' ============================================================
' 1. FILTRAR MAESTRO
' ============================================================
Sub FiltrarBalanceTrimestral()
    Dim sh As Worksheet: Set sh = Sheets("BALANCES")
    Dim Tri As Integer, AnioFiscal As Long, fIni As Date, fFin As Date
    Dim i As Long, nFilaE As Long, nFilaR As Long, nTrasteroE As Long, nTrasteroR As Long
    Dim datosE As Variant, datosR As Variant, Fecha As Variant
    Dim dictE As Object, dictR As Object, ID As String, colorEstado As Long

    Set dictE = CreateObject("Scripting.Dictionary")
    Set dictR = CreateObject("Scripting.Dictionary")

    Tri = Val(sh.Range("I22").Value)
    AnioFiscal = Val(sh.Range("L22").Value)
    If AnioFiscal < 100 Then AnioFiscal = 2000 + AnioFiscal

    If Tri < 1 Or Tri > 4 Then
        fIni = DateSerial(1900, 1, 1): fFin = DateSerial(2099, 12, 31)
    Else
        fIni = DateSerial(AnioFiscal, (Tri - 1) * 3 + 1, 1)
        fFin = DateSerial(AnioFiscal, Tri * 3 + 1, 0)
    End If

    If EstadoFiltroBalances = "" Then EstadoFiltroBalances = "TODAS"
    Application.ScreenUpdating = False

    Dim uE As Long: uE = sh.Range("B" & Rows.Count).End(xlUp).Row
    If uE >= 5 Then
        datosE = sh.Range("B5:F" & uE).Value
        Dim coloresE() As Long: ReDim coloresE(1 To uE - 4)
        For i = 5 To uE: coloresE(i - 4) = sh.Cells(i, "B").Interior.Color: Next i
        sh.Range("B5:F2000").ClearContents: sh.Range("B5:F2000").Interior.Color = RGB(0, 0, 0)
        nFilaE = 5: nTrasteroE = 1000
        For i = 1 To UBound(datosE, 1)
            ID = Trim(CStr(datosE(i, 1)))
            If ID <> "" And Not dictE.Exists(ID) Then
                dictE.Add ID, Nothing: Fecha = datosE(i, 2): colorEstado = coloresE(i)
                Dim cumpleF As Boolean: cumpleF = (IsDate(Fecha) And CDate(Fecha) >= fIni And CDate(Fecha) <= fFin)
                Dim cumpleE As Boolean: cumpleE = False
               Select Case EstadoFiltroBalances

    Case "TODAS"
        cumpleE = True

    Case "IMPAGADAS"
        If colorEstado = RGB(255, 0, 0) Then cumpleE = True

    Case "PARCIAL"
        If colorEstado = RGB(0, 112, 192) Then cumpleE = True

    Case "PENDIENTE"
        If colorEstado = RGB(0, 0, 0) Then cumpleE = True

    Case "ABONADAS"
        If colorEstado = RGB(0, 176, 80) Then cumpleE = True

    Case "MODIFICADAS"
        If colorEstado = RGB(255, 192, 0) Then cumpleE = True

End Select
                Dim fDest As Long: fDest = IIf(cumpleF And cumpleE, nFilaE, nTrasteroE)
                If cumpleF And cumpleE Then nFilaE = nFilaE + 1 Else nTrasteroE = nTrasteroE + 1
                sh.Range("B" & fDest).Resize(1, 5).Value = Application.index(datosE, i, 0)
                AplicarFormatoDise�o sh.Range("B" & fDest).Resize(1, 5)
                sh.Cells(fDest, "B").Interior.Color = colorEstado
            End If
        Next i
    End If

    Dim uR As Long: uR = sh.Range("O" & Rows.Count).End(xlUp).Row
    If uR >= 5 Then
        datosR = sh.Range("O5:S" & uR).Value
        sh.Range("O5:S2000").ClearContents: sh.Range("O5:S2000").Interior.Color = RGB(0, 0, 0)
        nFilaR = 5: nTrasteroR = 1000
        For i = 1 To UBound(datosR, 1)
            ID = Trim(CStr(datosR(i, 1)))
            If ID <> "" And Not dictR.Exists(ID) Then
                dictR.Add ID, Nothing: Fecha = datosR(i, 2)
                Dim fDestR As Long: fDestR = IIf(IsDate(Fecha) And CDate(Fecha) >= fIni And CDate(Fecha) <= fFin, nFilaR, nTrasteroR)
                If fDestR = nFilaR Then nFilaR = nFilaR + 1 Else nTrasteroR = nTrasteroR + 1
                sh.Range("O" & fDestR).Resize(1, 5).Value = Application.index(datosR, i, 0)
                AplicarFormatoDise�o sh.Range("O" & fDestR).Resize(1, 5)
            End If
        Next i
    End If
    Application.ScreenUpdating = True
End Sub
Sub VerFacturaDesdeBalances()

    Dim shBal As Worksheet
    Dim shReg As Worksheet
    Dim shF As Worksheet
    Dim filaSel As Long
    Dim filaInicio As Long
    Dim NumFactura As String
    Dim f As Range
    Dim obj As Shape
    Dim colorCelda As Long
    Dim txt As String
    Dim colorGlow As Long
    Dim i As Long, lin As Long
    Dim numDetectado As Variant

    Set shBal = Sheets("BALANCES")
    Set shReg = Sheets("REGISTRO FACTURAS")
    Set shF = Sheets("FACTURAS")

    filaSel = ActiveCell.Row
    NumFactura = Trim(shBal.Cells(filaSel, "B").Value)

    If filaSel < 5 Or NumFactura = "" Then Exit Sub

    '=========================================
    ' 1. LEER COLOR DE LA CELDA B
    '=========================================
    colorCelda = shBal.Cells(filaSel, "B").Interior.Color

    Select Case colorCelda
        Case RGB(255, 0, 0)
            txt = "IMPAGADA"
            colorGlow = RGB(255, 0, 0)
        Case RGB(0, 112, 192)
            txt = "PARCIAL"
            colorGlow = RGB(0, 112, 192)
        Case RGB(0, 176, 80)
            txt = "ABONADA"
            colorGlow = RGB(0, 176, 80)
        Case Else
            txt = "PENDIENTE"
            colorGlow = RGB(255, 255, 255)
    End Select

    '=========================================
    ' 2. ACTUALIZAR BOT�N "estado"
    '=========================================
    On Error Resume Next
    Set obj = shF.Shapes("estado")
    On Error GoTo 0

    If Not obj Is Nothing Then
        With obj
            .Fill.Visible = msoTrue
            .Fill.ForeColor.RGB = RGB(0, 0, 0)
            With .TextFrame2.TextRange
                .Text = txt
                With .Font
                    .name = "Corbel Light"
                    .Size = 14
                    .Fill.ForeColor.RGB = vbWhite
                End With
            End With
            With .Line
                .Visible = msoTrue
                .ForeColor.RGB = colorGlow
                .Weight = 1.25
            End With
            With .Glow
                .Color.RGB = colorGlow
                .Radius = 15
                .Transparency = 0.3
            End With
        End With
    End If

    '=========================================
    ' 3. LOCALIZAR PRIMERA FILA DE LA FACTURA EN REGISTRO
    '=========================================
    Set f = shReg.Columns("B").Find(NumFactura, LookAt:=xlWhole, LookIn:=xlValues)
    If f Is Nothing Then Exit Sub

    filaSel = f.Row
    If shReg.Cells(filaSel, "B").Value <> "" Then
        filaInicio = filaSel
    Else
        filaInicio = shReg.Cells(filaSel, "B").End(xlUp).Row
        If filaInicio < 5 Then Exit Sub
    End If

    '=========================================
    ' 4. CARGAR FACTURA EN HOJA FACTURAS (todas las l�neas)
    '=========================================
    Application.ScreenUpdating = False

    With shF
        .Range("C20:J37,H20:H37,I20:I37,J20:J37,J46:J48").ClearContents

        ' Cabecera
        .Range("D9").Value = NumFactura
        .Range("J9").Value = shReg.Cells(filaInicio, "K").Value
        .Range("C14").Value = shReg.Cells(filaInicio, "C").Value
        .Range("J14").Value = shReg.Cells(filaInicio, "D").Value
        .Range("J15").Value = shReg.Cells(filaInicio, "E").Value
        .Range("J16").Value = shReg.Cells(filaInicio, "F").Value

        ' Cargar l�neas de concepto desde REGISTRO FACTURAS
        lin = 0
        i = filaInicio

        Do
            ' Si B tiene un n�mero distinto y no es la primera fila, parar
            numDetectado = shReg.Cells(i, "B").Value
            If numDetectado <> "" Then
                If numDetectado <> NumFactura Then Exit Do
            End If

            ' Si G est� vac�o, no hay m�s conceptos
            If Trim(shReg.Cells(i, "G").Value) = "" Then Exit Do

            ' Copiar concepto completo a FACTURAS (C,H,I,J)
            .Cells(20 + lin, "C").Value = shReg.Cells(i, "G").Value ' CONCEPTO
            .Cells(20 + lin, "H").Value = shReg.Cells(i, "H").Value ' CANTIDAD
            .Cells(20 + lin, "I").Value = shReg.Cells(i, "I").Value ' PRECIO
            .Cells(20 + lin, "J").Value = shReg.Cells(i, "J").Value ' IMPORTE

            lin = lin + 1
            i = i + 1
            If 20 + lin > 37 Then Exit Do
        Loop

        ' Totales (si procede)
        .Range("J46").Formula = "=SUM(J20:J37)"
        .Range("J47").Formula = "=J46*0.21"
        .Range("J48").Formula = "=J46+J47"
        .Range("J46:J48").NumberFormat = "#,##0.00 �"
    End With

    '=========================================
    ' 5. MOSTRAR HOJA FACTURAS
    '=========================================
    shF.Activate
    shF.Range("C20").Select

    Application.ScreenUpdating = True

End Sub
' ============================================================
' 3. GENERADOR DE INFORME IVA (PDF + EXCEL)
' ============================================================
Sub Generar_Informe_IVA_Trimestral()
    Dim fBase As Integer: fBase = 9
    Dim fHead As Integer: fHead = 10
    Dim fRes As Integer: fRes = 12
    Dim colW As Double: colW = 7.5
    
    Dim sh As Worksheet: Set sh = Sheets("BALANCES")
    Dim shDatos As Worksheet: Set shDatos = Sheets("MIS DATOS")
    Dim wbNuevo As Workbook: Set wbNuevo = Workbooks.Add
    Dim wsNuevo As Worksheet: Set wsNuevo = wbNuevo.Sheets(1)
    
    Dim Tri As Integer: Tri = Val(sh.Range("I19").Value)
    Dim AnioFiscal As Long: AnioFiscal = Val(sh.Range("L19").Value)
    Dim rutaGuardado As String: rutaGuardado = RutaInformesTrimestralesDM(AnioFiscal, Tri)
    Dim nombreBase As String: nombreBase = "IVA_DM_CAR_" & AnioFiscal & "_T" & Tri
    
    Dim filaE As Long: filaE = 12: Dim filaR As Long: filaR = 12
    Dim i As Long, C As Range, f As Date
    Dim fIni As Date: fIni = DateSerial(AnioFiscal, (Tri - 1) * 3 + 1, 1)
    Dim fFin As Date: fFin = DateSerial(AnioFiscal, Tri * 3 + 1, 0)

    ' Configuraci�n de p�gina
    With wsNuevo.PageSetup: .PaperSize = xlPaperA4: .Orientation = xlPortrait: .LeftMargin = Application.CentimetersToPoints(0.8): .RightMargin = Application.CentimetersToPoints(0.8): .TopMargin = Application.CentimetersToPoints(0.8): .BottomMargin = Application.CentimetersToPoints(0.8): .FitToPagesWide = 1: .FitToPagesTall = False: .Zoom = False: End With
    wsNuevo.Cells.Font.name = "Calibri Light": wsNuevo.Cells.Font.Size = fBase: wsNuevo.Range("A:E,G:K").ColumnWidth = colW: wsNuevo.Columns("F").ColumnWidth = 0.8: wsNuevo.Range("A:B,G:H").ShrinkToFit = True
    
    ' Cabecera y Res�menes
    wsNuevo.Range("A1:K1").Merge: wsNuevo.Range("A1").Value = "INFORME IVA DM CAR " & AnioFiscal & " T" & Tri: wsNuevo.Range("A1").Font.Bold = True: wsNuevo.Range("A1").Font.Size = 14: wsNuevo.Range("A1").HorizontalAlignment = xlCenter
    wsNuevo.Range("A2:K2").Merge: wsNuevo.Range("A2").Value = shDatos.Range("F5").Value & " | CIF: " & shDatos.Range("F6").Value: wsNuevo.Range("A2").HorizontalAlignment = xlCenter
    wsNuevo.Range("B:D,H:J").ColumnWidth = 14
    wsNuevo.Range("B4:D4").Merge: wsNuevo.Range("B4").Value = "IVA REPERC. | IVA SOPORT. | RESULTADO": wsNuevo.Range("B4:D5").Interior.Color = RGB(230, 230, 230): wsNuevo.Range("B4:D5").Borders.LineStyle = xlContinuous: wsNuevo.Range("B4:D5").Font.Size = fRes: wsNuevo.Range("B4:D5").Font.Bold = True: wsNuevo.Range("B4:D5").HorizontalAlignment = xlCenter: wsNuevo.Range("B4:D5").RowHeight = 20
    wsNuevo.Range("H4:J4").Merge: wsNuevo.Range("H4").Value = "INGRESOS | GASTOS | RESULTADO": wsNuevo.Range("H4:J5").Interior.Color = RGB(230, 230, 230): wsNuevo.Range("H4:J5").Borders.LineStyle = xlContinuous: wsNuevo.Range("H4:J5").Font.Size = fRes: wsNuevo.Range("H4:J5").Font.Bold = True: wsNuevo.Range("H4:J5").HorizontalAlignment = xlCenter: wsNuevo.Range("H4:J5").RowHeight = 20
    
    wsNuevo.Range("A8:E8").Merge: wsNuevo.Range("A8").Value = "FACTURAS EMITIDAS": wsNuevo.Range("G8:K8").Merge: wsNuevo.Range("G8").Value = "FACTURAS RECIBIDAS"
    wsNuevo.Range("A8:E8,G8:K8").Font.Size = fHead: wsNuevo.Range("A8:E8,G8:K8").Font.Bold = True: wsNuevo.Range("A8:E8,G8:K8").HorizontalAlignment = xlCenter: wsNuevo.Range("A8:E8,G8:K8").Interior.Color = RGB(200, 200, 200)
    wsNuevo.Range("A9:E9").Value = Array("N� FACT.", "FECHA", "BASE", "IVA", "IMP."): wsNuevo.Range("G9:K9").Value = Array("N� FACT.", "FECHA", "BASE", "IVA", "IMP.")
    wsNuevo.Range("A9:E9,G9:K9").Borders.LineStyle = xlContinuous: wsNuevo.Range("A9:K9").HorizontalAlignment = xlCenter

    ' Volcado de datos filtrado
    For i = 5 To sh.Cells(sh.Rows.Count, "B").End(xlUp).Row
        If IsDate(sh.Cells(i, 3).Value) Then
            f = CDate(sh.Cells(i, 3).Value)
            If f >= fIni And f <= fFin And sh.Cells(i, "B").Value <> "" Then
                wsNuevo.Range("A" & filaE & ":E" & filaE).Value = sh.Range("B" & i & ":F" & i).Value: filaE = filaE + 1
            End If
        End If
    Next i
    For i = 5 To sh.Cells(sh.Rows.Count, "O").End(xlUp).Row
        If IsDate(sh.Cells(i, 16).Value) Then
            f = CDate(sh.Cells(i, 16).Value)
            If f >= fIni And f <= fFin And sh.Cells(i, "O").Value <> "" Then
                wsNuevo.Range("G" & filaR & ":K" & filaR).Value = sh.Range("O" & i & ":S" & i).Value: filaR = filaR + 1
            End If
        End If
    Next i

    ' F�rmulas y Resumen
    wsNuevo.Range("B5").Formula = "=SUM(D12:D" & filaE - 1 & ")": wsNuevo.Range("C5").Formula = "=SUM(J12:J" & filaR - 1 & ")": wsNuevo.Range("D5").Formula = "=B5-C5"
    wsNuevo.Range("H5").Formula = "=SUM(E12:E" & filaE - 1 & ")": wsNuevo.Range("I5").Formula = "=SUM(K12:K" & filaR - 1 & ")": wsNuevo.Range("J5").Formula = "=H5-I5"
    wsNuevo.Range("B5:D5,H5:J5,C12:E" & filaE - 1 & ",I12:K" & filaR - 1).NumberFormat = "#,##0.00"
    
    ' Guardado Dual
    Application.DisplayAlerts = False
    wbNuevo.SaveAs Filename:=rutaGuardado & "\" & nombreBase & ".xlsx"
    wsNuevo.ExportAsFixedFormat Type:=xlTypePDF, Filename:=rutaGuardado & "\" & nombreBase & ".pdf", Quality:=xlQualityStandard
    wbNuevo.Close SaveChanges:=False
    Application.DisplayAlerts = True
    MsgBox "Informe generado correctamente en Excel y PDF.", vbInformation
End Sub

Sub MostrarTodoBalances()
    Dim sh As Worksheet: Set sh = Sheets("BALANCES")
    sh.Range("I19").ClearContents
    sh.Range("L19").ClearContents
    EstadoFiltroBalances = "TODAS"
    FiltrarBalanceTrimestral
    MsgBox "Vista de balances restablecida.", vbInformation, "DM CAR"
End Sub
' ============================================================
' UTILIDADES
' ============================================================
Public Function RutaInformesTrimestralesDM(AnioFiscal As Long, Trimestre As Integer) As String
    Dim rb As String: rb = Environ("USERPROFILE") & "\Documents\TALLER MIGUEL\INFORMES"
    Dim ra As String: ra = rb & "\" & AnioFiscal
    Dim rf As String: rf = ra & "\T" & Trimestre
    If Dir(rb, vbDirectory) = "" Then MkDir rb
    If Dir(ra, vbDirectory) = "" Then MkDir ra
    If Dir(rf, vbDirectory) = "" Then MkDir rf
    RutaInformesTrimestralesDM = rf
End Function

Sub CicloFiltroEstadoBalances()
    Dim sh As Worksheet: Set sh = Sheets("BALANCES")
    Dim btn As Shape: On Error Resume Next: Set btn = sh.Shapes("filtroestadobalances"): On Error GoTo 0
    If btn Is Nothing Then Exit Sub
    If EstadoFiltroBalances = "" Then EstadoFiltroBalances = "TODAS"
    Select Case EstadoFiltroBalances
        Case "TODAS": EstadoFiltroBalances = "IMPAGADAS": btn.TextFrame2.TextRange.Text = "IMPAGADAS": btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 0, 0)
        Case "IMPAGADAS": EstadoFiltroBalances = "PARCIAL": btn.TextFrame2.TextRange.Text = "PARCIAL": btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(0, 112, 192)
        Case "PARCIAL": EstadoFiltroBalances = "PENDIENTE": btn.TextFrame2.TextRange.Text = "PENDIENTE": btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
        Case "PENDIENTE": EstadoFiltroBalances = "ABONADAS": btn.TextFrame2.TextRange.Text = "ABONADAS": btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(0, 176, 80)
        Case Else: EstadoFiltroBalances = "TODAS": btn.TextFrame2.TextRange.Text = "FILTRO ESTADO": btn.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
    End Select
    FiltrarBalanceTrimestral
End Sub

Private Sub AplicarFormatoDise�o(rng As Range)
    With rng
        .Font.name = "Calibri Light": .Font.Size = 12: .Font.Color = vbWhite: .Interior.Color = RGB(0, 0, 0)
        .HorizontalAlignment = xlCenter: .VerticalAlignment = xlCenter
        .Borders.LineStyle = xlContinuous: .Borders.Color = RGB(80, 80, 80)
    End With
    rng.Cells(1, 2).NumberFormat = "dd/mm/yyyy"
    rng.Range(rng.Cells(1, 3), rng.Cells(1, 5)).NumberFormat = "#,##0.00 �"
End Sub

Sub AbrirInforme_Click()
    Dim shB As Worksheet: Set shB = Sheets("BALANCES")
    Dim Tri As String: Tri = Val(shB.Range("I19").Value)
    Dim AnioFiscal As String: AnioFiscal = Val(shB.Range("L19").Value)
    Dim rutaCompleta As String
    rutaCompleta = Environ("USERPROFILE") & "\Documents\TALLER MIGUEL\INFORMES\" & AnioFiscal & "\T" & Tri & "\IVA_DM_CAR_" & AnioFiscal & "_T" & Tri & ".pdf"
    If Dir(rutaCompleta) <> "" Then
        ActiveWorkbook.FollowHyperlink Address:=rutaCompleta
    Else
        MsgBox "Archivo no encontrado en:" & vbCrLf & rutaCompleta, vbCritical
    End If
End Sub

Sub ResetearDatosBalances()
    If InputBox("Escriba RESET para confirmar borrado", "DM CAR") <> "RESET" Then Exit Sub
    Sheets("BALANCES").Range("B5:00, O5:S2000").ClearContents
    Sheets("BALANCES").Range("B5:F2000, O5:S2000").Interior.Color = RGB(0, 0, 0)
End Sub

