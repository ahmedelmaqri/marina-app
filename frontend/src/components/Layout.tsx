import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Tableau de bord', path: '/' },
  { label: 'Réservations', path: '/reservations' },
  { label: 'Contrats', path: '/contrats' },
  { label: "Liste d'attente", path: '/liste-attente' },
  { label: 'Clients', path: '/clients' },
  { label: 'Affectations', path: '/quais' },
  { label: 'Rapports', path: '/' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <div className="p-6 text-lg font-bold">Gestion Marina</div>

        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`px-6 py-3 text-sm hover:bg-gray-800 ${
                location.pathname === item.path ? 'bg-gray-800 font-semibold' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-6 py-4">
          <button
            onClick={() => navigate('/reservations/nouveau')}
            className="w-full rounded bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
          >
            + Nouvelle réservation
          </button>
        </div>

        <div className="mt-auto p-6">
          <p className="mb-2 text-xs text-gray-400">
            {user?.username} ({user?.role})
          </p>
          <button
            onClick={logout}
            className="w-full rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}