<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="w-full flex justify-center">
    <div
      class="flex items-center max-w-sm p-4 bg-white border border-gray-200 rounded-lg shadow sm:p-8 dark:bg-gray-800 dark:border-gray-700 my-10 mx-4"
    >
      <h5 class="text-xl font-medium text-gray-500 dark:text-gray-400 mr-3">
        Room code:
      </h5>
      <div class="flex items-baseline text-gray-900 dark:text-white">
        <span class="text-5xl font-extrabold tracking-tight select-all">{{
          text
        }}</span>
      </div>
    </div>
  </div>
</template>



<style>
</style>