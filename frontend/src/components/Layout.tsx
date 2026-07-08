import { useEffect, useRef, useState, type ReactNode } from 'react'
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

  const [menuOuvert, setMenuOuvert] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b bg-white px-8 py-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOuvert((v) => !v)}
              className="flex items-center gap-2 rounded p-2 text-gray-600 hover:bg-gray-100"
              title={`${user?.username} (${user?.role})`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">{user?.username}</span>
            </button>

            {menuOuvert && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-white shadow-lg">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOuvert(false)
                    navigate('/parametres')
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Paramètres
                </button>
                <button
                  onClick={() => {
                    setMenuOuvert(false)
                    navigate('/parametres/mot-de-passe')
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Changer mot de passe
                </button>
                <button
                  onClick={logout}
                  className="block w-full rounded-b-md px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}