Attribute VB_Name = "Módulo2"
Option Explicit

Public Sub FormatearAvisoPresupuesto()
    Dim wsPresupuestos As Worksheet
    Dim rngAviso As Range
    
    ' Definimos la hoja de Presupuestos
    Set wsPresupuestos = ThisWorkbook.Worksheets("PRESUPUESTOS")
    
    ' Establecemos el rango exacto de las columnas GHI, filas 38 a 44
    Set rngAviso = wsPresupuestos.Range("G38:I44")
    
    With rngAviso
        ' 1. Limpiamos cualquier formato previo y combinamos el bloque de celdas
        .ClearFormats
        .Merge
        
        ' 2. Activamos el ajuste de texto para que el párrafo no se corte
        .WrapText = True
        
        ' 3. Alineamos el texto a la izquierda y centrado verticalmente
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        
        ' 4. Aplicamos el formato estricto de fuente solicitado
        With .Font
            .name = "Calibri Light"
            .Size = 10
            .Color = RGB(0, 0, 0) ' Color Negro
            .Bold = False
            .Italic = False
        End With
        
        ' 5. Insertamos el texto exacto
        .Value = "Sujeto a variaciones por incidencias no evaluadas en primera valoración. " & _
                 "Recuerde entregar el vehículo en la fecha acordada, si no es posible avise con antelación suficiente."
    End With
End Sub
Function Registrar_Presupuesto_DM() As String

    Dim shPre As Worksheet: Set shPre = Sheets("PRESUPUESTOS")
    Dim shRegP As Worksheet: Set shRegP = Sheets("REGISTRO PRESUPUESTOS")

    Dim numPresupuesto As String
    Dim filaReg As Long
    Dim i As Long
    Dim fExiste As Range

    ' ============================================================
    ' 1) VALIDACIONES
    ' ============================================================

    numPresupuesto = Trim(shPre.Range("D9").Value)

    ' IVA 0 ? error
    If shPre.Range("G47").Value = 0 Then
        Registrar_Presupuesto_DM = "IVA_0"
        Exit Function
    End If

    ' FECHA DE ENTRADA OBLIGATORIA
    If Trim(shPre.Range("J9").Value) = "" Then
        MsgBox "Debe introducir la FECHA DE ENTRADA AL TALLER antes de registrar el presupuesto.", vbCritical, "DM CAR"
        Registrar_Presupuesto_DM = "ERROR_FECHA"
        Exit Function
    End If

    ' DUPLICADO
    Set fExiste = shRegP.Columns("B").Find( _
        What:=numPresupuesto, _
        LookIn:=xlValues, _
        LookAt:=xlWhole)

    If Not fExiste Is Nothing Then
        Registrar_Presupuesto_DM = "DUPLICADO"
        Exit Function
    End If

    Application.ScreenUpdating = False

    ' ============================================================
    ' 2) PRIMERA FILA LIBRE (Antes de insertar)
    ' ============================================================
    Dim filaInicioInsertar As Long
    filaReg = shRegP.Cells(shRegP.Rows.Count, "G").End(xlUp).Row + 1
    If filaReg < 5 Then filaReg = 5
    filaInicioInsertar = filaReg

    ' ============================================================
    ' 3) INYECTAR DATOS EN BRUTO
    ' ============================================================
    For i = 20 To 37
        If Trim(shPre.Cells(i, "C").Value) <> "" Then
            With shRegP
                .Cells(filaReg, "B").Value = numPresupuesto
                .Cells(filaReg, "C").Value = shPre.Range("C14").Value
                .Cells(filaReg, "D").Value = shPre.Range("J14").Value
                .Cells(filaReg, "E").Value = shPre.Range("J15").Value
                .Cells(filaReg, "F").Value = shPre.Range("J16").Value
                .Cells(filaReg, "K").Value = shPre.Range("J9").Value
                
                ' Conceptos y Desglose
                .Cells(filaReg, "G").Value = shPre.Cells(i, "C").Value
                .Cells(filaReg, "H").Value = shPre.Cells(i, "H").Value
                .Cells(filaReg, "I").Value = shPre.Cells(i, "I").Value
                .Cells(filaReg, "J").Value = shPre.Cells(i, "J").Value
                
                ' Estado inicial estricto en Mayúsculas
                .Cells(filaReg, "L").Value = "PENDIENTE"
            End With
            filaReg = filaReg + 1
        End If
    Next i

    ' ============================================================
    ' 4) ORDENAR DESCENDENTE POR Nº PRESUPUESTO
    ' ============================================================
    Dim UltimaFila As Long
    UltimaFila = shRegP.Cells(shRegP.Rows.Count, "G").End(xlUp).Row

    With shRegP.Sort
        .SortFields.Clear
        .SortFields.Add Key:=shRegP.Range("B5:B" & UltimaFila), _
                        SortOn:=xlSortOnValues, Order:=xlDescending
        .SetRange shRegP.Range("B5:L" & UltimaFila)
        .Header = xlNo
        .Apply
    End With

    ' ============================================================
    ' 5) APLICAR DISEÑO VISUAL DIRECTO DESDE LA FILA 5 EN ADELANTE
    ' ============================================================
    Dim f As Long
    Dim preActual As String
    
    For f = 5 To UltimaFila
        If Trim(shRegP.Cells(f, "B").Value) <> "" Then
            ' Si cambia el número de presupuesto o es el primero, es Línea Principal
            If shRegP.Cells(f, "B").Value <> preActual Then
                preActual = shRegP.Cells(f, "B").Value
                
                ' Formato Línea Principal (Fondo Negro Puro, Letras Blancas)
                With shRegP.Range(shRegP.Cells(f, "B"), shRegP.Cells(f, "K"))
                    .Interior.Color = RGB(0, 0, 0)
                    .Font.name = "Calibri Light"
                    .Font.Color = vbWhite
                    .Font.Bold = False
                End With
            Else
                ' Formato Líneas Secundarias (Fondo Negro 90%)
                With shRegP.Range(shRegP.Cells(f, "B"), shRegP.Cells(f, "K"))
                    .Interior.Color = RGB(26, 26, 26)
                    .Font.name = "Calibri Light"
                End With
                
                ' Mimetizar textos repetidos para ocultación completa
                With shRegP.Range("B" & f & ":F" & f)
                    .Font.Color = RGB(26, 26, 26)
                End With
                With shRegP.Cells(f, "K")
                    .Font.Color = RGB(26, 26, 26)
                End With
            End If
            
            ' Dar formato homogéneo a la columna de Estado (L)
            With shRegP.Cells(f, "L")
                .Font.name = "Calibri Light"
                .Font.Color = vbWhite
                .Font.Bold = True
                .HorizontalAlignment = xlCenter
            End With
        End If
    Next f

    Application.ScreenUpdating = True
    Registrar_Presupuesto_DM = "OK"

End Function
' ===========================================================================
' CODIGO DE CARGA OPTIMIZADO PARA INICIO EN FILA 5 (CON LÍNEA DE CONTROL CORREGIDA)
' ===========================================================================

Public Sub Cargar_Presupuesto_en_Presupuestos(numPre As Variant)

    Dim shPre As Worksheet: Set shPre = Sheets("PRESUPUESTOS")
    Dim shRegP As Worksheet: Set shRegP = Sheets("REGISTRO PRESUPUESTOS")
    Dim shBD As Worksheet: Set shBD = Sheets("BASE DE DATOS")

    Dim filaInicio As Long
    Dim i As Long, lin As Long
    Dim titular As String
    Dim fBD As Range

    ' Buscar la primera fila del presupuesto en REGISTRO
    filaInicio = Application.Match(numPre, shRegP.Columns("B"), 0)
    If IsError(filaInicio) Then Exit Sub

    Application.ScreenUpdating = False

    ' ============================================================
    ' CABECERA
    ' ============================================================
    shPre.Range("D9").Value = numPre
    shPre.Range("C14").Value = shRegP.Cells(filaInicio, "C").Value   ' Titular
    shPre.Range("J14").Value = shRegP.Cells(filaInicio, "D").Value   ' Matrícula
    shPre.Range("J15").Value = shRegP.Cells(filaInicio, "E").Value   ' Marca
    shPre.Range("J16").Value = shRegP.Cells(filaInicio, "F").Value   ' Modelo
    shPre.Range("J9").Value = shRegP.Cells(filaInicio, "K").Value    ' Fecha

    ' ============================================================
    ' DATOS DEL CLIENTE DESDE BASE DE DATOS
    ' ============================================================
    titular = shRegP.Cells(filaInicio, "C").Value   ' Nombre del titular

    ' Buscar titular en BASE DE DATOS (columna H)
    Set fBD = shBD.Columns("H").Find(What:=titular, LookIn:=xlValues, LookAt:=xlWhole)

    If Not fBD Is Nothing Then
        shPre.Range("D15").Value = shBD.Cells(fBD.Row, "I").Value   ' DNI/CIF
        shPre.Range("C17").Value = shBD.Cells(fBD.Row, "J").Value   ' Domicilio
        shPre.Range("D18").Value = shBD.Cells(fBD.Row, "K").Value   ' Teléfono
    Else
        shPre.Range("D15").Value = ""
        shPre.Range("C17").Value = ""
        shPre.Range("D18").Value = ""
    End If

    ' ============================================================
    ' LIMPIAR DESPIECE
    ' ============================================================
    shPre.Range("C20:J37").ClearContents

    ' ============================================================
    ' CARGAR DESPIECE
    ' ============================================================
    lin = 0
    For i = filaInicio To filaInicio + 17

        If i > filaInicio And shRegP.Cells(i, "B").Value <> "" Then Exit For
        If shRegP.Cells(i, "G").Value = "" Then Exit For

        shPre.Range("C" & 20 + lin).Value = shRegP.Cells(i, "G").Value
        shPre.Range("H" & 20 + lin).Value = shRegP.Cells(i, "H").Value
        shPre.Range("I" & 20 + lin).Value = shRegP.Cells(i, "I").Value
        shPre.Range("J" & 20 + lin).Value = shRegP.Cells(i, "J").Value

        lin = lin + 1
    Next i

    Application.ScreenUpdating = True

End Sub

Sub Ver_Presupuesto_Desde_Registro()

    Dim shR As Worksheet: Set shR = Sheets("REGISTRO PRESUPUESTOS")
    Dim shBD As Worksheet: Set shBD = Sheets("BASE DE DATOS")
    Dim shPre As Worksheet: Set shPre = Sheets("PRESUPUESTOS")

    Dim filaSel As Long, filaInicio As Long
    Dim titular As String, Matricula As String
    Dim numPre As Variant, numDetectado As Variant
    Dim fBD As Range
    Dim i As Long, lin As Long
    Dim shp As Shape

    filaSel = ActiveCell.Row
    ' CORRECCIÓN: Permitir la visualización a partir de la nueva fila 5 de registros
    If filaSel < 5 Then Exit Sub

    ' LOCALIZAR PRIMERA FILA DEL PRESUPUESTO
    If shR.Cells(filaSel, "B").Value = "" Then
        filaInicio = shR.Cells(filaSel, "B").End(xlUp).Row
    Else
        filaInicio = filaSel
    End If

    ' CORRECCIÓN: Permitir que la fila de inicio sea la 5 o la 6
    If filaInicio < 5 Then Exit Sub

    numPre = shR.Cells(filaInicio, "B").Value
    titular = shR.Cells(filaInicio, "C").Value
    Matricula = shR.Cells(filaInicio, "D").Value

    Application.ScreenUpdating = False

    '===========================================================
    ' 1) CARGAR CABECERA EN PRESUPUESTOS
    '===========================================================
    With shPre
        .Range("D9").Value = numPre
        .Range("C14").Value = titular
        .Range("J14").Value = Matricula
        .Range("J15").Value = shR.Cells(filaInicio, "E").Value
        .Range("J16").Value = shR.Cells(filaInicio, "F").Value

        ' *** CARGAR FECHA DE ENTRADA AL TALLER ***
        .Range("J9").Value = shR.Cells(filaInicio, "K").Value
    End With

    '===========================================================
    ' 2) LIMPIAR DESPIECE EN PRESUPUESTOS
    '===========================================================
    shPre.Range("C20:J45").ClearContents

    '===========================================================
    ' 3) CARGAR DESPIECE DESDE REGISTRO
    '===========================================================
    lin = 0
    i = filaInicio

    Do

        ' 1) SI B tiene un número distinto -> MURO -> parar
        numDetectado = shR.Cells(i, "B").Value

        If numDetectado <> "" Then
            If numDetectado <> numPre Then Exit Do
        End If

        ' 2) SI G está vacío -> no hay más conceptos -> parar
        If Trim(shR.Cells(i, "G").Value) = "" Then Exit Do

        ' 3) Cargar concepto en PRESUPUESTOS
        shPre.Cells(20 + lin, "C").Value = shR.Cells(i, "G").Value ' CONCEPTO
        shPre.Cells(20 + lin, "H").Value = shR.Cells(i, "H").Value ' CANTIDAD
        shPre.Cells(20 + lin, "I").Value = shR.Cells(i, "I").Value ' PRECIO
        shPre.Cells(20 + lin, "J").Value = shR.Cells(i, "J").Value ' IMPORTE

        lin = lin + 1
        i = i + 1

    Loop

    '===========================================================
    ' 5) MOSTRAR HOJA PRESUPUESTOS
    '===========================================================
    shPre.Activate
    shPre.Range("C20").Select

    Application.ScreenUpdating = True

End Sub
Sub Generar_Cita()

    On Error GoTo ErrorHandler

    Dim shC As Worksheet: Set shC = Sheets("CITAS")
    Dim shR As Worksheet: Set shR = Sheets("REGISTRO PRESUPUESTOS")

    Dim filaSel As Long: filaSel = ActiveCell.Row
    Dim filaCita As Long, filaInicio As Long
    Dim UltimaFila As Long, ultimaCol As Long
    Dim i As Long

    Dim numPres As String
    Dim vFecha As Variant, vMat As Variant
    Dim vImporte As Double
    Dim fExiste As Range

    If filaSel < 5 Then Exit Sub

    ' Detectar inicio del presupuesto
    If shR.Cells(filaSel, "B").Value <> "" Then
        filaInicio = filaSel
    Else
        filaInicio = shR.Cells(filaSel, "B").End(xlUp).Row
    End If

    numPres = shR.Cells(filaInicio, "B").Value
    If numPres = "" Then Exit Sub

    ' VALIDACIÓN — ESTADO ACEPTADO
    If shR.Cells(filaInicio, "L").Value <> "ACEPTADO" Then
        Call MostrarPopover("POPOVER_ESTADO_CITA", _
                            "CAMBIE EL ESTADO A ""ACEPTADO"" PARA ASIGNAR CITA", _
                            "ACEPTAR", "", "")
        Exit Sub
    End If

    ' CITA DUPLICADA
    Set fExiste = shC.Columns("D").Find(numPres, LookIn:=xlValues, LookAt:=xlWhole)
    If Not fExiste Is Nothing Then
        Call MostrarPopover("POPOVER_CITA_DUPLICADA", _
                            "CITA YA REGISTRADA ANTERIORMENTE", _
                            "IR A CITAS", "SALIR", "")
        Exit Sub
    End If

    ' CALCULAR IMPORTE
    vImporte = 0
    i = filaInicio

    Do While shR.Cells(i, "G").Value <> ""
        If i > filaInicio And shR.Cells(i, "B").Value <> "" And shR.Cells(i, "B").Value <> numPres Then Exit Do
        vImporte = vImporte + Val(shR.Cells(i, "J").Value)
        i = i + 1
    Loop

    vImporte = vImporte * 1.21

    vFecha = shR.Cells(filaInicio, "K").Value
    vMat = shR.Cells(filaInicio, "D").Value

    filaCita = shC.Cells(shC.Rows.Count, "C").End(xlUp).Row + 1
    If filaCita < 5 Then filaCita = 5

    Application.ScreenUpdating = False

    With shC
        .Cells(filaCita, "B").Value = "PENDIENTE"
        .Cells(filaCita, "C").Value = vFecha
        .Cells(filaCita, "D").Value = numPres
        .Cells(filaCita, "F").Value = vMat
        .Cells(filaCita, "G").Value = vImporte
        .Cells(filaCita, "G").NumberFormat = "#,##0.00 €"
        .Cells(filaCita, "K").Value = shR.Cells(filaInicio, "C").Value
    End With

    Application.ScreenUpdating = True

    ' ORDENAR
    UltimaFila = shC.Cells(shC.Rows.Count, "D").End(xlUp).Row
    ultimaCol = shC.Cells(4, shC.Columns.Count).End(xlToLeft).Column

    With shC.Sort
        .SortFields.Clear
        .SortFields.Add Key:=shC.Range("D5:D" & UltimaFila), _
                        SortOn:=xlSortOnValues, Order:=xlDescending
        .SetRange shC.Range(shC.Cells(4, 2), shC.Cells(UltimaFila, ultimaCol))
        .Header = xlYes
        .Apply
    End With

    ' POPOVER OK
    Call MostrarPopover("POPOVER_CITA_OK", _
                        "CITA REGISTRADA", _
                        "IR A CITAS", "SALIR", "")

    Call ActualizarAlertasInicio
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    Call MostrarPopover("POPOVER_ERROR", _
                        "ERROR: " & Err.Description, _
                        "ACEPTAR", "", "")

End Sub

Sub Enviar_A_Reparaciones()

    Dim shC As Worksheet: Set shC = Sheets("CITAS")
    Dim shRP As Worksheet: Set shRP = Sheets("REGISTRO PRESUPUESTOS")
    Dim shR As Worksheet: Set shR = Sheets("REPARACIONES")
    Dim shBD As Worksheet: Set shBD = Sheets("BASE DE DATOS")

    Dim filaSel As Long: filaSel = ActiveCell.Row
    Dim numPres As String, Matricula As String, codigoColor As String
    Dim filaInicio As Long, i As Long
    Dim nF As Long, numLineas As Long
    Dim UltimaFila As Long, ultimaCol As Long

    ' VALIDACIÓN DE FILA
    If ActiveSheet.name <> "CITAS" Or filaSel < 5 Then
        Call MostrarPopover("POPOVER_ERROR", _
                            "SELECCIONE UNA FILA VÁLIDA", _
                            "ACEPTAR", "", "")
        Exit Sub
    End If

    ' VALIDAR ESTADO CONFIRMADA
    If LCase(shC.Cells(filaSel, "B").Value) <> "confirmada" Then
        Call MostrarPopover("POPOVER_ENV_ERR", _
                            "CAMBIE EL ESTADO A ""Confirmada"" PARA PODER ENVIAR A TALLER", _
                            "ACEPTAR", "", "")
        Exit Sub
    End If

    numPres = shC.Cells(filaSel, "D").Value
    Matricula = shC.Cells(filaSel, "F").Value

    ' BUSCAR PRESUPUESTO
    Dim fFound As Range
    Set fFound = shRP.Columns("B").Find(numPres, LookIn:=xlValues, LookAt:=xlWhole)
    If fFound Is Nothing Then
        Call MostrarPopover("POPOVER_ERROR", _
                            "NO SE ENCONTRÓ EL PRESUPUESTO", _
                            "ACEPTAR", "", "")
        Exit Sub
    End If

    filaInicio = fFound.Row

    ' BUSCAR COLOR
    Dim fColor As Range
    Set fColor = shBD.Columns("C").Find(Matricula, LookIn:=xlValues, LookAt:=xlWhole)
    If Not fColor Is Nothing Then codigoColor = shBD.Cells(fColor.Row, "G").Value

    ' COMPROBAR DUPLICADO
    Dim fDup As Range
    Set fDup = shR.Columns("B").Find(numPres, LookIn:=xlValues, LookAt:=xlWhole)
    If Not fDup Is Nothing Then
        Call MostrarPopover("POPOVER_ENV_DUP", _
                            "ENVIADO ANTERIORMENTE", _
                            "IR A REPARACIONES", "SALIR", "")
        Exit Sub
    End If

    ' INSERTAR EN REPARACIONES
    nF = shR.Cells(shR.Rows.Count, "B").End(xlUp).Row + 1
    If nF < 5 Then nF = 5

    Application.ScreenUpdating = False

    numLineas = 0

    For i = 0 To 17

        If shRP.Cells(filaInicio + i, "G").Value = "" Then Exit For
        If i > 0 And shRP.Cells(filaInicio + i, "B").Value <> "" Then Exit For

        With shR
            If numLineas = 0 Then
                .Cells(nF, "B").Value = numPres
                .Cells(nF, "C").Value = Matricula
                .Cells(nF, "D").Value = codigoColor
                .Cells(nF, "H").Value = "En Proceso"
                .Cells(nF, "I").Value = shC.Cells(filaSel, "C").Value
            End If

            .Cells(nF, "E").Value = shRP.Cells(filaInicio + i, "G").Value
        End With

        nF = nF + 1
        numLineas = numLineas + 1
    Next i

    ' MARCAR CITA COMO FINALIZADA
    shC.Cells(filaSel, "B").Value = "Finalizada"
    shC.Cells(filaSel, "B").Interior.Color = RGB(52, 199, 89)

    Application.ScreenUpdating = True

    ' ORDENAR
    UltimaFila = shR.Cells(shR.Rows.Count, "B").End(xlUp).Row
    ultimaCol = shR.Cells(4, shR.Columns.Count).End(xlToLeft).Column

    With shR.Sort
        .SortFields.Clear
        .SortFields.Add Key:=shR.Range("B5:B" & UltimaFila), _
                        SortOn:=xlSortOnValues, Order:=xlDescending
        .SetRange shR.Range(shR.Cells(4, 2), shR.Cells(UltimaFila, ultimaCol))
        .Header = xlYes
        .Apply
    End With

    ' POPOVER OK
    Call MostrarPopover("POPOVER_ENV_OK", _
                        "ENVIADO CORRECTAMENTE", _
                        "IR A REPARACIONES", "SALIR", "")

End Sub

Sub ActualizarAlertasInicio()

    Call ActualizarAlertaFacturas
    Call ActualizarAlertaCitas

End Sub

