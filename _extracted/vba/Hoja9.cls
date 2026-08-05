VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja9"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Worksheet_Activate()
      
    ' Limpieza visual: ocultamos lo que sobra para que resalte tu diseño
    ActiveWindow.DisplayHeadings = False   ' Quita letras y números de fila
    ActiveWindow.DisplayGridlines = False  ' Quita la cuadrícula gris
End Sub

Private Sub Worksheet_SelectionChange(ByVal Target As Range)

    ' Si el tooltip NO está visible ? no hacemos nada
    If Not Me.Shapes("tooltip_info").Visible Then Exit Sub
    
    ' Si el usuario hace clic en el botón_info ? NO ocultar
    If Not Intersect(Target, Me.Shapes("boton_info").TopLeftCell) Is Nothing Then Exit Sub
    
    ' Si el usuario hace clic en cualquier otro sitio ? ocultar
    Call OcultarTooltip_Info

End Sub



