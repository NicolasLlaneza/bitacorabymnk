// Modal para crear/editar servicios. Soporta 3 flujos combinados:
//   1. Servicio sobre vehículo existente (flujo simple)
//   2. Servicio + vehículo nuevo, cliente existente
//   3. Servicio + vehículo + cliente todo nuevo (con detección de duplicado)
// Los 3 flujos con cliente/vehículo nuevo pasan por la RPC
// crear_servicio_completo (transaccional).

import { useState, useEffect, useCallback, Suspense } from 'react'
import { ArrowLeft, AlertCircle, Plus, Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { normalizarPatente, detectarTipoPatente, MAX_LEN_PATENTE } from '@/lib/patente'
import { TIPOS_SERVICIO, ROLES } from '@/lib/catalogos'
import { normalizarTelefonoAR } from '@/lib/telefono'
import { normalizarNombre, normalizarEmail } from '@/lib/texto'
import { uploadPendingFotos } from '@/lib/fotosServicio'
import { lazyWithRetry } from '@/lib/lazyWithRetry'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Textarea from '@/components/Textarea'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'

// FotoGallery arrastra browser-image-compression (~28 KB gzip). Al
// hacerlo lazy, esa librería solo se descarga cuando el usuario abre
// el modal — y no penaliza al que solo entra a listar servicios.
// lazyWithRetry maneja el "chunk load error" post-deploy (era el que
// llegaba a Sentry con "Failed to fetch dynamically imported module").
const FotoGallery = lazyWithRetry(() => import('@/components/FotoGallery'))

function FotoGalleryFallback() {
  return (
    <div className="flex items-center gap-2 text-gray-300 text-sm py-4">
      <Loader2 size={14} className="animate-spin" />
      Cargando galería de fotos...
    </div>
  )
}


function hoy() {
  return new Date().toISOString().split('T')[0]
}

// ─── Formulario ────────────────────────────────────────────────────────
export default function ServicioModal({ servicio, vehiculos, clientes, onSave, onServicioCreated, onClose }) {
  const { profile } = useAuth()
  const esSuperadmin = profile?.rol === ROLES.SUPERADMIN
  // Los campos que son evidencia del trabajo (fecha, kilometraje, importe,
  // tipo de servicio) quedan inmutables para admins normales una vez
  // creado el servicio. Solo un superadmin puede corregirlos. Al crear
  // un servicio nuevo todos los campos están habilitados.
  const bloqueado = !!servicio && !esSuperadmin
  const [form, setForm] = useState({
    vehiculo_id:   servicio?.vehiculo_id   ?? '',
    cliente_id:    servicio?.cliente_id    ?? '',
    tipo:          servicio?.tipo          ?? '',
    tipo_custom:   TIPOS_SERVICIO.includes(servicio?.tipo) ? '' : (servicio?.tipo ?? ''),
    fecha:         servicio?.fecha         ?? hoy(),
    km:            servicio?.km            ?? '',
    producto:      servicio?.producto      ?? '',
    importe:       servicio?.importe       ?? '',
    observaciones: servicio?.observaciones ?? '',
    cobrado:       servicio?.cobrado       ?? false,
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Modo de selección de vehículo/cliente
  const [modoVehiculo, setModoVehiculo] = useState('existente') // 'existente' | 'nuevo'
  const [modoCliente,  setModoCliente]  = useState('existente') // usado solo si modoVehiculo === 'nuevo'

  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    patente: '', tipo_patente: '', marca: '', modelo: '', anio: '',
  })
  const [nuevoCliente, setNuevoCliente] = useState({
    tipo: 'persona', nombre: '', telefono: '', email: '',
    documento: '', contacto_nombre: '', acepta_whatsapp: true,
  })

  // Duplicado detectado por teléfono al crear cliente nuevo
  const [clienteDuplicado, setClienteDuplicado] = useState(null)

  // Fotos pendientes de subir (solo modo creación)
  const [pendingFotos, setPendingFotos] = useState([])

  const tipoSelect = TIPOS_SERVICIO.includes(form.tipo) ? form.tipo : (servicio ? 'Otro' : form.tipo)
  const esModoNuevo = modoVehiculo === 'nuevo'
  const esNuevoCliente = esModoNuevo && modoCliente === 'nuevo'
  const esEmpresa = nuevoCliente.tipo === 'empresa'

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function setNV(key, value) {
    setNuevoVehiculo(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, ['nv_' + key]: null }))
  }

  function setNC(key, value) {
    setNuevoCliente(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, ['nc_' + key]: null }))
  }

  function handleVehiculo(vehiculo_id) {
    const v = vehiculos.find(v => v.id === vehiculo_id)
    setForm(prev => ({
      ...prev,
      vehiculo_id,
      cliente_id: v?.cliente_id ?? '',
    }))
    setErrors(prev => ({ ...prev, vehiculo_id: null }))
  }

  function handlePatenteNueva(value) {
    const normalizada = normalizarPatente(value)
    setNuevoVehiculo(prev => ({
      ...prev,
      patente: normalizada,
      tipo_patente: detectarTipoPatente(normalizada),
    }))
    setErrors(prev => ({ ...prev, nv_patente: null }))
  }

  function handleTipo(value) {
    set('tipo', value === 'Otro' ? '' : value)
    if (value !== 'Otro') set('tipo_custom', '')
  }

  // Chequeo de duplicado por teléfono (debounced).
  // Se compara el teléfono normalizado (549...) porque así se guardan los
  // clientes existentes — si comparáramos crudo, un usuario escribiendo
  // "261 234 5678" no matchearía al mismo cliente guardado como
  // "5492612345678".
  const checkDuplicado = useCallback(async (telefono) => {
    const telNormalizado = normalizarTelefonoAR(telefono)
    if (!telNormalizado || telNormalizado.length < 10) { setClienteDuplicado(null); return }
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, tipo')
      .eq('telefono', telNormalizado)
      .eq('activo', true)
      .maybeSingle()
    setClienteDuplicado(data ?? null)
  }, [])

  useEffect(() => {
    if (!esNuevoCliente) { setClienteDuplicado(null); return }
    const t = setTimeout(() => checkDuplicado(nuevoCliente.telefono), 400)
    return () => clearTimeout(t)
  }, [nuevoCliente.telefono, esNuevoCliente, checkDuplicado])

  function usarClienteDuplicado() {
    // Cambia a modo "cliente existente" y selecciona el duplicado
    setModoCliente('existente')
    setNuevoCliente(prev => ({ ...prev, __selected_cliente_id: clienteDuplicado.id }))
    // seleccionamos el cliente en el select de existentes
    setForm(prev => ({ ...prev, cliente_id: clienteDuplicado.id }))
    setClienteDuplicado(null)
  }

  function validate() {
    const errs = {}
    if (!form.tipo.trim())         errs.tipo   = 'Requerido'
    if (!form.fecha)               errs.fecha  = 'Requerido'
    if (!form.km && form.km !== 0) errs.km     = 'Requerido'

    if (modoVehiculo === 'existente') {
      if (!form.vehiculo_id) errs.vehiculo_id = 'Seleccioná un vehículo'
    } else {
      if (!nuevoVehiculo.patente)      errs.nv_patente = 'Requerida'
      else if (!nuevoVehiculo.tipo_patente) errs.nv_patente = 'Formato de patente no reconocido'
      if (!nuevoVehiculo.marca.trim())  errs.nv_marca  = 'Requerida'
      if (!nuevoVehiculo.modelo.trim()) errs.nv_modelo = 'Requerido'

      if (modoCliente === 'existente') {
        if (!form.cliente_id) errs.cliente_id = 'Seleccioná un cliente o creá uno nuevo'
      } else {
        if (!nuevoCliente.nombre.trim())   errs.nc_nombre   = esEmpresa ? 'Razón social requerida' : 'Requerido'
        if (!nuevoCliente.telefono.trim()) errs.nc_telefono = 'Requerido'
      }
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const finalTipo = tipoSelect === 'Otro' ? form.tipo_custom : form.tipo
    const errs = validate()
    if (!finalTipo?.trim()) errs.tipo = 'Ingresá el tipo de servicio'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)

    try {
      // Payload común del servicio
      const servicioPayload = {
        tipo:          finalTipo,
        fecha:         form.fecha,
        km:            parseInt(form.km),
        producto:      form.producto.trim()      || null,
        importe:       form.importe !== ''       ? parseFloat(form.importe) : null,
        observaciones: form.observaciones.trim() || null,
        cobrado:       !!form.cobrado,
      }

      let servicioGuardado

      if (editando) {
        // Edición: siempre vehículo existente, sin crear cliente/vehículo nuevos
        servicioGuardado = await onSave(servicioPayload)
      } else if (esModoNuevo) {
        // Creación con posiblemente cliente y/o vehículo nuevos.
        // Se ejecuta en UNA transacción SQL: si algún paso falla, rollback.
        // Normalización al guardar: nombres a Title Case, email a minúsculas,
        // teléfono a formato E.164 argentino (549...). Uniforma la carga
        // aunque distintos operadores escriban de maneras distintas.
        const clientePayload = modoCliente === 'nuevo' ? {
          tipo:            nuevoCliente.tipo,
          nombre:          normalizarNombre(nuevoCliente.nombre),
          telefono:        normalizarTelefonoAR(nuevoCliente.telefono),
          email:           nuevoCliente.email.trim() ? normalizarEmail(nuevoCliente.email) : null,
          documento:       nuevoCliente.documento.trim() || null,
          contacto_nombre: esEmpresa && nuevoCliente.contacto_nombre.trim()
            ? normalizarNombre(nuevoCliente.contacto_nombre)
            : null,
          acepta_whatsapp: !!nuevoCliente.acepta_whatsapp,
        } : null

        const vehiculoPayload = {
          patente:      nuevoVehiculo.patente,
          tipo_patente: nuevoVehiculo.tipo_patente,
          marca:        normalizarNombre(nuevoVehiculo.marca),
          modelo:       normalizarNombre(nuevoVehiculo.modelo),
          anio:         nuevoVehiculo.anio || null,
          km:           form.km || 0,
        }

        const { data, error } = await supabase.rpc('crear_servicio_completo', {
          p_servicio:       servicioPayload,
          p_cliente_id:     modoCliente === 'existente' ? form.cliente_id : null,
          p_vehiculo_id:    null,
          p_cliente_nuevo:  clientePayload,
          p_vehiculo_nuevo: vehiculoPayload,
        })
        if (error) throw new Error(error.message)

        // Refrescar tabla + guardar los IDs devueltos
        servicioGuardado = { id: data.servicio_id }
        await onServicioCreated(data)
      } else {
        // Creación con vehículo existente (flujo simple)
        servicioGuardado = await onSave({
          ...servicioPayload,
          vehiculo_id: form.vehiculo_id,
          cliente_id:  form.cliente_id,
        })
      }

      // Fotos pendientes: subirlas ahora que tenemos ID
      if (!editando && pendingFotos.length > 0 && servicioGuardado?.id) {
        const result = await uploadPendingFotos(servicioGuardado.id, pendingFotos)
        if (!result.ok) {
          setErrors(prev => ({ ...prev, submit: `Servicio creado, pero ${result.errors.length} foto(s) fallaron` }))
        }
      }
    } catch (err) {
      logger.error(err)
      setErrors(prev => ({ ...prev, submit: err.message ?? 'Error inesperado' }))
    } finally {
      setSaving(false)
    }
  }

  const vehiculoSeleccionado = vehiculos.find(v => v.id === form.vehiculo_id)
  const editando = !!servicio

  return (
    <Modal title={editando ? 'Editar servicio' : 'Nuevo servicio'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ─── Selector de vehículo ─── */}
        {!editando && (
          <div className="flex items-center justify-between">
            <label className="text-gray-200 text-xs uppercase tracking-wider">Vehículo</label>
            {modoVehiculo === 'nuevo' && (
              <button
                type="button"
                onClick={() => { setModoVehiculo('existente'); setModoCliente('existente') }}
                className="text-xs text-gray-200 hover:text-gray-100 transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Elegir existente
              </button>
            )}
          </div>
        )}

        {modoVehiculo === 'existente' || editando ? (
          <>
            <SearchSelect
              value={form.vehiculo_id}
              onChange={handleVehiculo}
              error={errors.vehiculo_id}
              placeholder="Buscar por patente, marca o cliente..."
              options={vehiculos.map(v => ({
                value: v.id,
                label: `${v.patente} — ${v.marca} ${v.modelo} (${v.clientes?.nombre})`,
              }))}
              disabled={editando}
            />
            {vehiculoSeleccionado && (
              <p className="text-xs text-gray-200 -mt-2">
                Cliente: <span className="text-gray-100">{vehiculoSeleccionado.clientes?.nombre}</span>
              </p>
            )}
            {!editando && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                onClick={() => setModoVehiculo('nuevo')}
              >
                <Plus size={15} /> Nuevo vehículo
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-3 p-3 border border-dark-400 rounded bg-dark-300/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Patente"
                  value={nuevoVehiculo.patente}
                  onChange={e => handlePatenteNueva(e.target.value)}
                  error={errors.nv_patente}
                  placeholder="AB123CD"
                  maxLength={MAX_LEN_PATENTE}
                />
                {nuevoVehiculo.tipo_patente && (
                  <p className="text-xs text-gray-300 mt-1">
                    Detectado: {nuevoVehiculo.tipo_patente.startsWith('auto') ? 'Auto' : 'Moto'}
                  </p>
                )}
              </div>
              <Input
                label="Año"
                type="number"
                value={nuevoVehiculo.anio}
                onChange={e => setNV('anio', e.target.value)}
                placeholder="2020"
                min={1950}
                max={2100}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Marca"
                value={nuevoVehiculo.marca}
                onChange={e => setNV('marca', e.target.value)}
                error={errors.nv_marca}
                placeholder="Toyota"
              />
              <Input
                label="Modelo"
                value={nuevoVehiculo.modelo}
                onChange={e => setNV('modelo', e.target.value)}
                error={errors.nv_modelo}
                placeholder="Corolla"
              />
            </div>

            {/* ─── Cliente (dentro de nuevo vehículo) ─── */}
            <div className="pt-2 border-t border-dark-400 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-gray-200 text-xs uppercase tracking-wider">Cliente</label>
                {modoCliente === 'nuevo' && (
                  <button
                    type="button"
                    onClick={() => setModoCliente('existente')}
                    className="text-xs text-gray-200 hover:text-gray-100 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Elegir existente
                  </button>
                )}
              </div>

              {modoCliente === 'existente' ? (
                <>
                  <SearchSelect
                    value={form.cliente_id}
                    onChange={cid => set('cliente_id', cid)}
                    error={errors.cliente_id}
                    placeholder="Buscar cliente por nombre..."
                    options={clientes.map(c => ({
                      value: c.id,
                      label: c.tipo === 'empresa' ? `[Empresa] ${c.nombre}` : c.nombre,
                    }))}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => setModoCliente('nuevo')}
                  >
                    <Plus size={15} /> Nuevo cliente
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  {/* Toggle persona/empresa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNC('tipo', 'persona')}
                      className={`px-3 py-2 rounded border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        !esEmpresa
                          ? 'border-red text-gray-100 bg-red/10'
                          : 'border-dark-400 text-gray-200 hover:border-gray-200'
                      }`}
                    >
                      Persona
                    </button>
                    <button
                      type="button"
                      onClick={() => setNC('tipo', 'empresa')}
                      className={`px-3 py-2 rounded border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        esEmpresa
                          ? 'border-red text-gray-100 bg-red/10'
                          : 'border-dark-400 text-gray-200 hover:border-gray-200'
                      }`}
                    >
                      Empresa
                    </button>
                  </div>

                  <Input
                    label={esEmpresa ? 'Razón social' : 'Nombre y apellido'}
                    value={nuevoCliente.nombre}
                    onChange={e => setNC('nombre', e.target.value)}
                    error={errors.nc_nombre}
                    placeholder={esEmpresa ? 'Calper SA' : 'Juan García'}
                  />
                  <Input
                    label="Teléfono"
                    value={nuevoCliente.telefono}
                    onChange={e => setNC('telefono', e.target.value)}
                    error={errors.nc_telefono}
                    placeholder="+54 9 11 1234 5678"
                  />

                  {/* Warning de duplicado */}
                  {clienteDuplicado && (
                    <div className="flex items-start gap-3 p-3 border border-yellow-500/40 bg-yellow-500/10 rounded">
                      <AlertCircle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="text-gray-100">
                          Ya existe un cliente con este teléfono: <span className="font-semibold">{clienteDuplicado.nombre}</span>
                        </p>
                        <button
                          type="button"
                          onClick={usarClienteDuplicado}
                          className="mt-1 text-xs text-red hover:text-red-bright font-semibold uppercase tracking-wider"
                        >
                          Usar este cliente y agregar servicio
                        </button>
                      </div>
                    </div>
                  )}

                  <Input
                    label="Email (opcional)"
                    type="email"
                    value={nuevoCliente.email}
                    onChange={e => setNC('email', e.target.value)}
                    placeholder="juan@email.com"
                  />

                  <label className="flex items-start gap-3 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevoCliente.acepta_whatsapp}
                      onChange={e => setNC('acepta_whatsapp', e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-red cursor-pointer"
                    />
                    <span className="text-xs text-gray-200">
                      El cliente autorizó recibir notificaciones por WhatsApp
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aviso cuando los campos históricos están bloqueados por rol */}
        {bloqueado && (
          <div className="flex items-start gap-3 p-3 border border-dark-400 bg-dark-300 rounded">
            <Lock size={16} className="text-gray-300 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-200">
              <p className="text-gray-100 font-semibold mb-0.5">Campos protegidos</p>
              <p>
                Tipo de servicio, fecha, kilometraje e importe son evidencia del trabajo
                y solo pueden editarlos los superadmins. Podés cambiar producto,
                observaciones y estado de cobro sin restricciones.
              </p>
            </div>
          </div>
        )}

        {/* ─── Tipo de servicio ─── */}
        <Select
          label="Tipo de servicio"
          value={tipoSelect}
          onChange={e => handleTipo(e.target.value)}
          error={errors.tipo}
          disabled={bloqueado}
        >
          <option value="">Seleccioná un servicio</option>
          {TIPOS_SERVICIO.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>

        {tipoSelect === 'Otro' && (
          <Input
            label="Especificá el servicio"
            value={form.tipo_custom}
            onChange={e => set('tipo_custom', e.target.value)}
            placeholder="Ej: Cambio de pastillas"
            error={errors.tipo}
            disabled={bloqueado}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={e => set('fecha', e.target.value)}
            error={errors.fecha}
            disabled={bloqueado}
          />
          <Input
            label="Kilometraje"
            type="number"
            value={form.km}
            onChange={e => set('km', e.target.value)}
            error={errors.km}
            placeholder="0"
            min={0}
            disabled={bloqueado}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Producto"
            value={form.producto}
            onChange={e => set('producto', e.target.value)}
            placeholder="Ej: Bridgestone 195/55R16"
          />
          <Input
            label="Importe ($)"
            type="number"
            value={form.importe}
            onChange={e => set('importe', e.target.value)}
            placeholder="0.00"
            min={0}
            step="0.01"
            disabled={bloqueado}
          />
        </div>

        <Textarea
          label="Observaciones"
          value={form.observaciones}
          onChange={e => set('observaciones', e.target.value)}
          placeholder="Notas adicionales..."
        />

        {/* Cobrado */}
        <label className="flex items-start gap-3 py-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.cobrado}
            onChange={e => set('cobrado', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red cursor-pointer"
          />
          <div className="text-sm text-gray-200 group-hover:text-gray-100 transition-colors">
            <p>Este servicio ya fue cobrado</p>
            <p className="text-xs text-gray-300 mt-0.5">
              Se registra la fecha de cobro automáticamente.
            </p>
          </div>
        </label>

        {/* Galería de fotos: modo persistido si editando, modo pendiente si creando */}
        <div className="pt-2 border-t border-dark-400">
          <Suspense fallback={<FotoGalleryFallback />}>
            <FotoGallery
              servicioId={editando ? servicio.id : undefined}
              onPendingChange={setPendingFotos}
            />
          </Suspense>
        </div>

        {errors.submit && (
          <p className="text-red-bright text-xs">{errors.submit}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

