// Cliente Supabase falso para el modo demo.
//
// Implementa solo la parte de la API que usa la app: consultas
// (select / insert / update / delete con eq, lte, gte, not, order, limit,
// single y count), relaciones embebidas muchos-a-uno ('clientes(nombre)',
// 'profiles:registrado_por(nombre)'), las RPC y Edge Functions que llama
// el frontend, auth y storage de fotos.
//
// Los datos viven en localStorage: cada visitante tiene su propio taller
// de prueba, puede cargar y editar lo que quiera, y con resetDemo()
// vuelve al estado inicial. Las fotos que se suben quedan solo en memoria
// (se pierden al recargar).

import { crearDatosDemo, FOTOS_DEMO, DEMO_USER_ID } from './seed'
import { fechaHoyAR } from '@/lib/fecha'

const STORAGE_KEY = 'bitacora-demo:v1'
const SESSION_KEY = 'bitacora-demo:sesion'
const LATENCIA_MS = 120

// Columna FK → tabla, para relaciones con alias ('profiles:registrado_por').
const FK_TABLA = {
  registrado_por: 'profiles',
  creado_por:     'profiles',
  programado_por: 'profiles',
  conectado_por:  'profiles',
  cliente_id:     'clientes',
  vehiculo_id:    'vehiculos',
  servicio_id:    'servicios',
}
// Tabla embebida → columna FK en la tabla de origen ('clientes(nombre)').
const TABLA_FK = {
  clientes:  'cliente_id',
  vehiculos: 'vehiculo_id',
  servicios: 'servicio_id',
}

const DEFAULTS = {
  clientes:       { tipo: 'persona', canal_preferido: 'WhatsApp', estado: 'nuevo', acepta_whatsapp: true, activo: true, fecha_baja: null, email: null, documento: null, contacto_nombre: null },
  vehiculos:      { km: 0, activo: true, anio: null },
  servicios:      { cobrado: false, fecha_cobro: null, producto: null, importe: null, observaciones: null },
  notificaciones: { hora_envio: '09:00:00', estado: 'pendiente', enviado_at: null, error_msg: null, servicio_id: null },
  fotos_servicio: { orden: 0, url: '' },
  profiles:       { activo: true, fecha_baja: null, debe_cambiar_password: true },
}
// Columna que el trigger de auditoría completa con el usuario actual.
const AUDITORIA = {
  clientes: 'creado_por',
  vehiculos: 'creado_por',
  servicios: 'registrado_por',
  notificaciones: 'programado_por',
}

// ── Estado ────────────────────────────────────────────────────────────

let db = null
const fotosSubidas = {}   // storage_path → object URL (solo en memoria)

function cargar() {
  if (db) return db
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    if (guardado) db = JSON.parse(guardado)
  } catch { /* localStorage bloqueado o corrupto: arrancamos de cero */ }
  if (!db) {
    db = crearDatosDemo()
    guardar()
  }
  return db
}

function guardar() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) } catch { /* sin persistencia */ }
}

export function resetDemo() {
  db = crearDatosDemo()
  guardar()
}

const clonar = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)))
const esperar = () => new Promise(r => setTimeout(r, LATENCIA_MS))
const errorPg = (message, code) => ({ message, code, details: null, hint: null })

// ── Proyección de columnas ────────────────────────────────────────────

// Divide 'a, b(c, d), e' por comas de primer nivel.
function partir(cols) {
  const partes = []
  let nivel = 0
  let actual = ''
  for (const ch of cols) {
    if (ch === '(') nivel++
    if (ch === ')') nivel--
    if (ch === ',' && nivel === 0) { partes.push(actual.trim()); actual = ''; continue }
    actual += ch
  }
  if (actual.trim()) partes.push(actual.trim())
  return partes
}

function proyectar(tabla, fila, cols) {
  if (!cols || cols.trim() === '*') return clonar(fila)
  const out = {}
  for (const parte of partir(cols)) {
    if (parte === '*') { Object.assign(out, clonar(fila)); continue }
    const m = parte.match(/^([\w]+)(?::([\w]+))?\((.*)\)$/s)
    if (!m) { out[parte] = clonar(fila[parte]) ?? null; continue }
    const [, nombre, fkAlias, subcols] = m
    const fk = fkAlias ?? TABLA_FK[nombre]
    const destino = fkAlias ? FK_TABLA[fkAlias] : nombre
    const relacionada = fila[fk] ? cargar()[destino]?.find(r => r.id === fila[fk]) : null
    out[nombre] = relacionada ? proyectar(destino, relacionada, subcols) : null
  }
  return out
}

// ── Query builder ─────────────────────────────────────────────────────

class Consulta {
  constructor(tabla) {
    this.tabla = tabla
    this.op = 'select'
    this.cols = '*'
    this.devolver = false
    this.filtros = []
    this.ordenes = []
    this.limite = null
    this.unico = false
    this.contar = false
    this.soloCabecera = false
    this.datos = null
  }

  select(cols = '*', opciones = {}) {
    this.cols = cols
    if (this.op !== 'select') this.devolver = true
    if (opciones.count) this.contar = true
    if (opciones.head) this.soloCabecera = true
    return this
  }
  insert(datos) { this.op = 'insert'; this.datos = datos; return this }
  update(datos) { this.op = 'update'; this.datos = datos; return this }
  delete()      { this.op = 'delete'; return this }

  eq(col, v)  { this.filtros.push(r => r[col] === v); return this }
  neq(col, v) { this.filtros.push(r => r[col] !== v); return this }
  gte(col, v) { this.filtros.push(r => r[col] != null && r[col] >= v); return this }
  lte(col, v) { this.filtros.push(r => r[col] != null && r[col] <= v); return this }
  gt(col, v)  { this.filtros.push(r => r[col] != null && r[col] > v); return this }
  lt(col, v)  { this.filtros.push(r => r[col] != null && r[col] < v); return this }
  in(col, vs) { this.filtros.push(r => vs.includes(r[col])); return this }
  is(col, v)  { this.filtros.push(r => (v === null ? r[col] == null : r[col] === v)); return this }
  not(col, op, v) {
    if (op === 'is' && v === null) this.filtros.push(r => r[col] != null)
    else if (op === 'eq') this.filtros.push(r => r[col] !== v)
    return this
  }
  order(col, { ascending = true } = {}) { this.ordenes.push([col, ascending]); return this }
  limit(n) { this.limite = n; return this }
  single() { this.unico = true; return this }
  maybeSingle() { this.unico = 'maybe'; return this }

  then(resolve, reject) { return this.ejecutar().then(resolve, reject) }

  coinciden(filas) {
    return filas.filter(r => this.filtros.every(f => f(r)))
  }

  async ejecutar() {
    await esperar()
    const d = cargar()
    if (!d[this.tabla]) d[this.tabla] = []
    try {
      let filas
      if (this.op === 'select') filas = this.seleccionar(d)
      else if (this.op === 'insert') filas = this.insertar(d)
      else if (this.op === 'update') filas = this.actualizar(d)
      else filas = this.borrar(d)
      if (this.op !== 'select') guardar()
      return this.armarRespuesta(filas)
    } catch (e) {
      return { data: null, error: e.code ? e : errorPg(e.message, 'DEMO'), count: null }
    }
  }

  seleccionar(d) {
    let filas = this.coinciden(d[this.tabla])
    for (const [col, asc] of [...this.ordenes].reverse()) {
      filas = [...filas].sort((a, b) => {
        const x = a[col], y = b[col]
        if (x === y) return 0
        if (x == null) return 1
        if (y == null) return -1
        return (x < y ? -1 : 1) * (asc ? 1 : -1)
      })
    }
    return filas
  }

  insertar(d) {
    const ahora = new Date().toISOString()
    const lista = Array.isArray(this.datos) ? this.datos : [this.datos]
    const nuevas = lista.map(datos => {
      const fila = {
        ...DEFAULTS[this.tabla],
        id: crypto.randomUUID(),
        created_at: ahora,
        updated_at: ahora,
        ...datos,
      }
      const auditoria = AUDITORIA[this.tabla]
      if (auditoria) fila[auditoria] = sesionActual()?.user.id ?? null
      if (this.tabla === 'servicios' && fila.cobrado && !fila.fecha_cobro) fila.fecha_cobro = ahora
      validar(d, this.tabla, fila)
      return fila
    })
    d[this.tabla].push(...nuevas)
    return nuevas
  }

  actualizar(d) {
    const ahora = new Date().toISOString()
    const filas = this.coinciden(d[this.tabla])
    filas.forEach(fila => {
      const cambios = { ...this.datos }
      if (this.tabla === 'servicios' && 'cobrado' in cambios && cambios.cobrado !== fila.cobrado) {
        cambios.fecha_cobro = cambios.cobrado ? ahora : null
      }
      if ('activo' in cambios && 'fecha_baja' in fila && cambios.activo !== fila.activo) {
        cambios.fecha_baja = cambios.activo ? null : ahora
      }
      validar(d, this.tabla, { ...fila, ...cambios }, fila.id)
      Object.assign(fila, cambios, { updated_at: ahora })
    })
    return filas
  }

  borrar(d) {
    const filas = this.coinciden(d[this.tabla])
    const ids = new Set(filas.map(f => f.id))
    d[this.tabla] = d[this.tabla].filter(f => !ids.has(f.id))
    if (this.tabla === 'servicios') {
      d.fotos_servicio = d.fotos_servicio.filter(f => !ids.has(f.servicio_id))
      d.notificaciones.forEach(n => { if (ids.has(n.servicio_id)) n.servicio_id = null })
    }
    return filas
  }

  armarRespuesta(filas) {
    const count = this.contar ? filas.length : null
    if (this.op !== 'select' && !this.devolver) return { data: null, error: null, count }
    if (this.soloCabecera) return { data: null, error: null, count }
    let lista = this.limite != null ? filas.slice(0, this.limite) : filas
    lista = lista.map(f => proyectar(this.tabla, f, this.cols))
    if (this.unico) {
      if (lista.length === 1) return { data: lista[0], error: null, count }
      if (lista.length === 0 && this.unico === 'maybe') return { data: null, error: null, count }
      return { data: null, error: errorPg('JSON object requested, multiple (or no) rows returned', 'PGRST116'), count }
    }
    return { data: lista, error: null, count }
  }
}

function validar(d, tabla, fila, idPropio) {
  if (tabla === 'vehiculos' && d.vehiculos.some(v => v.patente === fila.patente && v.id !== idPropio)) {
    throw errorPg('duplicate key value violates unique constraint "vehiculos_patente_key"', '23505')
  }
}

// ── RPC ───────────────────────────────────────────────────────────────

const RPCS = {
  crear_servicio_completo(d, { p_servicio, p_cliente_id, p_vehiculo_id, p_cliente_nuevo, p_vehiculo_nuevo }) {
    const ahora = new Date().toISOString()
    const usuario = sesionActual()?.user.id ?? null
    const vacioANull = (v) => (v === '' || v === undefined ? null : v)
    let clienteId = p_cliente_id
    if (p_cliente_nuevo) {
      clienteId = crypto.randomUUID()
      d.clientes.push({
        ...DEFAULTS.clientes, ...p_cliente_nuevo,
        id: clienteId, creado_por: usuario, created_at: ahora, updated_at: ahora,
      })
    }
    if (!clienteId) throw errorPg('Se requiere cliente_id o cliente_nuevo', 'P0001')
    let vehiculoId = p_vehiculo_id
    if (p_vehiculo_nuevo) {
      vehiculoId = crypto.randomUUID()
      const vehiculo = {
        ...DEFAULTS.vehiculos, ...p_vehiculo_nuevo,
        anio: p_vehiculo_nuevo.anio ? Number(p_vehiculo_nuevo.anio) : null,
        km: p_vehiculo_nuevo.km ? Number(p_vehiculo_nuevo.km) : 0,
        id: vehiculoId, cliente_id: clienteId, creado_por: usuario, created_at: ahora, updated_at: ahora,
      }
      validar(d, 'vehiculos', vehiculo)
      d.vehiculos.push(vehiculo)
    }
    if (!vehiculoId) throw errorPg('Se requiere vehiculo_id o vehiculo_nuevo', 'P0001')
    const servicioId = crypto.randomUUID()
    const cobrado = p_servicio.cobrado === true || p_servicio.cobrado === 'true'
    d.servicios.push({
      id: servicioId, vehiculo_id: vehiculoId, cliente_id: clienteId,
      tipo: p_servicio.tipo, fecha: p_servicio.fecha, km: Number(p_servicio.km) || 0,
      producto: vacioANull(p_servicio.producto),
      importe: vacioANull(p_servicio.importe) == null ? null : Number(p_servicio.importe),
      observaciones: vacioANull(p_servicio.observaciones),
      cobrado, fecha_cobro: cobrado ? ahora : null,
      registrado_por: usuario, created_at: ahora, updated_at: ahora,
    })
    return { servicio_id: servicioId, cliente_id: clienteId, vehiculo_id: vehiculoId }
  },

  clientes_dormidos(d, { p_meses = 6 }) {
    const [y, m, dia] = fechaHoyAR().split('-').map(Number)
    const limite = new Date(Date.UTC(y, m - 1 - p_meses, dia)).toISOString().slice(0, 10)
    return d.clientes
      .filter(c => c.activo)
      .map(c => {
        const fechas = d.servicios.filter(s => s.cliente_id === c.id).map(s => s.fecha).sort()
        return { id: c.id, nombre: c.nombre, telefono: c.telefono, ultima_visita: fechas.at(-1) ?? null }
      })
      .filter(c => c.ultima_visita && c.ultima_visita < limite)
      .sort((a, b) => (a.ultima_visita < b.ultima_visita ? -1 : 1))
  },

  cambiar_mi_password(d) {
    const perfil = d.profiles.find(p => p.id === sesionActual()?.user.id)
    if (perfil) perfil.debe_cambiar_password = false
    return null
  },
}

// ── Edge Functions ────────────────────────────────────────────────────

const FUNCIONES = {
  'consulta-publica'(d, { patente }) {
    const p = String(patente ?? '').toUpperCase().replace(/\s/g, '')
    const v = d.vehiculos.find(x => x.patente === p && x.activo)
    if (!v) return null
    const servicios = d.servicios
      .filter(s => s.vehiculo_id === v.id)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map(s => ({
        fecha: s.fecha, tipo: s.tipo, km: s.km, producto: s.producto, observaciones: s.observaciones,
        fotos: d.fotos_servicio
          .filter(f => f.servicio_id === s.id)
          .sort((a, b) => a.orden - b.orden)
          .map(f => urlFoto(f.storage_path))
          .filter(Boolean),
      }))
    return { patente: v.patente, marca: v.marca, modelo: v.modelo, anio: v.anio, tipo_patente: v.tipo_patente, servicios }
  },

  'admin-create-user'(d, { email, nombre, rol }) {
    if (d.profiles.some(p => p.email === email)) return { error: 'Ya existe un usuario con ese email' }
    const ahora = new Date().toISOString()
    const user = { id: crypto.randomUUID(), email, nombre, rol }
    d.profiles.push({ ...DEFAULTS.profiles, ...user, created_at: ahora, updated_at: ahora })
    return { user }
  },
}

// ── Storage ───────────────────────────────────────────────────────────

function urlFoto(path) {
  return FOTOS_DEMO[path] ?? fotosSubidas[path] ?? null
}

const storage = {
  from() {
    return {
      async upload(path, archivo) {
        await esperar()
        fotosSubidas[path] = URL.createObjectURL(archivo)
        return { data: { path }, error: null }
      },
      async createSignedUrls(paths) {
        return { data: paths.map(path => ({ path, signedUrl: urlFoto(path), error: null })), error: null }
      },
      async remove(paths) {
        paths.forEach(p => { delete fotosSubidas[p] })
        return { data: [], error: null }
      },
    }
  },
}

// ── Auth ──────────────────────────────────────────────────────────────

const oyentes = new Set()

function sesionActual() {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    const perfil = cargar().profiles.find(p => p.id === id)
    return perfil ? { access_token: 'demo', user: { id: perfil.id, email: perfil.email } } : null
  } catch {
    return null
  }
}

function avisar(evento) {
  const sesion = sesionActual()
  oyentes.forEach(fn => fn(evento, sesion))
}

const auth = {
  async getSession() {
    return { data: { session: sesionActual() }, error: null }
  },
  onAuthStateChange(fn) {
    oyentes.add(fn)
    return { data: { subscription: { unsubscribe: () => oyentes.delete(fn) } } }
  },
  // En la demo cualquier email/contraseña entra: si el email es de un
  // usuario existente entra como ese usuario, si no como el usuario demo.
  async signInWithPassword({ email }) {
    await esperar()
    const perfil = cargar().profiles.find(p => p.email === email?.trim().toLowerCase() && p.activo)
    try { localStorage.setItem(SESSION_KEY, perfil?.id ?? DEMO_USER_ID) } catch { /* sin persistencia */ }
    avisar('SIGNED_IN')
    return { data: { session: sesionActual() }, error: null }
  },
  async signOut() {
    try { localStorage.removeItem(SESSION_KEY) } catch { /* sin persistencia */ }
    avisar('SIGNED_OUT')
    return { error: null }
  },
  async updateUser() {
    avisar('USER_UPDATED')
    return { data: { user: sesionActual()?.user ?? null }, error: null }
  },
  async resetPasswordForEmail() {
    await esperar()
    return { data: {}, error: null }
  },
}

// ── Cliente ───────────────────────────────────────────────────────────

export function crearClienteDemo() {
  return {
    from: (tabla) => new Consulta(tabla),
    async rpc(nombre, args = {}) {
      await esperar()
      const fn = RPCS[nombre]
      if (!fn) return { data: null, error: errorPg(`Función ${nombre} no disponible en la demo`, 'DEMO') }
      try {
        const data = fn(cargar(), args)
        guardar()
        return { data: clonar(data), error: null }
      } catch (e) {
        return { data: null, error: e.code ? e : errorPg(e.message, 'DEMO') }
      }
    },
    functions: {
      async invoke(nombre, { body } = {}) {
        await esperar()
        const fn = FUNCIONES[nombre]
        if (!fn) return { data: { error: 'Esta función no está disponible en la demo.' }, error: null }
        const data = fn(cargar(), body ?? {})
        guardar()
        return { data: clonar(data), error: null }
      },
    },
    storage,
    auth,
  }
}

// Patentes para sugerir en la consulta pública de la demo: primero las
// que tienen fotos, después las de historial más largo.
export function patentesDeEjemplo(cantidad = 3) {
  const d = cargar()
  const puntaje = (v) => {
    const servicios = d.servicios.filter(s => s.vehiculo_id === v.id)
    const fotos = d.fotos_servicio.filter(f => servicios.some(s => s.id === f.servicio_id)).length
    return fotos * 100 + servicios.length
  }
  return d.vehiculos
    .filter(v => v.activo)
    .map(v => [v.patente, puntaje(v)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, cantidad)
    .map(([p]) => p)
}
