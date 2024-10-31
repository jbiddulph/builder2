<template>
  <div class="flex flex-col items-center justify-center p-6 space-y-6 max-w-lg mx-auto">
    <h1 class="text-2xl font-semibold mb-4">Please register or login below</h1>

    <div class="w-full">
      <!-- Tabs Header -->
      <div class="flex space-x-4 border-b mb-4">
        <button
          @click="activeTab = 'login'"
          :class="activeTab === 'login' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'"
          class="py-2 px-4 border-b-2 font-medium text-lg focus:outline-none"
        >
          Login
        </button>
        <button
          @click="activeTab = 'register'"
          :class="activeTab === 'register' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'"
          class="py-2 px-4 border-b-2 font-medium text-lg focus:outline-none"
        >
          Register
        </button>
      </div>

      <!-- Login Form -->
      <div v-if="activeTab === 'login'" class="p-6 bg-white border rounded-lg shadow-lg">
        <h2 class="text-xl font-medium mb-4 text-center">Login</h2>
        <div class="space-y-4">
          <input
            v-model="loginEmail"
            placeholder="Enter your email"
            type="email"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <input
            v-model="loginPassword"
            placeholder="Enter your password"
            type="password"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <button
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
            @click="handleLogin"
          >
            Login
          </button>
        </div>
      </div>

      <!-- Register Form -->
      <div v-if="activeTab === 'register'" class="p-6 bg-white border rounded-lg shadow-lg">
        <h2 class="text-xl font-medium mb-4 text-center">Register</h2>
        <div class="space-y-4">
          <input
            v-model="registerEmail"
            placeholder="Enter your email"
            type="email"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <input
            v-model="registerPassword"
            placeholder="Enter your password"
            type="password"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <button
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
            @click="handleRegister"
          >
            Register
          </button>
        </div>
      </div>
    </div>
    <div><UButton @click="handleLogout">Logout</UButton></div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
definePageMeta({
  middleware: ['auth']
})
const router = useRouter()
const authStore = useAuthStore()

const user = useSupabaseUser()

const activeTab = ref('login')
const loginEmail = ref('')
const loginPassword = ref('')
const registerEmail = ref('')
const registerPassword = ref('')

const handleLogin = async () => {
  const { error } = await authStore.login(loginEmail.value, loginPassword.value)
  if (error) {
    console.error('Login Error:', error.message)
  } else {
    console.log('User logged in with ID:', authStore.userID)
    localStorage.setItem('accessToken', authStore.accessToken)
    router.push("/create-nuxt-project")
  }
}

const handleRegister = async () => {
  const { error } = await authStore.register(registerEmail.value, registerPassword.value)
  if (error) {
    console.error('Registration Error:', error.message)
  } else {
    console.log('User registered with ID:', authStore.userID)
    localStorage.setItem('accessToken', authStore.accessToken)
    router.push("/create-nuxt-project")
  }
}

const handleLogout = async () => {
  await authStore.logout()
  console.log("User is now signed out")
}
</script>

<style scoped>
/* Additional custom styling if needed */
</style>
