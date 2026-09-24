import { createContext, useContext, useState, type ReactNode } from 'react'
import { API_URL, apiCall, getApiErrorMessage } from '../api'

type User = {
  email: string
  name: string
  role: string
}

type AuthContextValue = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, phoneNumber: string, email: string, password: string, role: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [isLoading, setIsLoading] = useState(false)

  const updateUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('user')
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      // Clear any stale session before writing the new one
      localStorage.removeItem('user')
      localStorage.removeItem('token')

      localStorage.setItem('token', data.access_token)

      updateUser({
        email: data.user?.email ?? email,
        name: data.user_name,
        role: data.user_role,
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, phoneNumber: string, email: string, password: string, role: string = 'staff') => {
    setIsLoading(true)
    try {
      const data = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, phone_number: phoneNumber, email, password, role }),
      })

      // Clear any stale session before writing the new one
      localStorage.removeItem('user')
      localStorage.removeItem('token')

      localStorage.setItem('token', data.access_token)

      updateUser({
        email: data.user?.email ?? email,
        name: data.user_name,
        role: data.user_role,
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    updateUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
