export type TipoAvisoFiscal =
  | 'aviso_20'
  | 'aviso_25'
  | 'permiso_30'
  | 'permiso_5'
  | 'aviso_9'
  | 'envio_10'

export interface CronEvent {
  tipo: TipoAvisoFiscal
  mensaje: string
  requierePermiso?: boolean
  fechaDisparo: Date
}

export class CronFiscalService {
  private static KEY = 'gestarian_cron_fiscal_status'

  // Devuelve el estado guardado de los avisos enviados
  static getStatus(): Record<string, boolean> {
    try {
      const data = localStorage.getItem(this.KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  }

  static markAsDone(avisoId: string) {
    const status = this.getStatus()
    status[avisoId] = true
    localStorage.setItem(this.KEY, JSON.stringify(status))
  }

  static isDone(avisoId: string): boolean {
    return !!this.getStatus()[avisoId]
  }

  // Comprueba la fecha actual y devuelve el evento correspondiente (si hay alguno pendiente)
  static checkCurrentDate(): CronEvent | null {
    const now = new Date()
    const month = now.getMonth() // 0-11
    const date = now.getDate()
    const year = now.getFullYear()
    
    // Meses pre-cierre (Marzo=2, Junio=5, Septiembre=8, Diciembre=11)
    const isPreCierre = [2, 5, 8, 11].includes(month)
    // Meses de cierre (Abril=3, Julio=6, Octubre=9, Enero=0)
    const isCierre = [3, 6, 9, 0].includes(month)

    const quarter = Math.floor(month / 3) + 1 // Q1, Q2, Q3, Q4
    const idPrefix = `Q${quarter}-${year}`
    const prevQuarter = quarter === 1 ? 4 : quarter - 1
    const prevIdPrefix = quarter === 1 ? `Q4-${year - 1}` : `Q${prevQuarter}-${year}`

    if (isPreCierre) {
      if (date >= 20 && !this.isDone(`${idPrefix}-aviso_20`)) {
        return { tipo: 'aviso_20', mensaje: "Recuerda ir adjuntando las facturas de gastos pendientes, se acerca el cierre trimestral.", fechaDisparo: now }
      }
      if (date >= 25 && !this.isDone(`${idPrefix}-aviso_25`)) {
        return { tipo: 'aviso_25', mensaje: "Recuerda ir adjuntando las facturas de gastos pendientes, se acerca el cierre trimestral.", fechaDisparo: now }
      }
      if (date >= 30 && !this.isDone(`${idPrefix}-permiso_30`)) {
        return { tipo: 'permiso_30', mensaje: "El cierre trimestral está a la vuelta de la esquina. ¿Me das permiso para enviar el trimestre a la gestoría cuando esté listo?", requierePermiso: true, fechaDisparo: now }
      }
    }

    if (isCierre) {
      // Los avisos del mes de cierre corresponden al trimestre anterior
      if (date >= 5 && !this.isDone(`${prevIdPrefix}-permiso_5`) && !this.hasPermiso(prevIdPrefix)) {
        return { tipo: 'permiso_5', mensaje: "Aún no tengo permiso para enviar el informe trimestral a tu gestoría. ¿Me das permiso para enviarlo?", requierePermiso: true, fechaDisparo: now }
      }
      if (date >= 9 && !this.isDone(`${prevIdPrefix}-aviso_9`)) {
        return { tipo: 'aviso_9', mensaje: "Mañana a las 18:00 se enviará el informe trimestral a tu gestoría automáticamente. Si no has incluido alguna factura, no te preocupes, en el próximo trimestre la podrás incluir.", fechaDisparo: now }
      }
      if (date >= 10) {
        // Día 10: si son más de las 18:00 (o días posteriores), forzamos envío si no se ha hecho
        const isPast18 = now.getHours() >= 18 || date > 10
        if (isPast18 && !this.isDone(`${prevIdPrefix}-envio_10`)) {
          return { tipo: 'envio_10', mensaje: "He procedido a enviar automáticamente el informe trimestral a tu gestoría.", fechaDisparo: now }
        }
      }
    }

    return null
  }

  static hasPermiso(idPrefix: string): boolean {
    return !!this.getStatus()[`${idPrefix}-permiso_concedido`]
  }

  static darPermiso() {
    const now = new Date()
    const month = now.getMonth()
    const quarter = Math.floor(month / 3) + 1
    const year = now.getFullYear()
    
    // Si estamos en mes de cierre, el permiso es para el trimestre anterior
    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year
    
    const idPrefix = `Q${targetQuarter}-${targetYear}`
    const status = this.getStatus()
    status[`${idPrefix}-permiso_concedido`] = true
    localStorage.setItem(this.KEY, JSON.stringify(status))
  }

  static getAvisoId(tipo: TipoAvisoFiscal): string {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const quarter = Math.floor(month / 3) + 1
    
    const isCierre = [3, 6, 9, 0].includes(month)
    const targetQuarter = isCierre ? (quarter === 1 ? 4 : quarter - 1) : quarter
    const targetYear = isCierre && quarter === 1 ? year - 1 : year

    return `Q${targetQuarter}-${targetYear}-${tipo}`
  }
}
