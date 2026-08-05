import { jsPDF } from 'jspdf'
import type { Presupuesto, Factura, Cliente, Vehiculo, Configuracion } from './types'
import { sendEstimate, sendInvoice } from '../services/communicationService'

export function generatePresupuestoPDF(
  presupuesto: Partial<Presupuesto>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const numero = presupuesto.numero || 'PRES-0001'
  const fecha = presupuesto.fecha ? new Date(presupuesto.fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')
  const conceptos = presupuesto.conceptos || []
  const subtotal = conceptos.reduce((acc, c) => acc + (c.cantidad * c.precio), 0)
  const iva = subtotal * 0.21
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

  doc.text('IVA (21%):', 124, curY + 13)
  doc.text(`${iva.toFixed(2)} €`, 190, curY + 13, { align: 'right' })

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
    if (yObs < 260) {
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

  // Footer
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Gracias por su confianza. Este documento es un presupuesto orientativo válido durante 30 días.', 105, 285, { align: 'center' })

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

  doc.text('IVA (21%):', 124, curY + 13)
  doc.text(`${iva.toFixed(2)} €`, 190, curY + 13, { align: 'right' })

  doc.setDrawColor(15, 23, 42)
  doc.line(124, curY + 16, 192, curY + 16)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('TOTAL FACTURA:', 124, curY + 23)
  doc.text(`${total.toFixed(2)} €`, 190, curY + 23, { align: 'right' })

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
  config?: Configuracion | null
) {
  const doc = generatePresupuestoPDF(presupuesto, cliente, vehiculo, config)
  const numero = presupuesto.numero || 'PRES-0001'
  doc.save(`Presupuesto_${numero}.pdf`)
}

export function downloadFacturaPDF(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null
) {
  const doc = generateFacturaPDF(factura, cliente, vehiculo, config)
  const numero = factura.numero || 'FAC-0001'
  doc.save(`Factura_${numero}.pdf`)
}

export async function sendPresupuestoByEmail(
  presupuesto: Partial<Presupuesto>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null
): Promise<{ success: boolean; error?: string }> {
  console.log('[DEBUG] sendPresupuestoByEmail clicked', { clienteEmail: cliente?.email, clienteNombre: cliente?.nombre });
  if (!cliente?.email) {
    alert('El cliente no tiene una dirección de correo electrónico configurada.')
    console.warn('[DEBUG] Cliente sin email, abortando envío.');
    return { success: false, error: 'No hay email configurado' }
  }

  const numero = presupuesto.numero || 'PRES-0001'
  
  // 1. Generar PDF en memoria con jsPDF
  const doc = generatePresupuestoPDF(presupuesto, cliente, vehiculo, config)
  const pdfBlob = doc.output('blob')
  console.log('[INSTRUMENTATION PDF Presupuesto]', {
    pdfBlobSize: pdfBlob.size,
    pdfBlobType: pdfBlob.type
  })

  // 2. Enviar mediante COMMUNICATION SERVICE
  const result = await sendEstimate({
    to: cliente.email,
    documentId: presupuesto.id,
    documentNumber: numero,
    pdfContent: pdfBlob,
    subject: `Presupuesto ${numero} - ${config?.nombre_empresa || 'DM CAR'}`,
    message: `Estimado/a ${cliente.nombre},\n\nLe adjuntamos el presupuesto ${numero} correspondiente a su vehículo.\n\nQuedamos a su entera disposición para cualquier duda o aclaración.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })

  if (result.success) {
    alert(`✅ PDF ENVIADO CON ÈXITO`)
  } else {
    alert(`⚠️ No se pudo completar el envío del presupuesto: ${result.error}`)
  }

  return result
}

export async function sendFacturaByEmail(
  factura: Partial<Factura>,
  cliente?: Cliente | null,
  vehiculo?: Vehiculo | null,
  config?: Configuracion | null
): Promise<{ success: boolean; error?: string }> {
  if (!cliente?.email) {
    alert('El cliente no tiene una dirección de correo electrónico configurada.')
    return { success: false, error: 'No hay email configurado' }
  }

  const numero = factura.numero || 'FAC-0001'
  
  // 1. Generar PDF en memoria con jsPDF
  const doc = generateFacturaPDF(factura, cliente, vehiculo, config)
  const pdfBlob = doc.output('blob')

  // 2. Enviar mediante COMMUNICATION SERVICE
  const result = await sendInvoice({
    to: cliente.email,
    documentId: factura.id,
    documentNumber: numero,
    pdfContent: pdfBlob,
    subject: `Factura ${numero} - ${config?.nombre_empresa || 'DM CAR'}`,
    message: `Estimado/a ${cliente.nombre},\n\nLe adjuntamos su factura ${numero} por importe total de ${(factura.total || 0).toFixed(2)} €.\n\nGracias por confiar en nosotros.\n\nAtentamente,\n${config?.nombre_empresa || 'DM CAR'}`,
    metadata: { cliente_id: cliente.id, vehiculo_id: vehiculo?.id }
  })

  if (result.success) {
    alert(`✅ PDF ENVIADO CON ÈXITO`)
  } else {
    alert(`⚠️ No se pudo completar el envío de la factura: ${result.error}`)
  }

  return result
}

