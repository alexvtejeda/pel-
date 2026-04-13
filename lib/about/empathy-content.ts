export type EmpathyQuadrant = {
  label: string
  body: string
}

export type EmpathySegment = {
  id: 'a' | 'b' | 'c'
  personaName: string
  age: number
  archetype: string
  blurb: string
  colorVar: string
  character: string
  quadrants: {
    piensa: EmpathyQuadrant
    ve: EmpathyQuadrant
    oye: EmpathyQuadrant
    dice: EmpathyQuadrant
    duele: EmpathyQuadrant
    aspira: EmpathyQuadrant
  }
}

export const QUADRANT_ORDER = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const

export const EMPATHY_SEGMENTS: EmpathySegment[] = [
  {
    id: 'a',
    personaName: 'Laura',
    age: 24,
    archetype: 'Joven digital sin mascota',
    blurb: 'Soltera, trabaja en marketing digital. Ama los animales pero nunca ha tenido mascota propia.',
    colorVar: 'var(--color-pop-700)',
    character: '/assets/about/empathy/segment-a-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: 'Quiere adoptar pero no sabe cómo. Siente culpa al ver animales abandonados. Ve la adopción como acto ético.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Publicaciones de rescate en Instagram. Poca información clara sobre adopción en RD. Pet shops vendiendo razas.',
      },
      oye: {
        label: '¿Qué oye?',
        body: '"Adoptar es complicado, mejor compra". Historias de mascotas abandonadas en redes. "Las mascotas cuestan mucho".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Busca info en Instagram y Google sin respuestas claras. Pospone adoptar por falta de confianza. Pagaría < RD$5,000/mes.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'No sabe dónde buscar (35%). Falta de información clara (29%). Procesos largos y complicados. Desconfianza en canales existentes.',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'Guía paso a paso del proceso. Saber el costo mensual real. App que centralice todo. Planes integrales de cuidado (82%).',
      },
    },
  },
  {
    id: 'b',
    personaName: 'Carlos',
    age: 26,
    archetype: 'Joven dueño comprometido',
    blurb: 'Soltero, adoptó un perro callejero hace un año. Lo considera su hijo. Trabaja tiempo completo.',
    colorVar: 'var(--color-slate-500)',
    character: '/assets/about/empathy/segment-b-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: '"Mi mascota es mi hijo/familia". Abrumado por costos veterinarios inesperados. Orgulloso de haber adoptado.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Veterinarios con precios variables. Tips de otros dueños en redes. Servicios de grooming desorganizados.',
      },
      oye: {
        label: '¿Qué oye?',
        body: 'Recomendaciones de veterinarios de amigos. "No te olvides de la vacuna". "Adopta, no compres".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Lleva al veterinario cuando hay problema (78%). Busca en Google ante síntomas. Pagaría RD$5K-7K/mes por plan completo.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'Costos veterinarios altos (44%). Falta de tiempo para cuidado (44%). Olvidar vacunas y citas (33%).',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'Todo el cuidado en una sola app. Recordatorios automáticos. Servicios a domicilio. Directorio veterinario confiable (47%).',
      },
    },
  },
  {
    id: 'c',
    personaName: 'María',
    age: 52,
    archetype: 'Adulto familiar tradicional',
    blurb: 'Casada, con hijos adultos. Ha tenido mascotas toda su vida. Considera adoptar de nuevo.',
    colorVar: 'oklch(70% 0.15 65)',
    character: '/assets/about/empathy/segment-c-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: '"Las mascotas son compañía y familia". Nostalgia por mascotas anteriores. Quiere cuidar bien sin complicarse.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Hijos usando apps para todo. Publicaciones en Instagram/WhatsApp. Veterinarios de toda la vida.',
      },
      oye: {
        label: '¿Qué oye?',
        body: 'Recomendaciones de amigos y familiares (canal #1). "Hay animalitos en la calle que necesitan hogar". "Los veterinarios están caros".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Siempre lleva al veterinario de confianza. No sabe cómo adoptar formalmente (82%). Pagaría < RD$5,000/mes.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'Procesos largos y confusos (35%). Dificultad para recordar vacunas. Sensibilidad alta al precio.',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'App sencilla con recordatorios. Veterinarios confiables sin buscar mucho. Plan básico económico. Transporte puerta a puerta.',
      },
    },
  },
]
