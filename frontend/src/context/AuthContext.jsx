import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db, googleProvider, isConfigured } from '../config/firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Sync user profile to Firestore users/{uid}
  const syncUserData = async (firebaseUser, extraData = {}) => {
    if (!firebaseUser || !db) return null
    try {
      const userRef = doc(db, 'users', firebaseUser.uid)
      const userSnap = await getDoc(userRef)
      
      const baseData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || extraData.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        emailVerified: Boolean(firebaseUser.emailVerified),
        lastLoginAt: serverTimestamp(),
        ...extraData
      }

      if (!userSnap.exists()) {
        baseData.createdAt = serverTimestamp()
        await setDoc(userRef, baseData, { merge: true })
        setUserProfile(baseData)
        return baseData
      } else {
        await setDoc(userRef, { lastLoginAt: serverTimestamp(), emailVerified: Boolean(firebaseUser.emailVerified), ...extraData }, { merge: true })
        const merged = { ...userSnap.data(), ...extraData, emailVerified: Boolean(firebaseUser.emailVerified), lastLoginAt: new Date().toISOString() }
        setUserProfile(merged)
        return merged
      }
    } catch (err) {
      console.warn('Firestore profile sync error:', err)
      return null
    }
  }

  // Reload current user to check if email has been verified
  const checkEmailVerification = async () => {
    if (!auth?.currentUser) return false
    await auth.currentUser.reload()
    const updated = auth.currentUser
    setUser({ ...updated })
    if (updated.emailVerified) {
      await syncUserData(updated, { emailVerified: true })
      return true
    }
    return false
  }

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!auth?.currentUser) throw new Error("No active user to send verification email to.")
    await sendEmailVerification(auth.currentUser)
  }

  // Send Password Reset Email
  const resetPassword = async (email) => {
    if (!auth) throw new Error("Firebase auth not ready.")
    await sendPasswordResetEmail(auth, email)
  }

  // Monitor auth state changes — keeps user signed in across page refreshes
  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            setUserProfile(userSnap.data())
          } else {
            await syncUserData(firebaseUser)
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Google Sign-In (already multi-factor/OTP verified through Google Account)
  const signInWithGoogle = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await syncUserData(result.user)
      return result.user
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }

  // Email & Password Sign-In (checks email verification)
  const signInWithEmail = async (email, password) => {
    setAuthError(null)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      
      // If user hasn't verified their email yet, require verification
      if (!result.user.emailVerified) {
        // Send a verification email if needed
        try {
          await sendEmailVerification(result.user)
        } catch (e) {
          console.log("Verification email rate-limit or sent already:", e)
        }
        await syncUserData(result.user)
        return { user: result.user, requiresVerification: true }
      }

      await syncUserData(result.user)
      return { user: result.user, requiresVerification: false }
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }

  // Email & Password Sign-Up (creates account & sends verification email)
  const signUpWithEmail = async (email, password, displayName = '') => {
    setAuthError(null)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName })
      }
      
      // Send Email Verification Link / Code to user's inbox
      await sendEmailVerification(result.user)
      
      await syncUserData(result.user, { displayName, emailVerified: false })
      return { user: result.user, requiresVerification: true }
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }

  // Logout
  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth)
      }
      setUser(null)
      setUserProfile(null)
      setAuthError(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Get Auth Token for backend calls
  const getIdToken = async () => {
    if (!user || !user.getIdToken) return null
    try {
      return await user.getIdToken()
    } catch {
      return null
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error: authError,
        setAuthError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        checkEmailVerification,
        resendVerificationEmail,
        resetPassword,
        logout,
        getIdToken,
        syncUserData,
        isConfigured
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
