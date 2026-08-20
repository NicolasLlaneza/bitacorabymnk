// Helpers de fotos_servicio compartidos entre FotoGallery (lazy) y
// consumidores que necesitan subir blobs ya comprimidos sincrónicamente.
//
// Importante: este módulo NO importa browser-image-compression, así los
// callers pueden usarlo sin arrastrar esa librería (28 KB gzip) al bundle.

import { supabase } from '@/lib/supabase'
import logger from '@/lib/logger'

export const BUCKET_FOTOS = 'fotos-servicio'

/**
 * Sube una lista de blobs ya comprimidos al bucket y los registra en
 * fotos_servicio. Se usa desde ServicioModal después de crear un servicio
 * nuevo cuando el usuario había cargado fotos en modo pendiente.
 *
 * Devuelve { ok, count, errors[] }. Un fallo individual no cancela el resto.
 */
export async function uploadPendingFotos(servicioId, files) {
  if (!files || files.length === 0) return { ok: true, count: 0, errors: [] }

  const errors = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const uuid = crypto.randomUUID()
      const path = `servicios/${servicioId}/${uuid}.jpg`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(path, file, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('fotos_servicio')
        .insert({
          servicio_id:  servicioId,
          url:          '',
          storage_path: path,
          orden:        i,
        })
      if (insertError) throw insertError
    } catch (err) {
      logger.error(err)
      errors.push(err.message ?? String(err))
    }
  }

  return { ok: errors.length === 0, count: files.length - errors.length, errors }
}
