VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

Private Sub Worksheet_SelectionChange(ByVal Target As Range)

    On Error GoTo SalidaSegura

    ' solo una celda
    If Target.CountLarge > 1 Then Exit Sub

    ' solo columna B (ESTADO), desde fila 5
    If Intersect(Target, Me.Range("B5:B500")) Is Nothing Then Exit Sub

    ' si no hay presupuesto en D, salir
    If Me.Cells(Target.Row, "D").Value = "" Then Exit Sub

    Application.EnableEvents = False


    '==================================================
    ' CAMBIO DE ESTADO
    '==================================================
    Select Case UCase(Trim(Target.Value))

        Case "PENDIENTE", ""
            Target.Value = "Confirmada"
            Target.Interior.Color = RGB(0, 122, 255)   ' azul

        Case "CONFIRMADA"
            Target.Value = "Pendiente"
            Target.Interior.Color = RGB(255, 159, 10)  ' naranja

        Case Else
            Target.Value = "Pendiente"
            Target.Interior.Color = RGB(255, 159, 10)

    End Select


    ' formato
    With Target
        .Font.Color = vbWhite
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With

    ' actualizar aviso INICIO
    Call ActualizarAlertaCitas

    ' mover cursor para permitir clic repetido
    Target.Offset(0, 1).Select


SalidaSegura:
    Application.EnableEvents = True

End Sub


Private Sub Worksheet_Activate()

    ActiveWindow.View = xlNormalView
    ActiveWindow.SplitColumn = 0
    ActiveWindow.SplitRow = 0
    ActiveWindow.FreezePanes = False

    Me.Range("A5").Select
    ActiveWindow.FreezePanes = True

End Sub
