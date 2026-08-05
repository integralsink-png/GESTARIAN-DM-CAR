Attribute VB_Name = "RFP"
Option Explicit

Sub incorporarfactura2()
    ' Redirige y da la instrucci�n clara
    Sheets("PROVEEDORES").Activate
    MsgBox "SELECCIONA EL PROVEEDOR Y PULSA EL BOT�N INCORPORAR FACTURA", vbInformation, "Instrucci�n de Registro"
End Sub


Sub ValidarFactura()
    Dim shReg As Worksheet: Set shReg = Sheets("REGISTRO FACTURAS PROVEEDORES")
    Dim shBal As Worksheet: Set shBal = Sheets("BALANCES")
    Dim filaDestino As Long, i As Long
    Dim NumFactura As String
    Dim rngBusqueda As Range
    
    ' 1. Validaci�n de fila activa
    If ActiveCell.Row < 11 Then Exit Sub
    
    ' 2. L�GICA DE INVALIDACI�N (Si ya est� "Validada")
    If Cells(ActiveCell.Row, "J").Value = "Validada" Then
        NumFactura = Cells(ActiveCell.Row, "D").Value
        
        ' Buscar y borrar la fila en Balances
        Set rngBusqueda = shBal.Columns("O").Find(What:=NumFactura, LookAt:=xlWhole)
        
        If Not rngBusqueda Is Nothing Then
            rngBusqueda.EntireRow.Delete
        End If
        
        ' Resetear celda J a Pendiente (Fondo negro, texto gris claro)
        With Cells(ActiveCell.Row, "J")
            .Value = "Pendiente"
            .Interior.Color = RGB(0, 0, 0)
            .Font.Color = RGB(224, 224, 224)
            .Font.Size = 16
            .Font.Bold = True
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With
        
        MsgBox "FACTURA INVALIDADA Y DETRA�DA DE BALANCES, PUEDE VOLVER A VALIDARLA", vbInformation, "Estado: Pendiente"
        Exit Sub
    End If
    
    ' 3. VALIDACI�N (Si est� "Pendiente")
    For i = 4 To 9 ' Columnas D a I
        If IsEmpty(Cells(ActiveCell.Row, i)) Then
            MsgBox "FALTAN DATOS PARA LA VALIDACI�N", vbCritical
            Exit Sub
        End If
    Next i
    
    ' 4. Pasar a Balances
    filaDestino = shBal.Cells(shBal.Rows.Count, "O").End(xlUp).Row + 1
    shBal.Cells(filaDestino, "O").Value = Cells(ActiveCell.Row, "D").Value
    shBal.Cells(filaDestino, "P").Value = Cells(ActiveCell.Row, "E").Value
    shBal.Cells(filaDestino, "Q").Value = Cells(ActiveCell.Row, "G").Value
    shBal.Cells(filaDestino, "R").Value = Cells(ActiveCell.Row, "H").Value
    shBal.Cells(filaDestino, "S").Value = Cells(ActiveCell.Row, "I").Value
    shBal.Cells(filaDestino, "T").Value = Cells(ActiveCell.Row, "F").Value
    
    ' 5. Aplicar formato "Validada" en columna J (Verde con texto 64,64,64)
    With Cells(ActiveCell.Row, "J")
        .Value = "Validada"
        .Interior.Color = RGB(0, 176, 80)
        .Font.Color = RGB(64, 64, 64)
        .Font.Size = 16
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
    
    MsgBox "VALIDADA Y REGISTRADA", vbInformation
End Sub

Sub buscardato()
    Dim Valor As String
    Valor = InputBox("�Qu� proveedor o factura buscas?", "Buscador")
    If Valor = "" Then Exit Sub
    
    On Error Resume Next
    Cells.Find(What:=Valor, After:=ActiveCell, LookIn:=xlValues, _
               LookAt:=xlPart, SearchOrder:=xlByRows, SearchDirection:=xlNext).Activate
    If Err.Number <> 0 Then MsgBox "No se ha encontrado el dato.", vbCritical
End Sub

Sub Escanear()
    Dim sistemaListo As Boolean
    sistemaListo = False
    
    If ActiveCell.Row < 11 Then
        MsgBox "Por favor, selecciona una fila de factura v�lida.", vbExclamation
        Exit Sub
    End If
    
    With Cells(ActiveCell.Row, "K")
        If sistemaListo Then
            .Value = "Escaneo completado correctamente"
            .Font.Color = RGB(0, 128, 0)
        Else
            .Value = "AVISO: No se detecta esc�ner o proceso OCR sin configurar"
            .Font.Color = RGB(200, 0, 0)
            .Font.Bold = True
            .Font.Size = 16
            .VerticalAlignment = xlCenter
        End If
    End With
    
    If Not sistemaListo Then
        MsgBox "El sistema de escaneo no est� disponible." & vbCrLf & _
               "Se ha registrado el aviso en la columna K.", vbCritical, "Estado del Sistema"
    End If
End Sub
