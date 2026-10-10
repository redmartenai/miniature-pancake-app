import type { Transition, Variants } from 'framer-motion'

/** Easing curves lifted from the landing page so the app moves like the story. */
export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  calm: [0.32, 0.72, 0.28, 1] as const,
  ez: [0.4, 0, 0.2, 1] as const,
}

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 }
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 30 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: ease.calm } },
}

/** Parent container that staggers its fadeUp children. */
export const stagger = (gap = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.out } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.25, ease: ease.ez } },
}

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: ease.ez } },
}

export const tap = { scale: 0.97 }
export const hoverLift = { y: -2, transition: { duration: 0.2, ease: ease.out } }
