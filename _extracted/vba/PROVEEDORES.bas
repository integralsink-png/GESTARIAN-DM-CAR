Attribute VB_Name = "PROVEEDORES"
Option Explicit

Sub incorporarfactura()
    Dim nombreProveedor As Variant
    Dim filaOrigen As Long
    Dim hojaRegistro As Worksheet
    
    ' Desactivar eventos temporalmente
    Application.EnableEvents = False
    
    On Error GoTo ManejadorError
    
    filaOrigen = ActiveCell.Row
    
    ' Validación básica
    If filaOrigen < 11 Then
        MsgBox "Selecciona una fila de proveedor válida (a partir de la 11).", vbExclamation
        GoTo Limpieza
    End If
    
    ' Captura segura del nombre
    nombreProveedor = Cells(filaOrigen, "E").Value
    
    Set hojaRegistro = Sheets("REGISTRO FACTURAS PROVEEDORES")
    
    ' Ejecución: Registro
    With hojaRegistro
        .Activate
        .Rows(11).Insert Shift:=xlDown
        
        ' Registrar Nombre
        .Cells(11, "F").Value = nombreProveedor
        
        ' Insertar fórmulas en H e I
        ' Columna H: IVA (G*0,21)
        .Cells(11, "H").FormulaLocal = "=SI(G11<>""""; G11*0,21; """")"
        ' Columna I: Total (G+H)
        .Cells(11, "I").FormulaLocal = "=SI(G11<>""""; G11+H11; """")"
        
        ' Registrar Estado
        .Cells(11, "J").Value = "Pendiente"
        
        ' Formato solicitado para J
        With .Cells(11, "J")
            .Interior.Color = RGB(64, 64, 64)
            .Font.Color = RGB(224, 224, 224)
            .Font.Size = 16
            .Font.Bold = True
            .HorizontalAlignment = xlCenter
            .VerticalAlignment = xlCenter
        End With
    End With
    
    MsgBox "CUMPLIMENTE EL DATO EN LA COLUMNA G PARA CALCULAR AUTOMÁTICAMENTE", vbInformation, "Registro Preparado"

Limpieza:
    Application.EnableEvents = True
    Exit Sub

ManejadorError:
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical
    Resume Limpieza
End Sub
