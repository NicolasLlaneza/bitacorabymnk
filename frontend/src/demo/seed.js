// Datos ficticios del modo demo.
//
// Arma un taller creíble: ~25 clientes, ~30 vehículos, un año de
// servicios, recordatorios por WhatsApp en todos los estados y algunas
// fotos. Las fechas son relativas a hoy para que el panel de inicio
// siempre tenga algo que mostrar (cobros pendientes, clientes dormidos,
// notificaciones del día). Nombres, patentes y teléfonos son inventados.
//
// Usa un generador pseudoaleatorio con semilla fija: todas las demos
// arrancan con los mismos datos.

import { fechaHoyAR } from '@/lib/fecha'
import { NOMBRE_MARCA } from '@/lib/empresa'

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

function crearRandom(semilla) {
  let s = semilla >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let idSeq = 0
function uuid() {
  idSeq += 1
  return `00000000-0000-4000-9000-${String(idSeq).padStart(12, '0')}`
}

function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d + dias))
  return f.toISOString().slice(0, 10)
}

const PERFILES = [
  { id: DEMO_USER_ID, nombre: 'Usuario Demo', email: 'demo@bitacora.app', rol: 'superadmin' },
  { id: '00000000-0000-4000-8000-000000000002', nombre: 'Martín Gómez', email: 'martin@tallerdemo.com.ar', rol: 'admin' },
  { id: '00000000-0000-4000-8000-000000000003', nombre: 'Lucía Fernández', email: 'lucia@tallerdemo.com.ar', rol: 'admin' },
]

const PERSONAS = [
  'Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez', 'Diego López',
  'Laura Sánchez', 'Pablo Romero', 'Florencia Díaz', 'Sergio Álvarez', 'Valeria Torres',
  'Gustavo Ruiz', 'Natalia Herrera', 'Federico Castro', 'Paula Medina', 'Ricardo Suárez',
  'Camila Ortiz', 'Hernán Morales', 'Silvina Ramos', 'Matías Acosta', 'Gabriela Molina',
]

const EMPRESAS = [
  { nombre: 'Logística del Sur SRL', contacto: 'Andrés Vega', documento: '30-71234567-8' },
  { nombre: 'Distribuidora Andina SA', contacto: 'Mónica Ríos', documento: '30-70987654-3' },
  { nombre: 'Remises Centro', contacto: 'Jorge Benítez', documento: '20-28765432-1' },
  { nombre: 'Agro Servicios Cuyo SRL', contacto: 'Daniela Paz', documento: '30-71555444-9' },
]

const MODELOS = [
  ['Volkswagen', 'Gol Trend'], ['Fiat', 'Cronos'], ['Peugeot', '208'], ['Chevrolet', 'Onix'],
  ['Toyota', 'Etios'], ['Renault', 'Sandero'], ['Ford', 'Ka'], ['Toyota', 'Corolla'],
  ['Volkswagen', 'Polo'], ['Renault', 'Kangoo'], ['Citroën', 'C4 Cactus'], ['Nissan', 'Kicks'],
]
const MODELOS_UTILITARIOS = [
  ['Toyota', 'Hilux'], ['Ford', 'Ranger'], ['Volkswagen', 'Amarok'], ['Fiat', 'Strada'],
  ['Renault', 'Kangoo'], ['Peugeot', 'Partner'],
]

// Tipo de servicio → [peso, importe base ARS, cada cuántos meses se repite, productos]
const SERVICIOS = {
  'Alineación y Balanceo':        [24, 45000, 6, [null]],
  'Rotación de Neumáticos':       [14, 18000, 6, [null]],
  'Cambio de filtros y aceite':   [20, 85000, 6, ['Aceite 5W30 sintético 4 L + filtros', 'Aceite 10W40 semisintético 4 L + filtro', 'Aceite 5W40 sintético 5 L + filtros']],
  'Equipamiento':                 [12, 520000, 24, ['4 neumáticos 185/65 R15', '4 neumáticos 205/55 R16', '2 neumáticos 175/70 R14', '4 neumáticos 265/65 R17']],
  'Reparación de pinchadura':     [10, 9000, null, [null]],
  'Reparación de Tren Delantero': [6, 160000, 12, ['Bieletas + bujes de parrilla', 'Extremos de dirección', 'Rótulas inferiores']],
  'Servicio de Mecánica General': [6, 120000, 12, ['Pastillas de freno delanteras', 'Correa de accesorios', 'Batería 12 V 65 Ah']],
  'Balanceo':                     [4, 20000, 6, [null]],
}

const OBSERVACIONES = [
  'Desgaste irregular en el borde interno delantero. Revisar en próxima visita.',
  'Cliente pide aviso antes de vacaciones.',
  'Se recomienda cambiar amortiguadores traseros.',
  'Presión ajustada a 32 psi.',
  'Neumático de auxilio en mal estado, se informó al cliente.',
]

// Tipo de servicio → [motivo de la notificación, frase para el mensaje]
const MOTIVOS = {
  'Alineación y Balanceo':        ['Recordatorio de alineación y balanceo', 'la alineación y el balanceo'],
  'Rotación de Neumáticos':       ['Recordatorio de rotación de neumáticos', 'la rotación de neumáticos'],
  'Cambio de filtros y aceite':   ['Recordatorio de cambio de aceite', 'el cambio de aceite y filtros'],
  'Equipamiento':                 ['Control de neumáticos nuevos', 'el control de los neumáticos nuevos'],
  'Reparación de Tren Delantero': ['Control de tren delantero', 'el control del tren delantero'],
  'Servicio de Mecánica General': ['Control general', 'el control general'],
  'Balanceo':                     ['Recordatorio de balanceo', 'el balanceo'],
}

const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

function fotoDemoSvg(titulo, subtitulo, tono) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="#1a1a1a"/>
<circle cx="400" cy="270" r="170" fill="#111" stroke="${tono}" stroke-width="18"/>
<circle cx="400" cy="270" r="95" fill="#2a2a2a" stroke="#3a3a3a" stroke-width="10"/>
<circle cx="400" cy="270" r="26" fill="#7a7a7a"/>
<text x="400" y="510" fill="#f5f5f5" font-family="Montserrat, Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle">${titulo}</text>
<text x="400" y="555" fill="#b8b8b8" font-family="Montserrat, Arial, sans-serif" font-size="22" text-anchor="middle">${subtitulo}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// storage_path → URL de la imagen. Las fotos subidas durante la demo se
// suman acá en memoria (ver mockSupabase.js).
export const FOTOS_DEMO = {
  'demo/antes.svg':   fotoDemoSvg('Foto de ejemplo · Antes', 'Desgaste en borde interno', '#d97706'),
  'demo/despues.svg': fotoDemoSvg('Foto de ejemplo · Después', 'Neumático nuevo instalado', '#16a34a'),
  'demo/tren.svg':    fotoDemoSvg('Foto de ejemplo', 'Bieletas reemplazadas', '#c2410c'),
}

export function crearDatosDemo() {
  idSeq = 0
  const rnd = crearRandom(20261007)
  const elegir = (arr) => arr[Math.floor(rnd() * arr.length)]
  const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1))
  const hoy = fechaHoyAR()
  const ahoraISO = new Date().toISOString()
  const ts = (fecha, hora = entre(9, 17)) => `${fecha}T${String(hora + 3).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00.000Z`

  const profiles = PERFILES.map((p, i) => ({
    ...p,
    activo: true,
    fecha_baja: null,
    debe_cambiar_password: false,
    created_at: ts(sumarDias(hoy, -400 + i * 20)),
    updated_at: ahoraISO,
  }))
  const perfilAlAzar = () => elegir(profiles).id

  // ── Clientes ──
  const clientes = []
  PERSONAS.forEach((nombre, i) => {
    clientes.push({
      id: uuid(), tipo: 'persona', nombre,
      telefono: `+54 9 11 5555-${String(1000 + i * 37).slice(-4)}`,
      email: i % 3 === 0 ? `${nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@ejemplo.com` : null,
      documento: null, contacto_nombre: null,
    })
  })
  EMPRESAS.forEach((e, i) => {
    clientes.push({
      id: uuid(), tipo: 'empresa', nombre: e.nombre,
      telefono: `+54 9 11 5555-${String(2100 + i * 53).slice(-4)}`,
      email: `flota@${e.nombre.split(' ')[0].toLowerCase()}.com.ar`,
      documento: e.documento, contacto_nombre: e.contacto,
    })
  })
  clientes.forEach((c) => Object.assign(c, {
    canal_preferido: 'WhatsApp', estado: 'ok',
    acepta_whatsapp: true, fecha_consentimiento: null,
    creado_por: perfilAlAzar(), activo: true, fecha_baja: null,
    created_at: null, updated_at: ahoraISO,
  }))
  clientes[7].acepta_whatsapp = false

  // ── Vehículos ──
  const vehiculos = []
  const patentes = new Set()
  function patenteNueva(anio, moto) {
    let p
    do {
      const L = () => elegir(LETRAS.split(''))
      const N = String(entre(100, 999))
      if (moto) p = `${L()}${N}${L()}${L()}`
      else if (anio >= 2017) p = `A${elegir('ABCDEFG'.split(''))}${N}${L()}${L()}`
      else p = `${elegir('JKLMNOP'.split(''))}${L()}${L()}${N}`
    } while (patentes.has(p))
    patentes.add(p)
    return p
  }
  clientes.forEach((c, i) => {
    const cantidad = c.tipo === 'empresa' ? entre(2, 3) : (i % 6 === 0 ? 2 : 1)
    for (let k = 0; k < cantidad; k++) {
      const moto = c.tipo === 'persona' && i === 13 && k === 0
      const [marca, modelo] = moto ? ['Honda', 'CB 190R'] : elegir(c.tipo === 'empresa' ? MODELOS_UTILITARIOS : MODELOS)
      const anio = entre(2011, 2025)
      const patente = patenteNueva(anio, moto)
      vehiculos.push({
        id: uuid(), cliente_id: c.id, patente,
        tipo_patente: moto ? 'moto-nueva' : (anio >= 2017 ? 'auto-nuevo' : 'auto-viejo'),
        marca, modelo, anio,
        km: entre(15, 140) * 1000,
        activo: true, creado_por: perfilAlAzar(), created_at: null, updated_at: ahoraISO,
      })
    }
  })

  // ── Servicios ──
  const tipos = Object.keys(SERVICIOS)
  const pesoTotal = tipos.reduce((a, t) => a + SERVICIOS[t][0], 0)
  function tipoAlAzar() {
    let r = rnd() * pesoTotal
    for (const t of tipos) { r -= SERVICIOS[t][0]; if (r <= 0) return t }
    return tipos[0]
  }

  // Algunos clientes quedan "dormidos": su última visita fue hace más de 6 meses.
  const dormidos = new Set([2, 9, 15, 18].map(i => clientes[i].id))

  const servicios = []
  vehiculos.forEach((v, vi) => {
    const dormido = dormidos.has(v.cliente_id)
    let fecha = sumarDias(hoy, -entre(330, 420))
    const fin = dormido ? sumarDias(hoy, -entre(200, 300)) : sumarDias(hoy, -entre(0, 40))
    let km = Math.max(5000, v.km - entre(15, 30) * 1000)
    const visitas = []
    while (fecha < fin) {
      visitas.push(fecha)
      fecha = sumarDias(fecha, entre(45, 130))
    }
    if (!dormido) visitas.push(fin)
    if (vi % 4 === 0 && !dormido) visitas.push(sumarDias(hoy, -entre(0, 6)))

    visitas.sort().forEach((f) => {
      km += entre(3, 9) * 1000
      const tipo = tipoAlAzar()
      const [, base, , productos] = SERVICIOS[tipo]
      const importe = Math.round((base * (0.85 + rnd() * 0.4)) / 500) * 500
      const reciente = f >= sumarDias(hoy, -10)
      const cobrado = !reciente || rnd() < 0.4
      servicios.push({
        id: uuid(), vehiculo_id: v.id, cliente_id: v.cliente_id,
        tipo, fecha: f, km,
        producto: elegir(productos),
        importe,
        observaciones: rnd() < 0.15 ? elegir(OBSERVACIONES) : null,
        cobrado,
        fecha_cobro: cobrado ? ts(f) : null,
        registrado_por: perfilAlAzar(),
        created_at: ts(f),
        updated_at: ts(f),
      })
    })
    v.km = km
  })

  // Clientes y vehículos se dan de alta con su primer servicio.
  const primeraVisita = {}
  servicios.forEach((s) => {
    if (!primeraVisita[s.vehiculo_id] || s.fecha < primeraVisita[s.vehiculo_id]) primeraVisita[s.vehiculo_id] = s.fecha
  })
  vehiculos.forEach((v) => { v.created_at = ts(primeraVisita[v.id] ?? hoy) })
  clientes.forEach((c) => {
    const fechas = vehiculos.filter(v => v.cliente_id === c.id).map(v => v.created_at).sort()
    c.created_at = fechas[0] ?? ts(hoy)
  })
  // Un par de clientes nuevos este mes, para los KPIs.
  const inicioMes = `${hoy.slice(0, 8)}01`
  servicios.filter(s => s.fecha >= inicioMes).slice(0, 2).forEach((s) => {
    const c = clientes.find(x => x.id === s.cliente_id)
    if (!dormidos.has(c.id)) c.created_at = s.created_at
  })

  // ── Notificaciones ──
  const notificaciones = []
  const porId = (arr) => Object.fromEntries(arr.map(x => [x.id, x]))
  const clientesPorId = porId(clientes)
  const vehiculosPorId = porId(vehiculos)
  const ultimoPorVehiculo = {}
  servicios.forEach((s) => {
    const u = ultimoPorVehiculo[s.vehiculo_id]
    if (!u || s.fecha > u.fecha) ultimoPorVehiculo[s.vehiculo_id] = s
  })

  function mensaje(c, v, frase) {
    const nombre = c.tipo === 'empresa' ? (c.contacto_nombre ?? c.nombre).split(' ')[0] : c.nombre.split(' ')[0]
    return `¡Hola ${nombre}! Te escribimos de ${NOMBRE_MARCA}: tu ${v.marca} ${v.modelo} (${v.patente}) ya le toca ${frase}. Respondé este mensaje y te reservamos un turno.`
  }

  let n = 0
  Object.values(ultimoPorVehiculo).forEach((s) => {
    const meses = SERVICIOS[s.tipo][2]
    if (!meses) return
    const c = clientesPorId[s.cliente_id]
    const v = vehiculosPorId[s.vehiculo_id]
    const [motivo, frase] = MOTIVOS[s.tipo]
    const fechaEnvio = sumarDias(s.fecha, meses * 30)
    let estado = 'pendiente'
    let enviado_at = null
    let error_msg = null
    if (fechaEnvio < hoy) {
      estado = 'enviada'
      enviado_at = ts(fechaEnvio, 9)
    }
    n += 1
    if (n === 3) { estado = 'fallida'; enviado_at = null; error_msg = 'El número no tiene una cuenta de WhatsApp.' }
    notificaciones.push({
      id: uuid(), cliente_id: c.id, servicio_id: s.id,
      motivo, canal: 'WhatsApp', mensaje: mensaje(c, v, frase),
      fecha_envio: fechaEnvio, hora_envio: '09:00:00',
      estado, programado_por: perfilAlAzar(), enviado_at, error_msg,
      created_at: s.created_at, updated_at: s.created_at,
    })
  })
  // Recordatorios históricos ya enviados a los clientes dormidos.
  servicios.filter(s => dormidos.has(s.cliente_id)).slice(0, 4).forEach((s) => {
    const c = clientesPorId[s.cliente_id]
    const v = vehiculosPorId[s.vehiculo_id]
    const [motivo, frase] = MOTIVOS['Alineación y Balanceo']
    const fechaEnvio = sumarDias(s.fecha, 150)
    if (fechaEnvio >= hoy) return
    notificaciones.push({
      id: uuid(), cliente_id: c.id, servicio_id: s.id, motivo, canal: 'WhatsApp',
      mensaje: mensaje(c, v, frase), fecha_envio: fechaEnvio, hora_envio: '09:00:00',
      estado: 'enviada', programado_por: perfilAlAzar(), enviado_at: ts(fechaEnvio, 9), error_msg: null,
      created_at: s.created_at, updated_at: s.created_at,
    })
  })
  // Dos recordatorios para hoy, uno ya vencido: muestran el aviso de "para enviar".
  const clientesHoy = new Set()
  servicios
    .filter(s => !dormidos.has(s.cliente_id) && s.fecha < sumarDias(hoy, -150))
    .filter(s => !clientesHoy.has(s.cliente_id) && clientesHoy.add(s.cliente_id))
    .slice(0, 2)
    .forEach((s, i) => {
      const c = clientesPorId[s.cliente_id]
      const v = vehiculosPorId[s.vehiculo_id]
      const [motivo, frase] = MOTIVOS['Rotación de Neumáticos']
      notificaciones.push({
        id: uuid(), cliente_id: c.id, servicio_id: s.id, motivo, canal: 'WhatsApp',
        mensaje: mensaje(c, v, frase), fecha_envio: hoy, hora_envio: i === 0 ? '08:00:00' : '18:00:00',
        estado: 'pendiente', programado_por: perfilAlAzar(), enviado_at: null, error_msg: null,
        created_at: ahoraISO, updated_at: ahoraISO,
      })
    })

  // ── Fotos ──
  const fotos_servicio = []
  const conFotos = servicios.filter(s => s.tipo === 'Equipamiento' || s.tipo === 'Reparación de Tren Delantero').slice(-4)
  conFotos.forEach((s) => {
    const paths = s.tipo === 'Equipamiento' ? ['demo/antes.svg', 'demo/despues.svg'] : ['demo/tren.svg']
    paths.forEach((p, orden) => fotos_servicio.push({
      id: uuid(), servicio_id: s.id, url: '', storage_path: p, orden, created_at: s.created_at,
    }))
  })

  return {
    profiles, clientes, vehiculos, servicios, notificaciones, fotos_servicio,
    configuracion_whatsapp: [],
  }
}
