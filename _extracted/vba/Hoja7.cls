VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "Hoja7"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Private Sub Worksheet_Change(ByVal Target As Range)

    Dim cel As Range
    Dim fila As Long
    Dim valH As Variant, valI As Variant
    Dim resultado As Double
    Dim shp As Shape
    Dim txt As String
    Dim f As Date

    On Error GoTo Salir
    Application.EnableEvents = False

    ' 1) CÁLCULO AUTOMÁTICO H*I ? J (H20:I37)
    If Not Intersect(Target, Me.Range("H20:I37")) Is Nothing Then
        For Each cel In Intersect(Target, Me.Range("H20:I37"))
            fila = cel.Row
            valH = Me.Cells(fila, "H").Value
            valI = Me.Cells(fila, "I").Value
            If IsNumeric(valH) And IsNumeric(valI) And valH <> "" And valI <> "" Then
                resultado = CDbl(valH) * CDbl(valI)
                Me.Cells(fila, "J").Value = resultado
                Me.Cells(fila, "J").NumberFormat = "0.00"
            Else
                Me.Cells(fila, "J").ClearContents
            End If
        Next cel
    End If
    '========================================================
    ' 2) GESTIÓN FECHA ENTRADA (J9)
    '========================================================
    If Intersect(Target, Me.Range("J9")) Is Nothing Then GoTo Salir

    Set shp = Me.Shapes("SHAPE_FECHA_ENTRADA_PRESUPUESTO")

    txt = Trim(Me.Range("J9").Value)

    '========================================================
    ' J9 VACÍA
    '========================================================
    If txt = "" Then

        Me.Range("J9").Interior.Color = RGB(0, 180, 0)

        shp.TextFrame2.TextRange.Text = "RELLENE FECHA EN LA CELDA VERDE"

        GoTo Salir

    End If

    '========================================================
    ' FECHA VÁLIDA
    '========================================================
    If IsDate(txt) Then

        f = CDate(txt)

        Me.Range("J9").Value = f
        Me.Range("J9").NumberFormat = "dd/mm/yyyy"

        ' Fondo blanco al registrar fecha
        Me.Range("J9").Interior.Color = RGB(255, 255, 255)

        ' SOLO CAMBIAR TEXTO DEL OBJETO
        shp.TextFrame2.TextRange.Text = "FECHA REGISTRADA"

    Else

        MsgBox _
        "Formato de fecha no válido. Use DD/MM/AAAA.", _
        vbExclamation, "DM CAR"

        Me.Range("J9").ClearContents
        Me.Range("J9").Interior.Color = RGB(0, 180, 0)

        shp.TextFrame2.TextRange.Text = "RELLENAR"

    End If

Salir:
    Application.EnableEvents = True

End Sub



