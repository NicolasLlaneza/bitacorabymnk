import { useState, useEffect } from 'react'
import { Plus, Car } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { notificar } from '@/lib/notificar'
import { emitirVehiculoActualizado } from '@/lib/eventos'
import { normalizarPatente, detectarTipoPatente, MAX_LEN_PATENTE, tipoLabelsCortos as tipoLabels } from '@/lib/patente'
import { formatearKm } from '@/lib/formato'
import { normalizarNombre } from '@/lib/texto'
import { OBJETO } from '@/lib/labels'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Modal from '@/components/Modal'
import DataTable from '@/components/DataTable'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'

// ─── Formulario ────────────────────────────────────────────────────────
function VehiculoModal({ vehiculo, clientes, onSave, onClose }) {
  const [form, setForm] = useState({
    cliente_id:  vehiculo?.cliente_id  ?? '',
    patente:     vehiculo?.patente     ?? '',
    tipo_patente: vehiculo?.tipo_patente ?? '',
    marca:       vehiculo?.marca       ?? '',
    modelo:      vehiculo?.modelo      ?? '',
    anio:        vehiculo?.anio        ?? '',
    km:          vehiculo?.km          ?? 0,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function handlePatente(value) {
    const normalizada = normalizarPatente(value)
    const tipo        = detectarTipoPatente(normalizada)
    setForm(prev => ({ ...prev, patente: normalizada, tipo_patente: tipo }))
    setErrors(prev => ({ ...prev, patente: null, tipo_patente: null }))
  }

  function validate() {
    const errs = {}
    if (!form.cliente_id)          errs.cliente_id   = 'Requerido'
    if (!form.patente.trim())      errs.patente      = 'Requerido'
    if (!form.tipo_patente)        errs.tipo_patente = 'Formato de patente no reconocido'
    if (!form.marca.trim())        errs.marca        = 'Requerido'
    if (!form.modelo.trim())       errs.modelo       = 'Requerido'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    // Normalizamos marca y modelo a Title Case para uniformar cargas.
    await onSave({
      ...form,
      marca:  normalizarNombre(form.marca),
      modelo: normalizarNombre(form.modelo),
      anio:   form.anio ? parseInt(form.anio) : null,
      km:     parseInt(form.km) || 0,
    })
    setSaving(false)
  }

  return (
    <Modal title={vehiculo ? `Editar ${OBJETO.singular.toLowerCase()}` : `Nuevo ${OBJETO.singular.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Cliente"
          value={form.cliente_id}
          onChange={e => set('cliente_id', e.target.value)}
          error={errors.cliente_id}
        >
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label={OBJETO.identificador}
              value={form.patente}
              onChange={e => handlePatente(e.target.value)}
              error={errors.patente}
              placeholder={OBJETO.identificadorEjemplo}
              maxLength={MAX_LEN_PATENTE}
            />
            {form.tipo_patente && (
              <p className="text-xs text-gray-200 mt-1">
                Detectado: {tipoLabels[form.tipo_patente]}
              </p>
            )}
            {errors.tipo_patente && (
              <p className="text-xs text-red-bright mt-1">{errors.tipo_patente}</p>
            )}
          </div>
          <Input
            label="Año"
            type="number"
            value={form.anio}
            onChange={e => set('anio', e.target.value)}
            placeholder="2020"
            min={1950}
            max={2100}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Marca"
            value={form.marca}
            onChange={e => set('marca', e.target.value)}
            error={errors.marca}
            placeholder="Toyota"
          />
          <Input
            label="Modelo"
            value={form.modelo}
            onChange={e => set('modelo', e.target.value)}
            error={errors.modelo}
            placeholder="Corolla"
          />
        </div>

        <Input
          label="Kilometraje"
          type="number"
          value={form.km}
          onChange={e => set('km', e.target.value)}
          placeholder="0"
          min={0}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página principal ───────────────────────────────────────────────────
export default function VehiculosPage() {
  const [vehiculos, setVehiculos]       = useState([])
  const [clientes, setClientes]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState(null)
  const [deletingId, setDeletingId]     = useState(null)
  const [search, setSearch]             = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchVehiculos()
    fetchClientes()
  }, [])

  async function fetchVehiculos() {
    setLoading(true)
    const { data } = await supabase
      .from('vehiculos')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    setVehiculos(data ?? [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
    setClientes(data ?? [])
  }

  function openCreate() { setEditing(null); setModalOpen(true) }
  function openEdit(v)  { setEditing(v);    setModalOpen(true) }

  async function handleSave(form) {
    if (editing) {
      const { data, error } = await supabase
        .from('vehiculos').update(form).eq('id', editing.id)
        .select('*, clientes(nombre)').single()
      if (error) { notificar.error(`No se pudo editar ${OBJETO.articulo} ${OBJETO.singular.toLowerCase()}`, error); return }
      setVehiculos(prev => prev.map(v => v.id === editing.id ? data : v))
      emitirVehiculoActualizado({ id: data.id, tipo: 'update' })
      notificar.exito(`${OBJETO.singular} actualizado`)
    } else {
      const { data, error } = await supabase
        .from('vehiculos').insert(form)
        .select('*, clientes(nombre)').single()
      if (error) { notificar.error(`No se pudo crear ${OBJETO.articulo} ${OBJETO.singular.toLowerCase()}`, error); return }
      setVehiculos(prev => [data, ...prev])
      emitirVehiculoActualizado({ id: data.id, tipo: 'create' })
      notificar.exito(`${OBJETO.singular} creado`)
    }
    setModalOpen(false)
  }

  async function handleDelete(id) {
    const { data, error } = await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', id)
      .select('id, activo')
    if (error) {
      notificar.error('No se pudo dar de baja', error)
      return
    }
    if (!data || data.length === 0) {
      notificar.error(`No se pudo dar de baja ${OBJETO.articulo} ${OBJETO.singular.toLowerCase()}. Refrescá y volvé a intentar.`)
      return
    }
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, activo: false } : v))
    setDeletingId(null)
    emitirVehiculoActualizado({ id, tipo: 'delete' })
    notificar.exito(`${OBJETO.singular} dado de baja`)
  }

  async function handleReactivate(id) {
    const { data, error } = await supabase
      .from('vehiculos')
      .update({ activo: true })
      .eq('id', id)
      .select('id, activo')
    if (error) {
      notificar.error('No se pudo reactivar', error)
      return
    }
    if (!data || data.length === 0) {
      notificar.error(`No se pudo reactivar ${OBJETO.articulo} ${OBJETO.singular.toLowerCase()}. Refrescá y volvé a intentar.`)
      return
    }
    setVehiculos(prev => prev.map(v => v.id === id ? { ...v, activo: true } : v))
    emitirVehiculoActualizado({ id, tipo: 'update' })
    notificar.exito(`${OBJETO.singular} reactivado`)
  }

  const inactivos = vehiculos.filter(v => !v.activo).length
  const filtrados = vehiculos
    .filter(v => showInactive ? true : v.activo)
    .filter(v => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return v.patente.toLowerCase().includes(q) ||
             v.marca.toLowerCase().includes(q) ||
             v.modelo.toLowerCase().includes(q) ||
             (v.clientes?.nombre ?? '').toLowerCase().includes(q)
    })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${filtrados.length} ${filtrados.length === 1 ? OBJETO.singular.toLowerCase() : OBJETO.plural.toLowerCase()}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo {OBJETO.singular.toLowerCase()}
        </Button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Buscar por ${OBJETO.identificador.toLowerCase()}, marca, modelo o cliente...`}
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

      {loading ? (
        <TableSkeleton columns={7} minWidth={700} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Car}
          title={search ? 'Sin resultados' : `No hay ${OBJETO.plural.toLowerCase()} todavía`}
          message={
            search
              ? `Probá con otr${OBJETO.articulo === 'la' ? 'a' : 'o'} ${OBJETO.identificador.toLowerCase()}, marca o cliente.`
              : `Cargá ${OBJETO.articulo === 'la' ? 'la primera' : 'el primer'} ${OBJETO.singular.toLowerCase()}.`
          }
          action={!search && (
            <Button onClick={openCreate}>
              <Plus size={15} /> Nuevo {OBJETO.singular.toLowerCase()}
            </Button>
          )}
        />
      ) : (
        <>
          {/* Desktop: tabla completa */}
          <div className="hidden md:block">
            <DataTable
              columns={['Cliente', OBJETO.identificador, 'Tipo', 'Marca / Modelo', 'Año', 'KM', '']}
              minWidth={700}
            >
                  {filtrados.map(v => (
                    <tr key={v.id} className={`border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors ${!v.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-100 font-medium">{v.clientes?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-100 font-mono tracking-wider">
                        {v.patente}
                        {!v.activo && <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded font-sans">Baja</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-200">{tipoLabels[v.tipo_patente] ?? v.tipo_patente}</td>
                      <td className="px-4 py-3 text-gray-200">{v.marca} {v.modelo}</td>
                      <td className="px-4 py-3 text-gray-200">{v.anio ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-200">{formatearKm(v.km)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!v.activo ? (
                            <Button size="sm" variant="primary" onClick={() => handleReactivate(v.id)}>
                              Reactivar
                            </Button>
                          ) : deletingId === v.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => handleDelete(v.id)}>Confirmar baja</Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => openEdit(v)}>Editar</Button>
                              <Button size="sm" variant="danger" onClick={() => setDeletingId(v.id)}>Dar de baja</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </DataTable>
          </div>

          {/* Mobile: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {filtrados.map(v => (
              <div
                key={v.id}
                className={`bg-dark-200 border border-dark-400 rounded-lg p-4 space-y-3 ${!v.activo ? 'opacity-60' : ''}`}
              >
                {/* Header: patente + tipo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-mono tracking-wider text-lg font-bold">
                      {v.patente}
                      {!v.activo && (
                        <span className="ml-2 text-xs text-gray-300 border border-dark-400 px-1.5 py-0.5 rounded font-sans font-normal">Baja</span>
                      )}
                    </p>
                    <p className="text-gray-200 text-sm mt-0.5">{v.marca} {v.modelo}</p>
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-gray-200 border-dark-400 bg-dark-300">
                    {tipoLabels[v.tipo_patente] ?? v.tipo_patente}
                  </span>
                </div>

                {/* Datos */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Cliente</span>
                    <span className="text-gray-100 text-right truncate">{v.clientes?.nombre ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Año</span>
                    <span className="text-gray-100">{v.anio ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">KM</span>
                    <span className="text-gray-100">{formatearKm(v.km)}</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  {!v.activo ? (
                    <Button size="sm" variant="primary" className="flex-1 justify-center" onClick={() => handleReactivate(v.id)}>
                      Reactivar
                    </Button>
                  ) : deletingId === v.id ? (
                    <>
                      <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => handleDelete(v.id)}>Confirmar baja</Button>
                      <Button size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => setDeletingId(null)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1 justify-center" onClick={() => openEdit(v)}>Editar</Button>
                      <Button size="sm" variant="danger" className="flex-1 justify-center" onClick={() => setDeletingId(v.id)}>Dar de baja</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <VehiculoModal
          vehiculo={editing}
          clientes={clientes}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
