<script setup>
import { ref } from "vue";
</script>

<template>
  <header class="bg-white rounded-lg shadow dark:bg-gray-900 m-4">
    <div class="w-full max-w-screen-xl mx-auto p-4 md:py-6">
      <div class="sm:flex sm:items-center sm:justify-between">
        <NuxtLink
          to="/"
          class="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img
            :src="'https://spyfallgame.com/SpyfallIcon.png'"
            class="h-[64px] w-[64px]"
            alt="Spyfall Game Logo"
          />
          <span
            class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white"
            >Spyfall Game</span
          >
        </NuxtLink>
        <ul
          class="flex flex-wrap items-center my-3 text-sm font-medium text-gray-500 dark:text-gray-400"
        >
          <li>
            <NuxtLink to="/learn-to-play" class="hover:underline me-4 md:me-6"
              >Learn To Play</NuxtLink
            >
          </li>
          <li>
            <a href="#" class="hover:underline me-4 md:me-6">Privacy Policy</a>
          </li>
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