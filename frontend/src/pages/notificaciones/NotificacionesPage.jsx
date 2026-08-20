import { useState, useEffect } from 'react'
import { Plus, MessageCircle, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { notificar } from '@/lib/notificar'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import EnviarWhatsAppModal from '@/components/EnviarWhatsAppModal'
import DataTable from '@/components/DataTable'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import { EVENTOS, suscribirseA, emitirNotifActualizada } from '@/lib/eventos'

import { estadoNotificacion as estadoConfig } from '@/lib/badges'
import { NOMBRE_MARCA } from '@/lib/empresa'
import { CANALES } from '@/lib/catalogos'

// Horario permitido para programar notificaciones: coincide con el horario
// de atención del taller. Fuera de este rango nadie va a estar disponible
// para hacer el envío manual desde WhatsApp Web.
const HORA_MIN = '09:00'
const HORA_MAX = '18:00'

// Fecha de hoy en formato YYYY-MM-DD hora Argentina, para el atributo
// min del input date (impide programar para ayer).
function hoyISO() {
  const now = new Date()
  now.setHours(now.getHours() - 3)
  return now.toISOString().split('T')[0]
}

// Personaliza el saludo inicial según el tipo de cliente.
// Persona: usa el primer nombre. Empresa: saluda al equipo con la razón social.
function mensajeInicial(cliente) {
  if (!cliente) return `Hola! 👋 Te contactamos desde *${NOMBRE_MARCA}*.`
  if (cliente.tipo === 'empresa') {
    return `Hola equipo de ${cliente.nombre}! 👋 Los contactamos desde *${NOMBRE_MARCA}*.`
  }
  const primerNombre = cliente.nombre.split(' ')[0]
  return `Hola ${primerNombre}! 👋 Te contactamos desde *${NOMBRE_MARCA}*.`
}

// ─── Formulario ─────────────────────────────────────────────────────────
function NotificacionModal({ notificacion, clientes, onSave, onClose }) {
  const motivoInicial = notificacion?.motivo ?? ''

  const [form, setForm] = useState({
    cliente_id:  notificacion?.cliente_id  ?? '',
    servicio_id: notificacion?.servicio_id ?? '',
    motivo:      motivoInicial,
    mensaje:     notificacion?.mensaje     ?? '',
    fecha_envio: notificacion?.fecha_envio ?? '',
    hora_envio:  (notificacion?.hora_envio ?? '09:00').slice(0, 5),
    estado:      notificacion?.estado      ?? 'pendiente',
  })
  const [servicios, setServicios] = useState([])
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (form.cliente_id) fetchServicios(form.cliente_id)
    else setServicios([])
  }, [form.cliente_id])

  async function fetchServicios(clienteId) {
    const { data } = await supabase
      .from('servicios')
      .select('id, tipo, fecha, vehiculos(patente)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
    setServicios(data ?? [])
  }

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function handleCliente(cliente_id) {
    const cliente = clientes.find(c => c.id === cliente_id)
    setForm(prev => ({
      ...prev,
      cliente_id,
      servicio_id: '',
      // Solo pre-carga el mensaje si todavía está vacío
      mensaje: prev.mensaje.trim() ? prev.mensaje : mensajeInicial(cliente),
    }))
    setErrors(prev => ({ ...prev, cliente_id: null }))
  }

  function validate() {
    const errs = {}
    if (!form.cliente_id)     errs.cliente_id  = 'Requerido'
    if (!form.motivo)         errs.motivo      = 'Requerido'
    if (!form.mensaje.trim()) errs.mensaje     = 'Requerido'
    if (!form.fecha_envio)    errs.fecha_envio = 'Requerido'
    else if (form.fecha_envio < hoyISO()) errs.fecha_envio = 'La fecha no puede ser anterior a hoy'
    if (!form.hora_envio)     errs.hora_envio  = 'Requerido'
    else if (form.hora_envio < HORA_MIN || form.hora_envio > HORA_MAX) {
      errs.hora_envio = `Solo entre ${HORA_MIN} y ${HORA_MAX} (horario del taller)`
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      cliente_id:  form.cliente_id,
      servicio_id: form.servicio_id || null,
      motivo:      form.motivo,
      canal:       CANALES.WHATSAPP,
      mensaje:     form.mensaje.trim(),
      fecha_envio: form.fecha_envio,
      hora_envio:  form.hora_envio,
      estado:      form.estado,
    })
    setSaving(false)
  }

  return (
    <Modal title={notificacion ? 'Editar notificación' : 'Nueva notificación'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <SearchSelect
          label="Cliente"
          value={form.cliente_id}
          onChange={handleCliente}
          error={errors.cliente_id}
          placeholder="Buscar cliente..."
          options={clientes.map(c => ({ value: c.id, label: c.nombre }))}
        />

        {form.cliente_id && (
          <Select
            label="Servicio relacionado (opcional)"
            value={form.servicio_id}
            onChange={e => set('servicio_id', e.target.value)}
          >
            <option value="">Sin servicio asociado</option>
            {servicios.map(s => (
              <option key={s.id} value={s.id}>
                {s.fecha.split('-').reverse().join('/')} — {s.tipo} ({s.vehiculos?.patente})
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Motivo"
          value={form.motivo}
          onChange={e => set('motivo', e.target.value)}
          error={errors.motivo}
          placeholder="Ej: Recordatorio cambio de neumáticos"
        />

        <Textarea
          label="Mensaje"
          value={form.mensaje}
          onChange={e => set('mensaje', e.target.value)}
          error={errors.mensaje}
          rows={5}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha de envío"
            type="date"
            value={form.fecha_envio}
            onChange={e => set('fecha_envio', e.target.value)}
            error={errors.fecha_envio}
            min={hoyISO()}
          />
          <Input
            label="Hora de envío"
            type="time"
            value={form.hora_envio}
            onChange={e => set('hora_envio', e.target.value)}
            error={errors.hora_envio}
            min={HORA_MIN}
            max={HORA_MAX}
          />
        </div>
        <p className="text-xs text-gray-300 -mt-2">
          Solo se pueden programar entre las {HORA_MIN} y las {HORA_MAX}, que es cuando el taller está abierto y puede enviar los mensajes por WhatsApp.
        </p>

        {notificacion && (
          <Select
            label="Estado"
            value={form.estado}
            onChange={e => set('estado', e.target.value)}
          >
            <option value="pendiente">Pendiente</option>
            <option value="enviada">Enviada</option>
            <option value="fallida">Fallida</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ────────────────────────────────────────────────────
export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState([])
  const [clientes, setClientes]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [modalOpen, setModalOpen]           = useState(false)
  const [editing, setEditing]               = useState(null)
  const [deletingId, setDeletingId]         = useState(null)
  // Notificación abierta en el modal de envío por WhatsApp Web
  const [sendingNotif, setSendingNotif]     = useState(null)
  const [search, setSearch]                 = useState('')

  useEffect(() => {
    fetchNotificaciones()
    fetchClientes()
  }, [])

  // Actualizar en vivo cuando otra vista (toast, /inicio) marca una
  // notif como enviada. Evita refetch de toda la tabla.
  useEffect(() => {
    return suscribirseA(EVENTOS.notifActualizada, (e) => {
      const { id, estado } = e.detail ?? {}
      if (!id) return
      setNotificaciones(prev => prev.map(n =>
        n.id === id
          ? { ...n, estado: estado ?? n.estado, enviado_at: new Date().toISOString() }
          : n
      ))
    })
  }, [])

  async function fetchNotificaciones() {
    setLoading(true)
    const { data } = await supabase
      .from('notificaciones')
      .select('*, clientes(nombre, telefono), servicios(tipo, vehiculos(patente))')
      .order('fecha_envio', { ascending: true })
    setNotificaciones(data ?? [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, tipo')
      .eq('activo', true)
      .order('nombre')
    setClientes(data ?? [])
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(n)  { setEditing(n);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('notificaciones').update(form).eq('id', editing.id)
        .select('*, clientes(nombre, telefono), servicios(tipo, vehiculos(patente))').single()
      if (error) { notificar.error('No se pudo editar la notificación', error); return }
      setNotificaciones(prev => prev.map(n => n.id === editing.id ? data : n))
      emitirNotifActualizada({ id: data.id, estado: data.estado, tipo: 'update' })
      notificar.exito('Notificación actualizada')
    } else {
      const { data, error } = await supabase
        .from('notificaciones').insert(form)
        .select('*, clientes(nombre, telefono), servicios(tipo, vehiculos(patente))').single()
      if (error) { notificar.error('No se pudo crear la notificación', error); return }
      setNotificaciones(prev =>
        [...prev, data].sort((a, b) => a.fecha_envio.localeCompare(b.fecha_envio))
      )
      emitirNotifActualizada({ id: data.id, estado: data.estado, tipo: 'create' })
      notificar.exito('Notificación programada')
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('notificaciones').update({ estado: 'cancelada' }).eq('id', id)
    if (error) {
      notificar.error('No se pudo cancelar', error)
      return
    }
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, estado: 'cancelada' } : n))
    setDeletingId(null)
    emitirNotifActualizada({ id, estado: 'cancelada', tipo: 'update' })
    notificar.info('Notificación cancelada')
  }

  // La query de fetchNotificaciones ya trae clientes(nombre, telefono),
  // así que no hace falta un fetch extra al abrir el modal.
  function handleOpenEnviar(notif) {
    setSendingNotif(notif)
  }

  const pendientes = notificaciones.filter(n => n.estado === 'pendiente').length

  const filtradas = notificaciones.filter(n => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (n.clientes?.nombre ?? '').toLowerCase().includes(q) ||
           n.motivo.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : (
            <>
              {filtradas.length} notificacion{filtradas.length !== 1 ? 'es' : ''}
              {pendientes > 0 && (
                <span
                  className="ml-2 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    color: estadoConfig.pendiente.color,
                    backgroundColor: `${estadoConfig.pendiente.color}22`,
                    border: `1px solid ${estadoConfig.pendiente.color}44`,
                  }}
                >
                  {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nueva notificación
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o motivo..."
          className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
      </div>

      {loading ? (
        <TableSkeleton columns={6} minWidth={700} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={search ? 'Sin resultados' : 'No hay notificaciones todavía'}
          message={
            search
              ? 'Probá con otro cliente o motivo.'
              : 'Programá el primer recordatorio para un cliente.'
          }
          action={!search && (
            <Button onClick={openCreate}>
              <Plus size={15} /> Nueva notificación
            </Button>
          )}
        />
      ) : (
        <DataTable
          columns={['Cliente', 'Motivo', 'Fecha envío', 'Hora', 'Estado', '']}
          minWidth={700}
        >
              {filtradas.map(n => (
                <tr key={n.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                  <td className="px-4 py-3 text-gray-100 font-medium">{n.clientes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-200">{n.motivo}</td>
                  <td className="px-4 py-3 text-gray-200">{n.fecha_envio.split('-').reverse().join('/')}</td>
                  <td className="px-4 py-3 text-gray-200">{n.hora_envio?.slice(0, 5)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color: estadoConfig[n.estado]?.color,
                        backgroundColor: estadoConfig[n.estado]?.color + '22',
                        border: `1px solid ${estadoConfig[n.estado]?.color}55`,
                      }}
                    >
                      {estadoConfig[n.estado]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === n.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(n.id)}>Confirmar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          {n.estado === 'pendiente' && (
                            <Button size="sm" onClick={() => handleOpenEnviar(n)}>
                              <MessageCircle size={13} /> Enviar por WhatsApp
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => openEdit(n)}>Editar</Button>
                          <Button size="sm" variant="danger" onClick={() => setDeletingId(n.id)}>Cancelar notif.</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
        </DataTable>
      )}

      {modalOpen && (
        <NotificacionModal
          notificacion={editing}
          clientes={clientes}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {sendingNotif && (
        <EnviarWhatsAppModal
          notificacion={sendingNotif}
          onClose={() => setSendingNotif(null)}
        />
      )}
    </div>
  )
}
