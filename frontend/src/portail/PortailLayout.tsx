import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePortailAuth } from './PortailAuthContext'

const NAV_ITEMS = [
  { label: 'Mes réservations', path: '/portail/reservations' },
  { label: 'Mes factures', path: '/portail/factures' },
  { label: 'Mes bateaux', path: '/portail/bateaux' },
  { label: 'Mes documents', path: '/portail/documents' },
]

export default function PortailLayout({ children }: { children: ReactNode }) {
  const { user, logout } = usePortailAuth()
  const location = useLocation()

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
        <div className="p-6 text-lg font-bold">Espace client</div>

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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b bg-white px-8 py-3">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOuvert((v) => !v)}
              className="flex items-center gap-2 rounded p-2 text-gray-600 hover:bg-gray-100"
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
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium">{user?.username}</span>
            </button>

            {menuOuvert && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-white shadow-lg">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">{user?.username}</p>
                  <p className="text-xs text-gray-500">Client</p>
                </div>
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
