<script setup>
import { ref } from "vue";
</script>

<template>
  <header class="bg-white rounded-lg shadow dark:bg-gray-900 my-4">
    <div class="w-full max-w-screen-xl mx-auto p-4 md:py-6">
      <div class="sm:flex sm:items-center sm:justify-between">
        <NuxtLink
          to="/"
          class="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img
            :src="'/SpyfallIcon.png'"
            class="h-[64px] w-[64px]"
            alt="Virtual Board Zone Logo"
          />
          <span
            class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white"
            >Virtual Board Zone</span
          >
        </NuxtLink>
        <ul
          class="flex flex-wrap items-center my-3 text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          <li>
            <NuxtLink
              to="https://spy.virtualboardzone.com"
              class="hover:underline me-4 md:me-6"
              >Play Spyfall</NuxtLink
            >
          </li>
          <li>
            <a href="#" class="hover:underline me-4 md:me-6">Privacy Policy</a>
          </li>
          <!-- <li>
            <a href="#" class="hover:underline me-4 md:me-6">Licensing</a>
          </li> -->
          <li>
            <a href="#" class="hover:underline">Contact</a>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<style lang="scss">
header {
  &.spy-header {
    height: 60px;
    background: #58c7fa;
  }
}
</style>