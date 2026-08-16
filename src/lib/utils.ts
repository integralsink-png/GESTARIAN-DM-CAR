import type { Cliente, Presupuesto } from './types'

export function getExpediente(presupuesto: Partial<Presupuesto> & { expediente_id?: string | null }, cliente: Cliente | null | undefined, allClientes: Cliente[]): string {
  if (presupuesto?.expediente_id) {
    return presupuesto.expediente_id;
  }

  if (!presupuesto?.numero) return 'BORRADOR'
  if (!cliente) return presupuesto.numero

  let clienteNum = ''
  if (cliente) {
    if (cliente.numero) {
      clienteNum = cliente.numero.toString()
    } else {
      const sorted = [...(allClientes || [])].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      const idx = sorted.findIndex(c => c.id === cliente.id)
      if (idx !== -1) clienteNum = (idx + 1).toString()
    }
  }

  const pNum = presupuesto.numero || '';

  // Formato antiguo: P + XT + AA + NNNN
  if (pNum.length >= 9 && pNum.includes('T')) {
    const aa = pNum.substring(3, 5); 
    const nnnn = pNum.substring(pNum.length - 4); 
    return `${clienteNum}E${aa}${nnnn}`;
  }

  return `${clienteNum}${pNum}`;
}
