import { useState, useEffect } from 'react'
import { Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { notificar } from '@/lib/notificar'
import { emitirClienteActualizado } from '@/lib/eventos'
import { normalizarNombre, normalizarEmail } from '@/lib/texto'
import { normalizarTelefonoAR } from '@/lib/telefono'
import { CANALES, CANALES_LIST } from '@/lib/catalogos'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'
import DataTable from '@/components/DataTable'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'

import { estadoCliente as estadoConfig } from '@/lib/badges'

// Botón de pestaña reutilizable para el filtro por tipo
function TabButton({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-xs uppercase tracking-wider font-semibold transition-colors border-b-2 -mb-px ${
        active
          ? 'border-red text-gray-100'
          : 'border-transparent text-gray-200 hover:text-gray-100'
      }`}
    >
      {label}
      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
        active ? 'bg-red text-gray-100' : 'bg-dark-300 text-gray-300'
      }`}>
        {count}
      </span>
    </button>
  )
}

// ─── Formulario dentro del modal ───────────────────────────────────────
function ClienteModal({ cliente, onSave, onClose }) {
  const [form, setForm] = useState({
    tipo:            cliente?.tipo            ?? 'persona',
    nombre:          cliente?.nombre          ?? '',
    documento:       cliente?.documento       ?? '',
    contacto_nombre: cliente?.contacto_nombre ?? '',
    telefono:        cliente?.telefono        ?? '',
    email:           cliente?.email           ?? '',
    canal_preferido: cliente?.canal_preferido ?? CANALES.WHATSAPP,
    estado:          cliente?.estado          ?? 'nuevo',
    acepta_whatsapp: cliente?.acepta_whatsapp ?? true,
  })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)

  const esEmpresa = form.tipo === 'empresa'

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.nombre.trim())   errs.nombre   = esEmpresa ? 'Razón social requerida' : 'Requerido'
    if (!form.telefono.trim()) errs.telefono = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    // Normalizamos al guardar para uniformar mayúsculas/minúsculas y prefijos
    // de teléfono. Los usuarios pueden cargar como quieran.
    await onSave({
      ...form,
      nombre:          normalizarNombre(form.nombre),
      telefono:        normalizarTelefonoAR(form.telefono),
      email:           form.email.trim() ? normalizarEmail(form.email) : null,
      documento:       form.documento.trim() || null,
      contacto_nombre: esEmpresa && form.contacto_nombre.trim()
        ? normalizarNombre(form.contacto_nombre)
        : null,
      acepta_whatsapp: !!form.acepta_whatsapp,
    })
    setSaving(false)
  }

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Tipo cliente */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('tipo', 'persona')}
            className={`px-4 py-2.5 rounded border text-sm font-semibold uppercase tracking-wider transition-colors ${
              form.tipo === 'persona'
                ? 'border-red text-gray-100 bg-red/10'
                : 'border-dark-400 text-gray-200 hover:border-gray-200'
            }`}
          >
            Persona
          </button>
          <button
            type="button"
            onClick={() => set('tipo', 'empresa')}
            className={`px-4 py-2.5 rounded border text-sm font-semibold uppercase tracking-wider transition-colors ${
              form.tipo === 'empresa'
                ? 'border-red text-gray-100 bg-red/10'
                : 'border-dark-400 text-gray-200 hover:border-gray-200'
            }`}
          >
            Empresa
          </button>
        </div>

        <Input
          label={esEmpresa ? 'Razón social' : 'Nombre y apellido'}
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          error={errors.nombre}
          placeholder={esEmpresa ? 'Calper SA' : 'Juan García'}
        />

        <Input
          label={esEmpresa ? 'CUIT (opcional)' : 'DNI (opcional)'}
          value={form.documento}
          onChange={e => set('documento', e.target.value)}
          placeholder={esEmpresa ? '30-12345678-9' : '20123456'}
        />

        {esEmpresa && (
          <Input
            label="Nombre de contacto (opcional)"
            value={form.contacto_nombre}
            onChange={e => set('contacto_nombre', e.target.value)}
            placeholder="Persona con quien nos comunicamos"
          />
        )}

        <Input
          label="Teléfono"
          value={form.telefono}
          onChange={e => set('telefono', e.target.value)}
          error={errors.telefono}
          placeholder="+54 9 11 1234 5678"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={e => set('email', e.target.value)}
          placeholder={esEmpresa ? 'contacto@empresa.com' : 'juan@email.com'}
        />
        <Select
          label="Canal preferido"
          value={form.canal_preferido}
          onChange={e => set('canal_preferido', e.target.value)}
        >
          {CANALES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select
          label="Estado"
          value={form.estado}
          onChange={e => set('estado', e.target.value)}
        >
          <option value="nuevo">Nuevo</option>
          <option value="ok">OK</option>
          <option value="proximo">Próximo</option>
          <option value="urgente">Urgente</option>
        </Select>

        {/* Consentimiento WhatsApp (Ley 25.326 + Meta Business Policy) */}
        <label className="flex items-start gap-3 py-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.acepta_whatsapp}
            onChange={e => set('acepta_whatsapp', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red cursor-pointer"
          />
          <div className="text-sm text-gray-200 group-hover:text-gray-100 transition-colors">
            <p>El cliente autorizó recibir notificaciones por WhatsApp</p>
            <p className="text-xs text-gray-300 mt-0.5">
              Si está desmarcado, no se le enviarán recordatorios automáticos.
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ──────────────────────────────────────────────────
export default function ClientesPage() {
  const [clientes, setClientes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [deletingId, setDeletingId]   = useState(null)
  const [search, setSearch]           = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [tipoFiltro, setTipoFiltro]   = useState('todos')  // 'todos' | 'persona' | 'empresa'

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    setClientes(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(c)  { setEditing(c);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('clientes').update(form).eq('id', editing.id).select().single()
      if (error) { notificar.error('No se pudo editar el cliente', error); return error }
      setClientes(prev => prev.map(c => c.id === editing.id ? data : c))
      emitirClienteActualizado({ id: data.id, tipo: 'update' })
      notificar.exito('Cliente actualizado')
    } else {
      const { data, error } = await supabase
        .from('clientes').insert(form).select().single()
      if (error) { notificar.error('No se pudo crear el cliente', error); return error }
      setClientes(prev => [data, ...prev])
      emitirClienteActualizado({ id: data.id, tipo: 'create' })
      notificar.exito('Cliente creado')
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    const { data, error } = await supabase
      .from('clientes')
      .update({ activo: false, fecha_baja: new Date().toISOString() })
      .eq('id', id)
      .select('id, activo, fecha_baja')
    if (error) {
      notificar.error('No se pudo dar de baja', error)
      return
    }
    if (!data || data.length === 0) {
      notificar.error('No se pudo dar de baja el cliente. Refrescá y volvé a intentar.')
      return
    }
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: false, fecha_baja: data[0].fecha_baja } : c))
    setDeletingId(null)
    emitirClienteActualizado({ id, tipo: 'delete' })
    notificar.exito('Cliente dado de baja')
  }

  async function handleReactivate(id) {
    const { data, error } = await supabase
      .from('clientes')
      .update({ activo: true, fecha_baja: null })
      .eq('id', id)
      .select('id, activo, fecha_baja')
    if (error) {
      notificar.error('No se pudo reactivar', error)
      return
    }
    if (!data || data.length === 0) {
      notificar.error('No se pudo reactivar el cliente. Refrescá y volvé a intentar.')
      return
    }
    setClientes(prev => prev.map(c => c.id === id ? { ...c, activo: true, fecha_baja: null } : c))
    emitirClienteActualizado({ id, tipo: 'update' })
    notificar.exito('Cliente reactivado')
  }

  const inactivos = clientes.filter(c => !c.activo).length

  // Contadores por tipo (respetando el filtro de inactivos actual)
  const clientesVisibles = clientes.filter(c => showInactive ? true : c.activo)
  const conteoTodos    = clientesVisibles.length
  const conteoPersonas = clientesVisibles.filter(c => c.tipo === 'persona').length
  const conteoEmpresas = clientesVisibles.filter(c => c.tipo === 'empresa').length

  const filtrados = clientesVisibles
    .filter(c => tipoFiltro === 'todos' ? true : c.tipo === tipoFiltro)
    .filter(c => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return c.nombre.toLowerCase().includes(q) ||
             c.telefono.toLowerCase().includes(q) ||
             (c.email ?? '').toLowerCase().includes(q) ||
             (c.contacto_nombre ?? '').toLowerCase().includes(q) ||
             (c.documento ?? '').toLowerCase().includes(q)
    })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${filtrados.length} cliente${filtrados.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo cliente
        </Button>
      </div>

      {/* Tabs por tipo */}
      <div className="flex items-center gap-1 mb-4 border-b border-dark-400">
        <TabButton
          active={tipoFiltro === 'todos'}
          onClick={() => setTipoFiltro('todos')}
          label="Todos"
          count={conteoTodos}
        />
        <TabButton
          active={tipoFiltro === 'persona'}
          onClick={() => setTipoFiltro('persona')}
          label="Personas"
          count={conteoPersonas}
        />
        <TabButton
          active={tipoFiltro === 'empresa'}
          onClick={() => setTipoFiltro('empresa')}
          label="Empresas"
          count={conteoEmpresas}
        />
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={
            tipoFiltro === 'empresa'
              ? 'Buscar por razón social, contacto, CUIT, teléfono o email...'
              : tipoFiltro === 'persona'
                ? 'Buscar por nombre, DNI, teléfono o email...'
                : 'Buscar por nombre, teléfono o email...'
          }
          className="flex-1 bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
        {inactivos > 0 && (
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`text-xs px-3 py-2 rounded border transition-colors whitespace-nowrap ${
              showInactive
                ? 'border-red text-red bg-red/10'
                : 'border-dark-400 text-gray-200 hover:border-gray-200'
            }`}
          >
            {showInactive ? 'Ocultar bajas' : `Ver bajas (${inactivos})`}
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <TableSkeleton columns={7} minWidth={640} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || tipoFiltro !== 'todos' ? 'Sin resultados' : 'No hay clientes todavía'}
          message={
            search || tipoFiltro !== 'todos'
              ? 'Probá con otro término o cambiá el filtro.'
              : 'Empezá cargando el primer cliente del taller.'
          }
          action={!search && tipoFiltro === 'todos' && (
            <Button onClick={openCreate}>
              <Plus size={15} /> Nuevo cliente
            </Button>
          )}
        />
      ) : (
        <>
          {/* Desktop: tabla completa */}
          <div className="hidden md:block">
            <DataTable
              columns={['Tipo', 'Nombre', 'Teléfono', 'Email', 'Canal', 'Estado', '']}
              minWidth={640}
            >
                  {filtrados.map(cliente => (
                    <tr key={cliente.id} className={`border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors ${!cliente.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded border ${
                          cliente.tipo === 'empresa'
                            ? 'text-blue-400 border-blue-400/40 bg-blue-400/10'
                            : 'text-gray-200 border-dark-400 bg-dark-300'
                        }`}>
                          {cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-100 font-medium">
                        {cliente.nombre}
                        {cliente.tipo === 'empresa' && cliente.contacto_nombre && (
                          <span className="block text-xs text-gray-300 font-normal mt-0.5">
                            Contacto: {cliente.contacto_nombre}
                          </span>
                        )}
                        {!cliente.activo && <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded">Baja</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-200">{cliente.telefono}</td>
                      <td className="px-4 py-3 text-gray-200">{cliente.email ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-200">{cliente.canal_preferido}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                          style={{
                            color: estadoConfig[cliente.estado]?.color,
                            backgroundColor: estadoConfig[cliente.estado]?.color + '22',
                            border: `1px solid ${estadoConfig[cliente.estado]?.color}55`,
                          }}
                        >
                          {estadoConfig[cliente.estado]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!cliente.activo ? (
                            <Button size="sm" variant="primary" onClick={() => handleReactivate(cliente.id)}>
                              Reactivar
                            </Button>
                          ) : deletingId === cliente.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(cliente.id)}>
                                Confirmar baja
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => openEdit(cliente)}>
                                Editar
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => setDeletingId(cliente.id)}>
                                Dar de baja
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </DataTable>
          </div>

          {/* Mobile: tarjetas apiladas (sin scroll horizontal) */}
          <div className="md:hidden space-y-3">
            {filtrados.map(cliente => (
              <div
                key={cliente.id}
                className={`bg-dark-200 border border-dark-400 rounded-lg p-4 space-y-3 ${!cliente.activo ? 'opacity-60' : ''}`}
              >
                {/* Header: nombre + tipo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-medium truncate">
                      {cliente.nombre}
                      {!cliente.activo && (
                        <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded font-normal">Baja</span>
                      )}
                    </p>
                    {cliente.tipo === 'empresa' && cliente.contacto_nombre && (
                      <p className="text-xs text-gray-300 mt-0.5 truncate">
                        Contacto: {cliente.contacto_nombre}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs uppercase tracking-wider px-2 py-0.5 rounded border ${
                    cliente.tipo === 'empresa'
                      ? 'text-blue-400 border-blue-400/40 bg-blue-400/10'
                      : 'text-gray-200 border-dark-400 bg-dark-300'
                  }`}>
                    {cliente.tipo === 'empresa' ? 'Empresa' : 'Persona'}
                  </span>
                </div>

                {/* Contacto y estado */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Teléfono</span>
                    <span className="text-gray-100 text-right break-all">{cliente.telefono}</span>
                  </div>
                  {cliente.email && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-300 text-xs uppercase tracking-wider">Email</span>
                      <span className="text-gray-100 text-right break-all">{cliente.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Canal</span>
                    <span className="text-gray-100">{cliente.canal_preferido}</span>
                  </div>
                  <div className="flex justify-between gap-3 items-center">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Estado</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color: estadoConfig[cliente.estado]?.color,
                        backgroundColor: estadoConfig[cliente.estado]?.color + '22',
                        border: `1px solid ${estadoConfig[cliente.estado]?.color}55`,
                      }}
                    >
                      {estadoConfig[cliente.estado]?.label}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  {!cliente.activo ? (
                    <Button size="sm" variant="primary" className="flex-1 justify-center" onClick={() => handleReactivate(cliente.id)}>
                      Reactivar
                    </Button>
                  ) : deletingId === cliente.id ? (
                    <>
                      <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => handleDelete(cliente.id)}>
                        Confirmar baja
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => setDeletingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1 justify-center" onClick={() => openEdit(cliente)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => setDeletingId(cliente.id)}>
                        Dar de baja
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <ClienteModal
          cliente={editing}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
