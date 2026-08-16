import type { Variants } from 'framer-motion';

/**
 * Duración total unificada desde la aparición del primer icono hasta el último: 1.5 segundos.
 */
export const TOTAL_DROPDOWN_ANIMATION_TIME = 1.5; // segundos

/**
 * Genera las variantes de contenedor calculando el stagger exacto para que
 * la secuencia completa desde el primer icono al último dure exactamente 1.5 segundos.
 */
export function getDropdownStaggerVariants(itemCount = 8, totalDuration = TOTAL_DROPDOWN_ANIMATION_TIME): Variants {
  const count = Math.max(1, itemCount);
  const stagger = count > 1 ? totalDuration / (count - 1) : 0;

  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: Math.min(stagger * 0.4, 0.06),
        staggerDirection: -1,
      },
    },
  };
}

/**
 * Variantes individuales para cada icono o fila con fade-in suave, escala y traslación Y.
 */
export const dropdownItemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.82,
    y: 12,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.82,
    y: 8,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * Variantes para el contenedor del panel desplegable
 */
export const dropdownPanelVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.28,
      ease: [0.4, 0, 1, 1],
    },
  },
};
