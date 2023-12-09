<script setup>
import { ref, onMounted } from "vue";
import { useGameStore } from "~/stores/gameData";
import { usePlayerStore } from "~/stores/playerData";
import { storeToRefs } from "pinia";
import useFirebase from "~/composables/useFirebase";

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const { user } = storeToRefs(playerStore);
const { gameData } = storeToRefs(gameStore);
const router = useRouter();

const currentRoute = router.currentRoute;
const routeData = ref(currentRoute);
const firebase = ref(useFirebase());
const roomId = ref(routeData.value.params.roomId[0]);
const isAdmin = ref(null);

onMounted(async () => {
  await firebase.value.getRealtimeRoomData(roomId.value);
});

const startGame = () => {
  firebase.value.startStopGameById(roomId.value, true);
};

const stopGame = () => {
  firebase.value.startStopGameById(roomId.value, false);
};

const endGame = () => {
  firebase.value.endGameById(roomId.value);
};
const leaveGame = () => {
  firebase.value.removePlayerFromRoomById(roomId.value, user.value.username);
  playerStore.unsetUserRoomIdOnStorage();
  navigateTo("/");
};
</script>

<template>
  <div class="w-full flex flex-col items-center justify-center">
    <GameCard :location="user.location" :role="user.role" />
    <div class="flex py-10">
      <div v-if="user?.isAdmin">
        <button
          v-if="gameData?.game.isActive"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="stopGame"
        >
          Stop Game
        </button>
        <button
          v-else
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="startGame"
        >
          Start Game
        </button>
      </div>

      <!-- USER: {{ user }}
    <pre>
    {{ gameData }}
  </pre
    > -->
      <div>
        <button
          v-if="user?.isAdmin"
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="endGame"
        >
          End Game
        </button>
        <button
          v-else
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="leaveGame"
        >
          Leave Game
        </button>
      </div>
    </div>
  </div>
</template>



<style>
</style>