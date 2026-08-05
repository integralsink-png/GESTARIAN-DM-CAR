Attribute VB_Name = "M_ESTADOS_FACTURAS"
Option Explicit

'=========================================================
' WBV ENGINE
' M_ESTADOS_FACTURAS
'=========================================================
'
' Motor �nico de estados de facturas
'
' Responsabilidades:
'
' � REGISTRO FACTURAS
' � BALANCES
' � VISOR FACTURAS
' � Bot�n Estado
' � Glow
' � Alertas
' � Dashboard
' � Helper IA
'
' Ning�n otro m�dulo modificar� estados directamente.
'
'=========================================================

'=========================================================
' ESTADOS
'=========================================================

Public Const ESTADO_PENDIENTE As String = "PENDIENTE"
Public Const ESTADO_EMAIL As String = "EMAIL"
Public Const ESTADO_EN_MANO As String = "EN MANO"
Public Const ESTADO_ABONADA As String = "ABONADA"
Public Const ESTADO_PARCIAL As String = "PARCIAL"
Public Const ESTADO_IMPAGADA As String = "IMPAGADA"

'=========================================================
' MOTOR PRINCIPAL
'=========================================================

Public Sub ActualizarEstadoFactura( _
        ByVal NumFactura As String, _
        ByVal NuevoEstado As String)

    Dim shReg As Worksheet
    Dim fila As Variant

    Set shReg = Sheets("REGISTRO FACTURAS")

    fila = Application.Match(NumFactura, shReg.Columns("B"), 0)

    If IsError(fila) Then

        MsgBox "No existe la factura " & NumFactura, _
               vbExclamation, "DM CAR"

        Exit Sub

    End If

    Select Case UCase(Trim(NuevoEstado))

        Case ESTADO_EMAIL

            AplicarEstadoEmail shReg, CLng(fila)

        Case ESTADO_EN_MANO

            AplicarEstadoEnMano shReg, CLng(fila)

        Case ESTADO_ABONADA

            AplicarEstadoAbonada shReg, CLng(fila)

        Case ESTADO_PARCIAL

            AplicarEstadoParcial shReg, CLng(fila)

        Case ESTADO_IMPAGADA

            AplicarEstadoImpagada shReg, CLng(fila)

        Case Else

            AplicarEstadoPendiente shReg, CLng(fila)

    End Select

    RefrescarEstadoFactura NumFactura

End Sub
'=========================================================
' PENDIENTE
'=========================================================

Private Sub AplicarEstadoPendiente( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_PENDIENTE

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(0, 0, 0)
        .Font.Color = RGB(255, 255, 255)

    End With

End Sub

'=========================================================
' EMAIL
'=========================================================

Private Sub AplicarEstadoEmail( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_EMAIL

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(0, 102, 204)
        .Font.Color = vbWhite

    End With

End Sub

'=========================================================
' EN MANO
'=========================================================

Private Sub AplicarEstadoEnMano( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_EN_MANO

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(255, 153, 0)
        .Font.Color = vbWhite

    End With

End Sub

'=========================================================
' ABONADA
'=========================================================

Private Sub AplicarEstadoAbonada( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_ABONADA

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(0, 176, 80)
        .Font.Color = vbWhite

    End With

End Sub

'=========================================================
' PARCIAL
'=========================================================

Private Sub AplicarEstadoParcial( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_PARCIAL

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(255, 255, 0)
        .Font.Color = vbBlack

    End With

End Sub

'=========================================================
' IMPAGADA
'=========================================================

Private Sub AplicarEstadoImpagada( _
        sh As Worksheet, _
        ByVal fila As Long)

    sh.Cells(fila, "N").Value = ESTADO_IMPAGADA

    With sh.Cells(fila, "N")

        .Interior.Color = RGB(192, 0, 0)
        .Font.Color = vbWhite

    End With

End Sub
'=========================================================
' REFRESCO GLOBAL
'=========================================================

Private Sub RefrescarEstadoFactura(ByVal NumFactura As String)

    On Error Resume Next

    Call ActualizarEstadoSistema
    Call ActualizarBalances
    Call ActualizarDashboard
    Call ActualizarAlertasFacturas

    On Error GoTo 0

End Sub

'=========================================================
' COMPATIBILIDAD LEGACY
'=========================================================

Public Sub Marcar_Estado_Registro( _
        ByVal NumFactura As String, _
        ByVal Estado As String)

    ActualizarEstadoFactura _
            NumFactura, _
            Estado

End Sub
Public Sub ActualizarBalances()

    On Error Resume Next

    FiltrarBalanceTrimestral

    On Error GoTo 0

End Sub
'=========================================================
' ACTUALIZA EL SHAPE DE VERSI�N DE FACTURA
'=========================================================
Public Sub ActualizarShapeVersionFactura(ByVal CodigoFactura As String)

    Dim sh As Worksheet

    Set sh = Sheets("FACTURAS")

    CodigoFactura = Trim(UCase(CodigoFactura))

    If CodigoFactura = "" Then Exit Sub

    With sh.Shapes("SHAPE_VERSION_FACTURA")

        '-------------------------------
        ' FACTURA ORIGINAL
        '-------------------------------
        If Right(CodigoFactura, 1) Like "#" Then

            .Visible = msoFalse

        Else

            '-------------------------------
            ' FACTURA MODIFICADA
            '-------------------------------

            .Visible = msoTrue

            .TextFrame2.TextRange.Text = _
                "VERSI�N  " & Right(CodigoFactura, 1)

            .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = vbWhite
            .TextFrame2.TextRange.Font.Bold = msoTrue

            .Fill.ForeColor.RGB = RGB(0, 0, 0)

            .Line.Visible = msoTrue
            .Line.ForeColor.RGB = RGB(180, 220, 255)
            .Line.Weight = 1.25

            .Glow.Color.RGB = RGB(0, 170, 255)
            .Glow.Radius = 5
            .Glow.Transparency = 0.5

        End If

    End With

End Sub

