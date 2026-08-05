Attribute VB_Name = "MOD_VISOR_V2"
Option Explicit
Public ListaImagenes() As String

Public PosicionActual As Long
Public TotalImagenes As Long

Public VisMatricula As String
Public VisCarpetaActual As String
Public Sub CrearVisorArquitectura()

    Dim sh As Worksheet

    Dim Marco As Shape
    Dim Foto As Shape

    Dim BtnCerrar As Shape
    Dim BtnAnt As Shape
    Dim BtnSig As Shape

    Dim BtnBorrar As Shape
    Dim BtnCarpeta As Shape

    Dim Titulo As Shape
    Dim Contador As Shape

    Dim W As Double
    Dim H As Double

    Dim L As Double
    Dim T As Double

    Set sh = ActiveSheet

    Call CerrarVisor

    '=================================================
    ' TAMA�O VISOR
    '=================================================

    W = 800
    H = 520

    L = ActiveWindow.VisibleRange.Left + _
        (ActiveWindow.VisibleRange.Width - W) / 2

    T = ActiveWindow.VisibleRange.Top + _
        (ActiveWindow.VisibleRange.Height - H) / 2 - 40

    If T < 10 Then T = 10

    '=================================================
    ' MARCO PRINCIPAL
    '=================================================

    Set Marco = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L, T, W, H)

    With Marco

        .name = "VIS_MARCO"

        .Adjustments.Item(1) = 0.05

        .Fill.ForeColor.RGB = RGB(0, 0, 0)

        .Line.ForeColor.RGB = RGB(127, 255, 212)
        .Line.Weight = 0.5

        With .Glow

            .Color.RGB = RGB(64, 224, 208)
            .Radius = 10
            .Transparency = 0.6

        End With

    End With

    '=================================================
    ' FOTO
    '=================================================

    Set Foto = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + 15, _
        T + 35, _
        W - 30, _
        H - 105)

    With Foto

        .name = "VIS_IMAGEN"

        .Adjustments.Item(1) = 0.08

        .Line.Visible = msoFalse

        .Fill.ForeColor.RGB = RGB(20, 20, 20)

        With .Glow

            .Color.RGB = RGB(255, 255, 255)
            .Radius = 4
            .Transparency = 0.85

        End With

    End With

    '=================================================
    ' TITULO
    '=================================================

    Set Titulo = sh.Shapes.AddTextbox( _
        msoTextOrientationHorizontal, _
        L + 25, _
        T + 8, _
        500, _
        25)

    With Titulo

        .name = "VIS_TITULO"

        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse

        .TextFrame.Characters.Text = "DM CAR"

        With .TextFrame.Characters.Font

            .name = "Calibri light"
            .Size = 18
            .Color = RGB(220, 220, 220)

        End With

    End With

    '=================================================
    ' CONTADOR
    '=================================================

    Set Contador = sh.Shapes.AddTextbox( _
        msoTextOrientationHorizontal, _
        L + W - 130, _
        T + 10, _
        100, _
        25)

    With Contador

        .name = "VIS_CONTADOR"

        .Fill.Visible = msoFalse
        .Line.Visible = msoFalse

        .TextFrame.Characters.Text = "0 / 0"

        With .TextFrame.Characters.Font

            .name = "Calibri light"
            .Size = 16
            .Color = RGB(220, 220, 220)

        End With

    End With

    '=================================================
    ' ANTERIOR
    '=================================================

    Set BtnAnt = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + 15, _
        T + H - 50, _
        100, _
        35)

    FormatearBoton BtnAnt, "<<", "VIS_BTN_ANT"
    BtnAnt.OnAction = "VisorAnterior"

    '=================================================
    ' SIGUIENTE
    '=================================================

    Set BtnSig = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + 125, _
        T + H - 50, _
        100, _
        35)

    FormatearBoton BtnSig, ">>", "VIS_BTN_SIG"
BtnSig.OnAction = "VisorSiguiente"
    '=================================================
    ' BORRAR
    '=================================================

    Set BtnBorrar = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + W - 330, _
        T + H - 50, _
        100, _
        35)

    FormatearBoton BtnBorrar, "BORRAR", "VIS_BTN_BORRAR"
BtnBorrar.OnAction = "VisorEliminarFoto"
    '=================================================
    ' CARPETA
    '=================================================

    Set BtnCarpeta = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + W - 220, _
        T + H - 50, _
        100, _
        35)

    FormatearBoton BtnCarpeta, "CARPETA", "VIS_BTN_CARPETA"
BtnCarpeta.OnAction = "VisorAbrirCarpeta"
    '=================================================
    ' CERRAR
    '=================================================

    Set BtnCerrar = sh.Shapes.AddShape( _
        msoShapeRoundedRectangle, _
        L + W - 110, _
        T + H - 50, _
        90, _
        35)

    FormatearBoton BtnCerrar, "SALIR", "VIS_BTN_CERRAR"
BtnCerrar.OnAction = "CerrarVisor"
End Sub

Private Sub FormatearBoton( _
    ByVal shp As Shape, _
    ByVal Texto As String, _
    ByVal Nombre As String)

    With shp

        .name = Nombre

        .Adjustments.Item(1) = 0.2

        .Fill.ForeColor.RGB = RGB(0, 0, 0)

        .Line.ForeColor.RGB = RGB(127, 255, 212)
        .Line.Weight = 0.5

        .TextFrame.Characters.Text = Texto

        With .TextFrame.Characters.Font

            .name = "Calibri light"
            .Size = 14
            .Bold = False
            .Color = RGB(220, 220, 220)

        End With

        With .Glow

            .Color.RGB = RGB(64, 224, 208)
            .Radius = 5
            .Transparency = 0.7

        End With

    End With

End Sub
Public Sub CerrarVisor()

    Dim sh As Worksheet
    Dim sp As Shape

    Set sh = ActiveSheet

    On Error Resume Next

    For Each sp In sh.Shapes

        If Left(sp.name, 4) = "VIS_" Then
            sp.Delete
        End If

    Next sp

    On Error GoTo 0

End Sub

'=================================================
' ABRIR VISOR
'=================================================

Public Sub AbrirVisorFotos( _
    ByVal Matricula As String)

    VisMatricula = _
        UCase(Trim(Matricula))

    Call CargarImagenesMatricula

    If TotalImagenes = 0 Then

        MsgBox _
        "No existen fotograf�as para " & _
        VisMatricula, _
        vbInformation

        Exit Sub

    End If

    Call CrearVisorArquitectura

    Call MostrarFotoActual

End Sub

'=================================================
' CARGAR IMAGENES
'=================================================

Public Sub CargarImagenesMatricula()

    Dim ruta As String
    Dim archivo As String

    Dim Contador As Long

   ruta = ObtenerCarpetaMatricula(VisMatricula)

    VisCarpetaActual = ruta

    TotalImagenes = 0
    PosicionActual = 0

    If Dir(ruta, vbDirectory) = "" Then Exit Sub

    ReDim ListaImagenes(1 To 1)

    archivo = Dir(ruta & "*.jpg")

    Do While archivo <> ""

        Contador = Contador + 1

        ReDim Preserve _
        ListaImagenes(1 To Contador)

        ListaImagenes(Contador) = _
            ruta & archivo

        archivo = Dir

    Loop

    archivo = Dir(ruta & "*.jpeg")

    Do While archivo <> ""

        Contador = Contador + 1

        ReDim Preserve _
        ListaImagenes(1 To Contador)

        ListaImagenes(Contador) = _
            ruta & archivo

        archivo = Dir

    Loop

    archivo = Dir(ruta & "*.png")

    Do While archivo <> ""

        Contador = Contador + 1

        ReDim Preserve _
        ListaImagenes(1 To Contador)

        ListaImagenes(Contador) = _
            ruta & archivo

        archivo = Dir

    Loop

    archivo = Dir(ruta & "*.bmp")

    Do While archivo <> ""

        Contador = Contador + 1

        ReDim Preserve _
        ListaImagenes(1 To Contador)

        ListaImagenes(Contador) = _
            ruta & archivo

        archivo = Dir

    Loop

    TotalImagenes = Contador

    If TotalImagenes > 0 Then

        PosicionActual = 1

    End If

End Sub

'=================================================
' MOSTRAR FOTO
'=================================================

Public Sub MostrarFotoActual()

    Dim sh As Worksheet

    Dim spFoto As Shape
    Dim spTitulo As Shape
    Dim spContador As Shape

    Set sh = ActiveSheet

    On Error Resume Next

    Set spFoto = sh.Shapes("VIS_IMAGEN")
    Set spTitulo = sh.Shapes("VIS_TITULO")
    Set spContador = sh.Shapes("VIS_CONTADOR")

    On Error GoTo 0

    If spFoto Is Nothing Then Exit Sub

    If TotalImagenes = 0 Then Exit Sub

    spFoto.Fill.UserPicture _
        ListaImagenes(PosicionActual)

    If Not spTitulo Is Nothing Then

        spTitulo.TextFrame.Characters.Text = _
            VisMatricula

    End If

    If Not spContador Is Nothing Then

        spContador.TextFrame.Characters.Text = _
            PosicionActual & _
            " / " & _
            TotalImagenes

    End If

End Sub

'=================================================
' SIGUIENTE
'=================================================

Public Sub VisorSiguiente()

    If TotalImagenes = 0 Then Exit Sub

    PosicionActual = PosicionActual + 1

    If PosicionActual > TotalImagenes Then

        PosicionActual = 1

    End If

    MostrarFotoActual

End Sub

'=================================================
' ANTERIOR
'=================================================

Public Sub VisorAnterior()

    If TotalImagenes = 0 Then Exit Sub

    PosicionActual = PosicionActual - 1

    If PosicionActual < 1 Then

        PosicionActual = TotalImagenes

    End If

    MostrarFotoActual

End Sub

'=================================================
' ABRIR CARPETA
'=================================================

Public Sub VisorAbrirCarpeta()

    If VisCarpetaActual = "" Then Exit Sub

    If Dir(VisCarpetaActual, vbDirectory) = "" Then Exit Sub

    Shell _
    "explorer.exe """ & _
    VisCarpetaActual & """", _
    vbNormalFocus

End Sub

'=================================================
' ELIMINAR FOTO
'=================================================

Public Sub VisorEliminarFoto()

    Dim ruta As String

    If TotalImagenes = 0 Then Exit Sub

    ruta = _
        ListaImagenes(PosicionActual)

    If MsgBox( _
       "�Eliminar fotograf�a?", _
       vbYesNo + vbQuestion) = vbNo Then Exit Sub

    Kill ruta

    Call CargarImagenesMatricula

    If TotalImagenes = 0 Then

        MsgBox _
        "No quedan fotograf�as.", _
        vbInformation

        Call CerrarVisor

        Exit Sub

    End If

    If PosicionActual > TotalImagenes Then

        PosicionActual = TotalImagenes

    End If

    MostrarFotoActual

End Sub

Public Sub VerImagenesCita()

    Dim Matricula As String

    If ActiveSheet.name <> "CITAS" Then

        MsgBox "Abra esta funci�n desde CITAS.", vbExclamation

        Exit Sub

    End If

    Matricula = _
        UCase(Trim( _
        Cells(ActiveCell.Row, "F").Value))

    If Matricula = "" Then

        MsgBox _
        "No hay matr�cula seleccionada.", _
        vbExclamation

        Exit Sub

    End If

    AbrirVisorFotos Matricula

End Sub
Public Sub VerImagenesReparacion()

    Dim Matricula As String

    If ActiveSheet.name <> "REPARACIONES" Then

        MsgBox _
        "Abra esta funci�n desde REPARACIONES.", _
        vbExclamation

        Exit Sub

    End If

    Matricula = _
        UCase(Trim( _
        Cells(ActiveCell.Row, "C").Value))

    If Matricula = "" Then

        MsgBox _
        "No hay matr�cula seleccionada.", _
        vbExclamation

        Exit Sub

    End If

    AbrirVisorFotos Matricula

End Sub
Public Sub VerImagenesTrabajo()

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
        "No hay matr�cula seleccionada.", _
        vbExclamation

        Exit Sub

    End If

    AbrirVisorFotos Matricula

End Sub

