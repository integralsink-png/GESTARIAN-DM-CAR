Attribute VB_Name = "MOD_FOTOS"
'=========================================================
' ACTUALIZAR ESTADO DE FOTOS EN REPARACIONES
'=========================================================

Public Sub ActualizarColumnaImagenes()

    Dim sh As Worksheet
    Dim fila As Long

    Dim Matricula As String

    Dim ruta As String

    Dim fso As Object

    Set sh = Sheets("REPARACIONES")
    Set fso = CreateObject("Scripting.FileSystemObject")

    For fila = 5 To sh.Cells(sh.Rows.Count, "A").End(xlUp).Row

        Matricula = Trim(sh.Cells(fila, "C").Value)

        If Matricula = "" Then

            sh.Cells(fila, "G").Value = ""

        Else

            ruta = ObtenerCarpetaMatricula(Matricula)

            If fso.FolderExists(ruta & "ANTERIORES\") And _
               fso.FolderExists(ruta & "POSTERIORES\") Then

                If ContarFotosCarpeta(ruta & "ANTERIORES\") > 0 And _
                   ContarFotosCarpeta(ruta & "POSTERIORES\") > 0 Then

                    sh.Cells(fila, "G").Value = "Anteriores y posteriores"

                ElseIf ContarFotosCarpeta(ruta & "ANTERIORES\") > 0 Then

                    sh.Cells(fila, "G").Value = "Anteriores"

                ElseIf ContarFotosCarpeta(ruta & "POSTERIORES\") > 0 Then

                    sh.Cells(fila, "G").Value = "Posteriores"

                Else

                    sh.Cells(fila, "G").Value = ""

                End If

            ElseIf fso.FolderExists(ruta & "ANTERIORES\") Then

                If ContarFotosCarpeta(ruta & "ANTERIORES\") > 0 Then
                    sh.Cells(fila, "G").Value = "Anteriores"
                Else
                    sh.Cells(fila, "G").Value = ""
                End If

            ElseIf fso.FolderExists(ruta & "POSTERIORES\") Then

                If ContarFotosCarpeta(ruta & "POSTERIORES\") > 0 Then
                    sh.Cells(fila, "G").Value = "Posteriores"
                Else
                    sh.Cells(fila, "G").Value = ""
                End If

            Else

                sh.Cells(fila, "G").Value = ""

            End If

        End If

    Next fila

End Sub
'=========================================================
' CONTAR FOTOS DE UNA CARPETA
'=========================================================

Public Function ContarFotosCarpeta(ByVal ruta As String) As Long

    Dim archivo As String

    Dim Ext As Variant

    Dim formatos

    formatos = Array("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp", "*.heic")

    For Each Ext In formatos

        archivo = Dir(ruta & Ext)

        Do While archivo <> ""

            ContarFotosCarpeta = ContarFotosCarpeta + 1

            archivo = Dir

        Loop

    Next Ext

End Function
