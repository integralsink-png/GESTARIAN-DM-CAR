export type MetisTool =
  | 'search_clients'
  | 'get_client'
  | 'search_vehicles'
  | 'get_vehicle'
  | 'search_quotes'
  | 'get_quote'
  | 'search_repairs'
  | 'get_repair'
  | 'search_invoices'
  | 'get_invoice'
  | 'search_supplier_invoices'
  | 'get_supplier_invoice'
  | 'search_incidents'
  | 'get_incident'
  | 'search_appointments'
  | 'search_communications'
  | 'search_accounting_reports'
  | 'get_workshop_case'

export interface MetisAction {
  type: MetisTool
  params: Record<string, unknown>
}

export interface MetisResponse {
  message: string

  actions?: MetisAction[]

  openEntity?: {
    type:
      | 'client'
      | 'vehicle'
      | 'quote'
      | 'repair'
      | 'invoice'
      | 'supplier_invoice'
      | 'incident'
    id: string
  }
}
