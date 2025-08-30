<script setup>
import { computed } from "vue";

const props = defineProps({
  files: { type: Array, required: true },
  formatFileSize: { type: Function, required: true },
  isAllowedFileType: { type: Function, required: true },
  isFileSizeValid: { type: Function, required: true },
  optimizationProgress: { type: Number, default: 0 }
});

const emit = defineEmits(["remove-file", "retry-upload"]);

const previewFiles = computed(() => props.files || []);
const hasActiveProcessing = computed(() =>
  previewFiles.value.some((f) => f.processing === true)
);
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="(fileObj, index) in previewFiles"
      :key="index"
      class="relative border border-gray-200 dark:border-gray-600 rounded-lg p-3"
      :class="{
        'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20':
          fileObj.needsOptimization && !fileObj.processed,
        'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20':
          fileObj.uploaded || fileObj.processed
      }"
    >
      <!-- Only show queued overlay on items waiting while another is processing -->
      <div
        v-if="hasActiveProcessing && !fileObj.processing && !fileObj.processed"
        class="absolute inset-0 z-10 bg-white/30 dark:bg-gray-900/20 flex items-center justify-center rounded-lg"
      >
        <div
          class="animate-spin w-6 h-6 border-4 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full"
        ></div>
      </div>
      <button
        type="button"
        class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs"
        @click="emit('remove-file', index)"
      >
        ×
      </button>

      <div class="mb-2">
        <div v-if="fileObj.preview">
          <img
            v-if="fileObj.file.type.startsWith('image/')"
            :src="fileObj.preview"
            class="w-full h-24 object-cover rounded"
            :alt="fileObj.file.name"
          />
          <video
            v-else
            :src="fileObj.preview"
            class="w-full h-24 object-cover rounded"
            muted
          />
        </div>
        <div
          v-else
          class="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center"
        >
          <i
            v-if="fileObj.file.type.startsWith('video/')"
            class="ri-vidicon-line text-2xl text-gray-400"
          ></i>
          <i v-else class="ri-image text-2xl text-gray-400"></i>
        </div>
      </div>

      <div class="text-xs space-y-1">
        <p
          class="font-medium truncate dark:text-gray-300"
          :title="fileObj.file.name"
        >
          {{ fileObj.file.name }}
        </p>
        <p class="text-gray-500">{{ formatFileSize(fileObj.file.size) }}</p>

        <div
          v-if="fileObj.processing"
          class="flex items-center space-x-1 text-blue-600"
        >
          <div
            class="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"
          ></div>
          <span v-if="fileObj.needsOptimization && optimizationProgress > 0">
            Optimizing... {{ optimizationProgress }}%
          </span>
          <span v-else-if="fileObj.needsOptimization"
            >Optimizing large video...</span
          >
          <span v-else>Processing...</span>
        </div>

        <div
          v-if="
            fileObj.processing &&
            fileObj.needsOptimization &&
            optimizationProgress > 0
          "
          class="mt-1"
        >
          <div class="w-full bg-blue-100 dark:bg-blue-800 rounded-full h-1.5">
            <div
              class="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              :style="`width: ${optimizationProgress}%`"
            ></div>
          </div>
        </div>

        <div v-else-if="fileObj.processed" class="text-green-600">
          <span
            v-if="
              fileObj.file.type.startsWith('video/') &&
              fileObj.file.size !== fileObj.processedFile?.size
            "
          >
            ✓ Optimized ({{ formatFileSize(fileObj.file.size) }} →
            {{ formatFileSize(fileObj.processedFile.size) }})
          </span>
          <span v-else>✓ Ready</span>
        </div>
        <div
          v-else-if="fileObj.needsOptimization && !fileObj.processing"
          class="text-amber-600"
        >
          ⚠️ Large video - will be optimized
        </div>
        <div v-else-if="fileObj.uploaded" class="text-green-600">
          ✓ Uploaded
        </div>

        <div
          v-else-if="fileObj.error"
          class="text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800"
        >
          <div class="font-medium">
            {{
              fileObj.postError
                ? "🚫 Form Submission Failed"
                : fileObj.timeoutError
                ? "⏰ Upload Timed Out"
                : "❌ Upload Failed"
            }}
          </div>
          <div class="text-xs mt-1">
            {{ fileObj.errorMessage || "Unknown error occurred" }}
          </div>
          <div
            v-if="fileObj.postError"
            class="text-xs mt-1 text-amber-600 dark:text-amber-400"
          >
            💡 The form submission never started - this usually indicates a
            JavaScript error or form validation issue
          </div>
          <div
            v-else-if="fileObj.timeoutError"
            class="text-xs mt-1 text-amber-600 dark:text-amber-400"
          >
            💡 Try again or check your connection
          </div>
          <button
            type="button"
            class="mt-2 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300 text-xs rounded"
            @click="emit('retry-upload', index)"
          >
            🔄 Retry
          </button>
        </div>

        <div
          v-if="fileObj.needsOptimization && !fileObj.processed"
          class="text-red-600"
        >
          <p
            v-if="
              !isFileSizeValid(fileObj.file.size) &&
              !fileObj.file.type.startsWith('video/')
            "
          >
            File too large (max 60MB)
          </p>
          <p
            v-if="
              !isFileSizeValid(fileObj.file.size) &&
              fileObj.file.type.startsWith('video/') &&
              fileObj.processed
            "
          >
            Video still too large after optimization (max 60MB)
          </p>
          <p v-if="!isAllowedFileType(fileObj.file.type)">
            Unsupported file type
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
