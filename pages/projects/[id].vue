<template>
  <div class="p-4 bg-slate-950 text-white">
    <div v-if="user">
      <div class="flex flex-row justify-between">
        <div class="flex flex-row">
          <NuxtLink to="/projects" class="text-sm"><UIcon name="heroicons:arrow-left-20-solid" /> Projects</NuxtLink>
          <h1 class="ml-4">{{ website.title }}</h1>
        </div>
        <img :src="website.image" alt="Website Image" class="w-24" />
      </div>
      <p>{{ website.description }}</p>
      
        <div class="flex flex-row justify-between">
          <p class="mr-4 text-xs">Category: {{ website.category }}</p>
          <p class="text-xs">Repo Name: <NuxtLink :to="website.repo_name" target="_blank">{{ website.repo_name }}</NuxtLink></p>
          <p class="text-xs">Status: <span class="text-yellow-500">{{ website.status }}</span></p>
        </div>
        

      <div class="flex flex-row border-2 border-red-500 border-ridge">
        <div class="w-1/5 flex flex-col bg-red-100 pl-2 h-100 overflow-y-auto">
          <div class="flex justify-between">
            <h2 class="text-slate-800 text-lg">Repo Structure</h2>
            <div class="flex flex-row px-2 py-1">
              <div class="cursor-pointer"><UIcon name="heroicons:document-plus-20-solid" @click="addFile" class="w-6 h-6 text-red-500" /></div>
              <div class="cursor-pointer"><UIcon name="heroicons:folder-plus-20-solid" @click="addFolder" class="w-6 h-6 text-red-500" /></div>
            </div>
          </div>
          <ul class="text-slate-600">
            <FileNode
              v-for="file in repoFiles"
              :key="file.path"
              :file="file"
              @fetch-file="fetchFileContent"
              @fetch-folder="fetchFolderContents"
              @delete-file="deleteItem"
              @rename-file="renameItem"
              @move-item="moveItem"
            />
          </ul>
        </div>

        <div class="w-4/5 bg-red-100">
          <div class="w-full justify-between flex">
            <h2 class="text-red-700">Selected file: <span class="font-bold">{{ selectedFile }}</span></h2>
            <h3 class="text-center underline mr-4 text-red-300 italic">{{ fileMsg }}</h3>
          </div>
          <!-- Monaco Editor with v-model binding to editableText -->
          <MonacoEditor v-model="editableText" lang="js" class="editor" />
          
          <!-- Save Button -->
          <button @click="saveFile" class="mt-2 p-2 bg-blue-500 text-white rounded">Save File</button>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Sorry you are not authenticated!</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import FileNode from '~/components/FileNode.vue'

const authStore = useAuthStore()
const route = useRoute()
const website = ref({})
const repoFiles = ref([]) // Array to hold the file structure
const editableText = ref("Select a file to view its content") // Monaco editor content
const selectedFile = ref("") // Currently selected file path
const fileMsg = ref("You should know what you are doing...") // Message to display file status
const config = useRuntimeConfig()
const GITHUB_TOKEN = config.public.githubToken
const owner = config.public.githubUser
const repoName = ref("")
const fileSha = ref("") // Track file SHA for GitHub updates
const user = useSupabaseUser()
const initialContent = ref("")

const renameItem = async (fileOrFolder) => {
  const newName = prompt("Enter new name:", fileOrFolder.name)
  if (!newName || newName === fileOrFolder.name) return // Exit if no name change

  const isFolder = fileOrFolder.type === 'dir'
  const newFilePath = fileOrFolder.path.replace(fileOrFolder.name, newName)

  try {
    if (isFolder) {
      // Fetch all contents in the folder to move them
      await renameFolderContents(fileOrFolder.path, newFilePath)
    } else {
      // Fetch the existing file content for renaming
      const fileContent = await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${fileOrFolder.path}`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      })

      // Create the file with the new name at the new path
      await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${newFilePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Rename ${fileOrFolder.name} to ${newName}`,
          content: fileContent.content,
          sha: fileContent.sha
        }),
      })

      // Delete the old file
      await deleteFile(fileOrFolder)
    }

    // Refresh the repo structure
    repoFiles.value = await fetchRepoFiles("")
    alert(`Renamed ${fileOrFolder.name} to ${newName}`)
  } catch (error) {
    console.error("Error renaming item:", error)
    alert("Failed to rename item")
  }
}

// Helper function to rename all contents within a folder
const renameFolderContents = async (oldPath, newPath) => {
  try {
    const folderContents = await fetchRepoFiles(oldPath)

    for (const item of folderContents) {
      const itemNewPath = item.path.replace(oldPath, newPath)

      if (item.type === 'dir') {
        // Recursively rename subfolders
        await renameFolderContents(item.path, itemNewPath)
      } else {
        // Fetch file content and create at the new path
        const fileContent = await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${item.path}`, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
          },
        })

        // Create the file at the new location
        await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${itemNewPath}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            message: `Move ${item.path} to ${itemNewPath}`,
            content: fileContent.content,
            sha: fileContent.sha,
          }),
        })

        // Delete the old file
        await deleteFile(item)
      }
    }
  } catch (error) {
    console.error("Error renaming folder contents:", error)
    throw new Error("Failed to rename folder contents")
  }
}


const moveItem = async ({ draggedFile, targetFolder }) => {
  try {
    const newFilePath = `${targetFolder.path}/${draggedFile.name}`

    console.log("NewFilePath: ", newFilePath);
    console.log("Moving file:", draggedFile.path, "to", newFilePath) // Log the paths for debugging

    // 1. Fetch the content of the dragged file
    const fileContent = await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${draggedFile.path}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    })

    if (!fileContent.content) {
      console.error("Failed to fetch file content:", draggedFile.path)
      return
    }

    // 2. Create a new file at the target path with the fetched content
    await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${newFilePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Move ${draggedFile.path} to ${newFilePath}`,
        content: fileContent.content, // Base64-encoded content of the original file
      }),
    })
    console.log("File created at new location:", newFilePath)

    // 3. Delete the original file
    await deleteFile(draggedFile)
    console.log("Original file deleted:", draggedFile.path)

    // 4. Refresh file structure
    repoFiles.value = await fetchRepoFiles("")
    alert(`Moved ${draggedFile.name} to ${targetFolder.name}`)

  } catch (error) {
    console.error("Error moving item:", error)
    alert("Failed to move item")
  }
}

const deleteItem = async (file) => {
  const confirmDelete = confirm(`Are you sure you want to delete ${file.name}?`)

  if (!confirmDelete) return

  try {
    if (file.type === 'dir') {
      // Recursively delete each item in the folder
      await deleteFolderContents(file.path)
    } else {
      // Delete a single file
      await deleteFile(file)
    }

    alert('Item deleted successfully!')
    repoFiles.value = await fetchRepoFiles("") // Refresh the file structure
  } catch (error) {
    console.error('Error deleting item:', error)
    alert('Failed to delete item')
  }
}

// Function to delete a single file on GitHub
const deleteFile = async (file) => {
  console.log("FILE: ", file);
  await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${file.path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      message: `Delete ${file.path}`, // Commit message
      sha: file.sha, // GitHub requires the file's SHA for deletion
    }),
  })
  repoFiles.value = await fetchRepoFiles("") 
}

// Function to delete all contents in a folder recursively
const deleteFolderContents = async (folderPath) => {
  const contents = await fetchRepoFiles(folderPath)

  for (const item of contents) {
    if (item.type === 'dir') {
      await deleteFolderContents(item.path) // Recursively delete subdirectories
    } else {
      await deleteFile(item) // Delete individual file
    }
  }

  // Delete the empty folder by removing the last file (e.g., `.gitkeep` if used)
  const placeholderFile = { path: `${folderPath}/.gitkeep`, sha: '' } // Use the actual SHA if it exists
  await deleteFile(placeholderFile)
}

const addFile = async () => {
  // Prompt the user to enter a file name and initial content
  const filePath = prompt("Enter the new file name (e.g., 'newfile.js')")
  initialContent.value = "<template></template>"

  if (!filePath || !initialContent) return

  try {
    // Encode content to base64
    const encodedContent = btoa(initialContent.value)

    // Send a PUT request to create a new file in GitHub
    await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Create new file ${filePath}`, // Commit message
        content: encodedContent, // Base64-encoded content
      }),
    })

    alert('File created successfully!')
    repoFiles.value = await fetchRepoFiles("") // Refresh the repo structure
  } catch (error) {
    console.error('Error creating new file:', error)
    alert('Failed to create file')
  }
}

const addFolder = async () => {
  // Prompt the user to enter a folder name
  const folderName = prompt("Enter the new folder name (e.g., 'newfolder')")

  if (!folderName) return

  try {
    // GitHub doesn't support empty folders, so create a placeholder file inside the folder
    const filePath = `${folderName}/.gitkeep`
    const initialContent = "" // Empty content for the placeholder file
    const encodedContent = btoa(initialContent)

    // Send a PUT request to create the folder with a placeholder file
    await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Create new folder ${folderName}`, // Commit message
        content: encodedContent, // Base64-encoded content for the placeholder file
      }),
    })

    alert('Folder created successfully!')
    repoFiles.value = await fetchRepoFiles("") // Refresh the repo structure
  } catch (error) {
    console.error('Error creating new folder:', error)
    alert('Failed to create folder')
  }
}

// Fetch details of the selected website/project
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
    repoName.value = website.value.repo_name.split('/')[2].split('.')[0]
    repoFiles.value = await fetchRepoFiles("") // Fetch the root directory structure
  } catch (error) {
    console.error('Error fetching website details:', error)
  }
}

// Fetch the repository file structure at a given path
const fetchRepoFiles = async (path) => {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName.value}/contents/${path}`
    const files = await $fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    })
    return files
  } catch (error) {
    console.error('Error fetching repository files:', error)
    return []
  }
}

// Toggle folder contents: fetch and display or collapse
const fetchFolderContents = async (folder) => {
  if (!folder.children) {
    folder.children = await fetchRepoFiles(folder.path) // Fetch and add children to the folder
  } else {
    folder.children = null // Collapse the folder by setting children to null
  }
}

// Fetch and display content of a selected file
const fetchFileContent = async (file) => {
  if (file.type === 'dir') return // Skip directories; handled by fetchFolderContents
  selectedFile.value = file.path

  try {
    const fileContent = await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${file.path}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    })

    // Decode content from base64, update editor content, and store file SHA for saving
    editableText.value = atob(fileContent.content)
    fileSha.value = fileContent.sha // Store the file's SHA for saving
  } catch (error) {
    console.error('Error fetching file content:', error)
    editableText.value = "Error loading file content"
  }
}

// Save the current file content
const saveFile = async () => {
  if (!selectedFile.value) return // Ensure a file is selected

  try {
    // Encode the editor content to base64
    const updatedContent = btoa(editableText.value)

    // Send a PUT request to update the file in GitHub
    await $fetch(`https://api.github.com/repos/${owner}/${repoName.value}/contents/${selectedFile.value}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Update ${selectedFile.value}`, // Commit message
        content: updatedContent, // Updated file content in base64
        sha: fileSha.value, // GitHub requires the file's SHA for updates
      }),
    })
    alert('File saved successfully!')
  } catch (error) {
    console.error('Error saving file:', error)
    alert('Failed to save file')
  }
}

// Load website details when component is mounted
onMounted(() => {
  const id = route.params.id
  fetchWebsiteDetails(id)
})
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
}
.editor {
  width: 77vw;
  height: 80vh;
}

</style>
