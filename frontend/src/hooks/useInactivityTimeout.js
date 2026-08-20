import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'

const INACTIVITY_LIMIT = 30 * 60 * 1000  // 30 minutos sin actividad → cierra sesión
const WARNING_BEFORE   =  1 * 60 * 1000  // avisa 1 minuto antes

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

export function useInactivityTimeout() {
  const navigate     = useNavigate()
  const timerRef     = useRef(null)
  const warningRef   = useRef(null)
  const [showWarning, setShowWarning] = useState(false)

  const logout = useCallback(async () => {
    setShowWarning(false)
    await supabase.auth.signOut()
    navigate(ROUTES.LOGIN, { replace: true })
  }, [navigate])

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    clearTimeout(warningRef.current)
    setShowWarning(false)

    // Aviso 1 minuto antes de cerrar
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_LIMIT - WARNING_BEFORE)

    // Cierra sesión al llegar al límite
    timerRef.current = setTimeout(logout, INACTIVITY_LIMIT)
  }, [logout])

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
      clearTimeout(warningRef.current)
    }
  }, [resetTimer])

  return { showWarning, extendSession: resetTimer }
}
