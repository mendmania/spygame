<script setup>
import useGetUserDataLocalStorage from "~/composables/useGetUserDataLocalStorage";
import { onMounted } from "vue";
import { usePlayerStore } from "~/stores/playerData";
import { generateUsername } from "~/utils/generateUsername";

const playerStore = usePlayerStore();

useHead({
  title: "Draw Game",
  htmlAttrs: { lang: "en" },
  meta: [
    {
      hid: "description",
      name: "description",
      content:
        "Draw is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    {
      hid: "keywords",
      name: "keywords",
      content:
        "Draw, board game, deception, spy, party game, social deduction, strategy game",
    },
    {
      hid: "og:type",
      property: "og:type",
      content: "website",
    },
    {
      hid: "og:title",
      property: "og:title",
      content: "Draw Board Game - Uncover the Deception",
    },
    {
      hid: "og:description",
      property: "og:description",
      content:
        "Draw is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    {
      hid: "og:image",
      property: "og:image",
      content: "https://https://Draw.virtualboardzone.com/DrawBanner.jpg",
    },
    {
      hid: "og:url",
      property: "og:url",
      content: "https://Draw.virtualboardzone.com",
    },
    {
      hid: "twitter:card",
      name: "twitter:card",
      content: "https://https://Draw.virtualboardzone.com/DrawBanner.jpg",
    },
    {
      hid: "twitter:title",
      name: "twitter:title",
      content: "Draw Board Game - Uncover the Deception",
    },
    {
      hid: "twitter:description",
      name: "twitter:description",
      content:
        "Draw is a thrilling board game of deception. Discover who the spy is before it’s too late! Learn the rules, strategies, and enjoy hours of espionage fun.",
    },
    {
      hid: "twitter:image",
      name: "twitter:image",
      content: "https://https://Draw.virtualboardzone.com/DrawBanner.jpg",
    },
  ],
});

onMounted(() => {
  const spyData = useGetUserDataLocalStorage();

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
    <div class="flex flex-grow"></div>

    <TheFooter />
  </div>
</template>
