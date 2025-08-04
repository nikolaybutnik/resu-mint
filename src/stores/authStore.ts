import { create } from 'zustand'

interface User {
  // TODO: Define
  id: string
}

interface AuthStore {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => void
}

// TODO: implement
export const useAuthStore = create<AuthStore>(() => ({
  user: null,
  loading: false,
  signIn: (email: string, password: string) => {
    console.log(email, password)
    return Promise.resolve()
  },
  signUp: (email: string, password: string) => {
    console.log(email, password)
    return Promise.resolve()
  },
  signOut: () => {
    return Promise.resolve()
  },
  initialize: () => {},
}))
