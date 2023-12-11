<script setup>
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import { onMounted } from "vue";
import { usePlayerStore } from "~/stores/playerData";
import { generateUsername } from "~/utils/generateUsername";

const playerStore = usePlayerStore();

useHead({
  title: "Spyfall Game",
  htmlAttrs: { lang: "en" },
  meta: [
    {
      hid: "description",
      name: "description",
      content:
        "Spyfall is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    {
      hid: "keywords",
      name: "keywords",
      content:
        "Spyfall, board game, deception, spy, party game, social deduction, strategy game",
    },
    {
      hid: "og:title",
      property: "og:title",
      content: "Spyfall Board Game - Uncover the Deception",
    },
    {
      hid: "og:description",
      property: "og:description",
      content:
        "Spyfall is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    { hid: "og:image", property: "og:image", content: "URL_TO_GAME_IMAGE" },
    { hid: "og:url", property: "og:url", content: "URL_TO_GAME_PAGE" },
    {
      hid: "twitter:card",
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      hid: "twitter:title",
      name: "twitter:title",
      content: "Spyfall Board Game - Uncover the Deception",
    },
    {
      hid: "twitter:description",
      name: "twitter:description",
      content:
        "Spyfall is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    {
      hid: "twitter:image",
      name: "twitter:image",
      content: "URL_TO_GAME_IMAGE",
    },
  ],
});

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
