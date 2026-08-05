Attribute VB_Name = "pruebas"
Sub ExportarTodo()

    Dim comp As VBIDE.VBComponent
    Dim ruta As String

    ruta = ThisWorkbook.Path & "\EXPORT_VBA\"

    If Dir(ruta, vbDirectory) = "" Then MkDir ruta

    For Each comp In ThisWorkbook.VBProject.VBComponents

        Select Case comp.Type

            Case vbext_ct_StdModule
                comp.Export ruta & comp.name & ".bas"

            Case vbext_ct_ClassModule
                comp.Export ruta & comp.name & ".cls"

            Case vbext_ct_MSForm
                comp.Export ruta & comp.name & ".frm"

            Case vbext_ct_Document
                comp.Export ruta & comp.name & ".cls"

        End Select

    Next comp

    MsgBox "Exportaci�n completada en:" & vbCrLf & ruta

End Sub

Sub AuditoriaObjetosWBV()

    Dim ws As Worksheet
    Dim shp As Shape
    Dim fso As Object
    Dim archivo As Object
    Dim ruta As String
    Dim linea As String

    ruta = ThisWorkbook.Path & "\WBV_AUDITORIA_OBJETOS.txt"

    Set fso = CreateObject("Scripting.FileSystemObject")
    Set archivo = fso.CreateTextFile(ruta, True, True)

    archivo.WriteLine String(150, "=")
    archivo.WriteLine "WBV OBJECT AUDIT"
    archivo.WriteLine "Fecha: " & Now
    archivo.WriteLine "Libro: " & ThisWorkbook.name
    archivo.WriteLine String(150, "=")
    archivo.WriteLine ""

    For Each ws In ThisWorkbook.Worksheets

        archivo.WriteLine ""
        archivo.WriteLine String(120, "-")
        archivo.WriteLine "HOJA: " & ws.name
        archivo.WriteLine String(120, "-")

        For Each shp In ws.Shapes

            linea = ""

            linea = linea & "Nombre=" & shp.name
            linea = linea & " | Tipo=" & ObtenerTipoShape(shp)
            linea = linea & " | Visible=" & shp.Visible
            linea = linea & " | Left=" & Format(shp.Left, "0")
            linea = linea & " | Top=" & Format(shp.Top, "0")
            linea = linea & " | Width=" & Format(shp.Width, "0")
            linea = linea & " | Height=" & Format(shp.Height, "0")

            On Error Resume Next

            linea = linea & " | Texto=" & _
                     Replace(shp.TextFrame2.TextRange.Text, vbCrLf, " ")

            linea = linea & " | Macro=" & shp.OnAction

            linea = linea & " | Locked=" & shp.Locked

            linea = linea & " | Placement=" & shp.Placement

            linea = linea & " | ZOrder=" & shp.ZOrderPosition

            If shp.Hyperlink.Address <> "" Then
                linea = linea & " | Hyperlink=" & shp.Hyperlink.Address
            End If

            On Error GoTo 0

            archivo.WriteLine linea

        Next shp

    Next ws

    archivo.Close

    MsgBox "Auditor�a completada:" & vbCrLf & ruta, vbInformation

End Sub

Private Function ObtenerTipoShape(ByVal shp As Shape) As String

    Select Case shp.Type

        Case msoAutoShape
            ObtenerTipoShape = "AutoShape"

        Case msoPicture
            ObtenerTipoShape = "Imagen"

        Case msoTextBox
            ObtenerTipoShape = "TextBox"

        Case msoFormControl
            ObtenerTipoShape = "ControlFormulario"

        Case msoOLEControlObject
            ObtenerTipoShape = "ActiveX"

        Case msoGroup
            ObtenerTipoShape = "Grupo"

        Case msoChart
            ObtenerTipoShape = "Grafico"

        Case msoLine
            ObtenerTipoShape = "Linea"

        Case msoFreeform
            ObtenerTipoShape = "Freeform"

       
        Case Else
            ObtenerTipoShape = "Tipo_" & shp.Type

    End Select

End Function
