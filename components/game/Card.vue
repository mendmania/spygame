
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

const holdTimeout = ref(null);
const isHolding = ref(null);

const startHold = () => {
  holdTimeout.value = setTimeout(() => {
    isHolding.value = true;
  }, 300);
};

const endHold = () => {
  clearTimeout(holdTimeout.value);
  isHolding.value = false;
};

const handleClick = () => {
  // if (isHolding.value) {
  //   console.log("Button clicked after holding");
  // } else {
  //   console.log("Button clicked");
  // }

  isHolding.value = false;
};
</script>

<template>
  <div
    class="game-card"
    @mousedown="startHold"
    @mouseup="endHold"
    @click="handleClick"
  >
    <div class="card flex flex-col" :class="isHolding ? 'show-card-data' : ''">
      <div class="text-sm">
        You are in: <span class="text-xl font-bold">{{ location }}</span>
      </div>
      <div class="text-sm">
        Role: <span class="text-xl font-bold">{{ role }}</span>
      </div>
    </div>
  </div>
</template>


<style lang="scss" scoped>
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

// .card:hover {
//   color: #58c7fa;
//   transition: color 1s;
// }
// .card:hover:before,
// .card:hover:after {
//   animation: none;
//   opacity: 0;
// }

.card {
  &.show-card-data {
    color: #58c7fa;
    transition: color 1s;

    &::before,
    &::after {
      animation: none;
      opacity: 0;
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

// a {
//   color: #212534;
//   text-decoration: none;
//   font-family: sans-serif;
//   font-weight: bold;
//   margin-top: 2rem;
// }
</style>