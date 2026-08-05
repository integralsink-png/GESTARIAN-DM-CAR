Attribute VB_Name = "MOD_FORMS"
Option Explicit

Private Const URL_FORMS As String = _
"https://docs.google.com/forms/d/e/1FAIpQLSc1DLLIm21UfCxtqa6IKJr8TNShC3j-UZeOCp-OyFtxiX4Lig/viewform?usp=pp_url&entry.1326452726="

'=================================================
' CITAS
'=================================================

Public Sub FotosCita()

    Dim Matricula As String

    Matricula = _
        UCase(Trim( _
        Sheets("CITAS") _
        .Cells(ActiveCell.Row, "F") _
        .Value))

    If Matricula = "" Then

        MsgBox _
        "No hay matr�cula seleccionada.", _
        vbExclamation

        Exit Sub

    End If

    ThisWorkbook.FollowHyperlink _
        URL_FORMS & Matricula

End Sub

'=================================================
' REPARACIONES
'=================================================

Public Sub FotosReparacion()

    Dim Matricula As String

    Matricula = _
        UCase(Trim( _
        Sheets("REPARACIONES") _
        .Cells(ActiveCell.Row, "C") _
        .Value))

    If Matricula = "" Then

        MsgBox _
        "No hay matr�cula seleccionada.", _
        vbExclamation

        Exit Sub

    End If

    ThisWorkbook.FollowHyperlink _
        URL_FORMS & Matricula

End Sub

'=================================================
' TRABAJOS
'=================================================

Public Sub FotosTrabajo()

    Dim Matricula As String

    On Error Resume Next

    Matricula = _
        UCase(Trim( _
        Sheets("TRABAJOS") _
        .Shapes("matricula") _
        .TextFrame.Characters.Text))

    On Error GoTo 0

    If Matricula = "" Then

        MsgBox _
        "No hay matr�cula.", _
        vbExclamation

        Exit Sub

    End If

    ThisWorkbook.FollowHyperlink _
        URL_FORMS & Matricula

End Sub

