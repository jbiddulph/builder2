<template>
  <li
    class="file-item border-b-2 border-red-200 border-dashed py-2 relative flex flex-col w-auto align-middle"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    draggable="true"
    @dragstart="startDrag"
    @dragover.prevent="allowDrop"
    @drop="handleDrop"
  >
    <div 
      @click="handleClick" 
      class="cursor-pointer inline-flex items-center"
      :class="{ 'font-bold text-yellow-600': isSelected }"
    >
      <strong>{{ file.type === 'dir' ? '📁' : '📄' }}</strong> {{ file.name }}
    </div>

    <!-- Delete and Rename buttons, shown only when hovering -->
    <span v-if="hovered" class="action-buttons mt-2">
      <UIcon name="heroicons:pencil-square-16-solid" @click.stop="emitRename" />
      <UIcon name="heroicons:x-mark-16-solid" @click.stop="emitDelete" class="mr-2" />
    </span>

    <ul v-if="file.children">
      <FileNode
        v-for="child in file.children"
        :key="child.path"
        :file="child"
        :selected-file="selectedFile"
        @fetch-file="$emit('fetch-file', child)"
        @fetch-folder="$emit('fetch-folder', child)"
        @delete-file="$emit('delete-file', child)"
        @rename-file="$emit('rename-file', child)"
        @move-item="$emit('move-item', $event)"
      />
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  selectedFile: {
    type: String, // The path of the currently selected file
    default: ''
  }
})

const emit = defineEmits(['fetch-file', 'fetch-folder', 'delete-file', 'rename-file', 'move-item'])
const hovered = ref(false)

// Computed property to check if the current file is selected
const isSelected = computed(() => {
  const selectedTrimmed = props.selectedFile.trim()
  const pathTrimmed = props.file.path.trim()
  const isSelected = selectedTrimmed === pathTrimmed
  console.log("Selected file:", selectedTrimmed)
  console.log("Current file path:", pathTrimmed)
  console.log("Is selected:", isSelected)
  return isSelected
})

const handleClick = () => {
  if (props.file.type === 'dir') {
    emit('fetch-folder', props.file) // Fetch or toggle folder contents
  } else {
    emit('fetch-file', props.file) // Fetch file content for viewing/editing
  }
}

// Emit delete event to parent component
const emitDelete = () => {
  emit('delete-file', props.file)
}

// Emit rename event to parent component
const emitRename = () => {
  emit('rename-file', props.file)
}

// Start drag operation and store dragged file info
const startDrag = (event) => {
  event.dataTransfer.setData('text/plain', JSON.stringify(props.file)) // Store file info as string
}

// Allow drop event on valid targets (folders only)
const allowDrop = (event) => {
  if (props.file.type === 'dir') {
    event.preventDefault()
  }
}

// Handle drop event: emit move-item event to the parent component with dragged and target files
const handleDrop = (event) => {
  const draggedFile = JSON.parse(event.dataTransfer.getData('text/plain'))
  emit('move-item', { draggedFile, targetFolder: props.file }) // Emit move event to parent
}
</script>

<style>
.file-item {
  position: relative;
}

.action-buttons {
  position: absolute;
  right: 0;
  top: 0;
  color: red;
  cursor: pointer;
  font-weight: bold;
  display: inline-flex;
  gap: 4px;
}
</style>
