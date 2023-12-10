
<script setup>
import { ref } from "vue";
const props = defineProps({
  location: {
    type: String,
    required: false,
    default: "Unknown",
  },
  role: {
    type: String,
    required: false,
    default: "Spy",
  },
});

const showCard = ref(false);

const handleClick = () => {
  showCard.value = !showCard.value;
};
</script>

<template>
  <div class="game-card" @click="handleClick">
    <div
      class="card flex flex-col"
      :class="showCard ? 'show-card-data' : 'hide-card-data'"
    >
      <div class="timer text-3xl font-extrabold">SPYFALL</div>
      <div class="text-sm">
        You are in: <span class="text-xl font-bold">{{ location }}</span>
      </div>
      <div class="text-sm">
        Role: <span class="text-xl font-bold">{{ role }}</span>

        <div class="timer text-5xl font-extrabold">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>


<style lang="scss" scoped>
.game-card {
  transform: perspective(600px) rotateY(180deg);
}
.card {
  background: #191c29;
  width: 300px;
  height: 500px;
  padding: 3px;
  position: relative;
  border-radius: 6px;
  justify-content: center;
  align-items: center;
  text-align: center;
  display: flex;
  font-size: 1.5em;
  color: #58c7fa00;
  cursor: pointer;
  outline: none;
}

.card {
  transition: all 1s ease, opacity 1s, color 1s ease 0.5s, opacity 1s ease 0.5s;
  transform: perspective(600px) rotateY(0deg);
  &::before,
  &::after {
    transition: opacity 0.5s ease 0.5s;
    opacity: 1;
  }

  &.show-card-data {
    color: #58c7fa;
    transform: perspective(600px) rotateY(180deg);

    &::before,
    &::after {
      transition: opacity 0.5s ease 0s;
      opacity: 0;
    }
  }
  .timer {
    color: transparent;
    transition: all 1s ease, opacity 1s, color 0.5s ease, opacity 0.5s ease 0.5s;
  }
  &.hide-card-data {
    transition: all 1s ease, opacity 1s, color 0.5s ease, opacity 0.5s ease 0.5s;

    .timer {
      transition: all 1s ease, opacity 1s, color 0.5s ease 0.5s,
        opacity 0.5s ease 0.5s;

      color: #fff;
      transform: rotateY(180deg);
    }
  }
}

.card::before {
  content: "";
  width: 104%;
  height: 102%;
  border-radius: 8px;
  background-image: linear-gradient(
    var(--rotate),
    #5ddcff,
    #3c67e3 43%,
    #4e00c2
  );
  position: absolute;
  z-index: -1;
  top: -1%;
  left: -2%;
  animation: spin 2.5s linear infinite;
}

.card::after {
  position: absolute;
  content: "";
  top: calc(500px / 6);
  left: 0;
  right: 0;
  z-index: -1;
  height: 100%;
  width: 100%;
  margin: 0 auto;
  transform: scale(0.8);
  filter: blur(calc(500px / 6));
  background-image: linear-gradient(
    var(--rotate),
    #5ddcff,
    #3c67e3 43%,
    #4e00c2
  );
  opacity: 1;
  transition: opacity 0.5s;
  animation: spin 2.5s linear infinite;
}

@keyframes spin {
  0% {
    --rotate: 0deg;
  }
  100% {
    --rotate: 360deg;
  }
}
</style>