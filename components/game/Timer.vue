<script setup>
import { ref, computed } from "vue";
const props = defineProps({
  timestamp: {
    type: Number,
    required: true,
  },
});

const seconds = ref(0);
const timerRunning = ref(false);

const timerFinished = ref(false);
const gameTimeRemaning = ref(null);

const timestampNow = new Date().getTime();

const gameTimeTimestamp = props.timestamp - timestampNow;
console.log(timestampNow);

if (gameTimeTimestamp < 0) {
  timerFinished.value = true;
} else {
  console.log(gameTimeTimestamp);
  gameTimeRemaning.value = Math.floor(gameTimeTimestamp / 1000);
}
console.log(gameTimeRemaning.value);

const formattedTime = computed(() => {
  const minutes = Math.floor(gameTimeRemaning.value / 60);
  const remainingSeconds = gameTimeRemaning.value % 60;
  const formattedSeconds = `${
    remainingSeconds < 10 ? "0" : ""
  }${remainingSeconds}`;
  return `${minutes}:${formattedSeconds}`;
});

const totalSeconds = computed(() => seconds.value);

const startTimer = () => {
  if (timerRunning.value) {
    // Timer is already running, do nothing
    return;
  }

  timerRunning.value = true;

  const interval = setInterval(() => {
    if (gameTimeRemaning.value <= 0) {
      clearInterval(interval);
      timerRunning.value = false;
      alert("Time's up!");
      gameTimeRemaning.value = 0; // Reset seconds
    } else {
      gameTimeRemaning.value--;
    }
  }, 1000);
};

onMounted(() => {
  if (gameTimeRemaning.value > 0) {
    startTimer();
  }
});
</script>

<template>
  <div class="w-full flex justify-center">
    <div>
      <p>{{ formattedTime }}</p>
    </div>
  </div>
</template>



<style>
</style>