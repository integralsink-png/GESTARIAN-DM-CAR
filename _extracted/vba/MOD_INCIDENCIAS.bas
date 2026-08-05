Attribute VB_Name = "MOD_INCIDENCIAS"
Option Explicit

'=========================================================
' DEVUELVE EL SIGUIENTE ID DE INCIDENCIA
'=========================================================
Public Function SiguienteIDIncidencia() As String

    Dim sh As Worksheet
    Dim UltFila As Long
    Dim i As Long
    Dim Codigo As String
    Dim Numero As Long
    Dim MaxNumero As Long

    Set sh = Sheets("INCIDENCIAS")

    UltFila = sh.Cells(sh.Rows.Count, "B").End(xlUp).Row

    MaxNumero = 0

    For i = 5 To UltFila

        Codigo = Trim(sh.Cells(i, "B").Value)

        If Codigo <> "" Then

            Codigo = Replace(UCase(Codigo), "INC", "")

            If IsNumeric(Codigo) Then

                Numero = CLng(Codigo)

                If Numero > MaxNumero Then
                    MaxNumero = Numero
                End If

            End If

        End If

    Next i

    SiguienteIDIncidencia = "INC" & Format(MaxNumero + 1, "00000")

End Function

'=========================================================
' PREPARAR NUEVA INCIDENCIA
'=========================================================
Public Sub Nueva_Incidencia()

    With Sheets("ALTA INCIDENCIA")

        .Shapes("numeroincidencia").TextFrame2.TextRange.Text = SiguienteIDIncidencia()

        .Range("F5").Value = Now
        .Range("F5").NumberFormat = "dd/mm/yyyy hh:mm"

        .Range("F6:F10").ClearContents

        .Range("F11").Value = "MEDIA"
        .Range("F12").ClearContents
        .Range("F13").Value = "ABIERTA"
        .Range("F14").ClearContents

    End With

End Sub

'=========================================================
' LIMPIAR FORMULARIO
'=========================================================
Public Sub Limpiar_Alta_Incidencia()

    With Sheets("ALTA INCIDENCIA")

        .Range("F6:F10").ClearContents

        .Range("F11").Value = "MEDIA"
        .Range("F12").ClearContents
        .Range("F13").Value = "ABIERTA"
        .Range("F14").ClearContents

    End With

End Sub

'=========================================================
' REGISTRAR INCIDENCIA
'=========================================================
Public Sub Registrar_Incidencia()

    Dim shAlta As Worksheet
    Dim shInc As Worksheet

    Dim fila As Long
    Dim UltFila As Long
    Dim ID As String

    Set shAlta = Sheets("ALTA INCIDENCIA")
    Set shInc = Sheets("INCIDENCIAS")

    ID = shAlta.Shapes("numeroincidencia").TextFrame2.TextRange.Text

    If Trim(shAlta.Range("F6").Value) = "" Then
        MsgBox "Debe indicar la matr�cula.", vbExclamation, "GESTARIAN"
        Exit Sub
    End If

    If Trim(shAlta.Range("F9").Value) = "" Then
        MsgBox "Debe indicar el motivo.", vbExclamation, "GESTARIAN"
        Exit Sub
    End If

    fila = shInc.Cells(shInc.Rows.Count, "B").End(xlUp).Row + 1

    If fila < 5 Then fila = 5

    With shInc

        .Cells(fila, "B").Value = ID
        .Cells(fila, "C").Value = shAlta.Range("F5").Value
        .Cells(fila, "D").Value = shAlta.Range("F7").Value
        .Cells(fila, "E").Value = shAlta.Range("F6").Value
        .Cells(fila, "F").Value = shAlta.Range("F8").Value
        .Cells(fila, "G").Value = shAlta.Range("F9").Value
        .Cells(fila, "H").Value = shAlta.Range("F10").Value
        .Cells(fila, "I").Value = shAlta.Range("F11").Value
        .Cells(fila, "J").Value = shAlta.Range("F12").Value
        .Cells(fila, "K").Value = shAlta.Range("F13").Value
        .Cells(fila, "L").Value = shAlta.Range("F14").Value

        With .Range(.Cells(fila, "B"), .Cells(fila, "L"))
            .Interior.Color = RGB(0, 0, 0)
            .Font.Color = vbWhite
        End With

        Select Case UCase(.Cells(fila, "I").Value)

            Case "ALTA"
                .Cells(fila, "B").Interior.Color = RGB(192, 0, 0)

            Case "MEDIA"
                .Cells(fila, "B").Interior.Color = RGB(255, 192, 0)

            Case "BAJA"
                .Cells(fila, "B").Interior.Color = RGB(0, 112, 192)

        End Select

    End With

    UltFila = shInc.Cells(shInc.Rows.Count, "B").End(xlUp).Row

    With shInc.Sort

        .SortFields.Clear
        .SortFields.Add Key:=shInc.Range("B5:B" & UltFila), _
                        SortOn:=xlSortOnValues, _
                        Order:=xlDescending

        .SetRange shInc.Range("B5:L" & UltFila)
        .Header = xlNo
        .Apply

    End With

    

    MsgBox "Incidencia registrada correctamente.", vbInformation, "GESTARIAN"

    Sheets("INCIDENCIAS").Activate
    Sheets("INCIDENCIAS").Range("B5").Select

    Call Limpiar_Alta_Incidencia
    Call Nueva_Incidencia

End Sub

