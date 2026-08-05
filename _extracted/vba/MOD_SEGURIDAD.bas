Attribute VB_Name = "MOD_SEGURIDAD"
Option Explicit

Public Sub ProtegerEstructuraLibro()

    ThisWorkbook.Protect _
        Password:="1234", _
        Structure:=True, _
        Windows:=False

    MsgBox _
    "Estructura protegida.", _
    vbInformation

End Sub

Public Sub DesprotegerEstructuraLibro()

    ThisWorkbook.Unprotect Password:="1234"

End Sub

