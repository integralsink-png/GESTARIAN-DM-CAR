Attribute VB_Name = "MOD_CONFIG"
Option Explicit

'==========================================================
' WBV ENGINE
' MOD_CONFIG
'==========================================================
' Motor central de configuraci�n.
'
' Todas las opciones se buscan por el nombre que aparece
' en la columna D de CONFIGURACION.
'
' Los valores se leen y escriben siempre en la columna E.
'
' Ning�n m�dulo debe acceder directamente a una celda.
'==========================================================

Private Const HOJA_CFG As String = "CONFIGURACION"

'==========================================================
' DEVUELVE LA HOJA CONFIGURACION
'==========================================================

Private Function CFG_Hoja() As Worksheet

    Set CFG_Hoja = ThisWorkbook.Worksheets(HOJA_CFG)

End Function

'==========================================================
' BUSCAR CONCEPTO
'==========================================================

Private Function CFG_Celda(Concepto As String) As Range

    Dim ws As Worksheet
    Dim C As Range

    Set ws = CFG_Hoja

    Set C = ws.Columns("D").Find( _
                What:=Trim(UCase(Concepto)), _
                LookIn:=xlValues, _
                LookAt:=xlWhole, _
                SearchOrder:=xlByRows, _
                MatchCase:=False)

    If Not C Is Nothing Then

        Set CFG_Celda = C.Offset(0, 1)

    End If

End Function

'==========================================================
' LEER CONFIGURACION
'==========================================================

Public Function cfg(Concepto As String) As Variant

    Dim C As Range

    Set C = CFG_Celda(Concepto)

    If C Is Nothing Then

        Err.Raise vbObjectError + 1000, _
                  "MOD_CONFIG", _
                  "No existe el par�metro: " & Concepto

    End If

    cfg = C.Value

End Function

'==========================================================
' ESCRIBIR CONFIGURACION
'==========================================================

Public Sub CFG_Write(Concepto As String, Valor As Variant)

    Dim C As Range

    Set C = CFG_Celda(Concepto)

    If C Is Nothing Then Exit Sub

    C.Value = Valor

End Sub

'==========================================================
' EXISTE PAR�METRO
'==========================================================

Public Function CFG_Existe(Concepto As String) As Boolean

    CFG_Existe = Not CFG_Celda(Concepto) Is Nothing

End Function

'==========================================================
' LIMPIAR PAR�METRO
'==========================================================

Public Sub CFG_Clear(Concepto As String)

    Dim C As Range

    Set C = CFG_Celda(Concepto)

    If Not C Is Nothing Then

        C.ClearContents

    End If

End Sub

'==========================================================
' FECHA ACTUALIZACI�N
'==========================================================

Public Sub CFG_ActualizarFecha(Concepto As String)

    CFG_Write Concepto, Now

End Sub

