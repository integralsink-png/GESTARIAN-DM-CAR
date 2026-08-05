Attribute VB_Name = "M_MEDIA"
Option Explicit

'=========================================================
' WBV ENGINE
' M_MEDIA
' v3.0
'=========================================================
' Motor multimedia unificado
'
' Gestiona:
'
' � Veh�culos
' � Fotograf�as
' � OCR
' � IA
' � Documentos
' � Exportaciones
' � Sincronizaci�n Drive
'
' Todo el proyecto utilizar� este motor.
'=========================================================

'=========================================================
' CONFIGURACI�N
'=========================================================

Public Const MEDIA_ROOT As String = _
"G:\Mi unidad\IMAGENES DM CAR"

Public Const MEDIA_VEHICULOS As String = _
MEDIA_ROOT & "\VEHICULOS"

'=========================================================
' CACHE
'=========================================================

Private VehiculoActual As String
Private RutaVehiculoActual As String

'=========================================================
' SUBCARPETAS
'=========================================================

Public Enum MediaFolder

    mfAnteriores = 1
    mfPosteriores = 2
    mfOCR = 3
    mfIA = 4
    mfDocumentos = 5
    mfExportaciones = 6

End Enum

'=========================================================
' INICIALIZAR MOTOR
'=========================================================

Public Sub InicializarMedia()

    CrearCarpeta MEDIA_ROOT

    CrearCarpeta MEDIA_VEHICULOS

End Sub

'=========================================================
' CREAR CARPETA
'=========================================================

Public Sub CrearCarpeta(ByVal ruta As String)

    If Len(ruta) = 0 Then Exit Sub

    If Dir(ruta, vbDirectory) = "" Then

        MkDir ruta

    End If

End Sub

'=========================================================
' RUTA VEH�CULO
'=========================================================

Public Function RutaVehiculo(ByVal Matricula As String) As String

    Matricula = UCase(Trim(Matricula))

    RutaVehiculo = _
        MEDIA_VEHICULOS & "\" & _
        Matricula & "\"

End Function

'=========================================================
' CREAR VEH�CULO
'=========================================================

Public Function CrearVehiculo(ByVal Matricula As String) As String

    Dim ruta As String

    ruta = RutaVehiculo(Matricula)

    CrearCarpeta ruta

    CrearCarpeta ruta & "ANTERIORES"

    CrearCarpeta ruta & "POSTERIORES"

    CrearCarpeta ruta & "OCR"

    CrearCarpeta ruta & "IA"

    CrearCarpeta ruta & "DOCUMENTOS"

    CrearCarpeta ruta & "EXPORTACIONES"

    CrearVehiculo = ruta

End Function

'=========================================================
' OBTENER VEH�CULO
'=========================================================

Public Function ObtenerVehiculo(ByVal Matricula As String) As String

    Dim ruta As String

    ruta = RutaVehiculo(Matricula)

    If Dir(ruta, vbDirectory) = "" Then

        ruta = CrearVehiculo(Matricula)

    End If

    VehiculoActual = Matricula

    RutaVehiculoActual = ruta

    ObtenerVehiculo = ruta

End Function

'=========================================================
' RUTA SUBCARPETA
'=========================================================

Public Function RutaMedia( _
ByVal Matricula As String, _
ByVal Carpeta As MediaFolder) As String

    Dim Base As String

    Base = ObtenerVehiculo(Matricula)

    Select Case Carpeta

        Case mfAnteriores

            RutaMedia = Base & "ANTERIORES\"

        Case mfPosteriores

            RutaMedia = Base & "POSTERIORES\"

        Case mfOCR

            RutaMedia = Base & "OCR\"

        Case mfIA

            RutaMedia = Base & "IA\"

        Case mfDocumentos

            RutaMedia = Base & "DOCUMENTOS\"

        Case mfExportaciones

            RutaMedia = Base & "EXPORTACIONES\"

    End Select

End Function

'=========================================================
' ACCESOS R�PIDOS
'=========================================================

Public Function RutaAnteriores(ByVal Matricula As String) As String

    RutaAnteriores = RutaMedia(Matricula, mfAnteriores)

End Function

Public Function RutaPosteriores(ByVal Matricula As String) As String

    RutaPosteriores = RutaMedia(Matricula, mfPosteriores)

End Function

Public Function RutaOCR(ByVal Matricula As String) As String

    RutaOCR = RutaMedia(Matricula, mfOCR)

End Function

Public Function RutaIA(ByVal Matricula As String) As String

    RutaIA = RutaMedia(Matricula, mfIA)

End Function

Public Function RutaDocumentos(ByVal Matricula As String) As String

    RutaDocumentos = RutaMedia(Matricula, mfDocumentos)

End Function

Public Function RutaExportaciones(ByVal Matricula As String) As String

    RutaExportaciones = RutaMedia(Matricula, mfExportaciones)

End Function

'=========================================================
' EXISTE VEH�CULO
'=========================================================

Public Function ExisteVehiculo( _
ByVal Matricula As String) As Boolean

    ExisteVehiculo = _
        (Dir(RutaVehiculo(Matricula), vbDirectory) <> "")

End Function

'=========================================================
' EXISTE SUBCARPETA
'=========================================================

Public Function ExisteCarpetaMedia( _
ByVal Matricula As String, _
ByVal Carpeta As MediaFolder) As Boolean

    ExisteCarpetaMedia = _
        (Dir(RutaMedia(Matricula, Carpeta), vbDirectory) <> "")

End Function

'=========================================================
' ABRIR VEH�CULO
'=========================================================

Public Sub AbrirVehiculo( _
ByVal Matricula As String)

    Dim ruta As String

    ruta = ObtenerVehiculo(Matricula)

    Shell _
    "explorer.exe """ & _
    ruta & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR ANTERIORES
'=========================================================

Public Sub AbrirAnteriores( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaAnteriores(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR POSTERIORES
'=========================================================

Public Sub AbrirPosteriores( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaPosteriores(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR OCR
'=========================================================

Public Sub AbrirOCRMedia( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaOCR(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR IA
'=========================================================

Public Sub AbrirIAMedia( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaIA(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR DOCUMENTOS
'=========================================================

Public Sub AbrirDocumentos( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaDocumentos(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR EXPORTACIONES
'=========================================================

Public Sub AbrirExportaciones( _
ByVal Matricula As String)

    Shell _
    "explorer.exe """ & _
    RutaExportaciones(Matricula) & """", _
    vbNormalFocus

End Sub

'=========================================================
' ABRIR SEG�N TIPO
'=========================================================

Public Sub AbrirMedia( _
ByVal Matricula As String, _
ByVal Carpeta As MediaFolder)

    Shell _
    "explorer.exe """ & _
    RutaMedia(Matricula, Carpeta) & """", _
    vbNormalFocus

End Sub

'=========================================================
' OBTENER VEH�CULO ACTUAL
'=========================================================

Public Function GetVehiculoActual() As String

    GetVehiculoActual = VehiculoActual

End Function

'=========================================================
' OBTENER RUTA ACTUAL
'=========================================================

Public Function GetRutaActual() As String

    GetRutaActual = RutaVehiculoActual

End Function

'=========================================================
' REFRESCAR CACHE
'=========================================================

Public Sub RefrescarVehiculoActual( _
ByVal Matricula As String)

    VehiculoActual = _
        UCase(Trim(Matricula))

    RutaVehiculoActual = _
        RutaVehiculo(VehiculoActual)

End Sub

'=========================================================
' LIMPIAR CACHE
'=========================================================

Public Sub LimpiarCacheMedia()

    VehiculoActual = ""

    RutaVehiculoActual = ""

End Sub


'=========================================================
' EXISTEN FOTOS
'=========================================================

Public Function HayFotos(ByVal Matricula As String) As Boolean

    HayFotos = _
        (ContarFotos(Matricula) > 0)

End Function

'=========================================================
' CONTAR FOTOS
'=========================================================

Public Function ContarFotos(ByVal Matricula As String) As Long

    ContarFotos = _
        ContarFotosCarpeta(RutaAnteriores(Matricula)) + _
        ContarFotosCarpeta(RutaPosteriores(Matricula))

End Function

'=========================================================
' CONTAR FOTOS DE UNA CARPETA
'=========================================================

Private Function ContarFotosCarpeta(ByVal ruta As String) As Long

    Dim archivo As String

    If Dir(ruta, vbDirectory) = "" Then Exit Function

    archivo = Dir(ruta & "*.*")

    Do While archivo <> ""

        Select Case LCase(Mid(archivo, InStrRev(archivo, ".") + 1))

            Case "jpg", "jpeg", "png", "bmp", "webp", "gif", "heic"

                ContarFotosCarpeta = _
                    ContarFotosCarpeta + 1

        End Select

        archivo = Dir

    Loop

End Function

'=========================================================
' LISTADO DE FOTOS
'=========================================================

Public Function ListadoFotos(ByVal Matricula As String) As Collection

    Dim Fotos As New Collection

    Call A�adirFotosCarpeta( _
            Fotos, _
            RutaAnteriores(Matricula))

    Call A�adirFotosCarpeta( _
            Fotos, _
            RutaPosteriores(Matricula))

    Set ListadoFotos = Fotos

End Function

'=========================================================
' A�ADIR FOTOS
'=========================================================

Private Sub A�adirFotosCarpeta( _
ByRef Fotos As Collection, _
ByVal ruta As String)

    Dim archivo As String

    If Dir(ruta, vbDirectory) = "" Then Exit Sub

    archivo = Dir(ruta & "*.*")

    Do While archivo <> ""

        Select Case LCase(Mid(archivo, InStrRev(archivo, ".") + 1))

            Case "jpg", "jpeg", "png", "bmp", "gif", "webp", "heic"

                Fotos.Add ruta & archivo

        End Select

        archivo = Dir

    Loop

End Sub

'=========================================================
' BUSCAR FOTO M�S RECIENTE
'=========================================================

Public Function FotoMasReciente( _
ByVal Matricula As String) As String

    Dim Fotos As Collection

    Dim i As Long

    Dim Fecha As Date

    Set Fotos = ListadoFotos(Matricula)

    For i = 1 To Fotos.Count

        If FileDateTime(Fotos(i)) > Fecha Then

            Fecha = FileDateTime(Fotos(i))

            FotoMasReciente = Fotos(i)

        End If

    Next i

End Function

'=========================================================
' FOTOS ANTERIORES
'=========================================================

Public Function FotosAnteriores( _
ByVal Matricula As String) As Collection

    Dim C As New Collection

    Call A�adirFotosCarpeta(C, RutaAnteriores(Matricula))

    Set FotosAnteriores = C

End Function

'=========================================================
' FOTOS POSTERIORES
'=========================================================

Public Function FotosPosteriores( _
ByVal Matricula As String) As Collection

    Dim C As New Collection

    Call A�adirFotosCarpeta(C, RutaPosteriores(Matricula))

    Set FotosPosteriores = C

End Function

'=========================================================
' ADJUNTAR FOTOS AL EMAIL
'=========================================================

Public Sub AdjuntarFotosVehiculo( _
ByVal Mail As Object, _
ByVal Matricula As String)

    Dim Fotos As Collection

    Dim i As Long

    Set Fotos = ListadoFotos(Matricula)

    If Fotos.Count = 0 Then Exit Sub

    For i = 1 To Fotos.Count

        Mail.AddAttachment Fotos(i)

        If i >= 5 Then Exit For

    Next i

End Sub

'=========================================================
' EXISTEN FOTOS ANTERIORES
'=========================================================

Public Function HayFotosAnteriores( _
ByVal Matricula As String) As Boolean

    HayFotosAnteriores = _
        (FotosAnteriores(Matricula).Count > 0)

End Function

'=========================================================
' EXISTEN FOTOS POSTERIORES
'=========================================================

Public Function HayFotosPosteriores( _
ByVal Matricula As String) As Boolean

    HayFotosPosteriores = _
        (FotosPosteriores(Matricula).Count > 0)

End Function
'=========================================================
' COPIAR ARCHIVO
'=========================================================

Public Function CopiarArchivoMedia( _
ByVal Origen As String, _
ByVal Destino As String) As Boolean

    On Error GoTo ErrorHandler

    FileCopy Origen, Destino

    CopiarArchivoMedia = True

    Exit Function

ErrorHandler:

    CopiarArchivoMedia = False

End Function

'=========================================================
' MOVER ARCHIVO
'=========================================================

Public Function MoverArchivoMedia( _
ByVal Origen As String, _
ByVal Destino As String) As Boolean

    On Error GoTo ErrorHandler

    Name Origen As Destino

    MoverArchivoMedia = True

    Exit Function

ErrorHandler:

    MoverArchivoMedia = False

End Function

'=========================================================
' ELIMINAR ARCHIVO
'=========================================================

Public Function EliminarArchivoMedia( _
ByVal archivo As String) As Boolean

    On Error GoTo ErrorHandler

    Kill archivo

    EliminarArchivoMedia = True

    Exit Function

ErrorHandler:

    EliminarArchivoMedia = False

End Function

'=========================================================
' EXISTE ARCHIVO
'=========================================================

Public Function ExisteArchivoMedia( _
ByVal archivo As String) As Boolean

    ExisteArchivoMedia = _
        (Dir(archivo) <> "")

End Function

'=========================================================
' RENOMBRAR ARCHIVO
'=========================================================

Public Function RenombrarArchivoMedia( _
ByVal archivo As String, _
ByVal NuevoNombre As String) As Boolean

    On Error GoTo ErrorHandler

    Dim ruta As String

    ruta = Left(archivo, InStrRev(archivo, "\"))

    Name archivo As ruta & NuevoNombre

    RenombrarArchivoMedia = True

    Exit Function

ErrorHandler:

    RenombrarArchivoMedia = False

End Function

'=========================================================
' LIMPIAR NOMBRE
'=========================================================

Public Function NombreSeguro( _
ByVal Texto As String) As String

    Dim i As Long

    Dim C

    C = Array("/", "\", ":", "*", "?", """", "<", ">", "|")

    For i = LBound(C) To UBound(C)

        Texto = Replace(Texto, C(i), "-")

    Next i

    NombreSeguro = Trim(Texto)

End Function

'=========================================================
' SINCRONIZAR VEH�CULO
'=========================================================

Public Sub SincronizarVehiculo( _
ByVal Matricula As String)

    'Reservado para Flutter

End Sub

'=========================================================
' EXPORTAR VEH�CULO
'=========================================================

Public Sub ExportarVehiculoZIP( _
ByVal Matricula As String)

    'Pendiente

End Sub

'=========================================================
' LIMPIAR VEH�CULO
'=========================================================

Public Sub LimpiarVehiculoMedia( _
ByVal Matricula As String)

    'Pendiente

End Sub

'=========================================================
' REINDEXAR VEH�CULO
'=========================================================

Public Sub ReindexarVehiculo( _
ByVal Matricula As String)

    Call ActualizarMatricula(Matricula)

End Sub

'=========================================================
' REINDEXAR TODO
'=========================================================

Public Sub ReindexarMedia()

    Call IndexarImagenes

End Sub

'=========================================================
' DIAGN�STICO
'=========================================================

Public Sub DiagnosticoMedia()

    Debug.Print "========== MEDIA =========="

    Debug.Print "Veh�culo actual : "; VehiculoActual

    Debug.Print "Ruta actual     : "; RutaVehiculoActual

    Debug.Print "==========================="

End Sub

'=========================================================
' PREPARADO OCR
'=========================================================

Public Function CarpetaOCRVehiculo( _
ByVal Matricula As String) As String

    CarpetaOCRVehiculo = RutaOCR(Matricula)

End Function

'=========================================================
' PREPARADO IA
'=========================================================

Public Function CarpetaIAVehiculo( _
ByVal Matricula As String) As String

    CarpetaIAVehiculo = RutaIA(Matricula)

End Function

'=========================================================
' PREPARADO DOCUMENTOS
'=========================================================

Public Function CarpetaDocumentosVehiculo( _
ByVal Matricula As String) As String

    CarpetaDocumentosVehiculo = _
        RutaDocumentos(Matricula)

End Function

'=========================================================
' PREPARADO EXPORTACIONES
'=========================================================

Public Function CarpetaExportacionesVehiculo( _
ByVal Matricula As String) As String

    CarpetaExportacionesVehiculo = _
        RutaExportaciones(Matricula)

End Function

'=========================================================
' RESET MOTOR
'=========================================================

Public Sub ResetMedia()

    VehiculoActual = ""

    RutaVehiculoActual = ""

End Sub

