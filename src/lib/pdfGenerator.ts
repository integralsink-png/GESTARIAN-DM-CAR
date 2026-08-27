import { jsPDF } from 'jspdf'
import type { Presupuesto, Factura, Cliente, Vehiculo, Configuracion } from './types'
import { sendEstimate, sendInvoice } from '../services/communicationService'
import { supabase } from './supabase'
import { generateVerifactuQRDataUrlSync, VERIFACTU_NORMATIVA_TEXT } from './verifactuService'

const PROVINCIAS_ESPANOLAS: Record<string, string> = {
  '01': 'Araba / Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
  '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos', '10': 'Cáceres',
  '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña',
  '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Gipuzkoa',
  '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León', '25': 'Lleida',
  '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga', '30': 'Murcia',
  '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas',
  '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
  '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel', '45': 'Toledo',
  '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia', '49': 'Zamora', '50': 'Zaragoza',
  '51': 'Ceuta', '52': 'Melilla'
}

export function getLocalidadFromCP(cp: string): string {
  if (!cp) return ''
  const prefix = cp.substring(0, 2)
  return PROVINCIAS_ESPANOLAS[prefix] || ''
}

export function generatePresupuestoPDF(
  presupuesto: Partial<Presupuesto>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const numero = expediente || presupuesto.numero || 'PRES-0001'
  const fecha = presupuesto.fecha ? new Date(presupuesto.fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')
  const conceptos = presupuesto.conceptos || []
  const subtotal = conceptos.reduce((acc, c) => acc + (c.cantidad * c.precio), 0)
  const aplicarIva = (presupuesto as any).aplicarIva !== undefined ? (presupuesto as any).aplicarIva : true
  const iva = aplicarIva ? subtotal * 0.21 : 0
  const total = subtotal + iva

  // Palette
  const primaryColor = [15, 23, 42] // #0f172a
  const accentColor = [2, 132, 199] // #0284c7
  const grayDark = [51, 65, 85]
  const grayLight = [248, 250, 252]

  // Header - Empresa
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 20)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let yEmpresa = 26
  if (config?.cif) { doc.text(`CIF: ${config.cif}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.direccion) { doc.text(config.direccion, 14, yEmpresa); yEmpresa += 4 }
  if (config?.telefono) { doc.text(`Tel: ${config.telefono}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.email) { doc.text(`Email: ${config.email}`, 14, yEmpresa); yEmpresa += 4 }

  // Header - Presupuesto Title (Right aligned)
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('PRESUPUESTO', 196, 20, { align: 'right' })

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(numero, 196, 27, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text(`Fecha: ${fecha}`, 196, 33, { align: 'right' })

  // Horizontal Divider
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 44, 196, 44)

  // Cliente Box
  const yCliente = 50
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(14, yCliente, 182, 32, 2, 2, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('DATOS DEL CLIENTE', 18, yCliente + 6)

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(cliente?.nombre || 'Cliente General', 18, yCliente + 12)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let infoLine = ''
  if (cliente?.dni) infoLine += `DNI/CIF: ${cliente.dni}   `
  if (cliente?.telefono) infoLine += `Tel: ${cliente.telefono}   `
  if (cliente?.email) infoLine += `Email: ${cliente.email}`
  if (infoLine) doc.text(infoLine, 18, yCliente + 17)

  // Dirección y Localidad Auto-detectada por CP
  const autoLoc = cliente?.cp ? getLocalidadFromCP(cliente.cp) : (cliente?.localidad || '')
  let addrLine = ''
  if (cliente?.direccion) addrLine += cliente.direccion
  if (cliente?.cp) addrLine += `${addrLine ? ' - ' : ''}CP ${cliente.cp}`
  if (autoLoc) addrLine += ` (${autoLoc})`
  if (addrLine) doc.text(addrLine, 18, yCliente + 22)

  if (vehiculo) {
    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    const vehText = `Vehículo: ${vehiculo.matricula} ${vehiculo.marca ? `- ${vehiculo.marca}` : ''} ${vehiculo.modelo ? `(${vehiculo.modelo})` : ''}`
    doc.text(vehText, 18, yCliente + 25)
  }

  // Table Header
  const yTable = 88
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(14, yTable, 182, 8, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('DESCRIPCIÓN DEL TRABAJO / RECAMBIO', 18, yTable + 5.5)
  doc.text('CANT.', 125, yTable + 5.5, { align: 'center' })
  doc.text('PRECIO', 155, yTable + 5.5, { align: 'right' })
  doc.text('TOTAL', 190, yTable + 5.5, { align: 'right' })

  // Table Rows
  let curY = yTable + 14
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)

  if (conceptos.length === 0) {
    doc.text('Sin conceptos detallados', 18, curY)
    curY += 8
  } else {
    conceptos.filter(c => c.descripcion.trim()).forEach((c) => {
      if (curY > 250) {
        doc.addPage()
        curY = 20
      }
      doc.text(c.descripcion, 18, curY)
      doc.text(String(c.cantidad), 125, curY, { align: 'center' })
      doc.text(`${c.precio.toFixed(2)} €`, 155, curY, { align: 'right' })
      doc.text(`${(c.cantidad * c.precio).toFixed(2)} €`, 190, curY, { align: 'right' })

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(14, curY + 2.5, 196, curY + 2.5)
      curY += 7.5
    })
  }

  // Totales Box
  curY = Math.max(curY + 6, 170)
  if (curY > 240) {
    doc.addPage()
    curY = 20
  }

  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(120, curY, 76, 28, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(120, curY, 76, 28, 2, 2, 'S')

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text('Base Imponible:', 124, curY + 7)
  doc.text(`${subtotal.toFixed(2)} €`, 190, curY + 7, { align: 'right' })

  if (aplicarIva) {
    doc.text('IVA (21%):', 124, curY + 13)
    doc.text(`${iva.toFixed(2)} €`, 190, curY + 13, { align: 'right' })
  } else {
    doc.text('IVA (0%):', 124, curY + 13)
    doc.text('0.00 €', 190, curY + 13, { align: 'right' })
  }

  doc.setDrawColor(15, 23, 42)
  doc.line(124, curY + 16, 192, curY + 16)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('TOTAL:', 124, curY + 23)
  doc.text(`${total.toFixed(2)} €`, 190, curY + 23, { align: 'right' })

  // Observaciones
  if (presupuesto.observaciones) {
    const yObs = curY + 34
    if (yObs < 250) {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('Observaciones:', 14, yObs)

      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
      const splitObs = doc.splitTextToSize(presupuesto.observaciones, 180)
      doc.text(splitObs, 14, yObs + 5)
    }
  }

  // Recuadro informativo de envío al pie de página (Email / WhatsApp)
  const fechaEnvioEmail = (presupuesto as any).enviado_email_at || (presupuesto.id ? localStorage.getItem(`presupuesto_${presupuesto.id}_email_at`) : null)
  const fechaEnvioWA = (presupuesto as any).enviado_whatsapp_at || (presupuesto.id ? localStorage.getItem(`presupuesto_${presupuesto.id}_wa_at`) : null)

  const fechaEnvio = fechaEnvioEmail || fechaEnvioWA || new Date().toISOString()
  const viaEnvio = fechaEnvioWA && !fechaEnvioEmail ? 'WhatsApp' : 'Email'

  let textoEnvio = ''
  try {
    const d = new Date(fechaEnvio)
    const fechaFmt = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaFmt = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    textoEnvio = `Presupuesto enviado el ${fechaFmt} a las ${horaFmt} h por ${viaEnvio}`
  } catch (e) {
    textoEnvio = `Presupuesto enviado por ${viaEnvio}`
  }

  // Dibujar Recuadro de Envío destacado en el pie A4
  doc.setFillColor(240, 253, 250) // Fondo verde menta / cian muy suave
  doc.roundedRect(14, 266, 182, 11, 2, 2, 'F')
  doc.setDrawColor(16, 185, 129) // Borde esmeralda / cian
  doc.setLineWidth(0.4)
  doc.roundedRect(14, 266, 182, 11, 2, 2, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(6, 95, 70) // Color texto esmeralda oscuro
  doc.text(textoEnvio.toUpperCase(), 105, 273, { align: 'center' })

  // Footer inferior
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('Gracias por su confianza. Este documento es un presupuesto orientativo válido durante 30 días.', 105, 286, { align: 'center' })

  return doc
}

export function generateFacturaPDF(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const numero = factura.numero || 'FAC-0001'
  const fecha = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')
  const conceptos = factura.conceptos || []
  const total = factura.total || conceptos.reduce((acc, c) => acc + (c.cantidad * c.precio * 1.21), 0)
  const subtotal = total / 1.21
  const iva = total - subtotal

  // Palette
  const primaryColor = [15, 23, 42]
  const accentColor = [16, 185, 129] // Emerald green for invoices
  const grayDark = [51, 65, 85]
  const grayLight = [248, 250, 252]

  // Header - Empresa
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 20)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let yEmpresa = 26
  if (config?.cif) { doc.text(`CIF: ${config.cif}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.direccion) { doc.text(config.direccion, 14, yEmpresa); yEmpresa += 4 }
  if (config?.telefono) { doc.text(`Tel: ${config.telefono}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.email) { doc.text(`Email: ${config.email}`, 14, yEmpresa); yEmpresa += 4 }

  // Header - Factura Title
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('FACTURA', 196, 20, { align: 'right' })

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(numero, 196, 27, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text(`Fecha: ${fecha}`, 196, 33, { align: 'right' })

  // Divider
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 44, 196, 44)

  // Cliente Box
  const yCliente = 50
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(14, yCliente, 182, 32, 2, 2, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('DATOS DEL CLIENTE', 18, yCliente + 6)

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(cliente?.nombre || 'Cliente General', 18, yCliente + 12)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let infoLine = ''
  if (cliente?.dni) infoLine += `DNI/CIF: ${cliente.dni}   `
  if (cliente?.telefono) infoLine += `Tel: ${cliente.telefono}   `
  if (cliente?.email) infoLine += `Email: ${cliente.email}`
  if (infoLine) doc.text(infoLine, 18, yCliente + 18)

  if (vehiculo) {
    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    const vehText = `Vehículo: ${vehiculo.matricula} ${vehiculo.marca ? `- ${vehiculo.marca}` : ''} ${vehiculo.modelo ? `(${vehiculo.modelo})` : ''}`
    doc.text(vehText, 18, yCliente + 25)
  }

  // Table Header
  const yTable = 88
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(14, yTable, 182, 8, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('DESCRIPCIÓN DEL CONCEPTO', 18, yTable + 5.5)
  doc.text('CANT.', 125, yTable + 5.5, { align: 'center' })
  doc.text('PRECIO', 155, yTable + 5.5, { align: 'right' })
  doc.text('TOTAL', 190, yTable + 5.5, { align: 'right' })

  // Table Rows
  let curY = yTable + 14
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)

  if (conceptos.length === 0) {
    doc.text('Sin conceptos detallados', 18, curY)
    curY += 8
  } else {
    conceptos.filter(c => c.descripcion.trim()).forEach((c) => {
      if (curY > 250) {
        doc.addPage()
        curY = 20
      }
      doc.text(c.descripcion, 18, curY)
      doc.text(String(c.cantidad), 125, curY, { align: 'center' })
      doc.text(`${c.precio.toFixed(2)} €`, 155, curY, { align: 'right' })
      doc.text(`${(c.cantidad * c.precio).toFixed(2)} €`, 190, curY, { align: 'right' })

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.line(14, curY + 2.5, 196, curY + 2.5)
      curY += 7.5
    })
  }

  // Totales Box & VERIFACTU QR Box
  curY = Math.max(curY + 6, 160)
  if (curY > 220) {
    doc.addPage()
    curY = 20
  }

  // --- SECCIÓN VERIFACTU (Izquierda) ---
  try {
    const qrDataUrl = generateVerifactuQRDataUrlSync(factura, config)
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 14, curY, 26, 26)
    } else {
      doc.setDrawColor(203, 213, 225)
      doc.rect(14, curY, 26, 26)
    }
  } catch (e) {
    console.warn('QR verifactu sync warning:', e)
  }

  // Título / Identificador VERI*FACTU
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('SISTEMA VERI*FACTU', 43, curY + 6)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text('Cotejo y Verificación Tributaria AEAT', 43, curY + 11)

  // Alusión a la norma que lo regula en cursiva y fuente tamaño 8 justo debajo del QR
  doc.setFont('Helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  const splitNormativa = doc.splitTextToSize(VERIFACTU_NORMATIVA_TEXT, 100)
  doc.text(splitNormativa, 14, curY + 31)

  // --- CAJA DE TOTALES (Derecha) ---
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(120, curY, 76, 28, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(120, curY, 76, 28, 2, 2, 'S')

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text('Base Imponible:', 124, curY + 7)
  doc.text(`${subtotal.toFixed(2)} €`, 190, curY + 7, { align: 'right' })

  doc.text('IVA (21%):', 124, curY + 13)
  doc.text(`${iva.toFixed(2)} €`, 190, curY + 13, { align: 'right' })

  doc.setDrawColor(15, 23, 42)
  doc.line(124, curY + 16, 192, curY + 16)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('TOTAL FACTURA:', 124, curY + 23)
  doc.text(`${total.toFixed(2)} €`, 190, curY + 23, { align: 'right' })

  // Observaciones
  if (factura.observaciones) {
    const yObs = curY + 44
    if (yObs < 265) {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.text('Observaciones:', 14, yObs)

      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
      const splitObs = doc.splitTextToSize(factura.observaciones, 180)
      doc.text(splitObs, 14, yObs + 5)
    }
  }

  // Footer
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Gracias por su confianza. Documento oficial emitido conforme a la legislación vigente.', 105, 285, { align: 'center' })

  return doc
}

export function downloadPresupuestoPDF(
  presupuesto: Partial<Presupuesto>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
) {
  const doc = generatePresupuestoPDF(presupuesto, cliente, vehiculo, config, expediente)
  const numero = expediente || presupuesto.numero || 'PRES-0001'
  doc.save(`Presupuesto_${numero}.pdf`)
}

export async function sendPresupuestoByEmail(
  presupuesto: Partial<Presupuesto>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) {
    return { success: false, error: 'No hay email configurado' }
  }

  const numero = expediente || presupuesto.numero || 'PRES-0001'
  const doc = generatePresupuestoPDF(presupuesto, cliente, vehiculo, config, expediente)
  const pdfBlob = doc.output('blob')

  // Obtener o generar token de invitación para el área de cliente
  let clientPortalUrl = ''
  try {
    if (cliente.id) {
      const { data: inv } = await supabase
        .from('cliente_invitaciones')
        .select('token')
        .eq('cliente_id', cliente.id)
        .maybeSingle()

      let token = inv?.token
      if (!token) {
        token = 'inv_' + crypto.randomUUID().slice(0, 8)
        await supabase.from('cliente_invitaciones').insert({
          cliente_id: cliente.id,
          vehiculo_id: vehiculo?.id || null,
          email: cliente.email,
          token: token
        })
      }
      const origin = window.location.origin || 'http://localhost:5174'
      clientPortalUrl = `${origin}/cliente/${token}`
    }
  } catch (e) {
    console.warn('Error resolviendo token de cliente para email:', e)
  }

  const messageBody = `Estimado/a ${cliente.nombre},\n\nLe adjuntamos el presupuesto ${numero} correspondiente a su vehículo ${vehiculo?.matricula ? `(${vehiculo.matricula})` : ''}.\n\nPara revisar los detalles del presupuesto y ELEGIR LA FECHA Y HORA DE SU CITA (disponible de 09:00 a 18:00 h), acceda directamente a su Área de Cliente pulsando en el siguiente enlace:\n${clientPortalUrl || window.location.origin}\n\nQuedamos a su entera disposición para cualquier duda o consulta.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`

  const result = await sendEstimate({
    to: cliente.email,
    documentId: presupuesto.id,
    documentNumber: numero,
    pdfContent: pdfBlob,
    subject: `Presupuesto ${numero} y Elección de Cita - ${config?.nombre_empresa || 'DM CAR'}`,
    message: messageBody,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })

  if (result.success && presupuesto.id) {
    const nowIso = new Date().toISOString()
    localStorage.setItem(`presupuesto_${presupuesto.id}_email_at`, nowIso)
    try {
      await supabase.from('presupuestos').update({ enviado_email_at: nowIso }).eq('id', presupuesto.id)
    } catch (e) {
      console.warn('Error actualizando enviado_email_at:', e)
    }
  }

  return result
}

export function downloadFacturaPDF(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
) {
  const doc = generateFacturaPDF(factura, cliente, vehiculo, config, expediente)
  const numero = factura.numero || 'FAC-0001'
  doc.save(`Factura_${numero}.pdf`)
}

// ─────────────────────────────────────────────────────────────
// 1. GENERADOR DE RECIBO DE ABONO (PARTICULARES)
// ─────────────────────────────────────────────────────────────
export function generateReciboAbonoPDF(
  factura: Partial<Factura>,
  abonoActual: number,
  cobrosPrevios: Cobro[],
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const numeroExp = expediente || factura.numero || 'EXP-0001'
  const fecha = new Date().toLocaleDateString('es-ES')
  const totalReparacion = factura.total || 0
  const sumaPrevios = cobrosPrevios.reduce((acc, c) => acc + c.importe, 0)
  const totalAbonadoAcumulado = sumaPrevios + abonoActual
  const saldoPendiente = Math.max(0, totalReparacion - totalAbonadoAcumulado)

  const primaryColor = [15, 23, 42]
  const accentColor = [2, 132, 199] // Azul
  const grayDark = [51, 65, 85]
  const grayLight = [248, 250, 252]

  // Header Empresa
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 20)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let yEmpresa = 26
  if (config?.cif) { doc.text(`CIF: ${config.cif}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.direccion) { doc.text(config.direccion, 14, yEmpresa); yEmpresa += 4 }
  if (config?.telefono) { doc.text(`Tel: ${config.telefono}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.email) { doc.text(`Email: ${config.email}`, 14, yEmpresa); yEmpresa += 4 }

  // Título RECIBO DE ABONO
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('RECIBO DE ABONO', 196, 20, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(`EXPEDIENTE: ${numeroExp}`, 196, 27, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text(`Fecha de emisión: ${fecha}`, 196, 33, { align: 'right' })

  // Divider
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 44, 196, 44)

  // Datos Cliente & Vehículo
  const yCliente = 50
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(14, yCliente, 182, 32, 2, 2, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('DATOS DEL CLIENTE', 18, yCliente + 6)

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(cliente?.nombre || 'Cliente Particular', 18, yCliente + 12)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let infoLine = ''
  if (cliente?.dni) infoLine += `DNI/NIE: ${cliente.dni}   `
  if (cliente?.telefono) infoLine += `Tel: ${cliente.telefono}   `
  if (cliente?.email) infoLine += `Email: ${cliente.email}`
  if (infoLine) doc.text(infoLine, 18, yCliente + 18)

  if (vehiculo) {
    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    const vehText = `Vehículo: ${vehiculo.matricula} ${vehiculo.marca ? `- ${vehiculo.marca}` : ''} ${vehiculo.modelo ? `(${vehiculo.modelo})` : ''}`
    doc.text(vehText, 18, yCliente + 25)
  }

  // Resumen del Estado de la Reparación
  const yTable = 88
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(14, yTable, 182, 8, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('DETALLE DEL COBRO Y ESTADO ECONÓMICO DEL EXPEDIENTE', 18, yTable + 5.5)

  let curY = yTable + 14
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)

  doc.text('Importe Total de la Reparación:', 18, curY)
  doc.setFont('Helvetica', 'bold')
  doc.text(`${totalReparacion.toFixed(2)} €`, 190, curY, { align: 'right' })
  curY += 8

  doc.setFont('Helvetica', 'normal')
  doc.text('Abonos Anteriores Acumulados:', 18, curY)
  doc.text(`${sumaPrevios.toFixed(2)} €`, 190, curY, { align: 'right' })
  curY += 8

  // Cuadro destacado del nuevo abono
  doc.setFillColor(240, 253, 244) // green-50
  doc.roundedRect(14, curY, 182, 12, 2, 2, 'F')
  doc.setDrawColor(34, 197, 94)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, curY, 182, 12, 2, 2, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(21, 128, 61)
  doc.text('IMPORTE ABONADO EN ESTE ACTO:', 18, curY + 7.5)
  doc.setFontSize(11)
  doc.text(`${abonoActual.toFixed(2)} €`, 190, curY + 7.5, { align: 'right' })
  curY += 18

  // Historial de Pagos
  if (cobrosPrevios.length > 0) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text('Historial de Abonos Anteriores:', 18, curY)
    curY += 6

    cobrosPrevios.forEach((c, idx) => {
      const fStr = c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : 'Fecha n/d'
      const met = c.metodo ? `(${c.metodo})` : ''
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
      doc.text(`• Abono #${idx + 1} (${fStr}) ${met}:`, 22, curY)
      doc.text(`${c.importe.toFixed(2)} €`, 190, curY, { align: 'right' })
      curY += 5
    })
    curY += 4
  }

  // Cuadro de Saldo Pendiente
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(120, curY, 76, 24, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(120, curY, 76, 24, 2, 2, 'S')

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text('Total Abonado:', 124, curY + 7)
  doc.text(`${totalAbonadoAcumulado.toFixed(2)} €`, 190, curY + 7, { align: 'right' })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(saldoPendiente > 0 ? 220 : 16, saldoPendiente > 0 ? 38 : 185, saldoPendiente > 0 ? 38 : 129)
  doc.text('IMPORTE PENDIENTE:', 124, curY + 16)
  doc.text(`${saldoPendiente.toFixed(2)} €`, 190, curY + 16, { align: 'right' })

  // Nota legal
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('NOTA IMPORTANTE:', 14, 260)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    'Este documento constituye un recibo y justificante de abono a cuenta de la reparación referenciada. No tiene validez de factura oficial. La factura oficial definitiva será expedida automáticamente una vez completado el abono íntegro de la reparación.',
    14,
    265,
    { maxWidth: 182 }
  )

  doc.text('GESTARIAN — Trazabilidad y Gestión de Taller', 105, 285, { align: 'center' })

  return doc
}

// ─────────────────────────────────────────────────────────────
// 1.B GENERADOR DE EXTRACTO DE CUENTA / REGULARIZACIÓN DE SALDO
// ─────────────────────────────────────────────────────────────
export function generateExtractoCuentaPDF(
  factura: Partial<Factura>,
  cobros: Cobro[],
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const numeroExp = expediente || factura.numero || 'EXP-0001'
  const fecha = new Date().toLocaleDateString('es-ES')
  const total = factura.total || 0
  const totalAbonado = factura.total_abonado || cobros.reduce((acc, c) => acc + c.importe, 0)
  const saldoPendiente = Math.max(0, total - totalAbonado)

  const primaryColor = [15, 23, 42]
  const redAccent = [220, 38, 38]
  const grayDark = [51, 65, 85]
  const grayLight = [248, 250, 252]

  // Header Empresa
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 20)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let yEmpresa = 26
  if (config?.cif) { doc.text(`CIF: ${config.cif}`, 14, yEmpresa); yEmpresa += 4 }
  if (config?.direccion) { doc.text(config.direccion, 14, yEmpresa); yEmpresa += 4 }
  if (config?.telefono) { doc.text(`Tel: ${config.telefono}`, 14, yEmpresa); yEmpresa += 4 }

  // Título EXTRACTO DE CUENTA
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(redAccent[0], redAccent[1], redAccent[2])
  doc.text('EXTRACTO DE CUENTA', 196, 20, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(`EXPEDIENTE: ${numeroExp}`, 196, 27, { align: 'right' })
  doc.text(`FACTURA: ${factura.numero || 'S/N'}`, 196, 33, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text(`Fecha: ${fecha}`, 196, 39, { align: 'right' })

  // Divider
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 44, 196, 44)

  // Datos Cliente & Vehículo
  const yCliente = 49
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(14, yCliente, 182, 28, 2, 2, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('ESTIMADO/A CLIENTE:', 18, yCliente + 6)

  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(cliente?.nombre || 'Cliente', 18, yCliente + 12)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let infoCli = ''
  if (cliente?.dni) infoCli += `DNI/CIF: ${cliente.dni}   `
  if (cliente?.telefono) infoCli += `Tel: ${cliente.telefono}   `
  if (cliente?.email) infoCli += `Email: ${cliente.email}`
  if (infoCli) doc.text(infoCli, 18, yCliente + 18)

  if (vehiculo) {
    doc.text(`Vehículo: ${vehiculo.matricula} ${vehiculo.marca ? `(${vehiculo.marca} ${vehiculo.modelo || ''})` : ''}`, 18, yCliente + 24)
  }

  // Estado del Expediente y Resumen Económico
  let curY = 84
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(14, curY, 182, 8, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('RESUMEN DE CUENTA Y SALDO DEL EXPEDIENTE', 18, curY + 5.5)

  curY += 14
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text('Total Factura / Expediente:', 18, curY)
  doc.setFont('Helvetica', 'bold')
  doc.text(`${total.toFixed(2)} €`, 190, curY, { align: 'right' })

  curY += 8
  doc.setFont('Helvetica', 'normal')
  doc.text('Total Abonado hasta la fecha:', 18, curY)
  doc.setFont('Helvetica', 'bold')
  doc.setTextColor(16, 185, 129)
  doc.text(`${totalAbonado.toFixed(2)} €`, 190, curY, { align: 'right' })

  curY += 8
  doc.setFont('Helvetica', 'bold')
  doc.setTextColor(redAccent[0], redAccent[1], redAccent[2])
  doc.text('SALDO PENDIENTE DE REGULARIZACIÓN:', 18, curY)
  doc.setFontSize(12)
  doc.text(`${saldoPendiente.toFixed(2)} €`, 190, curY, { align: 'right' })

  // Cronología de Abonos
  curY += 12
  doc.setFillColor(241, 245, 249)
  doc.rect(14, curY, 182, 7, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text('CRONOLOGÍA DE ABONOS REGISTRADOS', 18, curY + 5)

  curY += 10
  if (cobros.length === 0) {
    doc.setFont('Helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('No se han registrado abonos hasta el momento.', 18, curY)
    curY += 6
  } else {
    cobros.forEach((c, idx) => {
      const fStr = c.fecha ? new Date(c.fecha).toLocaleDateString('es-ES') : 'Fecha n/d'
      const met = c.metodo ? `(${c.metodo.toUpperCase()})` : ''
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      doc.text(`• Abono #${idx + 1} realizado el ${fStr} ${met}:`, 22, curY)
      doc.setFont('Helvetica', 'bold')
      doc.text(`+ ${c.importe.toFixed(2)} €`, 190, curY, { align: 'right' })
      curY += 6
    })
  }

  // Recuadro de Regularización
  curY = Math.max(curY + 6, 175)
  doc.setFillColor(254, 242, 242) // red-50
  doc.roundedRect(14, curY, 182, 38, 2, 2, 'F')
  doc.setDrawColor(239, 68, 68)
  doc.setLineWidth(0.4)
  doc.roundedRect(14, curY, 182, 38, 2, 2, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(185, 28, 28)
  doc.text('SOLICITUD DE REGULARIZACIÓN DE PAGO', 18, curY + 8)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(69, 10, 10)
  const regularizacionText = `Le informamos de que tiene un saldo pendiente de ${saldoPendiente.toFixed(2)} € correspondiente a la factura ${factura.numero || ''} (Expediente ${numeroExp}). Le rogamos proceda a la regularización del importe pendiente a la mayor brevedad posible para la cancelación de la deuda y emisión definitiva de su documentación contable.`
  const splitText = doc.splitTextToSize(regularizacionText, 174)
  doc.text(splitText, 18, curY + 15)

  if (config?.iban) {
    doc.setFont('Helvetica', 'bold')
    doc.text(`IBAN para transferencia: ${config.iban}`, 18, curY + 32)
  }

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('GESTARIAN — Extracto Oficial de Cuenta de Taller', 105, 286, { align: 'center' })

  return doc
}

export async function sendExtractoCuentaByEmail(
  factura: Partial<Factura>,
  cobros: Cobro[],
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) {
    return { success: false, error: 'El cliente no tiene email registrado' }
  }

  const numeroExp = expediente || factura.numero || 'EXP-0001'
  const saldoPendiente = Math.max(0, (factura.total || 0) - (factura.total_abonado || 0))
  const doc = generateExtractoCuentaPDF(factura, cobros, cliente, vehiculo, config, expediente)
  const pdfBlob = doc.output('blob')

  const origin = window.location.origin || 'http://localhost:5174'
  const messageBody = `Estimado/a ${cliente.nombre},\n\nLe remitimos adjunto el EXTRACTO DE CUENTA correspondiente al Expediente ${numeroExp} (Factura ${factura.numero || ''}).\n\n• Importe Total: ${(factura.total || 0).toFixed(2)} €\n• Total Abonado: ${(factura.total_abonado || 0).toFixed(2)} €\n• SALDO PENDIENTE: ${saldoPendiente.toFixed(2)} €\n\nLe recordamos la necesidad de regularizar este saldo pendiente a la mayor brevedad. Puede acceder a su Área de Cliente para consultar los detalles o ponerse en contacto con nosotros:\n${origin}\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`

  const result = await sendEstimate({
    to: cliente.email,
    documentId: factura.id,
    documentNumber: `Extracto_${factura.numero || numeroExp}`,
    pdfContent: pdfBlob,
    subject: `Extracto de Cuenta y Saldo Pendiente (${saldoPendiente.toFixed(2)} €) - Expediente ${numeroExp}`,
    message: messageBody,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id, tipo: 'extracto_cuenta' }
  })

  return result
}

// ─────────────────────────────────────────────────────────────
// 2. GENERADOR DE FACTURA PROFORMA (EMPRESAS / ORGANISMOS)
// ─────────────────────────────────────────────────────────────
export function generateFacturaProformaPDF(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string,
  cobros: Cobro[] = []
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const numeroProforma = factura.numero_proforma || factura.numero || 'FP260001'
  const numeroExp = expediente || 'EXP-0001'
  const fecha = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')
  const conceptos = factura.conceptos || []
  const total = factura.total || conceptos.reduce((acc, c) => acc + (c.cantidad * c.precio * 1.21), 0)
  const subtotal = total / 1.21
  const iva = total - subtotal

  const totalAbonado = cobros.reduce((acc, c) => acc + c.importe, 0)
  const saldoPendiente = Math.max(0, total - totalAbonado)

  const primaryColor = [15, 23, 42]
  const accentColor = [217, 119, 6] // Ámbar / Dorado
  const grayDark = [51, 65, 85]
  const grayLight = [248, 250, 252]

  // BANNER SUPERIOR CENTRADO MUY DESTACADO: FACTURA PROFORMA
  doc.setFillColor(254, 243, 199) // amber-100
  doc.rect(14, 10, 182, 10, 'F')
  doc.setDrawColor(245, 158, 11)
  doc.setLineWidth(0.5)
  doc.rect(14, 10, 182, 10, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(180, 83, 9)
  doc.text('*** FACTURA PROFORMA — DOCUMENTO NO VÁLIDO PARA DEDUCCIÓN FISCAL ***', 105, 16.5, { align: 'center' })

  // Header Empresa
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 28)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let yEmpresa = 33
  if (config?.cif) { doc.text(`CIF/NIF: ${config.cif}`, 14, yEmpresa); yEmpresa += 3.5 }
  if (config?.direccion) { doc.text(config.direccion, 14, yEmpresa); yEmpresa += 3.5 }
  if (config?.telefono) { doc.text(`Tel: ${config.telefono}`, 14, yEmpresa); yEmpresa += 3.5 }
  if (config?.email) { doc.text(`Email: ${config.email}`, 14, yEmpresa); yEmpresa += 3.5 }

  // Proforma Box Derecha
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('FACTURA PROFORMA', 196, 28, { align: 'right' })

  doc.setFontSize(10.5)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(`Nº PROFORMA: ${numeroProforma}`, 196, 34, { align: 'right' })
  doc.text(`EXPEDIENTE: ${numeroExp}`, 196, 39, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text(`Fecha: ${fecha}`, 196, 44, { align: 'right' })

  // Divider
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 49, 196, 49)

  // Cliente Box
  const yCliente = 53
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(14, yCliente, 182, 30, 2, 2, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text('DATOS FISCALES DEL CLIENTE / ENTIDAD', 18, yCliente + 5.5)

  doc.setFontSize(10.5)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(cliente?.nombre || 'Sociedad / Organismo', 18, yCliente + 11)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  let infoLine = ''
  if (cliente?.dni) infoLine += `CIF/NIF: ${cliente.dni}   `
  if (cliente?.telefono) infoLine += `Tel: ${cliente.telefono}   `
  if (cliente?.email) infoLine += `Email: ${cliente.email}`
  if (infoLine) doc.text(infoLine, 18, yCliente + 16.5)

  if (vehiculo) {
    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    const vehText = `Vehículo: ${vehiculo.matricula} ${vehiculo.marca ? `- ${vehiculo.marca}` : ''} ${vehiculo.modelo ? `(${vehiculo.modelo})` : ''}`
    doc.text(vehText, 18, yCliente + 23)
  }

  // Tabla Conceptos
  const yTable = 87
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(14, yTable, 182, 7.5, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text('DESCRIPCIÓN DEL CONCEPTO / TRABAJO', 18, yTable + 5)
  doc.text('CANT.', 125, yTable + 5, { align: 'center' })
  doc.text('PRECIO', 155, yTable + 5, { align: 'right' })
  doc.text('TOTAL', 190, yTable + 5, { align: 'right' })

  let curY = yTable + 12
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)

  conceptos.forEach((c) => {
    if (curY > 230) { doc.addPage(); curY = 20 }
    doc.text(c.descripcion, 18, curY)
    doc.text(String(c.cantidad), 125, curY, { align: 'center' })
    doc.text(`${c.precio.toFixed(2)} €`, 155, curY, { align: 'right' })
    doc.text(`${(c.cantidad * c.precio).toFixed(2)} €`, 190, curY, { align: 'right' })

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(14, curY + 2, 196, curY + 2)
    curY += 6.5
  })

  // Totales y Abonos
  curY = Math.max(curY + 4, 160)
  doc.setFillColor(grayLight[0], grayLight[1], grayLight[2])
  doc.roundedRect(110, curY, 86, 42, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(110, curY, 86, 42, 2, 2, 'S')

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(grayDark[0], grayDark[1], grayDark[2])
  doc.text('Base Imponible:', 114, curY + 6)
  doc.text(`${subtotal.toFixed(2)} €`, 192, curY + 6, { align: 'right' })

  doc.text('IVA (21%):', 114, curY + 12)
  doc.text(`${iva.toFixed(2)} €`, 192, curY + 12, { align: 'right' })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('TOTAL PROFORMA:', 114, curY + 19)
  doc.text(`${total.toFixed(2)} €`, 192, curY + 19, { align: 'right' })

  doc.setDrawColor(203, 213, 225)
  doc.line(114, curY + 22, 192, curY + 22)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(21, 128, 61)
  doc.text('Total Abonado:', 114, curY + 28)
  doc.text(`${totalAbonado.toFixed(2)} €`, 192, curY + 28, { align: 'right' })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(saldoPendiente > 0 ? 220 : 16, saldoPendiente > 0 ? 38 : 185, saldoPendiente > 0 ? 38 : 129)
  doc.text('SALDO PENDIENTE:', 114, curY + 36)
  doc.text(`${saldoPendiente.toFixed(2)} €`, 192, curY + 36, { align: 'right' })

  // Footer Legal
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'DOCUMENTO PROFORMA INFORMATIVO. No constituye documento tributario ni devengo de IVA deducible. La factura oficial con número F26XXXX será emitida una vez recibido el abono total.',
    105,
    285,
    { align: 'center', maxWidth: 180 }
  )

  return doc
}

// ─────────────────────────────────────────────────────────────
// 3. GENERADOR DE INFORME TRIMESTRAL PARA GESTORÍA
// ─────────────────────────────────────────────────────────────
export function generateInformeTrimestralPDF(
  quarter: number,
  year: number,
  facturasEmitidas: Factura[],
  facturasRecibidas: any[],
  config?: Configuracion | null
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const totalEmitidas = facturasEmitidas.reduce((s, f) => s + (f.total || 0), 0)
  const baseEmitidas = totalEmitidas / 1.21
  const ivaRepercutido = totalEmitidas - baseEmitidas

  const totalGastos = facturasRecibidas.reduce((s, f) => s + (f.total || f.base_imponible || 0), 0)
  const baseGastos = facturasRecibidas.reduce((s, f) => s + (f.base_imponible || 0), 0)
  const ivaSoportado = facturasRecibidas.reduce((s, f) => s + ((f.base_imponible || 0) * ((f.iva || 0) / 100)), 0)

  const resultadoIva = ivaRepercutido - ivaSoportado

  // Header
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(config?.nombre_empresa || 'DM CAR', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(2, 132, 199)
  doc.text(`INFORME RESUMEN TRIMESTRAL — Q${quarter} ${year}`, 196, 20, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(`Fecha de Cierre: ${new Date().toLocaleDateString('es-ES')}`, 196, 26, { align: 'right' })

  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.5)
  doc.line(14, 32, 196, 32)

  // Resumen Fiscal
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 38, 182, 45, 2, 2, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 38, 182, 45, 2, 2, 'S')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text('RESUMEN FISCAL DEL TRIMESTRE', 18, 45)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Total Facturas Emitidas Cerradas (${facturasEmitidas.length}):`, 18, 52)
  doc.text(`${totalEmitidas.toFixed(2)} € (Base: ${baseEmitidas.toFixed(2)} € | IVA: ${ivaRepercutido.toFixed(2)} €)`, 190, 52, { align: 'right' })

  doc.text(`Total Gastos / Facturas Recibidas (${facturasRecibidas.length}):`, 18, 59)
  doc.text(`${totalGastos.toFixed(2)} € (Base: ${baseGastos.toFixed(2)} € | IVA: ${ivaSoportado.toFixed(2)} €)`, 190, 59, { align: 'right' })

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Resultado IVA Trimestral (Repercutido - Soportado):', 18, 70)
  doc.text(`${resultadoIva.toFixed(2)} €`, 190, 70, { align: 'right' })

  return doc
}

// ─────────────────────────────────────────────────────────────
// 4. DESCARGAS Y ENVÍOS POR EMAIL AUTOMÁTICOS
// ─────────────────────────────────────────────────────────────
export function downloadReciboAbonoPDF(
  factura: Partial<Factura>,
  abonoActual: number,
  cobrosPrevios: Cobro[],
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
) {
  const doc = generateReciboAbonoPDF(factura, abonoActual, cobrosPrevios, cliente, vehiculo, config, expediente)
  doc.save(`Recibo_Abono_${expediente || factura.numero || 'EXP'}.pdf`)
}

export function downloadFacturaProformaPDF(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string,
  cobros: Cobro[] = []
) {
  const doc = generateFacturaProformaPDF(factura, cliente, vehiculo, config, expediente, cobros)
  const num = factura.numero_proforma || factura.numero || 'FP260001'
  doc.save(`Factura_Proforma_${num}.pdf`)
}

export async function sendReciboAbonoByEmail(
  factura: Partial<Factura>,
  abonoActual: number,
  cobrosPrevios: Cobro[],
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) return { success: false, error: 'Sin email configurado' }

  const numExp = expediente || factura.numero || 'EXP-0001'
  const doc = generateReciboAbonoPDF(factura, abonoActual, cobrosPrevios, cliente, vehiculo, config, expediente)
  const pdfBlob = doc.output('blob')

  return await sendInvoice({
    to: cliente.email,
    documentId: factura.id || 'recibo',
    documentNumber: `REC-${numExp}`,
    pdfContent: pdfBlob,
    subject: `Recibo de Abono (Expediente ${numExp}) - ${config?.nombre_empresa || 'DM CAR'}`,
    message: `Estimado/a ${cliente.nombre},\n\nLe adjuntamos el justificante del recibo de abono de ${abonoActual.toFixed(2)} € correspondiente a la reparación de su vehículo.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })
}

export async function sendFacturaProformaByEmail(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string,
  cobros: Cobro[] = []
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) return { success: false, error: 'Sin email configurado' }

  const numProforma = factura.numero_proforma || factura.numero || 'FP260001'
  const doc = generateFacturaProformaPDF(factura, cliente, vehiculo, config, expediente, cobros)
  const pdfBlob = doc.output('blob')

  return await sendInvoice({
    to: cliente.email,
    documentId: factura.id || 'proforma',
    documentNumber: numProforma,
    pdfContent: pdfBlob,
    subject: `Factura Proforma ${numProforma} - ${config?.nombre_empresa || 'DM CAR'}`,
    message: `Estimado/a ${cliente.nombre},\n\nLe adjuntamos la Factura Proforma ${numProforma} correspondiente a los trabajos presupuestados/realizados en su vehículo.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })
}

export async function sendFacturaByEmail(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null,
  expediente?: string
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) {
    return { success: false, error: 'No hay email configurado' }
  }

  const numero = factura.numero || 'FAC-0001'
  
  // 1. Generar PDF en memoria con jsPDF
  const doc = generateFacturaPDF(factura, cliente, vehiculo, config, expediente)
  const pdfBlob = doc.output('blob')

  // 2. Enviar mediante COMMUNICATION SERVICE
  const result = await sendInvoice({
    to: cliente.email,
    documentId: factura.id,
    documentNumber: numero,
    pdfContent: pdfBlob,
    subject: `Factura Oficial ${numero} - ${config?.nombre_empresa || 'DM CAR'}`,
    message: `Estimado/a ${cliente.nombre},\n\nLe adjuntamos su factura oficial ${numero} por importe total de ${(factura.total || 0).toFixed(2)} € (totalmente abonada).\n\nGracias por confiar en nosotros.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })

  if (result.success && factura.id && factura.id !== 'draft') {
    const nowIso = new Date().toISOString()
    localStorage.setItem(`factura_${factura.id}_email_at`, nowIso)
    try {
      await supabase.from('facturas').update({ enviado_email_at: nowIso }).eq('id', factura.id)
    } catch (e) {
      console.warn('Error actualizando enviado_email_at en factura:', e)
    }
  }

  return result
}

