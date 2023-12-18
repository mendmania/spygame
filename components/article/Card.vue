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
  imageSrc: {
    type: String,
    required: false,
    default: null,
  },
  linkTo: {
    type: String,
    required: false,
    default: "/",
  },
});
</script>

<template>
  <div
    class="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mx-auto my-4 md:m-4"
  >
    <NuxtLink :to="linkTo" v-if="imageSrc">
      <img class="rounded-t-lg" :src="imageSrc" alt="" />
    </NuxtLink>
    <div class="p-5">
      <a href="#">
        <h5
          class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          {{ title }}
        </h5>
      </a>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
        {{ description }}
      </p>
      <NuxtLink
        :to="linkTo"
        class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
      >
        Read more
        <svg
          class="rtl:rotate-180 w-3.5 h-3.5 ms-2"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 14 10"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M1 5h12m0 0L9 1m4 4L9 9"
          />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>



<style>
</style>