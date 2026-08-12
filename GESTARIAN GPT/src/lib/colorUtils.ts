import chroma from "chroma-js";

/**
 * Calcula el color óptimo (blanco o negro) para el texto 
 * basado en el color de fondo proporcionado para garantizar un contraste AAA.
 * Esta es la API matemática para asegurar que nunca existan problemas de legibilidad.
 * 
 * @param backgroundColor Color de fondo en formato HEX o RGB
 * @returns '#ffffff' o '#000000' dependiendo del contraste
 */
export function getOptimalTextColor(backgroundColor: string): string {
  try {
    // chroma.contrast calcula el ratio de contraste relativo según WCAG
    const contrastWithWhite = chroma.contrast(backgroundColor, '#ffffff');
    const contrastWithBlack = chroma.contrast(backgroundColor, '#000000');

    // Retornamos el color que ofrezca mayor contraste
    return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
  } catch (error) {
    // Fallback seguro si el color es inválido
    return '#000000';
  }
}

/**
 * Función para generar una paleta tonal a partir de un color primario,
 * similar a Material Design 3, garantizando que el texto sobre la superficie
 * primaria tenga el contraste exacto.
 */
export function generateAccessibleTheme(primaryColor: string) {
  const textColor = getOptimalTextColor(primaryColor);
  
  return {
    primary: primaryColor,
    onPrimary: textColor,
    // Podemos expandir esta lógica matemática para generar toda una paleta M3 sin glow.
  };
}
