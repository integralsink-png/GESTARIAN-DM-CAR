Attribute VB_Name = "BOTONfacturas"
Private Sub CambiarEstado( _
        ByVal NombreShape As String, _
        ByVal Texto As String, _
        ByVal Estado As EstadoSistema)

    Dim sp As Shape

    On Error Resume Next
    Set sp = Sheets("MIS DATOS").Shapes(NombreShape)
    On Error GoTo 0

    If sp Is Nothing Then Exit Sub

    With sp

        .TextFrame.Characters.Text = Texto

        .Fill.Visible = msoFalse
        .Line.Weight = 1.75

        Select Case Estado

            Case EstadoVerde

                .Line.ForeColor.RGB = RGB(153, 255, 51)
                .Glow.Color.RGB = RGB(153, 255, 51)

            Case EstadoRojo

                .Line.ForeColor.RGB = RGB(255, 60, 60)
                .Glow.Color.RGB = RGB(255, 60, 60)

            Case EstadoAmarillo

                .Line.ForeColor.RGB = RGB(255, 200, 0)
                .Glow.Color.RGB = RGB(255, 200, 0)

        End Select

        .Glow.Radius = 8
        .Glow.Transparency = 0.35

    End With

End Sub

