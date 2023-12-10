<script setup>
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import { onMounted } from "vue";
import { usePlayerStore } from "~/stores/playerData";
import { generateUsername } from "~/utils/generateUsername";

const playerStore = usePlayerStore();

onMounted(() => {
  const spyData = useGetUserDataLocalStorage();
  console.error("useGetUserRoomuseGetUserRoomuseGetUserRoom", !!spyData);

  const { username, roomId } = spyData ? spyData : {};

  if (!!username) {
    playerStore.setUsername(username);
    playerStore.setUserNameOnStorage(username);
  } else {
    const randomUsername = generateUsername();
    playerStore.setUsername(randomUsername);
    playerStore.setUserNameOnStorage(randomUsername);
  }

  if (!!roomId) {
    navigateTo(`/room/${roomId}`);
  }
});
</script>


<template>
  <div class="h-full flex flex-col">
    <TheHeader />
    <NuxtPage />
    <TheFooter />
  </div>
</template>
