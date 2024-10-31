<template>
  <div class="flex justify-center text-center">
    <div>
      <h2>Welcome {{ user.user_metadata.name }}</h2>
      <span @click="logout" class="cursor-pointer">Logout</span>
      <form @submit.prevent="createProject">
        <h2>Please select which modules you would like to add</h2>
        <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <li v-for="module in availableModules" :key="module" class="flex w-full h-12 p-4 bg-slate-700 items-center space-x-2">
            <label class="flex items-center space-x-2">
              <input type="checkbox" :value="module" v-model="selectedModules" />
              <span>{{ module }}</span>
            </label>
          </li>
        </ul>
        <p class="text-xl">Creating a project will:  </p>
        <ul class="list-syle-disc">
          <li>Create a Nuxt project</li>
          <li>Initialise a repo for your project in GitHub</li>
          <li>Link your project from GitHub to Netlify and deploy</li>
          <li>Create a preview URL to view your application</li>
        </ul>
        <input v-model="projectData.title" />
        <UButton type="submit" class="mt-4">Create Project</UButton>
      </form>

      <NuxtLink to="/projects">View my projects</NuxtLink>
    </div>
    
  </div>
</template>


<script setup>
definePageMeta({
  middleware: ['auth']
})
import { useAuthStore } from '~/stores/auth'
const authStore = useAuthStore()
const user = useSupabaseUser()
const availableModules = [
  // { name: "@nuxt/content", type: "Core Functionality and Data", description: "", info: "" },
  // { name: "@nuxtjs/axios", type: "Core Functionality and Data", description: "", info: "" },
  // { name: "@pinia/nuxt", type: "Core Functionality and Data", description: "", info: "" },
  // { name: "@nuxtjs/supabase", type: "Core Functionality and Data", description: "", info: "" },
  // { name: "@nuxtjs/apollo", type: "Core Functionality and Data", description: "", info: "" },
  // { name: "@nuxtjs/tailwindcss", type: "UI and Styling", description: "Integration for Tailwind CSS, which is popular for utility-based styling.", info: "" },
  // { name: "@nuxtjs/color-mode", type: "UI and Styling", description: "Adds dark mode and theme toggling capabilities.", info: "" },
  // { name: "@nuxtjs/bootstrap-vue-next", type: "UI and Styling", description: "Bootstrap Vue integration for responsive design and component styling.", info: "" },
  // { name: "@nuxt/image", type: "UI and Styling", description: "Optimized image handling for responsive images.", info: "" },
  // { name: "@vueuse/nuxt", type: "UI and Styling", description: "VueUse integration for a collection of essential utilities.", info: "" },
  // { name: "@nuxtjs/auth-next", type: "Authentication and Security", description: "", info: "" },
  // { name: "@nuxtjs/strapi", type: "Authentication and Security", description: "", info: "" },
  // { name: "@nuxtjs/firebase", type: "Authentication and Security", description: "", info: "" },
  // { name: "@nuxtjs/auth", type: "Authentication and Security", description: "", info: "" },
  // { name: "@nuxtjs/robots", type: "SEO and Analytics", description: "", info: "" },
  // { name: "@nuxtjs/sitemap", type: "SEO and Analytics", description: "", info: "" },
  // { name: "@nuxtjs/gtm", type: "SEO and Analytics", description: "", info: "" },
  // { name: "@nuxtjs/google-analytics", type: "SEO and Analytics", description: "", info: "" },
  // { name: "@nuxt-seo-kit", type: "SEO and Analytics", description: "", info: "" },
  // { name: "@nuxtjs/pwa", type: "Utility and Performance Enhancements", description: "", info: "" },
  // { name: "@nuxtjs/compression", type: "Utility and Performance Enhancements", description: "", info: "" },
  // { name: "@nuxtjs/svg", type: "Utility and Performance Enhancements", description: "", info: "" },
  // { name: "@nuxtjs/redirect-module", type: "Utility and Performance Enhancements", description: "", info: "" },
  // { name: "@nuxtjs/dotenv", type: "Utility and Performance Enhancements", description: "", info: "" },
  // { name: "@nuxtjs/strapi", type: "Headless CMS Integrations", description: "", info: "" },
  // { name: "@storyblok/nuxt", type: "Headless CMS Integrations", description: "", info: "" },
  // { name: "@sanity/nuxt", type: "Headless CMS Integrations", description: "", info: "" },
  // { name: "@contentful/nuxt", type: "Headless CMS Integrations", description: "", info: "" },
  // { name: "@nuxtjs/i18n", type: "Internationalization (i18n)", description: "", info: "" },
  "@nuxt/content",
  "@nuxtjs/axios",
  "@pinia/nuxt",
  "@nuxtjs/supabase",
  "@nuxtjs/apollo",
  "@nuxtjs/tailwindcss",
  "@nuxtjs/color-mode",
  "@nuxtjs/bootstrap-vue-next",
  "@nuxt/image",
  "@vueuse/nuxt",
  "@nuxtjs/auth-next",
  "@nuxtjs/strapi",
  "@nuxtjs/firebase",
  "@nuxtjs/auth",
  "@nuxtjs/robots",
  "@nuxtjs/sitemap",
  "@nuxtjs/gtm",
  "@nuxtjs/google-analytics",
  "@nuxt-seo-kit",
  "@nuxtjs/pwa",
  "@nuxtjs/compression",
  "@nuxtjs/svg",
  "@nuxtjs/redirect-module",
  "@nuxtjs/dotenv",
  "@nuxtjs/strapi",
  "@storyblok/nuxt",
  "@sanity/nuxt",
  "@contentful/nuxt",
  "@nuxtjs/i18n"
]
const supabaseUser = useSupabaseUser()
const selectedModules = ref([]);
const projectData = ref({
  title: 'xx',
  description: '',
  repo_name: '',
  image: '/img/websites/holding.png',
  category: 'new project',
  status: 'NEW',
  userId: supabaseUser?.value?.id || null, // Set userId directly if available
})
const logout = async () => {
  await authStore.logout()
  console.log("User is now signed out")
}
const createProject = async () => {
  // Send the selected modules to the backend
  await $fetch("/api/create-project", {
    method: "POST",
    body: { modules: selectedModules.value },
  })
  .then((response) => {
    // Display the result, such as the Netlify deploy link
    alert(`Project created! View at: ${response.netlify_url}`);
    projectData.value.repo_name = response.netlify_url
    projectData.value.description = selectedModules.value.join(', ')
  })
  .catch((error) => {
    console.error("Error creating project:", error);
  });
  try {
    const newProject = await $fetch("/api/projects/create", {
      method: "POST",
      body: projectData.value,
    })  
    console.log('New Project Created:', newProject)
  } catch (error) {
    console.error('Error creating project:', error.message)
  }
}
</script>
