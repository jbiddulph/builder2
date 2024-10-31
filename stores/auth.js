// stores/auth.js
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    userID: null,
    userData: null,
    accessToken: null,  // New state to store the access token
  }),
  actions: {
    async initializeAuth() {
      const supabase = useSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        this.userID = session.user.id
        this.userData = session.user
        this.accessToken = session.access_token
      }
    },
    async login(email, password) {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
// After successful login
      if (error) {
        console.error('Login error:', error.message)
        return { error }
      }

      if (data.user && data.session) {
        this.userID = data.user.id
        this.userData = data.user
        this.accessToken = data.session.access_token // Store the access token
      }
      return { data }
    },

    async register(email, password) {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        console.error('Registration error:', error.message)
        return { error }
      }

      if (data.user && data.session) {
        this.userID = data.user.id
        this.userData = data.user
        this.accessToken = data.session.access_token // Store the access token
      }
      return { data }
    },

    async logout() {
      const supabase = useSupabaseClient()
      await supabase.auth.signOut()
      this.userID = null
      this.userData = null
      this.accessToken = null // Clear the token on logout
      navigateTo('/')
    },

    async initializeAuth() {
      const supabase = useSupabaseClient()
      const { data: session } = await supabase.auth.getSession()

      if (session) {
        // this.userID = session.user.id
        this.userData = session.user
        this.accessToken = session.access_token // Store access token on load
      }
    },
  },
})
