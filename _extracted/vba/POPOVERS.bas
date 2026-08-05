Attribute VB_Name = "POPOVERS"
#If VBA7 Then
    Private Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
    Private Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If ' ============================================================
'   PULSE � animaci�n al pulsar bot�n
' ============================================================
Sub AnimarBoton(btn As Shape)

    Dim i As Integer

    For i = 1 To 4
        btn.Glow.Radius = 5 + (i * 2)
        DoEvents
        Sleep 10
    Next i

    For i = 4 To 1 Step -1
        btn.Glow.Radius = 5 + (i * 2)
        DoEvents
        Sleep 10
    Next i

    btn.Glow.Radius = 5

End Sub



' ============================================================
'   GENERAR LISTADO DE TOOLTIPS
' ============================================================
Sub GenerarListadoTooltips()

    Dim sh As Worksheet: Set sh = Sheets("TOOLTIPS")
    Dim i As Long

    sh.Range("C1:I200").ClearContents

    ' === 20 popovers con 2 botones ===
    For i = 1 To 20
        sh.Cells(i, "C").Value = "POPOVER_" & Format(i, "00")
        sh.Cells(i, "D").Value = ""
        sh.Cells(i, "E").Value = "Bot�n 1"
        sh.Cells(i, "F").Value = "Bot�n 2"
        sh.Cells(i, "G").Value = ""
        sh.Cells(i, "H").Value = ""
        sh.Cells(i, "I").Value = ""
    Next i

    ' === 20 popovers con 3 botones ===
    For i = 21 To 40
        sh.Cells(i, "C").Value = "POPOVER_" & Format(i, "00")
        sh.Cells(i, "D").Value = ""
        sh.Cells(i, "E").Value = "Bot�n 1"
        sh.Cells(i, "F").Value = "Bot�n 2"
        sh.Cells(i, "G").Value = "Bot�n 3"
        sh.Cells(i, "H").Value = ""
        sh.Cells(i, "I").Value = ""
    Next i

    MsgBox "TOOLTIPS generados correctamente.", vbInformation, "DM CAR"

End Sub
Sub MostrarPopover(nombrePopover As String, mensaje As String, _
                   boton1 As String, boton2 As String, boton3 As String)

    Dim ws As Worksheet
    Dim shp As Shape
    Dim x As Single
    Dim y As Single

    Set ws = ActiveSheet

    '---------------------------------------
    ' BORRAR POPOVER ANTERIOR
    '---------------------------------------
    On Error Resume Next
    ws.Shapes(nombrePopover).Delete
    ws.Shapes(nombrePopover & "_BTN1").Delete
    ws.Shapes(nombrePopover & "_BTN2").Delete
    ws.Shapes(nombrePopover & "_BTN3").Delete
    On Error GoTo 0

    '---------------------------------------
    ' POSICI�N
    '---------------------------------------
    x = ws.Range("H10").Left - 500
    y = ws.Range("H10").Top + 50

    '---------------------------------------
    ' CREAR POPOVER
    '---------------------------------------
    Set shp = ws.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        x, y, 460, 220)

    With shp
        .name = nombrePopover

        .Fill.ForeColor.RGB = RGB(0, 0, 0)        ' NEGRO
        .Fill.Transparency = 0.2                 ' 10% TRANSPARENCIA

        .Line.Visible = msoFalse

        .Glow.Radius = 40
        .Glow.Color.RGB = RGB(0, 120, 114)
        .Glow.Transparency = 0.6

        '-----------------------------------
        ' TEXTO
        '-----------------------------------
        .TextFrame.Characters.Text = mensaje

        .TextFrame.HorizontalAlignment = xlHAlignCenter
        .TextFrame.VerticalAlignment = xlVAlignCenter

        .TextFrame.MarginLeft = 15
        .TextFrame.MarginRight = 15
        .TextFrame.MarginTop = 20
        .TextFrame.MarginBottom = 70

        With .TextFrame.Characters.Font
            .name = "Lucida Console"
            .Size = 32
            .Bold = False
            .Color = RGB(205, 205, 205)
        End With
    End With

    '---------------------------------------
    ' CREAR BOTONES
    '---------------------------------------
    Call CrearBotonPopover(ws, nombrePopover, boton1, 1)

    If boton2 <> "" Then
        Call CrearBotonPopover(ws, nombrePopover, boton2, 2)
    End If

    If boton3 <> "" Then
        Call CrearBotonPopover(ws, nombrePopover, boton3, 3)
    End If

End Sub

Sub CrearBotonPopover(ws As Worksheet, pop As String, _
                      Titulo As String, indice As Integer, _
                      Optional totalButtons As Integer = 1, _
                      Optional position As String = "bottom", _
                      Optional spacing As Single = 12, _
                      Optional widthBtn As Single = 140, _
                      Optional heightBtn As Single = 36, _
                      Optional autoWidth As Boolean = True, _
                      Optional offsetX As Single = 0, _
                      Optional offsetY As Single = 0)

    If Titulo = "" Then Exit Sub
    If indice < 1 Then Exit Sub
    If totalButtons < 1 Then totalButtons = 1
    If indice > totalButtons Then Exit Sub

    Dim shp As Shape
    Dim btn As Shape
    Dim LeftPos As Single
    Dim TopPos As Single
    Dim anchoBoton As Single
    Dim altoBoton As Single
    Dim totalWidth As Single
    Dim i As Integer
    Dim textLen As Long
    Dim extraWidth As Single

    On Error GoTo ErrHandler
    Set shp = ws.Shapes(pop)

    '---------------------------------------
    ' DIMENSIONES
    '---------------------------------------
    textLen = Len(Titulo)
    If autoWidth Then
        ' Ajuste simple: base + 4 puntos por car�cter (ajusta si quieres otro ratio)
        extraWidth = textLen * 4
        anchoBoton = widthBtn + extraWidth
    Else
        anchoBoton = widthBtn
    End If
    altoBoton = heightBtn

    '---------------------------------------
    ' CALCULAR ANCHO TOTAL DEL GRUPO PARA CENTRADO
    '---------------------------------------
    totalWidth = (anchoBoton * totalButtons) + (spacing * (totalButtons - 1))

    '---------------------------------------
    ' POSICI�N VERTICAL BASE
    '---------------------------------------
    Select Case LCase(position)
        Case "bottom"
            TopPos = shp.Top + shp.Height - 60   ' debajo del pop
        Case "top"
            TopPos = shp.Top - altoBoton - 6    ' encima del pop
        Case "left"
            TopPos = shp.Top + (shp.Height - altoBoton) / 2
        Case "right"
            TopPos = shp.Top + (shp.Height - altoBoton) / 2
        Case "center"
            TopPos = shp.Top + (shp.Height - altoBoton) / 2
        Case Else
            TopPos = shp.Top + shp.Height + 6
    End Select

    '---------------------------------------
    ' POSICI�N HORIZONTAL: centrar grupo y desplazar seg�n �ndice
    '---------------------------------------
    Select Case LCase(position)
        Case "bottom", "top", "center"
            ' Centrar el grupo respecto al ancho del pop
            LeftPos = shp.Left + (shp.Width - totalWidth) / 2 + (indice - 1) * (anchoBoton + spacing)
        Case "left"
            ' Colocar a la izquierda del pop, apilados verticalmente si totalButtons>1
            LeftPos = shp.Left - totalWidth - 6 + (indice - 1) * (anchoBoton + spacing)
        Case "right"
            ' Colocar a la derecha del pop
            LeftPos = shp.Left + shp.Width + 6 + (indice - 1) * (anchoBoton + spacing)
        Case Else
            LeftPos = shp.Left + (shp.Width - totalWidth) / 2 + (indice - 1) * (anchoBoton + spacing)
    End Select

    ' Ajustes finales por offset
    LeftPos = LeftPos + offsetX
    TopPos = TopPos + offsetY

    '---------------------------------------
    ' CREAR BOT�N
    '---------------------------------------
    Set btn = ws.Shapes.AddShape(msoShapeRoundedRectangle, LeftPos, TopPos, anchoBoton, altoBoton)
    btn.name = pop & "_BTN" & CStr(indice)

    With btn
        .Fill.ForeColor.RGB = RGB(0, 0, 0)
        .Fill.Transparency = 0.15
        .Line.Visible = msoTrue
        .Line.ForeColor.RGB = RGB(255, 255, 255)
        .Line.Weight = 0#
        On Error Resume Next
        .Glow.Radius = 10
        .Glow.Color.RGB = RGB(0, 120, 114)
        .Glow.Transparency = 0.6
        On Error GoTo ErrHandler
        .Adjustments.Item(1) = 0.5

        ' Texto
        .TextFrame.Characters.Text = Titulo
        .TextFrame.HorizontalAlignment = xlHAlignCenter
        .TextFrame.VerticalAlignment = xlVAlignCenter

        With .TextFrame.Characters.Font
            .name = "Calibri Light"
            .Size = 22
            .Bold = True
            .Color = RGB(205, 205, 205)
        End With

        ' Nombre de la macro que se ejecutar� al pulsar (por defecto: pop_BTNn)
        .OnAction = pop & "_BTN" & CStr(indice)
    End With

    Exit Sub

ErrHandler:
    ' Si falla por shape no encontrado o por permisos, salir silenciosamente
    ' Para depuraci�n, descomenta la siguiente l�nea:
    ' MsgBox "Error CrearBotonPopover: " & Err.Number & " - " & Err.Description, vbExclamation
    Exit Sub

End Sub




Sub MostrarPopover_CAMARA_CONFIRMAR()

    Call CrearPopover( _
        "POPOVER_CAMARA_CONFIRMAR", _
        "PREPARAR C�MARA PARA FOTOGRAFIAR EL VEH�CULO" & vbCrLf & vbCrLf & _
        "Seleccione el tipo de fotos que va a tomar:" & vbCrLf & _
        "- INICIALES (antes de reparar)" & vbCrLf & _
        "- FINALES (despu�s de reparar)", _
        "INICIALES", "FINALES", "CANCELAR")

End Sub
Sub MostrarPopover_CAMARA_ESPERA()

    Call CrearPopover( _
        "POPOVER_CAMARA_ESPERA", _
        "HAGA LAS FOTOS DESDE EL M�VIL" & vbCrLf & vbCrLf & _
        "Cuando haya terminado, cierre la c�mara" & vbCrLf & _
        "y pulse ACEPTAR para guardarlas en DM CAR.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_CAMARA_OK()

    Call CrearPopover( _
        "POPOVER_CAMARA_OK", _
        "FOTOS GUARDADAS Y VINCULADAS CORRECTAMENTE", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_FOTOS_NO_ENCONTRADAS_INICIALES()

    Call CrearPopover( _
        "POPOVER_FOTOS_NO_ENCONTRADAS_INICIALES", _
        "NO SE ENCONTRARON FOTOS INICIALES PARA ESTE VEH�CULO" & vbCrLf & vbCrLf & _
        "Tome las fotos antes de reparar usando el bot�n C�MARA.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_FOTOS_NO_ENCONTRADAS_FINALES()

    Call CrearPopover( _
        "POPOVER_FOTOS_NO_ENCONTRADAS_FINALES", _
        "NO SE ENCONTRARON FOTOS FINALES PARA ESTE VEH�CULO" & vbCrLf & vbCrLf & _
        "Tome las fotos despu�s de reparar usando el bot�n C�MARA.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_FOTOS_FILA_INVALIDA()

    Call CrearPopover( _
        "POPOVER_FOTOS_FILA_INVALIDA", _
        "SELECCIONE UNA FILA V�LIDA PARA TOMAR FOTOS" & vbCrLf & vbCrLf & _
        "Debe seleccionar el veh�culo correspondiente en la tabla.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_FOTOS_DATOS_INVALIDOS()

    Call CrearPopover( _
        "POPOVER_FOTOS_DATOS_INVALIDOS", _
        "FALTAN DATOS PARA TOMAR FOTOS" & vbCrLf & vbCrLf & _
        "Compruebe que la matr�cula y el n�mero de presupuesto" & vbCrLf & _
        "est�n correctamente introducidos.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_EMAIL_CONFIRMAR()

    Call CrearPopover( _
        "POPOVER_EMAIL_CONFIRMAR", _
        "�DESEA ENVIAR ESTA FACTURA POR EMAIL AL CLIENTE?", _
        "ENVIAR", "CANCELAR", "")

End Sub
Sub MostrarPopover_EMAIL_SIN_CORREO()

    Call CrearPopover( _
        "POPOVER_EMAIL_SIN_CORREO", _
        "NO SE ENCONTR� UN EMAIL PARA ESTE CLIENTE" & vbCrLf & vbCrLf & _
        "A��dalo en la BASE DE DATOS antes de enviar.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_EMAIL_PDF_NO_GENERADO()

    Call CrearPopover( _
        "POPOVER_EMAIL_PDF_NO_GENERADO", _
        "NO SE PUDO GENERAR EL PDF DE ESTA FACTURA" & vbCrLf & vbCrLf & _
        "Int�ntelo de nuevo o revise la configuraci�n.", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_EMAIL_OK()

    Call CrearPopover( _
        "POPOVER_EMAIL_OK", _
        "FACTURA ENVIADA CORRECTAMENTE POR EMAIL", _
        "ACEPTAR", "", "")

End Sub
Sub MostrarPopover_EMAIL_ERROR()

    Call CrearPopover( _
        "POPOVER_EMAIL_ERROR", _
        "NO SE PUDO ENVIAR EL EMAIL" & vbCrLf & vbCrLf & _
        "Compruebe la conexi�n o la configuraci�n de Gmail.", _
        "ACEPTAR", "", "")

End Sub

Sub BuscarDuplicadosPopover()

    Dim C As VBIDE.VBComponent
    Dim L As Long
    Dim linea As String

    Debug.Print "=== BUSCANDO DUPLICADOS DE BOTONES DE POPOVER ==="

    For Each C In ThisWorkbook.VBProject.VBComponents
        For L = 1 To C.CodeModule.CountOfLines
            linea = Trim(C.CodeModule.Lines(L, 1))

            If InStr(1, linea, "Sub POPOVER_", vbTextCompare) > 0 Then
                Debug.Print C.name & "  ?  " & linea
            End If
        Next L
    Next C

    Debug.Print "=== FIN ==="

End Sub

