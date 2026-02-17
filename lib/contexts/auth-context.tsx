'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { onAuthChange } from '@/lib/firebase/auth'
import { getDocument } from '@/lib/firebase/firestore'
import { UserDocument } from '@/lib/types/user'

interface AuthContextType {
  user: User | null
  userProfile: UserDocument | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<User | null>(null)

  const refreshProfile = async () => {
    if (!userRef.current) return
    const { data } = await getDocument<UserDocument>('users', userRef.current.uid)
    setUserProfile(data)
  }

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      userRef.current = firebaseUser
      setUser(firebaseUser)

      if (firebaseUser) {
        // Fetch user profile from Firestore (5s timeout so loading never hangs forever)
        const timeout = new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 5000)
        )
        const { data } = await Promise.race([
          getDocument<UserDocument>('users', firebaseUser.uid),
          timeout,
        ])
        setUserProfile(data)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
