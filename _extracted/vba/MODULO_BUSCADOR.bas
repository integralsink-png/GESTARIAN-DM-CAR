Attribute VB_Name = "MODULO_BUSCADOR"
Sub Buscar_Filtrar_General()
    Dim ws As Worksheet: Set ws = ActiveSheet
    Dim textoABuscar As String
    Dim datos As Variant
    Dim i As Long
    Dim encontrado As Boolean
    Dim btn As Shape
    
    textoABuscar = InputBox("Introduce la matr�cula a buscar:", "BUSCADOR DM CAR")
    
    If Trim(textoABuscar) = "" Then Exit Sub
    
    ' 1. Cambiar texto del bot�n a modo espera
    On Error Resume Next
    Set btn = ws.Shapes("Rect�ngulo: esquinas redondeadas 49")
    If Not btn Is Nothing Then
        btn.TextFrame.Characters.Text = "FILTRANDO... ESPERE."
        ' FORZAMOS el refresco inmediato
        DoEvents
        Application.ScreenUpdating = True
        DoEvents
    End If
    On Error GoTo 0
    
    ' 2. Ahora s�, desactivamos la pantalla para el proceso pesado
    Application.ScreenUpdating = False
    
    ' 3. Limpieza inicial
    If ws.AutoFilterMode Then ws.AutoFilterMode = False
    ws.Rows("5:3000").EntireRow.Hidden = False
    
    ' 4. Buscar y ocultar filas
    datos = ws.Range("D5:D3000").Value
    For i = 1 To UBound(datos, 1)
        encontrado = (InStr(1, CStr(datos(i, 1)), textoABuscar, vbTextCompare) > 0)
        If Not encontrado Then ws.Rows(i + 4).Hidden = True
    Next i
    
    ' 5. Actualizar texto a resultado final
    If Not btn Is Nothing Then
        btn.TextFrame.Characters.Text = "MOSTRANDO: " & UCase(textoABuscar)
    End If
    
    Application.ScreenUpdating = True
End Sub
    
    

Sub Mostrar_Todo()
    Dim ws As Worksheet: Set ws = ActiveSheet
    Dim btn As Shape
    
    Application.ScreenUpdating = False
    
    If ws.AutoFilterMode Then ws.AutoFilterMode = False
    ws.Rows("5:3000").EntireRow.Hidden = False
    
    ' Restablecer nombre original
    On Error Resume Next
    Set btn = ws.Shapes("Rect�ngulo: esquinas redondeadas 49")
    If Not btn Is Nothing Then
        btn.TextFrame.Characters.Text = "FILTRAR POR MATRICULA"
    End If
    On Error GoTo 0
    
    Application.ScreenUpdating = True
End Sub

