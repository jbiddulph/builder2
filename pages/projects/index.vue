<template>
  <div class="p-4">
    <ul class="grid grid-cols-4 gap-4">
      <li v-for="website in userWebsites" :key="website.id">
        <UCard>
          <template #header>
            <div class="relative">
              <img :src="website.image" />
              <span class="absolute top-10 left-10 z-10">#{{ website.id }}</span>
            </div>
            <div class="h-8">
              <p>{{ website.title }}</p>
              <p>{{ website.description }}</p>
            </div>
          </template>
          <div class="h-8">
            <p>{{ website.repo_name }}</p>
          </div>

          <template #footer>
            <div class="h-8 flex flex-row justify-between">
              <small class="mr-4">Category: {{ website.category }}</small>
              <small>Status: {{ website.status }}</small>
              {{ website.id }}
              <NuxtLink :to="`/projects/${website.id}`">View Details</NuxtLink>
            </div>
          </template>
        </UCard>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const userWebsites = ref([])

const fetchUserWebsites = async () => {
  try {
    const token = localStorage.getItem('accessToken')
    userWebsites.value = await $fetch('/api/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error) {
    console.error('Error fetching websites:', error)
  }
}

onMounted(() => {
  fetchUserWebsites()
})
</script>

<style>

</style>