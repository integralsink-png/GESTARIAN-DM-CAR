VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja5"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
' --- CÓDIGO DENTRO DE HOJA5 (FACTURAS) ---

Private Sub Worksheet_Activate()
    ' Al entrar en la hoja, calculamos el IVA automáticamente
    Calcular_IVA_DMCAR
End Sub

Private Sub Worksheet_Change(ByVal Target As Range)
    ' Si editas cantidades o precios, se actualiza el total al momento
    If Not Intersect(Target, Range("C20:I37")) Is Nothing Then
        Calcular_IVA_DMCAR
    End If
End Sub

Public Sub Calcular_IVA_DMCAR()
    Dim i As Long, Base As Double: Base = 0
    Application.EnableEvents = False
    
    ' Calculamos línea por línea (Cantidad x Precio)
    For i = 20 To 37
        If Cells(i, "H") > 0 And Cells(i, "I") > 0 Then
            Cells(i, "J") = Cells(i, "H") * Cells(i, "I")
            Base = Base + Cells(i, "J")
        Else
            Cells(i, "J") = ""
        End If
    Next i
    
    ' Rellenamos los totales finales
    Range("J46") = Base              ' Subtotal
    Range("J47") = Base * 0.21       ' IVA
    Range("J48") = Base * 1.21       ' TOTAL
    Range("J46:J48").NumberFormat = "#,##0.00 €"
    
    Application.EnableEvents = True
End Sub
