Attribute VB_Name = "MODULO_POPOVERS"
Option Explicit

' Nombre exacto del objeto en la hoja INICIO
Private Const NOMBRE_AVISO_FISCAL As String = "avisos"

' ==============================================================================
' 1. CONTROL DEL AVISO FISCAL (Renombrado para evitar ambig�edades)
' ==============================================================================
Public Sub MostrarAvisoFiscal()
    Dim sh As Worksheet: Set sh = Sheets("INICIO")
    Dim popover As Shape
    
    On Error Resume Next
    Set popover = sh.Shapes(NOMBRE_AVISO_FISCAL)
    
    If Not popover Is Nothing Then
        ' FORZAR APLICACI�N DE ESTILO ANTES DE MOSTRAR
        Call AplicarEstiloVisualAviso
        
        ' Centrado din�mico
        With ActiveWindow.VisibleRange
            popover.Left = .Left + (.Width / 2) - (popover.Width / 2)
            popover.Top = .Top + (.Height / 2) - (popover.Height / 2)
        End With
        
        popover.Visible = msoTrue
        popover.ZOrder msoBringToFront
    End If
    On Error GoTo 0
End Sub



Public Sub AplicarEstiloVisualAviso()
    Dim sh As Worksheet: Set sh = Sheets("INICIO")
    Dim popover As Shape
    
    On Error Resume Next
    Set popover = sh.Shapes(NOMBRE_AVISO_FISCAL)
    
    If Not popover Is Nothing Then
        With popover
            ' 1. Quitamos la l�nea de contorno
            .Line.Visible = msoFalse
            
            ' 2. Forzamos el relleno s�lido negro y luego la transparencia
            .Fill.Visible = msoTrue
            .Fill.ForeColor.RGB = RGB(0, 0, 0)
            .Fill.Transparency = 0.2
            
            ' 3. Forzamos el efecto Glow (Brillo)
            ' Es crucial aplicar el radio y la transparencia juntos
            With .Glow
                .Color.RGB = RGB(127, 255, 212) ' Turquesa
                .Radius = 50
                .Transparency = 0.6
            End With
            
            ' 4. Texto Gris Claro
            With .TextFrame2.TextRange.Font.Fill
                .ForeColor.RGB = RGB(200, 200, 200)
                .Transparency = 0
            End With
            
            ' FORZADO: Refrescamos la visibilidad para que Excel procese el cambio
            .Visible = msoFalse
            .Visible = msoTrue
        End With
    End If
    On Error GoTo 0
End Sub

' ==============================================================================
' 2. L�GICA DE MONITORIZACI�N
' ==============================================================================
Public Sub ActualizarTextoAviso(Texto As String)
    On Error Resume Next
    Sheets("INICIO").Shapes(NOMBRE_AVISO_FISCAL).TextFrame2.TextRange.Text = Texto
    On Error GoTo 0
End Sub

Public Sub AvisoPersistenteTrimestral()
    Dim dia As Integer: dia = Day(Date)
    Dim mes As Integer: mes = Month(Date)
    Dim textoAviso As String: textoAviso = ""
    
    If (dia = 15 Or dia = 20 Or dia = 25 Or dia = 30) And (mes = 3 Or mes = 6 Or mes = 9 Or mes = 12) Then
        textoAviso = "AVISO: Es d�a " & dia & ". Recuerda a�adir las facturas de los gastos en BALANCES para el cierre del pr�ximo trimestre."
    ElseIf (mes = 1 Or mes = 4 Or mes = 7 Or mes = 10) And (dia >= 1 And dia <= 9) Then
        textoAviso = "AVISO: Periodo de cierre trimestral. Aseg�rese de tener todos los gastos registrados en BALANCES."
    ElseIf (mes = 1 Or mes = 4 Or mes = 7 Or mes = 10) And dia = 10 Then
        textoAviso = "El proximo dia 12 se generar� el informe de tus facturas del trimestre y se enviar� autom�ticamente a la gestor�a."
    ElseIf (mes = 1 Or mes = 4 Or mes = 7 Or mes = 10) And dia = 12 Then
        textoAviso = "Informe trimestral de facturas enviado a la gestor�a a las 10:00 AM"
    End If

    If textoAviso <> "" Then
        Call ActualizarTextoAviso(textoAviso)
        Call MostrarAvisoFiscal
         
    End If
End Sub

Public Sub EjecutarMonitorFiscal()
    Call AvisoPersistenteTrimestral
    If Day(Date) = 16 And (Month(Date) Mod 3 = 1) Then
        Call Generar_Informe_IVA_Trimestral
    End If
End Sub

' ==============================================================================
' 3. POPOVERS DIN�MICOS (Originales)
' ==============================================================================
Sub CrearPopover(nombrePopover As String, mensaje As String, boton1 As String, boton2 As String, boton3 As String)
    ' [AQU� TU C�DIGO ORIGINAL]
End Sub

Sub GestionarClicBoton()
    ' [AQU� TU C�DIGO ORIGINAL]
End Sub

Sub BorrarElementosPop(nombrePopover As String)
    Dim shp As Shape
    On Error Resume Next
    For Each shp In ActiveSheet.Shapes
        If InStr(shp.name, nombrePopover) > 0 Then shp.Delete
    Next shp
    On Error GoTo 0
End Sub
