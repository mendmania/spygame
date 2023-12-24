<script setup>
import { ref, onMounted } from "vue";
import { useGameStore } from "~/stores/gameData";
import { usePlayerStore } from "~/stores/playerData";
import { storeToRefs } from "pinia";
import useFirebase from "~/composables/useFirebase";
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import Player from "~/models/user/Player";

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const { user } = storeToRefs(playerStore);
const { gameData } = storeToRefs(gameStore);
const router = useRouter();

const currentRoute = router.currentRoute;
const routeData = ref(currentRoute);
const firebase = ref(useFirebase());
const roomId = ref(routeData.value.params.roomId[0]);

onMounted(async () => {
  await firebase.value.getRealtimeRoomData(roomId.value);

  const spyData = useGetUserDataLocalStorage();

  if (!spyData.roomId) {
    joinRoom(spyData.username);
  }
});

const prepareUserToJoinGame = (username) => {
  const playerData = new Player();

  console.log(username);
  playerData.fromData({
    username: username,
    roomId: roomId.value,
  });

  return playerData;
};

const joinRoom = async (data) => {
  const userData = prepareUserToJoinGame(data);
  const roomResponse = await firebase.value.joinGame(roomId.value, userData);

  if (!roomResponse) {
    alert("Room does not exist!");
    return;
  }

  playerStore.setUserRoomId(roomId.value);
  playerStore.setUserRoomIdOnStorage(roomId.value);
};

const startGame = () => {
  firebase.value.startStopGameById(roomId.value, true, 8);
};

const stopGame = () => {
  firebase.value.startStopGameById(roomId.value, false);
};

const endGame = () => {
  var userResponse = window.confirm(
    "Do you want to close room and end the game?"
  );
  if (userResponse) {
    firebase.value.endGameById(roomId.value);
  }
};
const leaveGame = () => {
  var userResponse = window.confirm("Are you sure you want to leave the game?");
  if (!userResponse) return;

  firebase.value.removePlayerFromRoomById(roomId.value, user.value.username);
  playerStore.unsetUserRoomIdOnStorage();
  navigateTo("/");
};

const gameLocation = () => {
  const locations = gameData.value?.game?.players.filter(
    (v) => v.isSpy != true && v.location != -1
  );

  if (locations && locations.length > 0) {
    const [gameLocation] = locations;
    return gameLocation.location;
  }

  return -1;
};
</script>

<template>
  <div class="draw-room w-full flex flex-col items-center justify-center">
    <GameInfoCard :text="gameData?.game.roomId" />

    <GameCanvas v-if="gameData" :isAdmin="user?.isAdmin" :gameData="gameData" />

    <!-- <GameCard :location="user.location" :role="user.role" :canFlipCard="true">
      <GameTimer
        v-if="gameData?.game.startTime"
        :timestamp="gameData?.game.startTime"
      />
      <div v-else class="text-transparen t flex flex-col">
        <span v-if="gameLocation() != -1" class="text-base"> Location: </span>
        <span v-if="gameLocation() != -1" class="text-2xl">
          "{{ gameLocation() }}"
        </span>
        <span v-else class="text-base">
          Unable to determine the location due to insufficient players.
        </span>
      </div>
    </GameCard> -->

    <div class="flex py-10">
      <div v-if="user?.isAdmin">
        <button
          v-if="gameData?.game.isActive"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="stopGame"
        >
          Finish Game
        </button>
        <button
          v-else
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="startGame"
        >
          Start Game
        </button>
      </div>

      <div>
        <button
          v-if="user?.isAdmin"
          class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-5"
          @click="endGame"
        >
          Close Room
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

    <GamePlayersList
      :players="gameData?.game?.players"
      :showSpy="!gameData?.game.startTime"
    />
    <!-- <GameLocationsList /> -->
  </div>
</template>



<style lang="scss">
.draw-room {
  position: fixed;
  z-index: 12;
  background: red;
  canvas {
    height: 50vh;
    width: 100vw;
  }
}
</style>