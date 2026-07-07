import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClientsList from './pages/clients/ClientsList'
import ClientForm from './pages/clients/ClientForm'
import ClientDetail from './pages/clients/ClientDetail'
import ReservationsList from './pages/reservations/ReservationsList'
import ReservationWizard from './pages/reservations/ReservationWizard'
import EscaleDetail from './pages/reservations/EscaleDetail'
import ListeAttenteList from './pages/reservations/ListeAttenteList'
import ContratsList from './pages/contrats/ContratsList'
import ContratForm from './pages/contrats/ContratForm'
import ContratDetail from './pages/contrats/ContratDetail'
import QuaisList from './pages/quais/QuaisList'
import QuaisConfig from './pages/quais/QuaisConfig'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
      <Route path="/clients/nouveau" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
      <Route path="/clients/:id/modifier" element={<ProtectedRoute><ClientForm /></ProtectedRoute>} />
      <Route path="/reservations" element={<ProtectedRoute><ReservationsList /></ProtectedRoute>} />
      <Route path="/reservations/nouveau" element={<ProtectedRoute><ReservationWizard /></ProtectedRoute>} />
      <Route path="/reservations/:id" element={<ProtectedRoute><EscaleDetail /></ProtectedRoute>} />
      <Route path="/liste-attente" element={<ProtectedRoute><ListeAttenteList /></ProtectedRoute>} />
      <Route path="/contrats" element={<ProtectedRoute><ContratsList /></ProtectedRoute>} />
      <Route path="/contrats/nouveau" element={<ProtectedRoute><ContratForm /></ProtectedRoute>} />
      <Route path="/contrats/:id" element={<ProtectedRoute><ContratDetail /></ProtectedRoute>} />
      <Route path="/quais" element={<ProtectedRoute><QuaisList /></ProtectedRoute>} />
      <Route path="/quais/configuration" element={<ProtectedRoute><QuaisConfig /></ProtectedRoute>} />
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