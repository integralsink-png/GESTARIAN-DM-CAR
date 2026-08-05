import type { Factura, FacturaRecibida, Concepto } from './types'

const IVA_RATE = 0.21

function computeBaseIVA(conceptos: Concepto[]): { base: number; iva: number } {
  const base = conceptos.reduce((s, c) => s + c.cantidad * c.precio, 0)
  const iva = base * IVA_RATE
  return { base, iva }
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

function filterFacturas<T extends { fecha: string }>(
  facturas: T[],
  trimestreStart: string,
  trimestreEnd: string,
  exclude10Days: boolean
): T[] {
  return facturas.filter((f) => {
    const fDate = f.fecha
    
    // Si exclude10Days es true, y la fecha es en los primeros 10 dias del trimestre, excluir
    if (exclude10Days) {
      const d = parseDate(f.fecha)
      const start = parseDate(trimestreStart)
      // Comprobar si la fecha esta dentro de los 10 primeros dias del trimestre
      const diffTime = Math.abs(d.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
      
      if (f.fecha >= trimestreStart && diffDays <= 10) {
        return false // Excluir
      }
    }
    
    return f.fecha >= trimestreStart && f.fecha <= trimestreEnd
  })
}

export function exportToExcel(
  facturasEmitidas: Factura[],
  facturasRecibidas: FacturaRecibida[],
  trimestreStart: string,
  trimestreEnd: string,
  exclude10Days: boolean
) {
  const emitidas = filterFacturas(facturasEmitidas, trimestreStart, trimestreEnd, exclude10Days)
  const recibidas = filterFacturas(facturasRecibidas, trimestreStart, trimestreEnd, exclude10Days)

  let csv = 'Tipo;Fecha;Factura;Base Imponible;Cuota IVA;Total\\n'

  emitidas.forEach((f) => {
    const { base, iva } = computeBaseIVA(f.conceptos || [])
    csv += `Emitida;${f.fecha};${f.numero};${base.toFixed(2)};${iva.toFixed(2)};${f.total.toFixed(2)}\\n`
  })

  recibidas.forEach((f) => {
    const base = f.base_imponible || 0
    const ivaAmount = base * ((f.iva || 0) / 100)
    csv += `Recibida;${f.fecha};${f.numero};${base.toFixed(2)};${ivaAmount.toFixed(2)};${f.total.toFixed(2)}\\n`
  })

  return csv
}

export function exportToA3(
  facturasEmitidas: Factura[],
  facturasRecibidas: FacturaRecibida[],
  trimestreStart: string,
  trimestreEnd: string,
  exclude10Days: boolean
) {
  // A3 usually accepts fixed width or specific CSV (SUENLACE format).
  // We'll generate a standard A3-compatible CSV.
  const emitidas = filterFacturas(facturasEmitidas, trimestreStart, trimestreEnd, exclude10Days)
  const recibidas = filterFacturas(facturasRecibidas, trimestreStart, trimestreEnd, exclude10Days)

  let txt = 'CODIGO_CUENTA;FECHA;DOCUMENTO;CONCEPTO;BASE;PORCENTAJE_IVA;CUOTA_IVA;TOTAL\\n'

  emitidas.forEach((f) => {
    const { base, iva } = computeBaseIVA(f.conceptos || [])
    // Cuenta 7000000 para Ventas, 4300000 para Clientes
    txt += `70000000;${f.fecha};${f.numero};Venta ${f.numero};${base.toFixed(2)};21;${iva.toFixed(2)};${f.total.toFixed(2)}\\n`
  })

  recibidas.forEach((f) => {
    const base = f.base_imponible || 0
    const ivaAmount = base * ((f.iva || 0) / 100)
    // Cuenta 6000000 para Compras, 4000000 para Proveedores
    txt += `60000000;${f.fecha};${f.numero};Compra ${f.numero};${base.toFixed(2)};${f.iva || 0};${ivaAmount.toFixed(2)};${f.total.toFixed(2)}\\n`
  })

  return txt
}

export function exportToSAGE(
  facturasEmitidas: Factura[],
  facturasRecibidas: FacturaRecibida[],
  trimestreStart: string,
  trimestreEnd: string,
  exclude10Days: boolean
) {
  // Sage 50 usually accepts specific CSV format
  const emitidas = filterFacturas(facturasEmitidas, trimestreStart, trimestreEnd, exclude10Days)
  const recibidas = filterFacturas(facturasRecibidas, trimestreStart, trimestreEnd, exclude10Days)

  let txt = '"Tipo_Asiento","Fecha","Factura","Cuenta","Contrapartida","Concepto","Base","IVA","Total"\\n'

  emitidas.forEach((f) => {
    const { base, iva } = computeBaseIVA(f.conceptos || [])
    txt += `"Venta","${f.fecha}","${f.numero}","4300000","7000000","Fra. ${f.numero}","${base.toFixed(2)}","${iva.toFixed(2)}","${f.total.toFixed(2)}"\\n`
  })

  recibidas.forEach((f) => {
    const base = f.base_imponible || 0
    const ivaAmount = base * ((f.iva || 0) / 100)
    txt += `"Compra","${f.fecha}","${f.numero}","4000000","6000000","Fra. ${f.numero}","${base.toFixed(2)}","${ivaAmount.toFixed(2)}","${f.total.toFixed(2)}"\\n`
  })

  return txt
}

export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
