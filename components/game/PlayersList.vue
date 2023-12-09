<script setup>
const props = defineProps({
  players: {
    type: Array,
    required: false,
    default: [],
  },
});
</script>

<template>
  <div class="w-full max-w-md">
    <div
      class="p-4 bg-white border border-gray-200 rounded-lg shadow sm:p-8 dark:bg-gray-800 dark:border-gray-700 m-4"
    >
      <div class="flex items-center justify-between mb-4">
        <h5
          class="text-xl font-bold leading-none text-gray-900 dark:text-white"
        >
          Players
        </h5>
      </div>
      <div class="flow-root">
        <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            class="py-3 sm:py-4"
            v-for="(player, index) in players"
            :key="index"
          >
            <div class="flex items-center">
              <!-- <div class="flex-shrink-0">
              <img
                class="w-8 h-8 rounded-full"
                src="/docs/images/people/profile-picture-1.jpg"
                alt="Neil image"
              />
            </div> -->
              <div class="min-w-0 ms-4">
                <p
                  class="text-sm font-medium text-gray-900 truncate dark:text-white"
                >
                  {{ index + 1 }}.
                </p>
              </div>
              <div class="flex-1 min-w-0 ms-4">
                <p
                  class="text-sm font-medium text-gray-900 truncate dark:text-white"
                >
                  {{ player.username }}
                </p>
                <!-- <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                email@windster.com
              </p> -->
              </div>
              <div
                v-if="player.isAdmin"
                class="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white"
              >
                Administrator
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>



<style>
</style>