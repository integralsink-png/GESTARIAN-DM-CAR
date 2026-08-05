Attribute VB_Name = "MOD_VISOR_FACTURAS"
Option Explicit

'============================================================
' 1) GESTIÓN Y FILTRADO EN LA HOJA REPARACIONES
'============================================================
Sub Historial_Matricula_C4()
    Dim matriculaInput As String
    Dim ws As Worksheet
    Dim UltimaFila As Long
    
    Set ws = Sheets("REPARACIONES")
    
    ' Pedir los números (Filtro por los 4 primeros dígitos)
    matriculaInput = InputBox("Introduce los 4 números de la matrícula:", "BUSCADOR DM CAR")
    
    ' Si cancela o no escribe nada, salimos de la macro
    If matriculaInput = "" Then Exit Sub
    
    ' Desproteger para que VBA pueda trabajar
    ws.Unprotect
    
    ' Limpiar cualquier filtro anterior para empezar de cero
    If ws.AutoFilterMode Then ws.AutoFilterMode = False
    
    ' Hallar la última fila con datos en la columna C
    UltimaFila = ws.Cells(ws.Rows.Count, "C").End(xlUp).Row
    
    ' Aplicar el filtro dinámico en la cabecera C4
    If UltimaFila >= 4 Then
        ws.Range("C4:C" & UltimaFila).AutoFilter Field:=1, Criteria1:=matriculaInput & "*"
    Else
        MsgBox "La lista de reparaciones parece estar vacía.", vbExclamation, "DM CAR"
    End If
    
    ' Proteger de nuevo permitiendo que el filtro sea visible
    ws.Protect AllowFiltering:=True, UserInterfaceOnly:=True
    
    MsgBox "Historial filtrado para: " & matriculaInput, vbInformation, "DM CAR"
End Sub

Sub MostrarTodo_Reparaciones()
    Dim ws As Worksheet
    Set ws = Sheets("REPARACIONES")

    On Error GoTo Salida

    Application.ScreenUpdating = False

    ' Desproteger
    ws.Unprotect

    ' Eliminar cualquier filtro activo de forma segura
    If ws.AutoFilterMode Then
        On Error Resume Next
        ws.ShowAllData
        On Error GoTo 0

        If ws.FilterMode Then
            ws.AutoFilterMode = False
        End If
    End If

    ' Reactivar AutoFiltro en la fila de la cabecera original
    ws.Range("C4").AutoFilter

    ' Posicionamiento visual limpio arriba
    ws.Activate
    ws.Range("C5").Select
    ActiveWindow.ScrollRow = 1
    ActiveWindow.ScrollColumn = 1

    ' Reproteger manteniendo la experiencia de usuario
    ws.Protect AllowFiltering:=True, UserInterfaceOnly:=True

Salida:
    Application.ScreenUpdating = True
End Sub


Public Sub Cargar_Factura()

On Error GoTo ErrorHandler

Dim shR As Worksheet: Set shR = Sheets("REGISTRO FACTURAS")
Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
Dim shBD As Worksheet: Set shBD = Sheets("BASE DE DATOS")

Dim filaSel As Long: filaSel = ActiveCell.Row
Dim NumFactura As Variant, filaInicio As Long
Dim i As Long, linV As Long
Dim tBase As Double
Dim Matricula As String
Dim fBD As Range
Dim numDetectado As Variant

If filaSel < 5 Then Exit Sub

If shR.Cells(filaSel, "B").Value <> "" Then
    filaInicio = filaSel
Else
    filaInicio = shR.Cells(filaSel, "B").End(xlUp).Row
    If filaInicio < 5 Then Exit Sub
End If

NumFactura = Trim(shR.Cells(filaInicio, "B").Value)
Matricula = shR.Cells(filaInicio, "D").Value

Application.ScreenUpdating = False

Set fBD = shBD.Columns("C").Find(What:=Matricula, LookIn:=xlValues, LookAt:=xlWhole)

With shF

    .Range("C20:C37,H20:H37,I20:I37,J20:J37,J46:J48").ClearContents

    .Range("D9").Value = NumFactura
    .Range("J9").Value = shR.Cells(filaInicio, "K").Value
    .Range("C14").Value = shR.Cells(filaInicio, "C").Value
    .Range("J14").Value = Matricula
    .Range("J15").Value = shR.Cells(filaInicio, "E").Value
    .Range("J16").Value = shR.Cells(filaInicio, "F").Value

    If Not fBD Is Nothing Then
        .Range("D15").Value = shBD.Cells(fBD.Row, "I").Value
        .Range("C17").Value = shBD.Cells(fBD.Row, "J").Value
        .Range("D18").Value = shBD.Cells(fBD.Row, "K").Value
    End If

    linV = 0
    tBase = 0
    i = filaInicio

    Do

        numDetectado = shR.Cells(i, "B").Value

        If numDetectado <> "" Then
            If numDetectado <> NumFactura Then Exit Do
        End If

        If Trim(shR.Cells(i, "G").Value) = "" Then Exit Do

        .Cells(20 + linV, "C").Value = shR.Cells(i, "G").Value
        .Cells(20 + linV, "H").Value = shR.Cells(i, "H").Value
        .Cells(20 + linV, "I").Value = shR.Cells(i, "I").Value
        .Cells(20 + linV, "J").Value = shR.Cells(i, "J").Value

        tBase = tBase + Val(shR.Cells(i, "J").Value)

        linV = linV + 1
        i = i + 1

        If 20 + linV > 37 Then Exit Do

    Loop

    .Range("J46").Value = tBase
    .Range("J47").Value = tBase * 0.21
    .Range("J48").Value = tBase * 1.21
    .Range("J46:J48").NumberFormat = "#,##0.00 €"

End With

Call Actualizar_Color_Estado_Factura(NumFactura)
Call ActualizarShapeVersionFactura(NumFactura)

'==========================================================
' BOTÓN MODIFICAR FACTURA
'==========================================================

With shF.Shapes("BTN_MODIFICAR_FACTURA")

    If Right(UCase(NumFactura), 1) Like "#" Then

        'Factura original
        .TextFrame2.TextRange.Text = "MODIFICAR FACTURA"

        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = RGB(200, 200, 200)
        .Line.Weight = 1.25

        .Glow.Radius = 0

    Else

        'Factura ya modificada anteriormente
        .TextFrame2.TextRange.Text = "MODIFICAR DE NUEVO"

        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = RGB(220, 255, 220)
        .Line.Weight = 1.25

        .Glow.Color.RGB = RGB(0, 255, 0)
        .Glow.Radius = 12
        .Glow.Transparency = 0.3

    End If

End With

'Siempre comienza fuera del modo modificación
shF.Range("B2").ClearContents

shF.Activate
shF.Range("C3").Select

Application.ScreenUpdating = True

Exit Sub

ErrorHandler:

Application.ScreenUpdating = True

MsgBox "Error DM CAR (Cargar_Factura): " & Err.Description, vbCritical, "GESTARIAN"

End Sub

'============================================================
' 3) DINÁMICA DE ESTADOS Y SINCRONIZACIÓN VISUAL
'============================================================
Public Sub Actualizar_Color_Estado_Factura(NumFactura As Variant)
    Dim shR As Worksheet: Set shR = Sheets("REGISTRO FACTURAS")
    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim shp As Shape
    Dim fila As Long
    Dim colorEstado As Long

    ' Nombre corregido del botón unificado según la estructura principal
    On Error Resume Next
    Set shp = shF.Shapes("estado")
    On Error GoTo 0
    
    If shp Is Nothing Then Exit Sub

    fila = Application.Match(NumFactura, shR.Columns("B"), 0)
    If IsError(fila) Then Exit Sub

    colorEstado = shR.Cells(fila, "L").Interior.Color

    ' Sincroniza la iluminación perimetral del botón en la interfaz principal
    With shp.Glow
        .Color.RGB = colorEstado
        .Radius = 20
        .Transparency = 0.6
    End With
End Sub

Sub Cambiar_Estado_Factura(celda As Range)
    On Error GoTo SalidaSegura
    Application.EnableEvents = False

    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim shBal As Worksheet: Set shBal = Sheets("BALANCES")
    Dim numFacturaVisor As String
    Dim numFacturaCambiada As String
    Dim filaBal As Variant
    
    Dim textoEstado As String
    Dim colorFondo As Long

    numFacturaVisor = Trim(shF.Range("D9").Value)
    numFacturaCambiada = celda.Offset(0, -10).Value ' Distancia relativa a la columna B

    ' NORMALIZACIÓN ESTRICTA A MAYÚSCULAS PARA EVITAR DESCOMPENSACIÓN DE LOGICA
    Select Case Trim(UCase(celda.Value))
        Case "PENDIENTE", ""
            textoEstado = "ABONADA"
            colorFondo = RGB(0, 176, 80) ' Verde DM CAR
        Case "ABONADA"
            textoEstado = "PARCIAL"
            colorFondo = RGB(0, 112, 192) ' Azul DM CAR
        Case "PARCIAL"
            textoEstado = "IMPAGADA"
            colorFondo = RGB(255, 0, 0) ' Rojo Alerta
        Case Else
            textoEstado = "PENDIENTE"
            colorFondo = RGB(0, 0, 0) ' Negro Puro Corporativo
    End Select

    ' Aplicación de diseño unificado a la celda modificada
    With celda
        .Value = textoEstado
        .Font.name = "Candara"
        .Font.Bold = True
        .Font.Color = vbWhite
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
        .Interior.Color = colorFondo
    End With

    ' Sincronizar de forma idéntica con el cuadrante de Balances
    filaBal = Application.Match(numFacturaCambiada, shBal.Columns("B"), 0)
    If Not IsError(filaBal) Then
        shBal.Cells(filaBal, "B").Interior.Color = colorFondo
    End If

    ' Refrescar dinámicamente el botón si la factura está en el visor activo
    If numFacturaVisor = numFacturaCambiada Then
        Actualizar_Color_Estado_Factura numFacturaVisor
    End If

    ' Lanzar refresco de indicadores generales
    On Error Resume Next
    Application.Run "ActualizarAlertasInicio"
    On Error GoTo 0

SalidaSegura:
    Application.EnableEvents = True
End Sub

'============================================================
' 4) CONTROL DE IMPRESIÓN SEGURO DESDE VISORES (Actualizado)
'============================================================
Sub Imprimir_Factura_Desde_Visor()
    Dim shF As Worksheet: Set shF = Sheets("FACTURAS")
    Dim NumFactura As String
    Dim respuesta As VbMsgBoxResult
    Dim copias As Long

    NumFactura = Trim(shF.Range("D9").Value)

    If NumFactura = "" Then
        MsgBox "No hay factura cargada en el visor.", vbExclamation, "DM CAR"
        Exit Sub
    End If

    ' Cuadro de diálogo de triple acción parametrizado
    respuesta = MsgBox( _
        "Seleccione una opción de impresión:" & vbCrLf & vbCrLf & _
        "Sí = Una copia (Cliente)" & vbCrLf & _
        "No = Dos copias (Cliente + Taller)" & vbCrLf & _
        "Cancelar = Detener proceso", _
        vbYesNoCancel + vbQuestion, "DM CAR")

    Select Case respuesta
        Case vbYes: copias = 1
        Case vbNo:  copias = 2
        Case vbCancel: Exit Sub
    End Select

    ' Lanzar el envío directo al hardware configurado
    shF.Range("C3:J48").PrintOut Copies:=copias

    ' Registrar automáticamente el estado en la hoja REGISTRO FACTURAS
    Marcar_Estado_Registro NumFactura, "En mano"

    MsgBox "Impresión realizada y registrada como 'En mano'." & vbCrLf & _
           "Recuerde marcar la factura como Abonada pulsando el botón ESTADO después del cobro.", _
           vbInformation, "DM CAR"
End Sub
