<script setup>
import { SPY_LOCATIONS } from "~/constants/SPY_LOCATIONS";
import { ref } from "vue";

const props = defineProps({
  players: {
    type: Array,
    required: false,
    default: [],
  },
});

const openedLocation = ref(null);
const toggleLocationDetails = (data) => {
  if (openedLocation.value === data) {
    openedLocation.value = null;
  } else {
    openedLocation.value = data;
  }
};
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
          Locations
        </h5>
      </div>
      <div class="flow-root">
        <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
          <li
            class="py-3 sm:py-4"
            v-for="(location, index) in SPY_LOCATIONS"
            :key="index"
          >
            <div class="flex items-start" @click="toggleLocationDetails(index)">
              <div class="min-w-0 ms-4">
                <p
                  class="text-sm font-medium text-gray-900 truncate dark:text-white"
                >
                  {{ index + 1 }}.
                </p>
              </div>
              <div class="flex-1 min-w-0 ms-4 cursor-pointer">
                <p
                  class="text-sm font-medium text-gray-900 truncate dark:text-white"
                >
                  {{ location.location }}
                </p>
                <div
                  class="flex flex-col mt-3"
                  :class="[
                    `location-${index}`,
                    openedLocation === index ? '' : 'hidden',
                  ]"
                >
                  <span
                    v-for="(role, i) in location.roles"
                    :key="i"
                    class="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300 mb-1"
                    >{{ role }}</span
                  >
                </div>
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