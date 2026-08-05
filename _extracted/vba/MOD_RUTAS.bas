Attribute VB_Name = "MOD_RUTAS"
Option Explicit

'=========================================================
' WBV ENGINE
' MOD_RUTAS v4.0 (UNIFICADO)
'=========================================================
'
' Motor único de rutas para todo el sistema DM CAR.
'
' - Facturas emitidas
' - Facturas recibidas
' - Informes trimestrales
' - Imágenes de vehículos
' - Imágenes OCR de facturas
' - Sincronización local/cloud
'
' Toda la configuración proviene de MOD_CONFIG:
'
'   RUTA RAIZ LOCAL
'   RUTA RAIZ CLOUD
'
'=========================================================


'=========================================================
' CREAR CARPETA SI NO EXISTE
'=========================================================
Private Sub CrearCarpeta(ByVal ruta As String)

    If Len(ruta) = 0 Then Exit Sub

    If Dir(ruta, vbDirectory) = "" Then
        MkDir ruta
    End If

End Sub


'=========================================================
' ASEGURAR ÁRBOL COMPLETO
'=========================================================
Private Sub AsegurarRuta(ByVal ruta As String)

    Dim Partes() As String
    Dim i As Long
    Dim Actual As String

    Partes = Split(ruta, "\")

    Actual = Partes(0)

    For i = 1 To UBound(Partes)
        Actual = Actual & "\" & Partes(i)
        If Dir(Actual, vbDirectory) = "" Then
            MkDir Actual
        End If
    Next i

End Sub


'=========================================================
' RAÍCES
'=========================================================
Public Function RutaRaizLocal() As String
    RutaRaizLocal = Trim(CStr(cfg("RUTA RAIZ LOCAL")))
End Function

Public Function RutaRaizCloud() As String
    RutaRaizCloud = Trim(CStr(cfg("RUTA RAIZ CLOUD")))
End Function


'=========================================================
' FACTURAS EMITIDAS
'=========================================================
Public Function RutaFacturasEmitidas( _
        Optional Fecha As Date = 0, _
        Optional Cloud As Boolean = False) As String

    Dim Base As String
    Dim Año As String
    Dim Tri As String

    If Fecha = 0 Then Fecha = Date

    Año = Year(Fecha)
    Tri = "T" & WorksheetFunction.RoundUp(Month(Fecha) / 3, 0)

    If Cloud Then
        Base = RutaRaizCloud()
    Else
        Base = RutaRaizLocal()
    End If

    RutaFacturasEmitidas = Base & _
        "\FACTURAS\EMITIDAS\" & Año & "\" & Tri

    AsegurarRuta RutaFacturasEmitidas

End Function


'=========================================================
' FACTURAS RECIBIDAS
'=========================================================
Public Function RutaFacturasRecibidas( _
        Optional Fecha As Date = 0, _
        Optional Cloud As Boolean = False) As String

    Dim Base As String
    Dim Año As String
    Dim Tri As String

    If Fecha = 0 Then Fecha = Date

    Año = Year(Fecha)
    Tri = "T" & WorksheetFunction.RoundUp(Month(Fecha) / 3, 0)

    If Cloud Then
        Base = RutaRaizCloud()
    Else
        Base = RutaRaizLocal()
    End If

    RutaFacturasRecibidas = Base & _
        "\FACTURAS\RECIBIDAS\" & Año & "\" & Tri

    AsegurarRuta RutaFacturasRecibidas

End Function


'=========================================================
' INFORMES TRIMESTRALES
'=========================================================
Public Function RutaInformes( _
        ByVal Año As Long, _
        ByVal Trimestre As Long, _
        Optional Cloud As Boolean = False) As String

    Dim Base As String

    If Cloud Then
        Base = RutaRaizCloud()
    Else
        Base = RutaRaizLocal()
    End If

    RutaInformes = Base & _
        "\INFORMES\" & Año & "\T" & Trimestre

    AsegurarRuta RutaInformes

End Function


'=========================================================
' IMÁGENES DE VEHÍCULOS
'=========================================================
Public Function RutaVehiculoDM( _
        ByVal Matricula As String, _
        Optional Cloud As Boolean = False) As String

    Dim Base As String

    Matricula = UCase(Trim(Matricula))

    If Cloud Then
        Base = RutaRaizCloud()
    Else
        Base = RutaRaizLocal()
    End If

    RutaVehiculoDM = Base & _
        "\IMAGENES\VEHICULOS\" & Matricula

    AsegurarRuta RutaVehiculoDM
    AsegurarRuta RutaVehiculoDM & "\ANTERIORES"
    AsegurarRuta RutaVehiculoDM & "\POSTERIORES"

End Function


'=========================================================
' IMÁGENES OCR DE FACTURAS
'=========================================================
Public Function RutaOCRFacturas( _
        Optional Cloud As Boolean = False) As String

    Dim Base As String

    If Cloud Then
        Base = RutaRaizCloud()
    Else
        Base = RutaRaizLocal()
    End If

    RutaOCRFacturas = Base & "\IMAGENES\FACTURAS"

    AsegurarRuta RutaOCRFacturas

End Function


'=========================================================
' COPIA A CLOUD
'=========================================================
Public Sub SincronizarCloud( _
        ByVal ArchivoOrigen As String, _
        ByVal CarpetaDestino As String)

    On Error Resume Next

    Dim Nombre As String

    Nombre = Mid(ArchivoOrigen, InStrRev(ArchivoOrigen, "\") + 1)

    FileCopy ArchivoOrigen, CarpetaDestino & "\" & Nombre

End Sub


'=========================================================
' ACCESOS DIRECTOS
'=========================================================
Public Function ObtenerCarpetaMatricula( _
        ByVal Matricula As String) As String

    ObtenerCarpetaMatricula = RutaVehiculoDM(Matricula)
End Function

Public Function BuscarCarpetaMatricula( _
        ByVal Matricula As String) As String

    BuscarCarpetaMatricula = RutaVehiculoDM(Matricula)
End Function


