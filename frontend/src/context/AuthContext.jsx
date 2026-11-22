import React, { createContext, useContext, useState, useEffect } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider, githubProvider, isConfigured } from '../config/firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      setUser({ displayName: 'Demo Grower', email: 'demo@folia.local', uid: 'demo-local' })
      return
    }
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setUser(result.user)
      setError(null)
    } catch (err) {
      setError(err.message)
      // Fallback to demo mode
      setUser({ displayName: 'Demo Grower', email: 'demo@folia.local', uid: 'demo-local' })
    }
  }

  const signInWithGithub = async () => {
    if (!isConfigured) {
      setUser({ displayName: 'Demo Grower', email: 'demo@folia.local', uid: 'demo-local' })
      return
    }
    try {
      const result = await signInWithPopup(auth, githubProvider)
      setUser(result.user)
      setError(null)
    } catch (err) {
      setError(err.message)
      setUser({ displayName: 'Demo Grower', email: 'demo@folia.local', uid: 'demo-local' })
    }
  }

  const logout = async () => {
    if (isConfigured && auth) {
      await signOut(auth)
    }
    setUser(null)
  }

  const getIdToken = async () => {
    if (!isConfigured || !user || !user.getIdToken) return null
    try {
      return await user.getIdToken()
    } catch {
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signInWithGithub, logout, getIdToken, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
