Attribute VB_Name = "MOD_INDEXADOR"
Option Explicit

'=========================================================
' INDEXAR TODO
'=========================================================

Public Sub IndexarImagenes()

    Application.ScreenUpdating = False

    Call IndexarCitas
    Call IndexarReparaciones

    Application.ScreenUpdating = True

End Sub

'=========================================================
' CITAS
'=========================================================

Private Sub IndexarCitas()

    Dim ws As Worksheet
    Dim UltFila As Long
    Dim fila As Long

    Dim Matricula As String

    Set ws = Sheets("CITAS")

    UltFila = _
        ws.Cells(ws.Rows.Count, "F") _
        .End(xlUp).Row

    For fila = 5 To UltFila

        Matricula = _
            UCase(Trim( _
            ws.Cells(fila, "F").Value))

        If Matricula <> "" Then

            If HayFotos(Matricula) Then

                ws.Cells(fila, "E").Value = "SI"

            Else

                ws.Cells(fila, "E").Value = ""

            End If

        Else

            ws.Cells(fila, "E").Value = ""

        End If

    Next fila

End Sub

'=========================================================
' REPARACIONES
'=========================================================

Private Sub IndexarReparaciones()

    Dim ws As Worksheet
    Dim UltFila As Long
    Dim fila As Long

    Dim Matricula As String

    Set ws = Sheets("REPARACIONES")

    UltFila = _
        ws.Cells(ws.Rows.Count, "C") _
        .End(xlUp).Row

    For fila = 5 To UltFila

        Matricula = _
            UCase(Trim( _
            ws.Cells(fila, "C").Value))

        If Matricula <> "" Then

            If HayFotos(Matricula) Then

                ws.Cells(fila, "G").Value = "SI"

            Else

                ws.Cells(fila, "G").Value = ""

            End If

        Else

            ws.Cells(fila, "G").Value = ""

        End If

    Next fila

End Sub

'=========================================================
' ACTUALIZAR UNA MATR�CULA
'=========================================================

Public Sub ActualizarMatricula( _
ByVal Matricula As String)

    Dim ws As Worksheet
    Dim fila As Long
    Dim UltFila As Long

    Matricula = UCase(Trim(Matricula))

    If Matricula = "" Then Exit Sub

    '---------------------------
    ' CITAS
    '---------------------------

    Set ws = Sheets("CITAS")

    UltFila = _
        ws.Cells(ws.Rows.Count, "F") _
        .End(xlUp).Row

    For fila = 5 To UltFila

        If UCase(Trim( _
           ws.Cells(fila, "F").Value)) = Matricula Then

            If HayFotos(Matricula) Then

                ws.Cells(fila, "E").Value = "SI"

            Else

                ws.Cells(fila, "E").Value = ""

            End If

        End If

    Next fila

    '---------------------------
    ' REPARACIONES
    '---------------------------

    Set ws = Sheets("REPARACIONES")

    UltFila = _
        ws.Cells(ws.Rows.Count, "C") _
        .End(xlUp).Row

    For fila = 5 To UltFila

        If UCase(Trim( _
           ws.Cells(fila, "C").Value)) = Matricula Then

            If HayFotos(Matricula) Then

                ws.Cells(fila, "G").Value = "SI"

            Else

                ws.Cells(fila, "G").Value = ""

            End If

        End If

    Next fila

End Sub

