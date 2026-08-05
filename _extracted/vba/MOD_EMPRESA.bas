Attribute VB_Name = "MOD_EMPRESA"

Option Explicit

'=========================================================
' CARGAR DATOS DE EMPRESA EN FACTURA
'=========================================================
Public Sub CargarDatosEmpresaFactura()

    Dim shDatos As Worksheet
    Dim shFac As Worksheet

    Set shDatos = Sheets("MIS DATOS")
    Set shFac = Sheets("FACTURAS")

    With shFac

        .Range("I3").Value = shDatos.Range("F5").Value
        .Range("I4").Value = "CIF: " & shDatos.Range("F6").Value
        .Range("I5").Value = shDatos.Range("F7").Value

        .Range("I6").Value = _
            "CP: " & shDatos.Range("F8").Value & _
            " " & shDatos.Range("F9").Value & _
            " " & shDatos.Range("F10").Value

        .Range("I7").Value = shDatos.Range("F11").Value

    End With

End Sub

'=========================================================
' CARGAR DATOS DE EMPRESA EN PRESUPUESTO
'=========================================================
Public Sub CargarDatosEmpresaPresupuesto()

    Dim shDatos As Worksheet
    Dim shPre As Worksheet

    Set shDatos = Sheets("MIS DATOS")
    Set shPre = Sheets("PRESUPUESTOS")

    With shPre

        .Range("I3").Value = shDatos.Range("F5").Value
        .Range("I4").Value = "CIF: " & shDatos.Range("F6").Value
        .Range("I5").Value = shDatos.Range("F7").Value

        .Range("I6").Value = _
            "CP: " & shDatos.Range("F8").Value & _
            " " & shDatos.Range("F9").Value & _
            " " & shDatos.Range("F10").Value

        .Range("I7").Value = shDatos.Range("F11").Value

    End With

End Sub

