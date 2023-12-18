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
  <h3 class="text-xl font-bold text-gray dark:text-gray-200">
    {{ title }}
  </h3>
  <p class="lead dark:text-gray-200 mb-4">
    {{ description }}
  </p>
</template>



<style>
</style>