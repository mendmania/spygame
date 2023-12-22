<script setup>
const props = defineProps({
  title: {
    type: String,
    required: false,
    default: "title",
  },
  subTitle: {
    type: String,
    required: false,
    default: "",
  },
});
</script>

<template>
  <div class="flex flex-col mb-11">
    <h1
      class="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white"
    >
      How to Play Draw: A
      <mark class="px-2 text-white bg-blue-600 rounded dark:bg-blue-500"
        >Thrilling</mark
      >
      Social Deduction Board Game
    </h1>
    <p class="text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">
      {{ subTitle }}
    </p>
  </div>
</template>



<style>
</style>