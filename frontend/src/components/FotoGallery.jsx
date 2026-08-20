import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Plus, Loader2, Image as ImageIcon } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'
import { BUCKET_FOTOS as BUCKET } from '@/lib/fotosServicio'

const MAX_FOTOS   = 5
const MAX_MB      = 0.5
const MAX_WIDTH   = 1600
const SIGNED_TTL  = 3600  // 1 hora — se renuevan al abrir el modal

const COMPRESSION_OPTS = {
  maxSizeMB:            MAX_MB,
  maxWidthOrHeight:     MAX_WIDTH,
  useWebWorker:         true,
  fileType:             'image/jpeg',
  initialQuality:       0.85,
}

/**
 * Galería de fotos con compresión automática.
 *
 * Modos:
 *   - Persistido (servicioId definido): sube al bucket + inserta en la BD
 *     inmediatamente. Elimina de la BD al borrar.
 *   - Pendiente (servicioId ausente): guarda blobs comprimidos en memoria
 *     y notifica al padre vía onPendingChange. El padre los sube después
 *     de crear el servicio, usando uploadPendingFotos().
 */
export default function FotoGallery({ servicioId, onPendingChange }) {
  // Modo persistido: fotos leídas desde la BD
  const [fotos, setFotos]     = useState([])   // { id, url, storage_path, orden }
  const [loading, setLoading] = useState(!!servicioId)

  // Modo pendiente: blobs comprimidos que aún no se subieron
  const [pending, setPending] = useState([])   // { id (local), file, previewUrl }

  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState(null)
  const [error, setError]         = useState(null)

  const persistido = !!servicioId

  const fetchFotos = useCallback(async () => {
    if (!persistido) return
    setLoading(true)
    const { data, error } = await supabase
      .from('fotos_servicio')
      .select('id, storage_path, orden')
      .eq('servicio_id', servicioId)
      .order('orden')

    if (error) { logger.error(error); setLoading(false); return }

    if (data && data.length > 0) {
      const paths = data.map(f => f.storage_path)
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_TTL)

      const withUrls = data.map((f, i) => ({
        ...f,
        url: signed?.[i]?.signedUrl ?? null,
      }))
      setFotos(withUrls)
    } else {
      setFotos([])
    }
    setLoading(false)
  }, [servicioId, persistido])

  useEffect(() => {
    if (persistido) fetchFotos()
  }, [persistido, fetchFotos])

  // Notificar al padre cuando cambian las pendings (modo creación)
  useEffect(() => {
    if (!persistido && onPendingChange) {
      onPendingChange(pending.map(p => p.file))
    }
  }, [pending, persistido, onPendingChange])

  // Las preview URLs de las fotos pendientes son blobs en memoria.
  // Si el modal se cierra sin guardar, quedarían huérfanas hasta el
  // próximo refresh. Guardamos las vigentes en un ref para poder
  // revocarlas al desmontar sin re-ejecutar el cleanup en cada cambio.
  const pendingUrlsRef = useRef([])
  useEffect(() => {
    pendingUrlsRef.current = pending.map(p => p.previewUrl)
  }, [pending])

  useEffect(() => () => {
    pendingUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
  }, [])

  const totalActual = persistido ? fotos.length : pending.length

  async function handleUpload(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const disponibles = MAX_FOTOS - totalActual
    if (files.length > disponibles) {
      setError(`Solo podés subir ${disponibles} foto${disponibles !== 1 ? 's' : ''} más (máx ${MAX_FOTOS}).`)
      return
    }

    setError(null)
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" no es una imagen válida`)
        continue
      }

      try {
        const compressed = await imageCompression(file, COMPRESSION_OPTS)

        if (persistido) {
          // Modo persistido: sube directo
          const uuid = crypto.randomUUID()
          const path = `servicios/${servicioId}/${uuid}.jpg`

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
          if (uploadError) throw uploadError

          const { error: insertError } = await supabase
            .from('fotos_servicio')
            .insert({
              servicio_id:  servicioId,
              url:          '',
              storage_path: path,
              orden:        totalActual + i,
            })
          if (insertError) throw insertError
        } else {
          // Modo pendiente: guardar blob comprimido en memoria
          const previewUrl = URL.createObjectURL(compressed)
          setPending(prev => [...prev, {
            id: crypto.randomUUID(),
            file: compressed,
            previewUrl,
          }])
        }
      } catch (err) {
        logger.error(err)
        setError(`Error al procesar "${file.name}": ${err.message ?? 'desconocido'}`)
      }
    }

    setUploading(false)
    if (persistido) await fetchFotos()
  }

  async function handleDelete(foto) {
    if (!confirm('¿Borrar esta foto?')) return

    if (persistido) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([foto.storage_path])
      if (storageError) logger.error(storageError)

      const { error } = await supabase
        .from('fotos_servicio')
        .delete()
        .eq('id', foto.id)
      if (error) {
        setError('No se pudo borrar')
        return
      }
      setFotos(prev => prev.filter(f => f.id !== foto.id))
    } else {
      URL.revokeObjectURL(foto.previewUrl)
      setPending(prev => prev.filter(p => p.id !== foto.id))
    }
  }

  const puedeAgregarMas = totalActual < MAX_FOTOS && !uploading

  // Vista unificada: fotos persistidas o pendientes
  const items = persistido
    ? fotos.map(f => ({ id: f.id, url: f.url, __data: f }))
    : pending.map(p => ({ id: p.id, url: p.previewUrl, __data: p, pending: true }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-gray-200 text-xs uppercase tracking-wider">
          Fotos del servicio ({totalActual}/{MAX_FOTOS})
        </label>
        {puedeAgregarMas && (
          <label className="cursor-pointer text-xs text-red hover:text-red-bright transition-colors font-semibold uppercase tracking-wider flex items-center gap-1">
            <Plus size={12} />
            Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      {!persistido && pending.length > 0 && (
        <p className="text-xs text-gray-300 italic">
          Las fotos se subirán al guardar el servicio.
        </p>
      )}

      {error && (
        <p className="text-red-bright text-xs">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-300 text-sm py-4">
          <Loader2 size={14} className="animate-spin" />
          Cargando fotos...
        </div>
      ) : items.length === 0 && !uploading ? (
        <div className="border border-dashed border-dark-400 rounded p-6 text-center">
          <ImageIcon size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-300 text-xs">
            No hay fotos todavía. {puedeAgregarMas && 'Podés agregar hasta ' + MAX_FOTOS + '.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map(item => (
            <div key={item.id} className="relative group aspect-square bg-dark-300 rounded overflow-hidden border border-dark-400">
              {item.url ? (
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setPreview(item.url)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                  No disponible
                </div>
              )}
              {item.pending && (
                <div className="absolute bottom-1 left-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/80 text-dark font-semibold">
                  Pendiente
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(item.__data)}
                className="absolute top-1 right-1 p-1 bg-dark-100/80 hover:bg-red text-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Borrar foto"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {uploading && (
            <div className="aspect-square bg-dark-300 rounded border border-dark-400 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          )}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-dark-100 hover:bg-dark-200 text-gray-100 rounded transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

// uploadPendingFotos se movió a src/lib/fotosServicio.js para permitir
// importarlo sin arrastrar imageCompression al bundle de los callers.
export { uploadPendingFotos } from '@/lib/fotosServicio'
