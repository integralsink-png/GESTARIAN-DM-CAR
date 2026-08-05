Attribute VB_Name = "Módulo1"
' ================================================================================
'          MÓDULO 1 — DM CAR: CONTROL MAESTRO TOTAL (REVISADO MAYO 2026)
' ================================================================================
Option Explicit

' --- DECLARACIONES DE VARIABLES GLOBALES UNIFICADAS ---
Public HojaPrevia As String
Public TiempoMarquesina As Date
Public EjecutandoMarquesina As Boolean
Public TextoBase As String
Public ParpadeoContador As Long
Public ProximaLlamada As Date

' --- DECLARACIÓN DE LA API DE WINDOWS SEGURA PARA 32 Y 64 BITS ---
#If VBA7 Then
    Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
 #End If

' ================================================================================
' --- 1) NAVEGACIÓN PRINCIPAL ---
' ================================================================================
Sub Ir_A_Inicio(): RegistrarSalida: Sheets("INICIO").Activate: End Sub
Sub Ir_A_Base_Datos(): RegistrarSalida: Sheets("BASE DE DATOS").Activate: Range("C5").Select: End Sub
Sub Ir_A_Presupuestos(): RegistrarSalida: Sheets("PRESUPUESTOS").Activate: Range("C14").Select: End Sub
Sub Ir_A_Citas(): RegistrarSalida: Sheets("CITAS").Activate: End Sub
Sub Ir_A_Clientes(): RegistrarSalida: Sheets("CLIENTES").Activate: End Sub
Sub Ir_A_Vehiculos(): RegistrarSalida: Sheets("VEHÍCULOS").Activate: End Sub
Sub Ir_A_Reparaciones(): RegistrarSalida: Sheets("REPARACIONES").Activate: End Sub
Sub Ir_A_Facturas(): RegistrarSalida: Sheets("FACTURAS").Activate: End Sub
Sub Ir_A_Registro_Presupuestos(): RegistrarSalida: Sheets("REGISTRO PRESUPUESTOS").Activate: End Sub
Sub Ir_A_Alta_Cliente(): RegistrarSalida: Sheets("ALTA CLIENTE").Activate: End Sub
Sub Ir_A_Incidencias(): RegistrarSalida: Sheets("INCIDENCIAS").Activate: End Sub
Sub Ir_A_Registro_Facturas(): RegistrarSalida: Sheets("REGISTRO FACTURAS").Activate: End Sub
Sub Ir_A_Balances(): RegistrarSalida: Sheets("BALANCES").Activate: End Sub
Sub IrAMisDatos()
    ' Intenta activar la hoja MIS DATOS
    On Error Resume Next
    Sheets("MIS DATOS").Activate
    
    ' Si ocurre un error (la hoja no existe), avisa al usuario
    If Err.Number <> 0 Then
        MsgBox "No se encuentra la hoja 'MIS DATOS'. Por favor, verifica que el nombre sea correcto.", vbCritical
    End If
    On Error GoTo 0
End Sub

' Macro para ir a la hoja de registro
Sub IrARegistro()
    On Error Resume Next ' Por si el nombre de la hoja cambiara
    Sheets("REGISTRO FACTURAS PROVEEDORES").Activate
    ActiveSheet.Range("A11").Select ' Posiciona al inicio de la tabla
    On Error GoTo 0
End Sub

' Macro para ir a la hoja de proveedores
Sub IrAProveedores()
    On Error Resume Next
    Sheets("PROVEEDORES").Activate
    ActiveSheet.Range("A1").Select
    On Error GoTo 0
End Sub
Sub RegistrarSalida()
    HojaPrevia = ActiveSheet.name
End Sub

Sub Volver_Atras()
    On Error Resume Next
    If HojaPrevia <> "" Then
        Sheets(HojaPrevia).Activate
    Else
        Sheets("INICIO").Activate
    End If
    HojaPrevia = ""
    On Error GoTo 0
End Sub

Sub Ir_a_Guia_Operativa()
    Dim NombreHoja As String
    NombreHoja = "GUÍA OPERATIVA"
    
    On Error Resume Next
    Sheets(NombreHoja).Select
    
    If Err.Number <> 0 Then
        MsgBox "No se ha podido encontrar la hoja: " & NombreHoja, vbExclamation, "DM CAR"
        Err.Clear
    Else
        Range("A1").Select
    End If
    On Error GoTo 0
End Sub
Sub IrAAltaIncidencia()
    On Error Resume Next
    Sheets("ALTA INCIDENCIA").Select
    If Err.Number <> 0 Then
        MsgBox "La hoja 'ALTA INCIDENCIA' no existe en este libro.", vbExclamation
    End If
    On Error GoTo 0
End Sub
 
' ================================================================================
' --- 2) NAVEGACIÓN CÍCLICA DE HOJAS ---
' ================================================================================
Sub Ir_a_Hoja_Siguiente_Ciclica()
    Dim indexActual As Integer
    Dim totalHojas As Integer
    Dim indexSiguiente As Integer
    Dim hojafind As Boolean
    Dim i As Integer

    Application.ScreenUpdating = False
    indexActual = ActiveSheet.index
    totalHojas = Sheets.Count
    
    If totalHojas <= 1 Then
        Application.ScreenUpdating = True
        Exit Sub
    End If

    If indexActual = totalHojas Then
        indexSiguiente = 1
    Else
        indexSiguiente = indexActual + 1
    End If
    
    hojafind = False
    i = indexSiguiente
    
    Do While hojafind = False
        If Sheets(i).Visible = xlSheetVisible Then
            Sheets(i).Select
            hojafind = True
        Else
            If i = totalHojas Then
                i = 1
            Else
                i = i + 1
            End If
            
            If i = indexSiguiente Then
                MsgBox "No hay otras hojas visibles a las que navegar.", vbInformation, "DM CAR"
                hojafind = True
            End If
        End If
    Loop

    Application.ScreenUpdating = True
End Sub

Sub Ir_a_Hoja_Anterior_Ciclica()
    Dim indexActual As Integer
    Dim totalHojas As Integer
    Dim indexPrevio As Integer
    Dim hojafind As Boolean
    Dim i As Integer

    Application.ScreenUpdating = False
    indexActual = ActiveSheet.index
    totalHojas = Sheets.Count
    
    If totalHojas <= 1 Then
        Application.ScreenUpdating = True
        Exit Sub
    End If

    If indexActual = 1 Then
        indexPrevio = totalHojas
    Else
        indexPrevio = indexActual - 1
    End If
    
    hojafind = False
    i = indexPrevio
    
    Do While hojafind = False
        If Sheets(i).Visible = xlSheetVisible Then
            Sheets(i).Select
            hojafind = True
        Else
            If i = 1 Then
                i = totalHojas
            Else
                i = i - 1
            End If
            
            If i = indexPrevio Then
                MsgBox "No hay otras hojas visibles.", vbInformation, "DM CAR"
                hojafind = True
            End If
        End If
    Loop

    Application.ScreenUpdating = True
End Sub



' ================================================================================
' --- 4) GESTIÓN DE CLIENTES Y ALTAS ---
' ================================================================================
Sub Guardar_Alta_Cliente()
    Dim shA As Worksheet: Set shA = Sheets("ALTA CLIENTE")
    Dim shB As Worksheet: Set shB = Sheets("BASE DE DATOS")
    Dim shC As Worksheet: Set shC = Sheets("CLIENTES")
    Dim shV As Worksheet: Set shV = Sheets("VEHÍCULOS")
    Dim nB As Long, nC As Long, nV As Long
    Dim i As Long
    Dim matNueva As String, dniNuevo As String, titularNuevo As String
    Dim duplicado As Boolean
    Dim numAdjudicado As Long
    
    matNueva = Trim(shA.Range("F5").Value)
    dniNuevo = Trim(shA.Range("F11").Value)
    titularNuevo = shA.Range("F10").Value
    
    If matNueva = "" Then
        MsgBox "DM CAR: La matrícula es obligatoria.", vbExclamation, "ERROR"
        Exit Sub
    End If
    
    duplicado = False
    nB = shB.Cells(shB.Rows.Count, "C").End(xlUp).Row
    
    If nB >= 5 Then
        For i = 5 To nB
            If Trim(shB.Cells(i, "C").Value) = matNueva And _
               Trim(shB.Cells(i, "I").Value) = dniNuevo Then
                duplicado = True
                Exit For
            End If
        Next i
    End If
    
    If duplicado Then
        MsgBox "Vehículo (" & matNueva & ") + Titular (" & titularNuevo & ") registrados anteriormente.", _
               vbCritical, "ALTA DENEGADA"
        Exit Sub
    End If
    
    nB = shB.Cells(shB.Rows.Count, "C").End(xlUp).Row + 1: If nB < 5 Then nB = 5
    nC = shC.Cells(shC.Rows.Count, "B").End(xlUp).Row + 1: If nC < 5 Then nC = 5
    nV = shV.Cells(shV.Rows.Count, "B").End(xlUp).Row + 1: If nV < 5 Then nV = 5
    
    On Error Resume Next
    numAdjudicado = CLng(shA.Shapes("numerocliente").TextFrame2.TextRange.Text)
    If Err.Number <> 0 Then numAdjudicado = nC - 4
    On Error GoTo 0
    
    Application.ScreenUpdating = False
    
    With shB
        .Cells(nB, "B").Value = numAdjudicado
        .Cells(nB, "C").Value = shA.Range("F5").Value
        .Cells(nB, "D").Value = shA.Range("F6").Value
        .Cells(nB, "E").Value = shA.Range("F7").Value
        .Cells(nB, "F").Value = shA.Range("F8").Value
        .Cells(nB, "G").Value = shA.Range("F9").Value
        .Cells(nB, "H").Value = shA.Range("F10").Value
        .Cells(nB, "I").Value = shA.Range("F11").Value
        .Cells(nB, "J").Value = shA.Range("F12").Value
        .Cells(nB, "K").Value = shA.Range("F13").Value
        .Cells(nB, "L").Value = shA.Range("F14").Value
    End With
    
    With shC
        .Cells(nC, "B").Value = shA.Range("F10").Value
        .Cells(nC, "C").Value = shA.Range("F11").Value
        .Cells(nC, "D").Value = shA.Range("F13").Value
        .Cells(nC, "E").Value = shA.Range("F12").Value
        .Cells(nC, "F").Value = shA.Range("F14").Value
        .Cells(nC, "G").Value = Date
        .Cells(nC, "I").Value = numAdjudicado
    End With
    
    With shV
        .Cells(nV, "B").Value = shA.Range("F5").Value
        .Cells(nV, "C").Value = shA.Range("F6").Value
        .Cells(nV, "D").Value = shA.Range("F7").Value
        .Cells(nV, "E").Value = shA.Range("F9").Value
        .Cells(nV, "H").Value = shA.Range("F8").Value
        .Cells(nV, "I").Value = shA.Range("F10").Value
    End With
    
   ' ... (después de rellenar los datos con With shV)

    Application.ScreenUpdating = True
    
    ' Cambiar el aspecto del botón de guardado en lugar del MsgBox
    Call ActualizarBotonAviso(shA, "Rectángulo: esquinas redondeadas 78")
    
    ' Opcional: Si quieres moverte a otra hoja después del guardado, manténlo aquí:
    ' shB.Activate
    ' shB.Cells(nB, "C").Select
End Sub
Sub ActualizarBotonAviso(ws As Worksheet, nombreBoton As String)
    Dim btn As Shape
    On Error Resume Next
    Set btn = ws.Shapes(nombreBoton)
    On Error GoTo 0
    
    If Not btn Is Nothing Then
        ' Aplicar estado "GUARDADO"
        With btn
            .TextFrame.Characters.Text = "GUARDADO"
            .Fill.Transparency = 1 ' Transparencia total
            .Line.ForeColor.RGB = RGB(153, 255, 51) ' Verde pistacho
            .Line.Transparency = 0
            .Glow.Radius = 10
            .Glow.Color.RGB = RGB(153, 255, 51)
            .Glow.Transparency = 0.3
        End With
        
        ' Programar restauración a 2 segundos
        Application.OnTime Now + TimeValue("0:00:02"), "'RestaurarBotonAlta """ & ws.name & """, """ & nombreBoton & """'"
    End If
End Sub

Sub RestaurarBotonAlta(wsName As String, nombreBoton As String)
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets(wsName)
    Dim btn As Shape
    
    On Error Resume Next
    Set btn = ws.Shapes(nombreBoton)
    If Not btn Is Nothing Then
        With btn
            ' Ajusta aquí el texto original que tenía tu botón antes de guardarse
            .TextFrame.Characters.Text = "ALTA CLIENTE"
            .Fill.Transparency = 1
            .Line.ForeColor.RGB = vbWhite
            .Glow.Color.RGB = vbWhite
            .Glow.Radius = 5
            .Glow.Transparency = 0.6
        End With
    End If
End Sub
Sub EnumerarClientes()
    Dim shC As Worksheet: Set shC = Sheets("CLIENTES")
    Dim ultima As Long, i As Long
    
    ultima = shC.Cells(shC.Rows.Count, "B").End(xlUp).Row
    If ultima < 5 Then Exit Sub
    
    For i = 5 To ultima
        shC.Cells(i, "I").Value = i - 4
    Next i
    MsgBox "Clientes enumerados correctamente.", vbInformation, "DM CAR"
End Sub

Sub ActualizarNumeroCliente()
    Dim shA As Worksheet: Set shA = Sheets("ALTA CLIENTE")
    Dim shC As Worksheet: Set shC = Sheets("CLIENTES")
    Dim ultima As Long, Numero As Long
    
    ultima = shC.Cells(shC.Rows.Count, "B").End(xlUp).Row
    If ultima < 5 Then
        Numero = 1
    Else
        Numero = (ultima + 1) - 4
    End If
    shA.Shapes("numerocliente").TextFrame2.TextRange.Text = Numero
End Sub

Sub Limpiar_Alta_Cliente()
    Dim shA As Worksheet: Set shA = Sheets("ALTA CLIENTE")
    Application.ScreenUpdating = False
    shA.Range("F5:F14").ClearContents
    On Error Resume Next
    shA.Shapes("numerocliente").TextFrame2.TextRange.Text = ""
    On Error GoTo 0
    Application.ScreenUpdating = True
    MsgBox "Formulario de Alta Cliente limpiado correctamente.", vbInformation, "DM CAR"
End Sub

' ================================================================================
' --- 5) PROCESAMIENTO Y EXPORTACIÓN DE DATOS ---
' ================================================================================
Sub Exportar_Desde_Base_Datos()
    Dim shB As Worksheet: Set shB = Sheets("BASE DE DATOS")
    Dim shC As Worksheet: Set shC = Sheets("CLIENTES")
    Dim shV As Worksheet: Set shV = Sheets("VEHÍCULOS")
    Dim filaSel As Long, nC As Long, nV As Long
    Dim DNI As String, Matricula As String
    Dim existeCliente As Boolean, ExisteVehiculo As Boolean
    Dim i As Long

    filaSel = ActiveCell.Row
    If filaSel < 5 Then
        MsgBox "Seleccione una fila válida en BASE DE DATOS.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Matricula = Trim(shB.Cells(filaSel, "C").Value)
    DNI = Trim(shB.Cells(filaSel, "I").Value)

    If Matricula = "" Then
        MsgBox "No hay matrícula en la fila seleccionada.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Application.ScreenUpdating = False
    
    existeCliente = False
    nC = shC.Cells(shC.Rows.Count, "B").End(xlUp).Row
    If nC >= 5 Then
        For i = 5 To nC
            If Trim(shC.Cells(i, "C").Value) = DNI Then
                existeCliente = True
                Exit For
            End If
        Next i
    End If

    If Not existeCliente Then
        nC = shC.Cells(shC.Rows.Count, "B").End(xlUp).Row + 1: If nC < 5 Then nC = 5
        With shC
            .Cells(nC, "B").Value = shB.Cells(filaSel, "H").Value
            .Cells(nC, "C").Value = shB.Cells(filaSel, "I").Value
            .Cells(nC, "D").Value = shB.Cells(filaSel, "K").Value
            .Cells(nC, "E").Value = shB.Cells(filaSel, "J").Value
            .Cells(nC, "F").Value = shB.Cells(filaSel, "L").Value
            .Cells(nC, "G").Value = Date
            .Cells(nC, "I").Value = shB.Cells(filaSel, "B").Value
        End With
    End If

    ExisteVehiculo = False
    nV = shV.Cells(shV.Rows.Count, "B").End(xlUp).Row
    If nV >= 5 Then
        For i = 5 To nV
            If Trim(shV.Cells(i, "B").Value) = Matricula Then
                ExisteVehiculo = True
                Exit For
            End If
        Next i
    End If

    If Not ExisteVehiculo Then
        nV = shV.Cells(shV.Rows.Count, "B").End(xlUp).Row + 1: If nV < 5 Then nV = 5
        With shV
            .Cells(nV, "B").Value = shB.Cells(filaSel, "C").Value
            .Cells(nV, "C").Value = shB.Cells(filaSel, "D").Value
            .Cells(nV, "D").Value = shB.Cells(filaSel, "E").Value
            .Cells(nV, "E").Value = shB.Cells(filaSel, "G").Value
            .Cells(nV, "H").Value = shB.Cells(filaSel, "F").Value
            .Cells(nV, "I").Value = shB.Cells(filaSel, "H").Value
        End With
    End If

    Application.ScreenUpdating = True
    MsgBox "Datos exportados correctamente.", vbInformation, "DM CAR"
End Sub

Sub Historial_Vehiculo_Desde_Vehiculos()
    On Error GoTo ErrorHandler
    Dim shV As Worksheet: Set shV = Sheets("VEHÍCULOS")
    Dim shR As Worksheet: Set shR = Sheets("REPARACIONES")
    Dim filaSel As Long, Matricula As String, UltimaFila As Long

    filaSel = ActiveCell.Row
    If ActiveSheet.name <> "VEHÍCULOS" Then
        MsgBox "Abra primero la hoja VEHÍCULOS.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    If filaSel < 5 Then
        MsgBox "Seleccione un vehículo válido.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Matricula = Trim(shV.Cells(filaSel, "B").Value)
    If Matricula = "" Then
        MsgBox "No se encontró matrícula en la fila seleccionada.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Application.ScreenUpdating = False
    shR.Activate

    If shR.AutoFilterMode Then
        On Error Resume Next
        shR.ShowAllData
        On Error GoTo 0
    End If

    UltimaFila = shR.Cells(shR.Rows.Count, "C").End(xlUp).Row
    If UltimaFila < 4 Then
        MsgBox "La hoja REPARACIONES está vacía.", vbExclamation, "DM CAR"
        Application.ScreenUpdating = True
        Exit Sub
    End If

    shR.Range("C4:C" & UltimaFila).AutoFilter Field:=1, Criteria1:=Matricula
    shR.Range("C5").Select
    Application.ScreenUpdating = True
    MsgBox "Mostrando historial de: " & Matricula, vbInformation, "DM CAR"
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    MsgBox "Error: " & Err.Description, vbCritical, "DM CAR"
End Sub
Sub GenerarPresupuestoDesdeBaseDatos()

    Dim shBD As Worksheet
    Dim shPre As Worksheet
    Dim f As Long
    Dim i As Long
    Dim shp As Shape

    Set shBD = Sheets("BASE DE DATOS")
    Set shPre = Sheets("PRESUPUESTOS")
    Call CargarDatosEmpresaPresupuesto

    f = ActiveCell.Row

    ' VALIDACIÓN
    If ActiveSheet.name <> "BASE DE DATOS" Then
        MsgBox "DM CAR: Por favor, sitúese en la hoja 'BASE DE DATOS'.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    If f < 5 Or shBD.Cells(f, "C").Value = "" Then
        MsgBox "DM CAR: Seleccione un cliente válido.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Application.ScreenUpdating = False

    ' LIMPIEZA
    shPre.Range("C20:J45").ClearContents

    ' NUEVO Nº PRESUPUESTO
    shPre.Range("D9").Value = ObtenerSiguienteNumeroPresupuesto()

    ' RESETEAR BOTÓN ESTADO
    On Error Resume Next
    Set shp = shPre.Shapes("SHAPE_ESTADO_PRESUPUESTO")
    On Error GoTo 0

    If Not shp Is Nothing Then
        With shp
            .Fill.ForeColor.RGB = RGB(0, 0, 0)
            .Line.ForeColor.RGB = RGB(200, 200, 200)
            .Glow.Radius = 0

            With .TextFrame2.TextRange
                .Text = "PENDIENTE"
                .Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
            End With
        End With
    End If

    ' VOLCADO DE DATOS CLIENTE
    With shPre

        .Range("J14").Value = shBD.Cells(f, "C").Value
        .Range("J15").Value = shBD.Cells(f, "D").Value
        .Range("J16").Value = shBD.Cells(f, "E").Value

        .Range("C14").Value = shBD.Cells(f, "H").Value
        .Range("D15").Value = shBD.Cells(f, "I").Value
        .Range("C17").Value = shBD.Cells(f, "J").Value
        .Range("D18").Value = shBD.Cells(f, "K").Value

        .Range("J9").ClearContents

        For i = 20 To 45
            .Cells(i, "J").Formula = "=IF(AND(H" & i & "<>"""",I" & i & "<>""""),H" & i & "*I" & i & ","""")"
        Next i

        .Range("J48").Formula = "=SUM(J46:J47)"

    End With

    '===========================================================
    ' ACTUALIZAR OBJETO FECHAENTRADA
    '===========================================================
    On Error Resume Next
    Set shp = shPre.Shapes("SHAPE_FECHA_ENTRADA_PRESUPUESTO")
    On Error GoTo 0

    If Not shp Is Nothing Then
        With shp.TextFrame2.TextRange
            .Text = "RELLENE FECHA" & vbCrLf & "ENTRADA A TALLER"
            .ParagraphFormat.Alignment = msoAlignCenter
            .Font.Size = 26
            .Font.Fill.ForeColor.RGB = RGB(57, 255, 20)
        End With
    End If

    ' FINALIZAR
    shPre.Activate
    shPre.Range("C20").Select

    Application.ScreenUpdating = True


End Sub

Sub AlternarIVA()
    With Sheets("PRESUPUESTOS").Range("G47")
        If .Value = 0.21 Then
            .Value = 0
        Else
            .Value = 0.21
        End If
        .NumberFormat = "0%"
    End With
End Sub

Sub LimpiarPresupuesto()
    Static copia As Variant
    Static Estado As Boolean
    Dim sh As Worksheet
    
    Set sh = Sheets("PRESUPUESTOS")

    Application.ScreenUpdating = False
    If Estado = False Then
        copia = sh.Range("C20:J45").Value
        sh.Range("C20:J45").ClearContents
        Estado = True
    Else
        sh.Range("C20:J45").Value = copia
        Estado = False
    End If
    Application.ScreenUpdating = True
End Sub

Function ObtenerSiguienteNumeroPresupuesto() As Long
    Dim shReg As Worksheet: Set shReg = Sheets("REGISTRO PRESUPUESTOS")
    Dim UltimaFila As Long, maxNum As Long
    Dim celda As Range

    UltimaFila = shReg.Cells(shReg.Rows.Count, "B").End(xlUp).Row
    maxNum = 0
    For Each celda In shReg.Range("B5:B" & UltimaFila)
        If IsNumeric(celda.Value) Then
            If CLng(celda.Value) > maxNum Then maxNum = CLng(celda.Value)
        End If
    Next celda
    ObtenerSiguienteNumeroPresupuesto = maxNum + 1
End Function

Sub Toggle_Aceptar_Presupuesto()
    Dim shPre As Worksheet: Set shPre = Sheets("PRESUPUESTOS")
    Dim shReg As Worksheet: Set shReg = Sheets("REGISTRO PRESUPUESTOS")
    Dim shp As Shape
    Dim Estado As String, numPre As Variant, filaReg As Variant
    Dim verde As Long, negro As Long

    verde = RGB(57, 255, 20): negro = RGB(0, 0, 0)
    
    On Error Resume Next
    Set shp = shPre.Shapes("SHAPE_ESTADO_PRESUPUESTO")
    On Error GoTo 0

    If shp Is Nothing Then
        MsgBox "No se encontró el botón de estado.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    Estado = Trim(UCase(shp.TextFrame2.TextRange.Text))
    numPre = shPre.Range("D9").Value
    filaReg = Application.Match(numPre, shReg.Columns("B"), 0)

    If Estado = "PENDIENTE" Then
        With shp
            .TextFrame2.TextRange.Text = "ACEPTADO"
            .Fill.ForeColor.RGB = negro
            .Line.ForeColor.RGB = vbWhite
            .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
            With .Glow
                .Color.RGB = verde: .Radius = 10: .Transparency = 0.5
            End With
        End With

        If Not IsError(filaReg) Then
            With shReg.Cells(filaReg, "L")
                .Value = "Aceptado": .Interior.Color = verde: .Font.Color = vbWhite
                .HorizontalAlignment = xlCenter: .Font.Bold = True
            End With
        End If
    Else
        With shp
            .TextFrame2.TextRange.Text = "PENDIENTE"
            .Fill.ForeColor.RGB = negro
            .Line.ForeColor.RGB = RGB(200, 200, 200)
            .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
            .Glow.Radius = 0
        End With

        If Not IsError(filaReg) Then
            With shReg.Cells(filaReg, "L")
                .Value = "Pendiente": .Interior.Color = negro: .Font.Color = vbWhite
                .HorizontalAlignment = xlCenter: .Font.Bold = True
            End With
        End If
    End If
End Sub
  

 ' --- 8) UTILIDADES GENERALES ---
' ================================================================================
Sub Abrir_Buscador_Sencillo()
    Dim textoABuscar As Variant, celdaEncontrada As Range
    Dim fondoOriginal As Long, fuenteOriginal As Long
      
    textoABuscar = InputBox("Introduce el dato a buscar:", "BUSCADOR DM CAR")
    If textoABuscar = "" Then Exit Sub
      
    Set celdaEncontrada = Cells.Find(What:=textoABuscar, After:=ActiveCell, LookIn:=xlValues, _
                                     LookAt:=xlPart, SearchOrder:=xlByRows, SearchDirection:=xlNext, _
                                     MatchCase:=False, SearchFormat:=False)
                
    If Not celdaEncontrada Is Nothing Then
        celdaEncontrada.Activate
        fondoOriginal = celdaEncontrada.Interior.Color
        fuenteOriginal = celdaEncontrada.Font.Color
          
        With celdaEncontrada
            .Interior.Color = vbWhite
            .Font.Color = vbBlack
        End With
        DoEvents
          
        Application.Wait (Now + TimeValue("0:00:02"))
          
        With celdaEncontrada
            .Interior.Color = fondoOriginal
            .Font.Color = fuenteOriginal
        End With
    Else
        MsgBox "No se ha encontrado ninguna coincidencia para: " & textoABuscar, vbInformation, "DM CAR"
    End If
End Sub

Sub EliminarDesplegables_BaseDeDatos()
    Sheets("BASE DE DATOS").Cells.Validation.Delete
End Sub

