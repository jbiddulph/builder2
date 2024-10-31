<template>
  <div class="p-4">
    <h1>{{ website.title }}</h1>
    <img :src="website.image" alt="Website Image" class="web-img"/>
    <p>{{ website.description }}</p>
    <p>Category: {{ website.category }}</p>
    <p>Status: {{ website.status }}</p>
    <p>Repo Name: {{ website.repo_name }}</p>
    <div class="flex flex-row">
      <div>
        <h2>Repository File Structure</h2>
        <ul>
          <li 
            v-for="file in repoFiles" 
            :key="file.path" 
            @click="fetchFileContent(file)" 
            class="border-b-2"
          >
            <strong>{{ file.type === 'dir' ? '📁' : '📄' }}</strong> 
            {{ file.name }}
          </li>
        </ul>
      </div>
      <div v-if="editorContent !== null" class="mt-4">
        <h2>Editing: {{ selectedFile }}</h2>
        <div ref="editorContainer" class="editor-container"></div>
        <button @click="saveFile" class="mt-2 p-2 bg-blue-500 text-white">Save File</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { EditorView, basicSetup } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

const route = useRoute()
const website = ref({})
const repoFiles = ref([]) // Array to hold the file structure
const editorContainer = ref(null) // Reference to the editor container div
const editorInstance = ref(null) // CodeMirror instance
const editorContent = ref('') // Content to be set in the editor
const selectedFile = ref('') // Track the currently selected file

const fetchWebsiteDetails = async (id) => {
  try {
    const token = localStorage.getItem('accessToken')
    if (!token) throw new Error('No access token found')

    website.value = await $fetch(`/api/projects/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    fetchRepoFiles(website.value.repo_name)
  } catch (error) {
    console.error('Error fetching website details:', error)
  }
}

const fetchRepoFiles = async (repoUrl) => {
  try {
    const repoName = repoUrl.split('/')[2].split('.')[0]
    const config = useRuntimeConfig()
    const GITHUB_TOKEN = config.public.githubToken
    const owner = config.public.githubUser

    const files = await $fetch(`https://api.github.com/repos/${owner}/${repoName}/contents`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    })
    repoFiles.value = files
  } catch (error) {
    console.error('Error fetching repository files:', error)
  }
}

// Fetch and display file content in editor
const fetchFileContent = async (file) => {
  if (file.type === 'dir') return // Skip directories
  selectedFile.value = file.path

  try {
    const [owner, repo] = website.value.repo_name.split('/')
    const config = useRuntimeConfig()
    const githubToken = config.public.githubToken

    const fileContent = await $fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
      },
    })

    // Decode content from base64 and set it in editorContent
    editorContent.value = atob(fileContent.content)
    console.log('Fetched content:', editorContent.value) // Log content to verify it

    // Set content in CodeMirror editor
    if (editorInstance.value) {
      editorInstance.value.dispatch({
        changes: { from: 0, to: editorInstance.value.state.doc.length, insert: editorContent.value },
      })
    }
  } catch (error) {
    console.error('Error fetching file content:', error)
  }
}

// Save edited content back to GitHub
const saveFile = async () => {
  if (!selectedFile.value) return
  try {
    const [owner, repo] = website.value.repo_name.split('/')
    const config = useRuntimeConfig()
    const githubToken = config.public.githubToken

    // Fetch current file info to get the `sha` needed for updates
    const { sha } = await $fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFile.value}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    })

    // Prepare the updated content (convert to base64)
    const updatedContent = btoa(editorContent.value)

    // Update file in GitHub
    await $fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFile.value}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Update ${selectedFile.value}`,
        content: updatedContent,
        sha,
      }),
    })
    alert('File saved successfully!')
  } catch (error) {
    console.error('Error saving file:', error)
  }
}

onMounted(() => {
  const id = route.params.id
  fetchWebsiteDetails(id)

  // Initialize CodeMirror editor
  editorInstance.value = new EditorView({
    doc: editorContent.value, // Initial content
    extensions: [basicSetup, javascript(), oneDark],
    parent: editorContainer.value,
  })

  // Watch for changes in editor content
  editorInstance.value.state.doc.on("change", () => {
    editorContent.value = editorInstance.value.state.doc.toString()
  })
})
</script>

<style>
.editor-container {
  width: 100vw;
  height: 100vh;
}
.web-img {
  width: 100px;
  height: auto;
}
</style>
