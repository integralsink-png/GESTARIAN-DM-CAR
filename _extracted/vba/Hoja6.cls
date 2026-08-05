VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja6"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

Private Sub Worksheet_SelectionChange(ByVal Target As Range)
    On Error GoTo SalidaSegura
    Application.EnableEvents = False

    ' Validar selecci�n �nica y que estemos de la fila 5 en adelante
    If Target.CountLarge > 1 Then GoTo SalidaSegura
    If Target.Row < 5 Then GoTo SalidaSegura
    
    ' ============================================================
    ' �NICA ACCI�N: COLUMNA N (Marca de control "SI")
    ' ============================================================
    If Target.Column = 14 Then ' Columna N
        
        ' Solo act�a si la fila tiene datos (Concepto en G)
        If Trim(Me.Cells(Target.Row, "G").Value) <> "" Then
            
            Application.ScreenUpdating = False
            
            With Target
                .Interior.Color = RGB(0, 0, 0) ' Fondo negro corporativo
                
                If Trim(UCase(.Value)) = "SI" Then
                    .Value = ""
                    .Interior.Color = xlNone ' Restaura fondo original al borrar
                Else
                    .Value = "SI"
                    .Font.name = "Candara"
                    .Font.Color = vbWhite
                    .Font.Bold = True
                    .HorizontalAlignment = xlCenter
                End If
            End With
            
            Application.ScreenUpdating = True
            
            ' Desplazamos el cursor a la columna M para liberar la N
            Target.Offset(0, -1).Select
            GoTo SalidaSegura
        End If
    End If

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
