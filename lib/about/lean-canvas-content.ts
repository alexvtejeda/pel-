export type LeanCanvasBlock = {
  id: string
  title: string
  shortText: string
  fullText: string
  col: number // 1..5 grid column
  row: number // 1..2 grid row
}

export const LEAN_CANVAS: LeanCanvasBlock[] = [
  {
    id: 'socios',
    title: 'Socios Clave',
    shortText: 'Centros de rescate + transporte',
    fullText: 'Rabito Callejero, AdoptameRD, PetTransportRD y PetPickup, junto a entrenadores y paseadores, conforman un ecosistema donde ya existen soluciones parciales para el cuidado de mascotas.',
    col: 1, row: 1,
  },
  {
    id: 'actividades',
    title: 'Actividades Clave',
    shortText: 'Desarrollo y contenido visual',
    fullText: 'Desarrollo y mantenimiento de una aplicación multiplataforma que centraliza servicios, producción de contenido visual profesional, y apoyo a paseadores, entrenadores y transporte.',
    col: 2, row: 1,
  },
  {
    id: 'propuesta',
    title: 'Propuesta de Valor',
    shortText: 'Un solo lugar para todo',
    fullText: 'Simplificar la burocracia y gestión de procesos relacionados con mascotas mediante la organización y estandarización de trámites, conectando dueños con empresas que satisfacen sus necesidades.',
    col: 3, row: 1,
  },
  {
    id: 'relacion',
    title: 'Relación',
    shortText: 'Conexión estructurada',
    fullText: 'Conectar centros de rescate con adoptantes, y dueños con paseadores, entrenadores o taxistas de mascotas, dando estructura y organización a procesos informales.',
    col: 4, row: 1,
  },
  {
    id: 'segmentos',
    title: 'Segmentos',
    shortText: 'Adoptantes, centros, negocios',
    fullText: 'Adoptantes de mascotas, centros de rescate, entrenadores, paseadores y empresas de transporte que buscan conectarse de forma eficiente dentro de un ecosistema organizado.',
    col: 5, row: 1,
  },
  {
    id: 'recursos',
    title: 'Recursos Clave',
    shortText: 'Mac Mini, cámaras, jaulas',
    fullText: 'Mac Mini, vehículo, jaulas, kit de luces, cámaras y micrófonos para producción de contenido visual que alimenta el catálogo de mascotas.',
    col: 2, row: 2,
  },
  {
    id: 'canales',
    title: 'Canales',
    shortText: 'Web + app + redes',
    fullText: 'App móvil (App Store / Google Play), versión web, escritorio Electron, y redes sociales para captación y educación del mercado.',
    col: 4, row: 2,
  },
  {
    id: 'costos',
    title: 'Costos',
    shortText: 'Dev, infra, licencias',
    fullText: 'Membresía Claude Code Max, Apple Developer Program, Cloudflare R2, Google Maps Platform, servidores y servicios de email transaccional. ~USD$130/mes.',
    col: 1, row: 2,
  },
  {
    id: 'ingresos',
    title: 'Ingresos',
    shortText: 'Membresías + comisiones',
    fullText: 'Planes Básico / Intermedio / Premium / Flexible, comisiones sobre servicios de terceros (baños, paseos, transporte, vacunación), y tarifa dinámica de transporte.',
    col: 5, row: 2,
  },
]
