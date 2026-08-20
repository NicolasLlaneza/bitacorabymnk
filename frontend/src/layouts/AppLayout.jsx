import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'
import InactivityWarning from '@/components/InactivityWarning'
import NotifVencidaToast from '@/components/NotifVencidaToast'
import PasswordChangeReminder from '@/components/PasswordChangeReminder'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/routes'

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const { showWarning, extendSession } = useInactivityTimeout()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="min-h-screen bg-dark">
      <Sidebar />
      <Topbar />
      <main className="md:ml-56 pt-14 p-4 md:px-6 md:pb-6 pb-20">
        {children}
      </main>
      <BottomNav />

      {showWarning && (
        <InactivityWarning
          onExtend={extendSession}
          onLogout={handleLogout}
        />
      )}

      <NotifVencidaToast />
      <PasswordChangeReminder />
    </div>
  )
}
