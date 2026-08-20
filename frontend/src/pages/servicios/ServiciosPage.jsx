import { useState, useEffect } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { notificar } from '@/lib/notificar'
import { emitirServicioActualizado } from '@/lib/eventos'
import { formatearARS, formatearKm } from '@/lib/formato'
import Button from '@/components/Button'
import DataTable from '@/components/DataTable'
import EmptyState from '@/components/EmptyState'
import TableSkeleton from '@/components/TableSkeleton'
import ServicioModal from './ServicioModal'

// ─── Página principal ───────────────────────────────────────────────────
export default function ServiciosPage() {
  const [servicios, setServicios]   = useState([])
  const [vehiculos, setVehiculos]   = useState([])
  const [clientes, setClientes]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    fetchServicios()
    fetchVehiculos()
    fetchClientes()
  }, [])

  async function fetchServicios() {
    setLoading(true)
    const { data } = await supabase
      .from('servicios')
      .select('*, vehiculos(patente, marca, modelo), clientes(nombre)')
      .order('fecha', { ascending: false })
    setServicios(data ?? [])
    setLoading(false)
  }

  async function fetchVehiculos() {
    const { data } = await supabase
      .from('vehiculos')
      .select('id, patente, marca, modelo, cliente_id, clientes(nombre)')
      .eq('activo', true)
      .order('patente')
    setVehiculos(data ?? [])
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
  function openEdit(s)  { setEditing(s);    setModalOpen(true) }

  async function handleSave(form) {
    // Se usa para: edición de servicio existente, o creación con vehículo existente
    // (los flujos con cliente/vehículo nuevo pasan por handleServicioCreated).
    if (editing) {
      const { data, error } = await supabase
        .from('servicios').update(form).eq('id', editing.id)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { notificar.error('No se pudo editar el servicio', error); return null }
      setServicios(prev => prev.map(s => s.id === editing.id ? data : s))
      setModalOpen(false)
      emitirServicioActualizado({ id: data.id, tipo: 'update' })
      notificar.exito('Servicio actualizado')
      return data
    } else {
      const { data, error } = await supabase
        .from('servicios').insert(form)
        .select('*, vehiculos(patente, marca, modelo), clientes(nombre)').single()
      if (error) { notificar.error('No se pudo crear el servicio', error); return null }
      setServicios(prev => [data, ...prev])
      setModalOpen(false)
      emitirServicioActualizado({ id: data.id, tipo: 'create' })
      notificar.exito('Servicio creado')
      return data
    }
  }

  // Post-callback cuando la RPC crear_servicio_completo terminó exitosamente.
  // Recibe { servicio_id, cliente_id, vehiculo_id }. Refresca listados
  // y cierra el modal.
  async function handleServicioCreated(ids) {
    await Promise.all([fetchServicios(), fetchVehiculos(), fetchClientes()])
    setModalOpen(false)
    emitirServicioActualizado({ id: ids?.servicio_id, tipo: 'create' })
    notificar.exito('Servicio creado')
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) {
      notificar.error('No se pudo eliminar el servicio', error)
      return
    }
    setServicios(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
    emitirServicioActualizado({ id, tipo: 'delete' })
    notificar.exito('Servicio eliminado')
  }

  const filtrados = servicios.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (s.clientes?.nombre ?? '').toLowerCase().includes(q) ||
           (s.vehiculos?.patente ?? '').toLowerCase().includes(q) ||
           s.tipo.toLowerCase().includes(q)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-gray-200 text-sm">
          {loading ? '...' : `${filtrados.length} servicio${filtrados.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Nuevo servicio
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, patente o tipo de servicio..."
          className="w-full bg-dark-300 border border-dark-400 text-gray-100 text-sm rounded px-3 py-2 outline-none focus:border-red transition-colors placeholder:text-gray-300"
        />
      </div>

      {loading ? (
        <TableSkeleton columns={8} minWidth={700} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={search ? 'Sin resultados' : 'No hay servicios todavía'}
          message={
            search
              ? 'Probá con otro cliente, patente o tipo de servicio.'
              : 'Registrá el primer trabajo realizado.'
          }
          action={!search && (
            <Button onClick={openCreate}>
              <Plus size={15} /> Nuevo servicio
            </Button>
          )}
        />
      ) : (
        <>
          {/* Desktop: tabla completa */}
          <div className="hidden md:block">
            <DataTable
              columns={['Cliente', 'Vehículo', 'Servicio', 'Fecha', 'KM', 'Importe', 'Cobro', '']}
              minWidth={700}
            >
                  {filtrados.map(s => (
                    <tr key={s.id} className="border-b border-dark-400 last:border-0 hover:bg-dark-300 transition-colors">
                      <td className="px-4 py-3 text-gray-100 font-medium">{s.clientes?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-200 font-mono">{s.vehiculos?.patente} <span className="font-sans text-xs">{s.vehiculos?.marca} {s.vehiculos?.modelo}</span></td>
                      <td className="px-4 py-3 text-gray-200">{s.tipo}</td>
                      <td className="px-4 py-3 text-gray-200">{s.fecha.split('-').reverse().join('/')}</td>
                      <td className="px-4 py-3 text-gray-200">{formatearKm(s.km)}</td>
                      <td className="px-4 py-3 text-gray-200">
                        {s.importe != null ? formatearARS(s.importe) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.cobrado ? (
                          <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-green-500 border-green-500/40 bg-green-500/10">
                            Cobrado
                          </span>
                        ) : (
                          <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-yellow-500 border-yellow-500/40 bg-yellow-500/10">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Editar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </DataTable>
          </div>

          {/* Mobile: tarjetas apiladas */}
          <div className="md:hidden space-y-3">
            {filtrados.map(s => (
              <div
                key={s.id}
                className="bg-dark-200 border border-dark-400 rounded-lg p-4 space-y-3"
              >
                {/* Header: tipo + fecha + estado de cobro */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-100 font-medium">{s.tipo}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{s.fecha.split('-').reverse().join('/')}</p>
                  </div>
                  {s.cobrado ? (
                    <span className="shrink-0 text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-green-500 border-green-500/40 bg-green-500/10">
                      Cobrado
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs uppercase tracking-wider px-2 py-0.5 rounded border text-yellow-500 border-yellow-500/40 bg-yellow-500/10">
                      Pendiente
                    </span>
                  )}
                </div>

                {/* Datos */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Cliente</span>
                    <span className="text-gray-100 text-right truncate">{s.clientes?.nombre ?? '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Vehículo</span>
                    <span className="text-gray-100 text-right font-mono">{s.vehiculos?.patente}</span>
                  </div>
                  {(s.vehiculos?.marca || s.vehiculos?.modelo) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-300 text-xs uppercase tracking-wider">Marca / Modelo</span>
                      <span className="text-gray-100 text-right truncate">{s.vehiculos?.marca} {s.vehiculos?.modelo}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">KM</span>
                    <span className="text-gray-100">{formatearKm(s.km)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300 text-xs uppercase tracking-wider">Importe</span>
                    <span className="text-gray-100 font-medium">
                      {s.importe != null ? formatearARS(s.importe) : '—'}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" className="flex-1 justify-center" onClick={() => openEdit(s)}>
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <ServicioModal
          servicio={editing}
          vehiculos={vehiculos}
          clientes={clientes}
          onSave={handleSave}
          onServicioCreated={handleServicioCreated}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
