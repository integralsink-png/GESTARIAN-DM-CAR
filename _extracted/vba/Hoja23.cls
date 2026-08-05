VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja23"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Worksheet_Activate()
    
    ' Limpieza visual
    ActiveWindow.DisplayHeadings = False
    ActiveWindow.DisplayGridlines = False

    ' Actualizar número de cliente en tiempo real
    Call ActualizarNumeroCliente

End Sub

