export type LeanCanvasBlock = {
  id: string
  title: string
  shortText: string
  fullText: string
}

export type LeanCanvasColumn = {
  id: string
  cells: LeanCanvasBlock[]
  weight?: number
}

export type LeanCanvas = {
  top: LeanCanvasColumn[]
  bottom: LeanCanvasColumn[]
}

const socios: LeanCanvasBlock = {
  id: 'socios',
  title: 'Socios Clave',
  shortText: 'Centros de rescate + transporte',
  fullText:
    'Rabito Callejero, AdoptameRD, PetTransportRD y PetPickup, junto a entrenadores y paseadores, conforman un ecosistema donde ya existen soluciones parciales para el cuidado de mascotas.',
}

const actividades: LeanCanvasBlock = {
  id: 'actividades',
  title: 'Actividades Clave',
  shortText: 'Desarrollo y contenido visual',
  fullText:
    'Desarrollo y mantenimiento de una aplicación multiplataforma que centraliza servicios, producción de contenido visual profesional, y apoyo a paseadores, entrenadores y transporte.',
}

const recursos: LeanCanvasBlock = {
  id: 'recursos',
  title: 'Recursos Clave',
  shortText: 'Mac Mini, cámaras, jaulas',
  fullText:
    'Mac Mini, vehículo, jaulas, kit de luces, cámaras y micrófonos para producción de contenido visual que alimenta el catálogo de mascotas.',
}

const propuesta: LeanCanvasBlock = {
  id: 'propuesta',
  title: 'Propuesta de Valor',
  shortText: 'Un solo lugar para todo',
  fullText:
    'Simplificar la burocracia y gestión de procesos relacionados con mascotas mediante la organización y estandarización de trámites, conectando dueños con empresas que satisfacen sus necesidades.',
}

const relacion: LeanCanvasBlock = {
  id: 'relacion',
  title: 'Relación',
  shortText: 'Conexión estructurada',
  fullText:
    'Conectar centros de rescate con adoptantes, y dueños con paseadores, entrenadores o taxistas de mascotas, dando estructura y organización a procesos informales.',
}

const canales: LeanCanvasBlock = {
  id: 'canales',
  title: 'Canales',
  shortText: 'Web + app + redes',
  fullText:
    'App móvil (App Store / Google Play), versión web, escritorio Electron, y redes sociales para captación y educación del mercado.',
}

const segmentos: LeanCanvasBlock = {
  id: 'segmentos',
  title: 'Segmentos',
  shortText: 'Adoptantes, centros, negocios',
  fullText:
    'Adoptantes de mascotas, centros de rescate, entrenadores, paseadores y empresas de transporte que buscan conectarse de forma eficiente dentro de un ecosistema organizado.',
}

const costos: LeanCanvasBlock = {
  id: 'costos',
  title: 'Costos',
  shortText: 'Dev, infra, licencias',
  fullText:
    'Membresía Claude Code Max, Apple Developer Program, Cloudflare R2, Google Maps Platform, servidores y servicios de email transaccional. ~USD$130/mes.',
}

const ingresos: LeanCanvasBlock = {
  id: 'ingresos',
  title: 'Ingresos',
  shortText: 'Membresías + comisiones',
  fullText:
    'Planes Básico / Intermedio / Premium / Flexible, comisiones sobre servicios de terceros (baños, paseos, transporte, vacunación), y tarifa dinámica de transporte.',
}

export const LEAN_CANVAS: LeanCanvas = {
  top: [
    { id: 'col-socios', cells: [socios] },
    { id: 'col-actividades-recursos', cells: [actividades, recursos] },
    { id: 'col-propuesta', cells: [propuesta] },
    { id: 'col-relacion-canales', cells: [relacion, canales] },
    { id: 'col-segmentos', cells: [segmentos] },
  ],
  bottom: [
    { id: 'col-costos', cells: [costos], weight: 2 },
    { id: 'col-ingresos', cells: [ingresos], weight: 3 },
  ],
}
