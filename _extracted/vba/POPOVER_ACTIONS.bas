Attribute VB_Name = "POPOVER_ACTIONS"
Option Explicit

' ============================================================
' MAPA DE POPOVERS ? HOJAS DONDE EXISTEN
' ============================================================
Function HojaDePopover(pop As String) As String

    Select Case UCase(pop)

        ' PRESUPUESTOS
        Case "POPOVER_01", "POPOVER_IVA_0", "POPOVER_DUPLICADO", "POPOVER_IMPRIMIR"
            HojaDePopover = "PRESUPUESTOS"

        ' REGISTRO PRESUPUESTOS
        Case "POPOVER_CITA_OK", "POPOVER_ESTADO_CITA", "POPOVER_CITA_DUPLICADA"
            HojaDePopover = "REGISTRO PRESUPUESTOS"

        ' CITAS
        Case "POPOVER_ENV_OK", "POPOVER_ENV_DUP", "POPOVER_ENV_ERR"
            HojaDePopover = "CITAS"

        ' REPARACIONES
        Case "POPOVER_ESTADO_INCORRECTO"
            HojaDePopover = "REPARACIONES"

        ' FACTURAS
        Case "POPOVER_FACTURA_OK", "POPOVER_FACTIRA_DUPLICADA", _
             "POPOVER_FACTURA_PDF_GUARDADO", "POPOVER_FACTURA_ABONAR", _
             "POPOVER_IMPRIMIR"
            HojaDePopover = "FACTURAS"

        Case Else
            HojaDePopover = ActiveSheet.name

    End Select

End Function

' ============================================================
' CERRAR POPOVER EN SU HOJA REAL
' ============================================================
Sub CerrarPopover(pop As String)

    Dim ws As Worksheet
    Dim shp As Shape
    Dim obj As OLEObject
    Dim prefijo As String

    Set ws = ThisWorkbook.Worksheets(HojaDePopover(pop))
    prefijo = UCase(pop)

    On Error Resume Next

    ' Borrar shapes
    For Each shp In ws.Shapes
        If InStr(1, UCase(shp.name), prefijo) > 0 Then shp.Delete
    Next shp

    ' Borrar OLEObjects
    For Each obj In ws.OLEObjects
        If InStr(1, UCase(obj.name), prefijo) > 0 Then obj.Delete
    Next obj

    On Error GoTo 0

End Sub

' ============================================================
' EJECUTAR ACCI�N Y CERRAR POPOVER
' ============================================================
Sub EjecutarYCerrar(pop As String, Optional hojaDestino As String = "")

    ' 1. Cerrar popover en su hoja
    CerrarPopover pop

    ' 2. Ejecutar acci�n (si hay hoja destino)
    If hojaDestino <> "" Then Sheets(hojaDestino).Activate

End Sub

' ============================================================
' BOTONES DE TODOS LOS POPOVERS
' ============================================================

' PRESUPUESTOS
Sub POPOVER_01_BTN1(): EjecutarYCerrar "POPOVER_01", "REGISTRO PRESUPUESTOS": End Sub
Sub POPOVER_01_BTN2(): EjecutarYCerrar "POPOVER_01": End Sub

Sub POPOVER_IVA_0_BTN1(): EjecutarYCerrar "POPOVER_IVA_0": End Sub
Sub POPOVER_DUPLICADO_BTN1(): EjecutarYCerrar "POPOVER_DUPLICADO": End Sub

' REGISTRO PRESUPUESTOS
Sub POPOVER_CITA_OK_BTN1(): EjecutarYCerrar "POPOVER_CITA_OK", "CITAS": End Sub
Sub POPOVER_CITA_OK_BTN2(): EjecutarYCerrar "POPOVER_CITA_OK": End Sub

Sub POPOVER_ESTADO_CITA_BTN1(): EjecutarYCerrar "POPOVER_ESTADO_CITA": End Sub
Sub POPOVER_CITA_DUPLICADA_BTN1(): EjecutarYCerrar "POPOVER_CITA_DUPLICADA", "CITAS": End Sub
Sub POPOVER_CITA_DUPLICADA_BTN2(): EjecutarYCerrar "POPOVER_CITA_DUPLICADA": End Sub

' CITAS
Sub POPOVER_ENV_OK_BTN1(): EjecutarYCerrar "POPOVER_ENV_OK", "REPARACIONES": End Sub
Sub POPOVER_ENV_OK_BTN2(): EjecutarYCerrar "POPOVER_ENV_OK": End Sub

Sub POPOVER_ENV_DUP_BTN1(): EjecutarYCerrar "POPOVER_ENV_DUP", "REPARACIONES": End Sub
Sub POPOVER_ENV_DUP_BTN2(): EjecutarYCerrar "POPOVER_ENV_DUP": End Sub

Sub POPOVER_ENV_ERR_BTN1(): EjecutarYCerrar "POPOVER_ENV_ERR": End Sub

' REPARACIONES
Sub POPOVER_ESTADO_INCORRECTO_BTN1(): EjecutarYCerrar "POPOVER_ESTADO_INCORRECTO": End Sub

' FACTURAS
Sub POPOVER_FACTURA_OK_BTN1(): EjecutarYCerrar "POPOVER_FACTURA_OK", "REGISTRO FACTURAS": End Sub
Sub POPOVER_FACTURA_OK_BTN2(): EjecutarYCerrar "POPOVER_FACTURA_OK": End Sub

Sub POPOVER_FACTIRA_DUPLICADA_BTN1(): EjecutarYCerrar "POPOVER_FACTIRA_DUPLICADA", "REGISTRO FACTURAS": End Sub
Sub POPOVER_FACTIRA_DUPLICADA_BTN2(): EjecutarYCerrar "POPOVER_FACTIRA_DUPLICADA": End Sub

Sub POPOVER_FACTURA_PDF_GUARDADO_BTN1(): EjecutarYCerrar "POPOVER_FACTURA_PDF_GUARDADO": End Sub

Sub POPOVER_FACTURA_ABONAR_BTN1(): EjecutarYCerrar "POPOVER_FACTURA_ABONAR": End Sub




