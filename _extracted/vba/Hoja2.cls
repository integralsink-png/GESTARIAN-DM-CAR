VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Worksheet_Activate()

    ' Vista normal obligatoria
    ActiveWindow.View = xlNormalView

    ' Quitar cualquier divisi�n previa
    ActiveWindow.SplitColumn = 0
    ActiveWindow.SplitRow = 0

    ' Quitar inmovilizaci�n previa
    ActiveWindow.FreezePanes = False

    ' Inmovilizar las primeras 4 filas
    Me.Range("A5").Select
    ActiveWindow.FreezePanes = True

End Sub

