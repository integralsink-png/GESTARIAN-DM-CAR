Attribute VB_Name = "Módulo3"
Sub VerHistorialCliente()

    Dim shC As Worksheet
    Dim shR As Worksheet
    Dim nombreCliente As String
    Dim fila As Long

    Set shC = Sheets("CLIENTES")
    Set shR = Sheets("REGISTRO FACTURAS")

    fila = ActiveCell.Row

    If fila < 5 Then Exit Sub

    nombreCliente = Trim(shC.Cells(fila, "B").Value)

    If nombreCliente = "" Then Exit Sub

    Application.ScreenUpdating = False

    shR.Activate

    If shR.AutoFilterMode Then
        shR.AutoFilterMode = False
    End If

    shR.Range("B6:L5000").AutoFilter Field:=2, Criteria1:=nombreCliente

    Application.ScreenUpdating = True

End Sub


Sub Imprimir_Desde_Presupuestos()

    Dim shp As Worksheet: Set shp = Sheets("PRESUPUESTOS")
    Dim respuesta As VbMsgBoxResult
    Dim copias As Long

    ' ============================================================
    ' AVISO DE IVA (obligatorio)
    ' ============================================================
    If shp.Range("J47").Value = 0 Or shp.Range("J47").Value = "" Then
        MsgBox "Atención: Va a imprimir un presupuesto SIN IVA.", vbExclamation, "DM CAR"
    End If

    ' ============================================================
    ' PREGUNTAR Nº DE COPIAS (1 / 2 / Cancelar)
    ' ============================================================
    respuesta = MsgBox( _
        "¿Cuántas copias desea imprimir?" & vbCrLf & vbCrLf & _
        "   Sí = 1 copia" & vbCrLf & _
        "   No = 2 copias" & vbCrLf & _
        "   Cancelar = No imprimir", _
        vbYesNoCancel + vbQuestion, "DM CAR")

    Select Case respuesta
        Case vbYes
            copias = 1
        Case vbNo
            copias = 2
        Case vbCancel
            Exit Sub
    End Select

    ' ============================================================
    ' CONFIGURACION DE IMPRESIÓN
    ' ============================================================
    With shp.PageSetup
        .PrintArea = "$B$3:$J$48"
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .CenterHorizontally = True
    End With

    ' ============================================================
    ' IMPRIMIR DIRECTAMENTE (modo kiosko compatible)
    ' ============================================================
    shp.PrintOut Copies:=copias

End Sub



' ------------------------------------------------------------
' 2B) IMPRIMIR DESDE "REGISTRO" (EL VISOR P3:W48)
' ------------------------------------------------------------
Sub Imprimir_Desde_Registro()
    Dim shR As Worksheet: Set shR = Sheets("REGISTRO PRESUPUESTOS")
    Dim fila As Long: fila = ActiveCell.Row
    Dim Estado As String, filaInicio As Long
    
    ' 1. Localizar cabecera para ver el estado
    If shR.Cells(fila, "B").Value <> "" Then
        filaInicio = fila
    Else
        filaInicio = shR.Cells(fila, "B").End(xlUp).Row
    End If
    
    ' 2. Validación obligatoria de Estado "Aceptado"
    Estado = shR.Cells(filaInicio, "L").Value
    If Estado <> "Aceptado" Then
        MsgBox "DM CAR: El presupuesto debe estar en estado 'Aceptado' para poder imprimirse.", vbExclamation, "CONTROL DE REGISTRO"
        Exit Sub
    End If

    ' 3. Configuración y Vista Previa del Rango Visor
    With shR.PageSetup
        .PrintArea = "$P$3:$W$48"
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .CenterHorizontally = True
    End With
    
    shR.Range("P3:W48").PrintPreview
End Sub


Sub AutoGuardado_Si_Hay_Cambios()

    On Error Resume Next

    Const intervalo As Double = 3 / 1440   ' 3 minutos

    If ThisWorkbook.Saved = False Then
        Application.EnableEvents = False
        ThisWorkbook.Save
        Application.EnableEvents = True
    End If

    Application.OnTime Now + intervalo, "AutoGuardado_Si_Hay_Cambios"

End Sub

Sub Boton_RegistrarPresupuesto_Click()

    Dim resultado As String
    resultado = Registrar_Presupuesto_DM()

    Select Case resultado

        Case "IVA_0"
            Call MostrarPopover("POPOVER_IVA_0", _
                                "No se puede registrar un presupuesto sin IVA.", _
                                "ACEPTAR", "", "")

        Case "DUPLICADO"
            Call MostrarPopover("POPOVER_DUPLICADO", _
                                "Este presupuesto ya está registrado.", _
                                "ACEPTAR", "", "")

        Case "OK"
            Call MostrarPopover("POPOVER_01", _
                                "PRESUPUESTO REGISTRADO CORRECTAMENTE", _
                                "IR A REGISTRO", "SALIR", "")

    End Select

End Sub


