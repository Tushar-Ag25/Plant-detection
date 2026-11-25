import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase.js'

/**
 * Get the Firestore document reference for a specific user: users/{uid}
 */
export const getUserDocRef = (uid) => {
  return doc(db, 'users', uid)
}

/**
 * Save / Update core user profile in Firestore at users/{uid}
 */
export const saveUserProfile = async (uid, data) => {
  if (!db || !uid) return null
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

/**
 * Fetch user profile from users/{uid}
 */
export const getUserProfile = async (uid) => {
  if (!db || !uid) return null
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  return snap.exists() ? snap.data() : null
}

/**
 * Save a diagnosis scan under the user's personal collection: users/{uid}/scans/{scanId}
 */
export const saveUserScan = async (uid, scanData) => {
  if (!db || !uid) return null
  const scanId = scanData.id || `scan-${Date.now()}`
  const scanRef = doc(db, 'users', uid, 'scans', scanId)
  
  const payload = {
    ...scanData,
    id: scanId,
    userId: uid,
    userEmail: scanData.userEmail || '',
    createdAt: serverTimestamp()
  }
  
  await setDoc(scanRef, payload)
  return { ...payload, id: scanId }
}

/**
 * Fetch all diagnosis scans for a user: users/{uid}/scans
 */
export const getUserScans = async (uid) => {
  if (!db || !uid) return []
  try {
    const scansCol = collection(db, 'users', uid, 'scans')
    const q = query(scansCol, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().date || (d.data().createdAt?.toDate ? d.data().createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent')
    }))
  } catch (err) {
    // If compound index or ordering fails, fallback to simple collection read
    console.warn('Scans query fallback:', err)
    const scansCol = collection(db, 'users', uid, 'scans')
    const snap = await getDocs(scansCol)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }
}

/**
 * Delete a user's scan from users/{uid}/scans/{scanId}
 */
export const deleteUserScan = async (uid, scanId) => {
  if (!db || !uid || !scanId) return
  const scanRef = doc(db, 'users', uid, 'scans', scanId)
  await deleteDoc(scanRef)
}
