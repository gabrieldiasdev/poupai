import { FirebaseError } from 'firebase/app'
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const provider = new GoogleAuthProvider()
provider.setCustomParameters({ prompt: 'select_account' })

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw error
  }
}

export function isUserCancellation(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)
  )
}

export function signOut() {
  return firebaseSignOut(auth)
}
