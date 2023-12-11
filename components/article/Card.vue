<script setup>
const props = defineProps({
  title: {
    type: String,
    required: false,
    default: "title",
  },
  description: {
    type: String,
    required: false,
    default: "description",
  },
});
</script>

<template>
  <div
    class="block max-w-sm p-6 mb-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
  >
    <h5
      class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
    >
      {{ title }}
    </h5>
    <p class="font-normal text-gray-700 dark:text-gray-400">
      {{ description }}
    </p>
  </div>
</template>



<style>
</style>