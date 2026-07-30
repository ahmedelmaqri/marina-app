import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PortailAuthProvider, usePortailAuth } from './PortailAuthContext'
import PortailLayout from './PortailLayout'
import PortailLogin from './pages/PortailLogin'
import PortailActivation from './pages/PortailActivation'
import PortailReservations from './pages/PortailReservations'
import PortailFactures from './pages/PortailFactures'
import PortailBateaux from './pages/PortailBateaux'
import PortailDocuments from './pages/PortailDocuments'

function PortailProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = usePortailAuth()
  if (!isAuthenticated || user?.role !== 'client') {
    return <Navigate to="/portail/login" replace />
  }
  return <PortailLayout>{children}</PortailLayout>
}

export default function PortailRoutes() {
  return (
    <PortailAuthProvider>
      <Routes>
        <Route path="login" element={<PortailLogin />} />
        <Route path="activation" element={<PortailActivation />} />
        <Route
          path="reservations"
          element={<PortailProtectedRoute><PortailReservations /></PortailProtectedRoute>}
        />
        <Route
          path="factures"
          element={<PortailProtectedRoute><PortailFactures /></PortailProtectedRoute>}
        />
        <Route
          path="factures/:id"
          element={<PortailProtectedRoute><PortailFactures /></PortailProtectedRoute>}
        />
        <Route
          path="bateaux"
          element={<PortailProtectedRoute><PortailBateaux /></PortailProtectedRoute>}
        />
        <Route
          path="documents"
          element={<PortailProtectedRoute><PortailDocuments /></PortailProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/portail/reservations" replace />} />
      </Routes>
    </PortailAuthProvider>
  )
}
