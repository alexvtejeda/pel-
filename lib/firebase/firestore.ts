import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'

/**
 * Get a document by ID
 */
export const getDocument = async <T>(collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() } as T, error: null }
    } else {
      return { data: null, error: 'Document not found' }
    }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

/**
 * Get all documents from a collection
 */
export const getDocuments = async <T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  try {
    const collectionRef = collection(db, collectionName)
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef
    const querySnapshot = await getDocs(q)

    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[]

    return { data: documents, error: null }
  } catch (error: any) {
    return { data: [], error: error.message }
  }
}

/**
 * Create or update a document
 */
export const setDocument = async <T>(
  collectionName: string,
  docId: string,
  data: Partial<T>
) => {
  try {
    const docRef = doc(db, collectionName, docId)
    await setDoc(docRef, data, { merge: true })
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Update a document
 */
export const updateDocument = async <T>(
  collectionName: string,
  docId: string,
  data: Partial<T>
) => {
  try {
    const docRef = doc(db, collectionName, docId)
    await updateDoc(docRef, data as any)
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Delete a document
 */
export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId)
    await deleteDoc(docRef)
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

/**
 * Helper to create a Firestore timestamp
 */
export const timestamp = () => Timestamp.now()

// Re-export commonly used Firestore functions
export { collection, doc, query, where, orderBy, limit, Timestamp }
