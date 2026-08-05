Attribute VB_Name = "bloqueo"
Option Explicit

' --- BLOQUEO DE SCROLL (Vertical y Lateral) ---
Sub ConfigurarScrollDMCAR()

    Dim sh As Worksheet

    For Each sh In ThisWorkbook.Worksheets
        sh.ScrollArea = "A:N"
    Next sh

    Sheets("INICIO").ScrollArea = "A1:P40"
    Sheets("MIS DATOS").ScrollArea = "A1:P40"
    Sheets("TRABAJOS").ScrollArea = "A1:P40"
    Sheets("ALTA CLIENTE").ScrollArea = "A1:K60"

    Sheets("PRESUPUESTOS").ScrollArea = "A1:K50"
    Sheets("FACTURAS").ScrollArea = "A1:K50"

    Sheets("GUÍA OPERATIVA").ScrollArea = "A1:P100"

End Sub

' --- MANTENIMIENTO DE OBJETOS ---
Sub BloquearObjetosEnTodoElLibro()
    Dim ws As Worksheet, shp As Shape
    For Each ws In ThisWorkbook.Worksheets
        For Each shp In ws.Shapes
            shp.Placement = xlFreeFloating
            shp.Top = shp.Top
            shp.Left = shp.Left
        Next shp
    Next ws
End Sub

' --- HELPERS ---
Private Function NzSafe(v As Variant) As String
    On Error Resume Next
    If IsError(v) Or IsNull(v) Then NzSafe = "" Else NzSafe = CStr(v)
End Function
Sub PantallaCompletaDMCAR()

    Application.DisplayFullScreen = True

End Sub
