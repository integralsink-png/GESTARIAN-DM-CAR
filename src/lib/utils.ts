import type { Cliente, Presupuesto } from './types'

export function getExpediente(presupuesto: Partial<Presupuesto>, cliente: Cliente | null | undefined, allClientes: Cliente[]): string {
  if (!presupuesto.numero) return 'BORRADOR'
  if (!cliente) return presupuesto.numero

  let clienteNum = ''
  if (cliente) {
    if (cliente.numero) {
      clienteNum = cliente.numero.toString()
    } else {
      const sorted = [...allClientes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const idx = sorted.findIndex(c => c.id === cliente.id)
      if (idx !== -1) clienteNum = (idx + 1).toString()
    }
  }

  const pNum = presupuesto.numero;

  // Nuevo formato: P + XT + AA + NNNN (Ejemplo: P3T260001 -> longitud 9)
  if (pNum.length >= 9 && pNum.includes('T')) {
    // Ejemplo pNum: P3T260001
    const aa = pNum.substring(3, 5); // extrae "26"
    const nnnn = pNum.substring(pNum.length - 4); // extrae "0001"
    return `${clienteNum}E${aa}${nnnn}`;
  }

  // Antiguo formato o cualquier otro: concatenar
  return `${clienteNum}${pNum}`;
}
