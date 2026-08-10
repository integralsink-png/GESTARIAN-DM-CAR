import type { Cliente, Presupuesto } from './types'

export function getExpediente(presupuesto: Partial<Presupuesto>, cliente: Cliente | null | undefined, allClientes: Cliente[]): string {
  if (!presupuesto.numero) return 'BORRADOR'
  if (!cliente) return presupuesto.numero

  // Usar el numero del campo de BD si existe
  if (cliente.numero) return `${cliente.numero}${presupuesto.numero}`

  // Fallback: calcular ordinal por fecha de alta
  const sorted = [...allClientes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const idx = sorted.findIndex(c => c.id === cliente.id)
  
  if (idx === -1) return presupuesto.numero
  return `${idx + 1}${presupuesto.numero}`
}
