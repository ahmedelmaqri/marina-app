import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import ClientsList from './pages/clients/ClientsList'
import type { ReactNode } from 'react'
import ReservationsList from './pages/reservations/ReservationsList'
import ContratsList from './pages/contrats/ContratsList'
import QuaisList from './pages/quais/QuaisList'
import ClientForm from './pages/clients/ClientForm'
import ContratForm from './pages/contrats/ContratForm'
import ContratDetail from './pages/contrats/ContratDetail'
import ReservationWizard from './pages/reservations/ReservationWizard'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function Dashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p>Connecté en tant que {user?.username} ({user?.role})</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><ReservationsList /></ProtectedRoute>} />
      <Route path="/contrats" element={<ProtectedRoute><ContratsList /></ProtectedRoute>} />
      <Route path="/quais" element={<ProtectedRoute><QuaisList /></ProtectedRoute>} />
      <Route path="/clients/nouveau" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/clients/:id/modifier" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/contrats/nouveau" element={<ProtectedRoute><ContratForm /></ProtectedRoute>} />
      <Route path="/contrats/:id" element={<ProtectedRoute><ContratDetail /></ProtectedRoute>} />
      <Route path="/reservations/nouveau" element={<ProtectedRoute><ReservationWizard /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}