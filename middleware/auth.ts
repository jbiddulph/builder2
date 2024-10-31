export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  console.log("userx: ", user.value)

  // If the user is not logged in, redirect to the home page, but only if they're not already there
  if (!user.value && to.path !== '/') {
    return navigateTo('/')
  }

  // If the user is logged in and tries to access the home page, redirect them to '/create-nuxt-project'
  if (user.value && to.path === '/') {
    return navigateTo('/create-nuxt-project')
  }

  // Allow navigation if no redirection is necessary
})