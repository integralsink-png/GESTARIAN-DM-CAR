Attribute VB_Name = "exportvba"
Option Explicit

' ============================================================
'   VARIABLES GLOBALES
' ============================================================

Public UltimaFirmaVBA As String
Public ProximoBackup As Date
Public BackupIniciado As Boolean

Private Const RUTA_BACKUP As String = _
"C:\Users\Administrador\Desktop\JUANI\TALLER MIGUEL\VBA\"

' ============================================================
'   INICIAR SISTEMA AUTOM�TICO
' ============================================================

Sub IniciarBackupAutomatico()

    On Error Resume Next

    ' Evitar temporizadores duplicados
    If BackupIniciado Then
        Call DetenerBackupAutomatico
    End If

    ' Revisar cambios ahora
    Call BackupVBA_SiHayCambios

    ' Programar siguiente revisi�n
    ProximoBackup = Now + TimeValue("00:15:00")

    Application.OnTime _
        EarliestTime:=ProximoBackup, _
        Procedure:="IniciarBackupAutomatico"

    BackupIniciado = True

    On Error GoTo 0

End Sub

' ============================================================
'   DETENER TEMPORIZADOR
' ============================================================

Sub DetenerBackupAutomatico()

    On Error Resume Next

    If BackupIniciado Then

        Application.OnTime _
            EarliestTime:=ProximoBackup, _
            Procedure:="IniciarBackupAutomatico", _
            Schedule:=False

    End If

    BackupIniciado = False

    On Error GoTo 0

End Sub

' ============================================================
'   COMPROBAR SI EL VBA HA CAMBIADO
' ============================================================

Sub BackupVBA_SiHayCambios()

    Dim firmaActual As String

    firmaActual = ObtenerFirmaVBA()

    If firmaActual <> UltimaFirmaVBA Then

        UltimaFirmaVBA = firmaActual

        Call ExportarProyectoCompleto

    End If

End Sub

' ============================================================
'   GENERAR FIRMA DIGITAL DEL PROYECTO VBA
' ============================================================

Function ObtenerFirmaVBA() As String

    Dim comp As Object
    Dim Texto As String
    Dim n As Long

    Texto = ""

    For Each comp In ThisWorkbook.VBProject.VBComponents

        On Error Resume Next

        n = comp.CodeModule.CountOfLines

        If n > 0 Then
            Texto = Texto & comp.CodeModule.Lines(1, n)
        End If

        On Error GoTo 0

    Next comp

    ObtenerFirmaVBA = _
        CStr(Len(Texto)) & "_" & _
        CStr(Crc32(Texto))

End Function

' ============================================================
'   EXPORTAR TODO EL PROYECTO VBA
' ============================================================

Sub ExportarProyectoCompleto()

    On Error GoTo ErrorHandler

    Dim vbComp As Object

    Dim Fecha As String
    Dim Carpeta As String
    Dim archivoTXT As String

    Dim Ext As String
    Dim n As Long

    Dim canalArchivo As Integer

    Fecha = Format(Now, "yyyy-mm-dd__hh-nn-ss")

    Carpeta = RUTA_BACKUP & Fecha & "\"

    ' Crear carpetas si no existen
    Call CrearRutaCompleta(RUTA_BACKUP)
    Call CrearRutaCompleta(Carpeta)

    archivoTXT = Carpeta & "VBA_COMPLETO_" & Fecha & ".txt"

    canalArchivo = FreeFile

    Open archivoTXT For Output As #canalArchivo

    Print #canalArchivo, String(60, "=")
    Print #canalArchivo, " EXPORTACI�N COMPLETA VBA - DM CAR"
    Print #canalArchivo, " FECHA: " & Now
    Print #canalArchivo, String(60, "=")
    Print #canalArchivo, ""

    ' ============================================================
    ' EXPORTAR COMPONENTES
    ' ============================================================

    For Each vbComp In ThisWorkbook.VBProject.VBComponents

        Select Case vbComp.Type

            Case 1
                Ext = ".bas"

            Case 2
                Ext = ".cls"

            Case 3
                Ext = ".frm"

            Case 100
                Ext = ".cls"

            Case Else
                Ext = ".txt"

        End Select

        ' ------------------------------------------------
        ' EXPORTAR ARCHIVO INDIVIDUAL
        ' ------------------------------------------------

        On Error Resume Next

        vbComp.Export Carpeta & vbComp.name & Ext

        On Error GoTo 0

        ' ------------------------------------------------
        ' EXPORTAR AL TXT MAESTRO
        ' ------------------------------------------------

        Print #canalArchivo, ""
        Print #canalArchivo, String(60, "=")
        Print #canalArchivo, " M�DULO: " & vbComp.name
        Print #canalArchivo, String(60, "=")
        Print #canalArchivo, ""

        On Error Resume Next

        n = vbComp.CodeModule.CountOfLines

        If n > 0 Then

            Print #canalArchivo, _
                vbComp.CodeModule.Lines(1, n)

        Else

            Print #canalArchivo, "[SIN C�DIGO]"

        End If

        On Error GoTo 0

        Print #canalArchivo, ""
        Print #canalArchivo, ""

    Next vbComp

    Close #canalArchivo

    Exit Sub

ErrorHandler:

    MsgBox _
    "ERROR EXPORTANDO VBA:" & vbCrLf & _
    Err.Description, _
    vbCritical

End Sub

' ============================================================
'   CREAR RUTA COMPLETA
' ============================================================

Sub CrearRutaCompleta(ruta As String)

    Dim Partes() As String
    Dim rutaActual As String

    Dim i As Long

    Partes = Split(ruta, "\")

    rutaActual = Partes(0) & "\"

    For i = 1 To UBound(Partes)

        If Partes(i) <> "" Then

            rutaActual = rutaActual & Partes(i) & "\"

            If Dir(rutaActual, vbDirectory) = "" Then
                MkDir rutaActual
            End If

        End If

    Next i

End Sub

' ============================================================
'   HASH SIMPLE TIPO CRC
' ============================================================

Function Crc32(Texto As String) As Long

    Dim i As Long
    Dim resultado As Long

    resultado = 0

    For i = 1 To Len(Texto)

        resultado = _
        ((resultado And &HFFFFFF) * 31 + _
        Asc(Mid$(Texto, i, 1))) _
        And &H7FFFFFFF

    Next i

    Crc32 = resultado

End Function

