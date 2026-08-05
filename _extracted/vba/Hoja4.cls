VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

Private Sub Worksheet_SelectionChange(ByVal Target As Range)

    On Error GoTo Salir

    ' ============================================================
    ' SOLO 1 CELDA EN COLUMNA H
    ' ============================================================
    If Target.CountLarge > 1 Then Exit Sub
    If Target.Column <> 8 Then Exit Sub
    If Target.Row < 5 Then Exit Sub

    Dim numPresupuesto As Variant
    numPresupuesto = Me.Cells(Target.Row, "B").Value

    Application.EnableEvents = False

    Select Case Trim(Target.Value)

        ' ========================================================
        ' EN PROCESO -> TERMINADO
        ' ========================================================
        Case "", "En proceso", "En Proceso", "En taller"

            Target.Value = "Terminado"
            Target.Interior.Color = RGB(52, 199, 89)

            If numPresupuesto <> "" Then

                Sheets("FACTURAS").Range("M3").Value = numPresupuesto

             ' --- En tu evento SelectionChange ---
Call CrearPopover( _
    "POPOVER_CAMBIO_ESTADO", _
    "VEH�CULO TERMINADO" & vbCrLf & "Datos cargados en FACTURAS.", _
    "GENERAR Y ABRIR FACTURA", "CANCELAR", "")

            End If

        ' ========================================================
        ' TERMINADO -> EN PROCESO
        ' ========================================================
        Case "Terminado"

            Target.Value = "En proceso"
            Target.Interior.Color = RGB(255, 159, 10)

    End Select

    ' ============================================================
    ' FORMATO
    ' ============================================================
    With Target

        .Font.Color = vbWhite
        .Font.Bold = True
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter

    End With

    Target.Offset(0, -1).Select

Salir:

    Application.EnableEvents = True
    Application.StatusBar = "DM CAR: Estado actualizado."

End Sub


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

