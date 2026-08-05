VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja8"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Worksheet_SelectionChange(ByVal Target As Range)

    ' Solo una celda y solo columna L
    If Target.Count > 1 Then Exit Sub
    If Target.Column <> 12 Then Exit Sub   ' Columna L
    If Target.Row < 5 Then Exit Sub        ' Evitar encabezados

    Dim numPresupuesto As String
    numPresupuesto = Trim(Me.Cells(Target.Row, "B").Value)
    
    ' CONFLICTO CORREGIDO: Si la celda B est� vac�a (l�nea secundaria),
    ' buscamos hacia arriba la fila principal para obtener el n�mero de presupuesto.
    If numPresupuesto = "" Then
        Dim filaBuscar As Long
        filaBuscar = Target.Row
        Do While numPresupuesto = "" And filaBuscar >= 5
            numPresupuesto = Trim(Me.Cells(filaBuscar, "B").Value)
            filaBuscar = filaBuscar - 1
        Loop
    End If

    ' Si realmente est� vac�o el bloque (fila sin presupuesto), salimos
    If numPresupuesto = "" Then Exit Sub

    ' Desactivamos eventos para evitar que la macro se llame a s� misma al modificar celdas
    Application.EnableEvents = False
    Application.ScreenUpdating = False

    ' 1) Determinar el nuevo estado y los nuevos colores bas�ndonos en la celda pulsada
    Dim NuevoEstado As String
    Dim colorFondo As Long
    
    Select Case UCase(Trim(Target.Value))
        Case "", "PENDIENTE"
            ' PASAR A ACEPTADO (AZUL APPLE)
            NuevoEstado = "ACEPTADO"
            colorFondo = RGB(0, 122, 255)
            
        Case "ACEPTADO"
            ' VOLVER A PENDIENTE (GRIS OSCURO APPLE #1c1c1e)
            NuevoEstado = "PENDIENTE"
            colorFondo = RGB(28, 28, 30)
            
        Case Else
            NuevoEstado = "PENDIENTE"
            colorFondo = RGB(28, 28, 30)
    End Select

    ' 2) CONFLICTO CORREGIDO: Buscar y actualizar TODAS las filas de este presupuesto
    Dim UltimaFila As Long
    Dim f As Long
    Dim preActual As String
    
    UltimaFila = Me.Cells(Me.Rows.Count, "G").End(xlUp).Row
    
    For f = 5 To UltimaFila
        ' Rastrear a qu� presupuesto pertenece la fila actual
        If Trim(Me.Cells(f, "B").Value) <> "" Then
            preActual = Trim(Me.Cells(f, "B").Value)
        End If
        
        ' Si la fila pertenece al presupuesto modificado, actualizamos su columna L
        If preActual = numPresupuesto Then
            With Me.Cells(f, "L")
                .Interior.Pattern = xlSolid
                .Value = NuevoEstado
                .Interior.Color = colorFondo
                .Font.Color = vbWhite
                .Font.name = "Calibri Light"
                .Font.Bold = True
                .HorizontalAlignment = xlCenter
            End With
        End If
    Next f

    ' Quitamos la selecci�n de la celda de estado movi�ndola a la columna G (Concepto)
    ' Esto evita que se quede encasillado si vuelves a hacer clic en la misma celda
    Me.Cells(Target.Row, "G").Select

    Application.EnableEvents = True
    Application.ScreenUpdating = True

End Sub
