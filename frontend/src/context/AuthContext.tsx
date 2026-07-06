import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api/axios'

interface User {
  username: string
  role: 'admin' | 'gestionnaire'
}

interface DecodedToken {
  username: string
  role: 'admin' | 'gestionnaire'
  exp: number
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function decodeUserFromToken(token: string): User | null {
  try {
    const decoded = jwtDecode<DecodedToken>(token)
    return { username: decoded.username, role: decoded.role }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('access_token')
    return token ? decodeUserFromToken(token) : null
  })

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/token/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser(decodeUserFromToken(data.access))
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token')
      setUser(token ? decodeUserFromToken(token) : null)
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider")
  }
  return context
}