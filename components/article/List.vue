<script setup>
const props = defineProps({
  title: {
    type: String,
    required: false,
    default: "title",
  },
  list: {
    type: Array,
    required: false,
    default: [],
  },
});
</script>

<template>
  <h3 class="text-xl font-bold text-gray dark:text-gray-200">
    {{ title }}
  </h3>
  <ol class="lead dark:text-gray-200 mb-4 list-inside list-disc">
    <li v-for="(item, i) in list" :key="i">
      <strong>{{ item.title }}</strong> {{ item.description }}
    </li>
  </ol>
</template>



<style>
</style>