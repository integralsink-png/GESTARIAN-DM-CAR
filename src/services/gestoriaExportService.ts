import { supabase } from '../lib/supabase'
import { exportToA3, exportToSAGE, exportToExcel } from '../lib/accountingExporters'
import { generateInformeTrimestralPDF } from '../lib/pdfGenerator'

export async function enviarTrimestreGestoriaAutomático() {
  try {
    // 1. Obtener email de la gestoría de configuración
    const { data: config } = await supabase.from('configuracion').select('*').eq('id', 1).maybeSingle()
    const emailGestoria = config?.email_gestoria
    if (!emailGestoria) {
      console.warn("No hay email de gestoría configurado. No se puede enviar el informe.")
      return false
    }

    // 2. Determinar el trimestre a enviar. Si estamos en enero, abril, julio, octubre (meses de cierre), enviamos el anterior.
    const now = new Date()
    const month = now.getMonth() // 0-11
    const year = now.getFullYear()
    const quarter = Math.floor(month / 3) + 1

    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year

    // Definir fechas inicio y fin del trimestre objetivo
    // Q1 = Ene-Mar (0-2), Q2 = Abr-Jun (3-5), Q3 = Jul-Sep (6-8), Q4 = Oct-Dic (9-11)
    const startMonth = (targetQuarter - 1) * 3
    const endMonth = startMonth + 2
    
    // Fechas en formato YYYY-MM-DD
    const startDate = new Date(targetYear, startMonth, 1)
    const endDate = new Date(targetYear, endMonth + 1, 0) // Último día del mes fin
    
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]

    // 3. Obtener facturas emitidas (cerradas) y recibidas
    const { data: facturasEmitidas } = await supabase
      .from('facturas')
      .select('*')
      .gte('fecha', startStr)
      .lte('fecha', endStr)

    const { data: facturasRecibidas } = await supabase
      .from('facturas_recibidas')
      .select('*')
      .gte('fecha', startStr)
      .lte('fecha', endStr)

    // 4. Generar archivos (strings en texto plano / CSV / PDF)
    const em = facturasEmitidas || []
    const rec = facturasRecibidas || []
    
    const a3Content = exportToA3(em, rec, startStr, endStr, false)
    const sageContent = exportToSAGE(em, rec, startStr, endStr, false)
    const csvContent = exportToExcel(em, rec, startStr, endStr, false)

    // Generar PDF del informe trimestral
    const pdfDoc = generateInformeTrimestralPDF(targetQuarter, targetYear, em as any, rec, config)
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1]

    // Función helper para convertir string UTF-8 a Base64 sin problemas de tildes
    const toBase64 = (str: string) => {
      const bytes = new TextEncoder().encode(str)
      const binString = String.fromCodePoint(...bytes)
      return btoa(binString)
    }

    // 5. Preparar adjuntos (A3, SAGE, CSV, PDF)
    const adjuntos = [
      {
        filename: `GESTARIAN_INFORME_TRIMESTRAL_Q${targetQuarter}_${targetYear}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf'
      },
      {
        filename: `GESTARIAN_A3_Q${targetQuarter}_${targetYear}.txt`,
        content: toBase64(a3Content),
        contentType: 'text/plain'
      },
      {
        filename: `GESTARIAN_SAGE_Q${targetQuarter}_${targetYear}.txt`,
        content: toBase64(sageContent),
        contentType: 'text/plain'
      },
      {
        filename: `GESTARIAN_EXCEL_Q${targetQuarter}_${targetYear}.csv`,
        content: toBase64(csvContent),
        contentType: 'text/csv'
      }
    ]

    const appOrigin = window.location.origin
    const enlaceFacturas = `${appOrigin}/facturas`

    // 6. Enviar vía Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-communication', {
      body: {
        to: emailGestoria,
        subject: `Cierre Trimestral Q${targetQuarter} ${targetYear} - ${config?.nombre_empresa || 'DM CAR'}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
            <h2 style="color: #0284c7;">Informe de Cierre Trimestral Q${targetQuarter} ${targetYear}</h2>
            <p>Estimados señores,</p>
            <p>Adjuntamos la documentación contable y fiscal correspondiente al cierre del trimestre <strong>Q${targetQuarter} del año ${targetYear}</strong> de la empresa <strong>${config?.nombre_empresa || 'DM CAR'}</strong> (CIF: ${config?.cif || 'N/A'}).</p>
            
            <p><strong>Archivos adjuntos incluidos:</strong></p>
            <ul>
              <li>Informe Resumen Fiscal Trimestral (PDF)</li>
              <li>Archivo de integración contable A3 (.txt)</li>
              <li>Archivo de integración contable SAGE (.txt)</li>
              <li>Libro registro de Facturas Emitidas y Recibidas en Excel (.csv)</li>
            </ul>

            <p>Asimismo, pueden acceder y consultar el histórico completo de facturas oficiales cerradas en el siguiente enlace del sistema:</p>
            <p style="margin: 20px 0;"><a href="${enlaceFacturas}" style="background-color: #0f172a; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Acceder a Base de Datos de Facturas Cerradas</a></p>

            <p>Atentamente,<br><strong>${config?.nombre_empresa || 'GESTARIAN'}</strong></p>
          </div>
        `,
        attachments: adjuntos
      }
    })

    if (edgeError || !edgeData?.success) {
      console.error("Error al enviar el trimestre a la gestoría:", edgeError || edgeData)
      return false
    }

    return true
  } catch (error) {
    console.error("Excepción en enviarTrimestreGestoriaAutomático:", error)
    return false
  }
}
