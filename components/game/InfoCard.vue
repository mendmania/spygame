<script setup>
const props = defineProps({
  text: {
    type: String,
    required: false,
    default: "****",
  },
});
</script>

<template>
  <div class="w-full flex justify-between items-center">
    <slot name="left" />

    
    <div
      class="flex items-center max-w-sm bg-white border border-gray-200 rounded-lg shadow p-2 dark:bg-gray-800 dark:border-gray-700 my-2 mx-4"
    >
      <h5 class="text-md font-medium text-gray-500 dark:text-gray-400 mr-3">
        Room code:
      </h5>
      <div class="flex items-baseline text-gray-300 dark:text-white">
        <span class="text-l font-extrabold tracking-tight select-all">{{
          text
        }}</span>
      </div>
    </div>

    <slot name="right" />
  </div>
</template>



<style>
</style>