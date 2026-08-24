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

export function formatDateShort(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

/**
 * Valida el NIF (DNI autónomo), NIE (extranjeros) y CIF (sociedades) según el algoritmo oficial de control de la AEAT (Agencia Tributaria Española).
 */
export function validarDocumentoAEAT(doc: string): { valido: boolean; tipo: 'DNI/NIF' | 'NIE' | 'CIF' | 'DESCONOCIDO'; error?: string } {
  if (!doc) return { valido: false, tipo: 'DESCONOCIDO', error: 'Documento vacío' };
  
  const clean = doc.trim().toUpperCase().replace(/[\s\-_.]/g, '');
  if (clean.length !== 9) {
    return { valido: false, tipo: 'DESCONOCIDO', error: 'Debe contener exactamente 9 caracteres (ej. 12345678Z, B12345678)' };
  }

  const letrasDNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

  // 1. DNI / NIF Estándar Autónomos (8 dígitos + 1 letra de control)
  if (/^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/.test(clean)) {
    const num = parseInt(clean.substring(0, 8), 10);
    const letraEsperada = letrasDNI[num % 23];
    const letraActual = clean.charAt(8);
    if (letraEsperada === letraActual) {
      return { valido: true, tipo: 'DNI/NIF' };
    }
    return { valido: false, tipo: 'DNI/NIF', error: `Letra de control incorrecta. Debería ser '${letraEsperada}'` };
  }

  // 2. NIE Extranjeros residentes (X, Y, Z + 7 dígitos + 1 letra)
  if (/^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/.test(clean)) {
    let prefijo = clean.charAt(0);
    let digitoReemplazo = '0';
    if (prefijo === 'Y') digitoReemplazo = '1';
    if (prefijo === 'Z') digitoReemplazo = '2';
    
    const numNIE = parseInt(digitoReemplazo + clean.substring(1, 8), 10);
    const letraEsperada = letrasDNI[numNIE % 23];
    const letraActual = clean.charAt(8);
    if (letraEsperada === letraActual) {
      return { valido: true, tipo: 'NIE' };
    }
    return { valido: false, tipo: 'NIE', error: `Letra NIE incorrecta. Debería ser '${letraEsperada}'` };
  }

  // 3. CIF Sociedades / Entidades (Letra organización + 7 dígitos + dígito/letra control)
  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(clean)) {
    const letraInicial = clean.charAt(0);
    const digitos = clean.substring(1, 8);
    const controlChar = clean.charAt(8);

    let sumaPares = 0;
    let sumaImpares = 0;

    for (let i = 0; i < 7; i++) {
      const n = parseInt(digitos.charAt(i), 10);
      if (i % 2 === 0) { // Posiciones impares 1, 3, 5, 7 (índice 0, 2, 4, 6)
        const doble = n * 2;
        sumaImpares += Math.floor(doble / 10) + (doble % 10);
      } else { // Posiciones pares 2, 4, 6 (índice 1, 3, 5)
        sumaPares += n;
      }
    }

    const sumaTotal = sumaPares + sumaImpares;
    const digitoControl = (10 - (sumaTotal % 10)) % 10;
    const letrasControlCIF = 'JABCDEFGHI';

    // Tipos de CIF que requieren dígito numérico, letra, o admiten ambos
    const soloLetra = /^[KPQRSNW]/.test(letraInicial);
    const soloNumero = /^[ABEH]/.test(letraInicial);

    const digitoStr = digitoControl.toString();
    const letraStr = letrasControlCIF[digitoControl];

    if (soloNumero) {
      if (controlChar === digitoStr) return { valido: true, tipo: 'CIF' };
      return { valido: false, tipo: 'CIF', error: `Dígito de control incorrecto. Debería ser '${digitoStr}'` };
    }
    if (soloLetra) {
      if (controlChar === letraStr) return { valido: true, tipo: 'CIF' };
      return { valido: false, tipo: 'CIF', error: `Letra de control incorrecta. Debería ser '${letraStr}'` };
    }

    // Admite tanto letra como número
    if (controlChar === digitoStr || controlChar === letraStr) {
      return { valido: true, tipo: 'CIF' };
    }
    return { valido: false, tipo: 'CIF', error: `Control CIF incorrecto. Debería ser '${digitoStr}' o '${letraStr}'` };
  }

  return { valido: false, tipo: 'DESCONOCIDO', error: 'Formato de NIF/CIF no válido' };
}

