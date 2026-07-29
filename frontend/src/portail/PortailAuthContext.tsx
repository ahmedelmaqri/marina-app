import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import portailApi from './api'

interface PortailUser {
  username: string
  role: 'client'
}

interface DecodedToken {
  username: string
  role: 'client'
  exp: number
}

interface PortailAuthContextType {
  user: PortailUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const PortailAuthContext = createContext<PortailAuthContextType | undefined>(undefined)

function decodeUserFromToken(token: string): PortailUser | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token)
    return { username: decoded.username, role: decoded.role }
  } catch {
    return null
  }
}

export function PortailAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortailUser | null>(() => {
    const token = localStorage.getItem('portail_access_token')
    return token ? decodeUserFromToken(token) : null
  })

  const login = async (username: string, password: string) => {
    const { data } = await portailApi.post('/login/', { username, password })
    localStorage.setItem('portail_access_token', data.access)
    localStorage.setItem('portail_refresh_token', data.refresh)
    setUser(decodeUserFromToken(data.access))
  }

  const logout = () => {
    localStorage.removeItem('portail_access_token')
    localStorage.removeItem('portail_refresh_token')
    setUser(null)
  }

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('portail_access_token')
      setUser(token ? decodeUserFromToken(token) : null)
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <PortailAuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </PortailAuthContext.Provider>
  )
}

export function usePortailAuth() {
  const context = useContext(PortailAuthContext)
  if (!context) {
    throw new Error("usePortailAuth doit être utilisé à l'intérieur d'un PortailAuthProvider")
  }
  return context
}
