Attribute VB_Name = "TRABAJO"
Option Explicit

Sub VerTrabajo()
    Dim shReg As Worksheet: Set shReg = Sheets("REGISTRO FACTURAS")
    Dim shTrab As Worksheet: Set shTrab = Sheets("TRABAJOS")
    Dim NumFactura As String, Matricula As String
    Dim filaOrigen As Long, filaDestino As Long
    Dim ultimaFilaReg As Long
    
    ' 1. Obtener datos de la fila seleccionada
    NumFactura = shReg.Cells(ActiveCell.Row, "B").Value
    Matricula = shReg.Cells(ActiveCell.Row, "D").Value
    
    If NumFactura = "" Then
        MsgBox "Selecciona una fila válida en la columna de facturas.", vbExclamation
        Exit Sub
    End If
    
    ' 2. Limpiar zona de conceptos anterior en TRABAJO
    shTrab.Range("E17:F17").ClearContents ' Limpiar cabeceras de factura/fecha
    shTrab.Range("G17:G100").ClearContents ' Limpiar lista de conceptos
    
    ' 3. Volcar datos principales
    shTrab.Range("E17").Value = NumFactura
    shTrab.Range("F17").Value = shReg.Cells(ActiveCell.Row, "K").Value ' Fecha
    
    ' 4. Volcar matrícula al shape
    On Error Resume Next
    shTrab.Shapes("matricula").TextFrame2.TextRange.Text = Matricula
    On Error GoTo 0
    
    ' 5. Buscar y copiar conceptos (filas con el mismo número de factura)
    filaDestino = 17
    ultimaFilaReg = shReg.Cells(shReg.Rows.Count, "B").End(xlUp).Row
    
    For filaOrigen = 5 To ultimaFilaReg ' Asumiendo que tus datos empiezan en la fila 5
        If shReg.Cells(filaOrigen, "B").Value = NumFactura Then
            shTrab.Cells(filaDestino, "G").Value = shReg.Cells(filaOrigen, "G").Value
            filaDestino = filaDestino + 1
        End If
    Next filaOrigen
    
    ' 6. Ir a la página
    shTrab.Activate
End Sub
