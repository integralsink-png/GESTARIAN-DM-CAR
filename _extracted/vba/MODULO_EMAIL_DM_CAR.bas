Attribute VB_Name = "MODULO_EMAIL_DM_CAR"
Option Explicit

Private Const MAX_FOTOS_EMAIL As Long = 5

'==============================================================
' WBV ENGINE
' MOD_EMAIL v2.0
'==============================================================
' Motor de comunicaciones.
'
' Funciones:
'
' � Env�o de facturas
' � Env�o gestor�a
' � Google Drive
' � SMTP
' � Estados
'
' Toda la configuraci�n proviene de:
'
' MOD_CONFIG
'
' Nunca se accede directamente a celdas.
'==============================================================


'==============================================================
' CONFIGURACI�N SMTP
'==============================================================

Private Function EmailEmpresa() As String

    EmailEmpresa = Trim(CStr(cfg("EMAIL GMAIL")))

End Function


Private Function PasswordEmpresa() As String

    PasswordEmpresa = Trim(CStr(cfg("PASSWORD APP")))

End Function


Private Function EmailGestoria() As String

    EmailGestoria = Trim(CStr(cfg("EMAIL GESTORIA")))

End Function


Private Function LinkDriveGestoria() As String

    LinkDriveGestoria = Trim(CStr(cfg("ENLACE DRIVE GESTORIA")))

End Function


'==============================================================
' LIMPIAR NOMBRE ARCHIVO
'==============================================================

Public Function LimpiarNombreArchivo(ByVal Nombre As String) As String

    Dim i As Long

    Dim prohibidos

    prohibidos = Array("/", "\", ":", "*", "?", """", "<", ">", "|")

    For i = LBound(prohibidos) To UBound(prohibidos)

        Nombre = Replace(Nombre, prohibidos(i), "-")

    Next i

    LimpiarNombreArchivo = Nombre

End Function


'==============================================================
' CREAR CONFIGURACI�N SMTP
'==============================================================
Private Function CrearConfiguracionSMTP() As Object

    Dim cfgSMTP As Object

    Set cfgSMTP = CreateObject("CDO.Configuration")

    With cfgSMTP.Fields

        .Item("http://schemas.microsoft.com/cdo/configuration/sendusing") = 2

        .Item("http://schemas.microsoft.com/cdo/configuration/smtpserver") = "smtp.gmail.com"

        .Item("http://schemas.microsoft.com/cdo/configuration/smtpserverport") = 465

        .Item("http://schemas.microsoft.com/cdo/configuration/smtpusessl") = True

        .Item("http://schemas.microsoft.com/cdo/configuration/smtpauthenticate") = 1

        .Item("http://schemas.microsoft.com/cdo/configuration/sendusername") = _
            Trim(CStr(cfg("EMAIL GMAIL")))

        .Item("http://schemas.microsoft.com/cdo/configuration/sendpassword") = _
            Trim(CStr(cfg("PASSWORD APP")))

        .Update

    End With

    Set CrearConfiguracionSMTP = cfgSMTP

End Function


'==============================================================
' ENV�O GENERAL
'==============================================================

Public Function Enviar_Gmail_DMCar_General( _
        Destino As String, _
        Archivo1 As String, _
        Archivo2 As String, _
        Asunto As String, _
        Cuerpo As String) As Boolean

    On Error GoTo ErrorSMTP

    Dim Mail As Object

    Set Mail = CreateObject("CDO.Message")

    Set Mail.Configuration = CrearConfiguracionSMTP()

    With Mail

        .From = EmailEmpresa

        .To = Destino

        .Subject = Asunto

        .TextBody = Cuerpo

        If Len(Archivo1) > 0 Then .AddAttachment Archivo1

        If Len(Archivo2) > 0 Then .AddAttachment Archivo2

        .Send

    End With

    Enviar_Gmail_DMCar_General = True

    Exit Function

ErrorSMTP:

    Enviar_Gmail_DMCar_General = False

End Function

'==============================================================
' ENVIAR FACTURA AL CLIENTE
'==============================================================

Public Sub Enviar_Factura_Email_Cliente()

    On Error GoTo ErrorHandler

    Dim shF As Worksheet
    Dim shBD As Worksheet

    Dim NumFactura As String
    Dim DNI As String
    Dim Matricula As String

    Dim fila As Variant

    Dim EmailCliente As String

    Dim RutaPDF As String
    Dim RutaCarpeta As String

    Dim Mail As Object

    Set shF = Sheets("FACTURAS")
    Set shBD = Sheets("BASE DE DATOS")

    '----------------------------------------------------------
    ' Datos factura
    '----------------------------------------------------------

    NumFactura = LimpiarNombreArchivo(Trim(shF.Range("D9").Value))

    DNI = Trim(shF.Range("D15").Value)

    Matricula = UCase(Trim(shF.Range("J14").Value))

    If NumFactura = "" Then

        MsgBox _
            "No existe n�mero de factura.", _
            vbExclamation, _
            "GESTARIAN"

        Exit Sub

    End If

    '----------------------------------------------------------
    ' Buscar cliente
    '----------------------------------------------------------

    fila = Application.Match(DNI, shBD.Columns("I"), 0)

    If IsError(fila) Then

        MsgBox _
            "No se ha encontrado el cliente.", _
            vbCritical, _
            "GESTARIAN"

        Exit Sub

    End If

    EmailCliente = Trim(shBD.Cells(fila, "L").Value)

    If EmailCliente = "" Then

        MsgBox _
            "El cliente no tiene email registrado.", _
            vbExclamation, _
            "GESTARIAN"

        Exit Sub

    End If

    '----------------------------------------------------------
    ' Obtener ruta PDF
    '----------------------------------------------------------

    RutaCarpeta = RutaFacturasDM(Date)

    If RutaCarpeta = "" Then

        MsgBox _
            "No se pudo obtener la carpeta de facturas.", _
            vbCritical, _
            "GESTARIAN"

        Exit Sub

    End If

    RutaPDF = RutaCarpeta & "\FACTURA_" & NumFactura & ".pdf"

    '----------------------------------------------------------
    ' Generar PDF
    '----------------------------------------------------------

    shF.Range("C3:J48").ExportAsFixedFormat _
            Type:=xlTypePDF, _
            Filename:=RutaPDF, _
            Quality:=xlQualityStandard, _
            IgnorePrintAreas:=False, _
            OpenAfterPublish:=False

    '----------------------------------------------------------
    ' Verificar creaci�n PDF
    '----------------------------------------------------------

    If Dir(RutaPDF) = "" Then

        MsgBox _
            "No se pudo generar el PDF." & vbCrLf & vbCrLf & _
            RutaPDF, _
            vbCritical, _
            "GESTARIAN"

        Exit Sub

    End If

    '----------------------------------------------------------
    ' Sincronizaci�n Google Drive
    '----------------------------------------------------------

    If Len(Trim(RutaCloudFacturas())) > 0 Then

        SincronizarFacturaCloud RutaPDF

    End If

    '----------------------------------------------------------
    ' Preparar email
    '----------------------------------------------------------

    Set Mail = CreateObject("CDO.Message")

    Set Mail.Configuration = CrearConfiguracionSMTP()

    With Mail

        .From = EmailEmpresa

        .To = EmailCliente

        .Subject = "Factura " & NumFactura

        .TextBody = _
            "Adjuntamos la factura correspondiente." & vbCrLf & vbCrLf & _
            "Gracias por confiar en nosotros."

        .AddAttachment RutaPDF

        If Matricula <> "" Then

            AdjuntarFotosVehiculo Mail, Matricula

        End If

        .Send

    End With

    '----------------------------------------------------------
    ' Actualizar estado
    '----------------------------------------------------------

    Marcar_Estado_Registro NumFactura, "EMAIL"

    CFG_Write "�LTIMO ENV�O EMAIL", Now

    MsgBox _
        "Factura enviada correctamente.", _
        vbInformation, _
        "GESTARIAN"

    Exit Sub

ErrorHandler:

    MsgBox _
        "Error n�: " & Err.Number & vbCrLf & _
        "Descripci�n: " & Err.Description, _
        vbCritical, _
        "GESTARIAN"

End Sub


'==============================================================
' ENVIAR INFORME TRIMESTRAL
'==============================================================

Public Sub Enviar_Trimestre_Gestoria()

    On Error GoTo ErrorHandler

    Dim sh As Worksheet

    Set sh = Sheets("BALANCES")

    Dim Tri As Integer

    Dim Anio As Long

    Dim RutaCarpeta As String

    Dim PDF As String

    Dim XLS As String

    Tri = Val(sh.Range("I19").Value)

    Anio = Val(sh.Range("L19").Value)

    RutaCarpeta = RutaInformesTrimestralesDM(Anio, Tri)

    PDF = RutaCarpeta & "\IVA_DM_CAR_" & Anio & "_T" & Tri & ".pdf"

    XLS = RutaCarpeta & "\IVA_DM_CAR_" & Anio & "_T" & Tri & ".xlsx"

    If Enviar_Gmail_DMCar_General( _
            EmailGestoria, _
            PDF, _
            XLS, _
            "Informe Trimestral " & Anio & " T" & Tri, _
            "Adjuntamos informe trimestral.") Then

        CFG_Write "�LTIMO ENV�O GESTORIA", Now

        MsgBox "Informe enviado correctamente.", vbInformation

    Else

        MsgBox "No se pudo enviar el informe.", vbCritical

    End If

    Exit Sub

ErrorHandler:

    MsgBox Err.Description, vbCritical

End Sub


'==============================================================
' ENVIAR ENLACE DRIVE
'==============================================================

Public Sub Enviar_Enlace_GoogleDrive_Gestoria()

    On Error GoTo ErrorHandler

    If EmailGestoria = "" Then

        MsgBox "No existe email de gestor�a.", vbExclamation

        Exit Sub

    End If

    If LinkDriveGestoria = "" Then

        MsgBox "No existe enlace de Drive.", vbExclamation

        Exit Sub

    End If

    If Enviar_Gmail_DMCar_General( _
            EmailGestoria, _
            "", _
            "", _
            "Acceso Google Drive", _
            "Acceso a la carpeta compartida:" & vbCrLf & vbCrLf & _
            LinkDriveGestoria) Then

        CFG_Write "�LTIMO ENV�O DRIVE", Now

        MsgBox "Enlace enviado correctamente.", vbInformation

    Else

        MsgBox "No se pudo enviar el enlace.", vbCritical

    End If

    Exit Sub

ErrorHandler:

    MsgBox Err.Description, vbCritical

End Sub

'==============================================================
' WBV ENGINE
' RUTAS
'==============================================================

Private Function RutaLocalFacturas() As String

    RutaLocalFacturas = _
        Trim(CStr(cfg("RUTA RAIZ LOCAL"))) & _
        "\FACTURAS"

End Function

Private Function RutaCloudFacturas() As String

    RutaCloudFacturas = _
        Trim(CStr(cfg("RUTA RAIZ CLOUD"))) & _
        "\FACTURAS"

End Function


Private Function RutaLocalInformes() As String

    RutaLocalInformes = _
        Trim(CStr(cfg("RUTA RAIZ LOCAL"))) & _
        "\INFORMES"

End Function


Private Function RutaCloudInformes() As String

    RutaCloudInformes = _
        Trim(CStr(cfg("RUTA RAIZ CLOUD"))) & _
        "\INFORMES"

End Function

'==============================================================
' CREAR CARPETA SI NO EXISTE
'==============================================================

Private Sub CrearCarpeta(ByVal ruta As String)

    On Error Resume Next

    If Len(Trim(ruta)) = 0 Then Exit Sub

    If Dir(ruta, vbDirectory) = "" Then
        MkDir ruta
    End If

    On Error GoTo 0

End Sub


'==============================================================
' FACTURAS
'==============================================================

Public Function RutaFacturasDM(Optional FechaFactura As Date) As String

    On Error GoTo ErrorHandler

    Dim Anio As String
    Dim Tri As String
    Dim Base As String

    If FechaFactura = 0 Then FechaFactura = Date

    Anio = CStr(Year(FechaFactura))
    Tri = "T" & WorksheetFunction.RoundUp(Month(FechaFactura) / 3, 0)

    Base = Trim(RutaLocalFacturas())

    If Base = "" Then
        Err.Raise vbObjectError + 1000, , _
            "No existe RUTA RAIZ LOCAL."
    End If

    CrearCarpeta Base
    CrearCarpeta Base & "\" & Anio
    CrearCarpeta Base & "\" & Anio & "\" & Tri

    RutaFacturasDM = Base & "\" & Anio & "\" & Tri

    Exit Function

ErrorHandler:

    MsgBox _
        "Error creando la estructura de facturas:" & vbCrLf & vbCrLf & _
        Base & vbCrLf & _
        Anio & vbCrLf & _
        Tri & vbCrLf & vbCrLf & _
        Err.Description, _
        vbCritical, _
        "GESTARIAN"

    RutaFacturasDM = ""

End Function


'==============================================================
' INFORMES
'==============================================================

Public Function RutaInformesTrimestralesDM( _
        Anio As Long, _
        Trimestre As Integer) As String

    On Error GoTo ErrorHandler

    Dim Base As String

    Base = Trim(RutaLocalInformes())

    CrearCarpeta Base
    CrearCarpeta Base & "\" & Anio
    CrearCarpeta Base & "\" & Anio & "\T" & Trimestre

    RutaInformesTrimestralesDM = _
        Base & "\" & Anio & "\T" & Trimestre

    Exit Function

ErrorHandler:

    MsgBox _
        "Error creando la estructura de informes." & vbCrLf & _
        Err.Description, _
        vbCritical, _
        "GESTARIAN"

    RutaInformesTrimestralesDM = ""

End Function


'==============================================================
' COPIAR A CLOUD
'==============================================================

Public Sub SincronizarArchivoCloud( _
            ArchivoLocal As String, _
            RutaCloud As String)

    On Error GoTo ErrorHandler

    Dim Nombre As String

    If Len(ArchivoLocal) = 0 Then Exit Sub
    If Len(RutaCloud) = 0 Then Exit Sub

    Nombre = Mid(ArchivoLocal, InStrRev(ArchivoLocal, "\") + 1)

    CrearCarpeta RutaCloud

    FileCopy ArchivoLocal, RutaCloud & "\" & Nombre

    Exit Sub

ErrorHandler:

    MsgBox _
        "Error sincronizando archivo." & vbCrLf & vbCrLf & _
        "Origen:" & vbCrLf & _
        ArchivoLocal & vbCrLf & vbCrLf & _
        "Destino:" & vbCrLf & _
        RutaCloud & vbCrLf & vbCrLf & _
        Err.Description, _
        vbCritical, _
        "GESTARIAN"

End Sub


'==============================================================
' FACTURA -> CLOUD
'==============================================================

Public Sub SincronizarFacturaCloud(ArchivoPDF As String)

    If Len(RutaCloudFacturas()) = 0 Then Exit Sub

    SincronizarArchivoCloud _
            ArchivoPDF, _
            RutaCloudFacturas()

End Sub


'==============================================================
' INFORME -> CLOUD
'==============================================================

Public Sub SincronizarInformeCloud(archivo As String)

    If Len(RutaCloudInformes()) = 0 Then Exit Sub

    SincronizarArchivoCloud _
            archivo, _
            RutaCloudInformes()

End Sub

'==============================================================
' ADJUNTAR FOTOS DEL VEH�CULO
'==============================================================
Private Sub AdjuntarFotosVehiculo( _
    ByVal Mail As Object, _
    ByVal Matricula As String)

    On Error Resume Next

    Dim fso As Object
    Dim ruta As String
    Dim Total As Long

    Set fso = CreateObject("Scripting.FileSystemObject")

    ' Obtener autom�ticamente la carpeta correcta,
    ' independientemente del a�o o estructura
    ruta = ObtenerCarpetaMatricula(Matricula)

    If ruta = "" Then Exit Sub

    If Not fso.FolderExists(ruta) Then Exit Sub

    Total = 0

    ' Fotos anteriores
    AdjuntarFotosCarpeta _
        Mail, _
        ruta & "ANTERIORES\", _
        Total

    ' Fotos posteriores
    AdjuntarFotosCarpeta _
        Mail, _
        ruta & "POSTERIORES\", _
        Total

End Sub

Private Sub AdjuntarFotosCarpeta(ByVal Mail As Object, _
                                 ByVal ruta As String, _
                                 ByRef Total As Long)

    Dim fso As Object

    Dim Carpeta As Object

    Dim archivo As Object

    Set fso = CreateObject("Scripting.FileSystemObject")

    If Not fso.FolderExists(ruta) Then Exit Sub

    Set Carpeta = fso.GetFolder(ruta)

    For Each archivo In Carpeta.Files

        Select Case LCase(fso.GetExtensionName(archivo.name))

            Case "jpg", "jpeg", "png", "heic"

                Mail.AddAttachment archivo.Path

                Total = Total + 1

                If Total >= MAX_FOTOS_EMAIL Then Exit Sub

        End Select

    Next archivo

End Sub
Sub TEST_IMPRESION_RANGO()

    Sheets("FACTURAS").Range("C3:J48").PrintPreview

End Sub
