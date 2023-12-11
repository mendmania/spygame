<script setup>
import useFirebase from "~/composables/useFirebase";
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import { ref, onMounted } from "vue";
import { generateRoomId } from "~/utils/generateRoomId";
import { generateUsername } from "~/utils/generateUsername";

import { usePlayerStore } from "~/stores/playerData";
import { storeToRefs } from "pinia";
import Game from "~/models/game/Game";
import Player from "~/models/user/Player";

const playerStore = usePlayerStore();

const { username, user } = storeToRefs(playerStore);

const roomIdInput = ref("");
const roomUrl = ref(null);
const firebase = ref(useFirebase());

const prepareToCreateGameRoom = () => {
  const roomId = generateRoomId();
  const gameData = new Game();

  gameData.fromData(roomId);
  gameData.addPlayer({ roomId, username: user.value.username });
  return { gameData, roomId };
};

const prepareUserToJoinGame = () => {
  const playerData = new Player();

  playerData.fromData({
    username: user.value.username,
    roomId: roomIdInput.value.toUpperCase(),
  });

  return playerData;
};

const createRoom = () => {
  const { gameData, roomId } = prepareToCreateGameRoom();

  playerStore.setUserRoomId(roomId);
  playerStore.setUserRoomIdOnStorage(roomId);

  roomUrl.value = `/room/${roomId}`;
  firebase.value.createRoom(roomId, gameData);
  navigateTo(roomUrl.value);
};

const joinRoom = async () => {
  const userData = prepareUserToJoinGame();

  const roomId = roomIdInput.value.toUpperCase();

  const roomResponse = await firebase.value.joinGame(roomId, userData);

  console.log(roomResponse);
  if (!roomResponse) {
    alert("Room does not exist!");
    return;
  }

  playerStore.setUserRoomId(roomId);
  playerStore.setUserRoomIdOnStorage(roomId);
};

onMounted(() => {});

const onUsernameInput = ($e) => {
  playerStore.setUsername($e);
  playerStore.setUserNameOnStorage($e);
};
</script>

<template>
  <div class="flex flex-col justify-center items-center">
    <div class="flex mb-10 w-full md:w-[400px]">
      <div class="flex mx-4 w-full">
        <div
          id="dropdown-button"
          data-dropdown-toggle="dropdown"
          class="flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center text-gray-900 bg-gray-100 border border-e-0 border-gray-300 dark:border-gray-700 dark:text-white rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800"
          type="button"
        >
          Username
        </div>
        <div
          id="dropdown"
          class="z-10 hidden bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700"
        ></div>
        <div class="relative w-full">
          <input
            :value="user?.username"
            @input="onUsernameInput($event.target.value)"
            type="search"
            id="search-dropdown"
            class="block p-4 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg rounded-s-gray-100 rounded-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
            placeholder="Add username"
            required
          />
        </div>
      </div>
    </div>

    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      @click="createRoom"
    >
      Create room
    </button>

    <div class="flex items-baseline text-gray-900 dark:text-white my-5">
      <span class="text-5xl font-extrabold tracking-tight">OR</span>
    </div>

    <div class="relative w-full md:w-[400px]">
      <div class="mx-4">
        <input
          v-model="roomIdInput"
          type="search"
          id="search"
          class="uppercase block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Room"
          required
        />
        <button
          @click="joinRoom"
          class="text-white absolute end-7 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Join
        </button>
      </div>
    </div>
    <GameLocationsList />
  </div>
</template>
  
