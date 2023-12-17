<script setup>
import { onMounted } from "vue";

useHead({
  title: "Virtual Board Zone - Your Ultimate Online Board Game Destination",
  htmlAttrs: { lang: "en" },
  meta: [
    {
      hid: "description",
      name: "description",
      content:
        "Enter the world of Virtual Board Zone for an unparalleled online board gaming experience. Explore our wide range of games, from classics to the latest hits. Play, connect, and enjoy!",
    },
    {
      hid: "keywords",
      name: "keywords",
      content:
        "online board games, virtual board games, multiplayer games, family board games, strategy games, card games, Virtual Board Zone",
    },
    {
      hid: "og:type",
      property: "og:type",
      content: "website",
    },
    {
      hid: "og:title",
      property: "og:title",
      content: "Virtual Board Zone - Connect & Play",
    },
    {
      hid: "og:description",
      property: "og:description",
      content:
        "Discover a wide variety of online board games at Virtual Board Zone. Connect with friends or make new ones while enjoying thrilling and strategic gameplay.",
    },
    {
      hid: "og:image",
      property: "og:image",
      content: "https://virtualboardzone.com/HomeBanner.jpg",
    },
    {
      hid: "og:url",
      property: "og:url",
      content: "https://virtualboardzone.com",
    },
    {
      hid: "twitter:card",
      name: "twitter:card",
      content: "https://virtualboardzone.com/HomeBanner.jpg",
    },
    {
      hid: "twitter:title",
      name: "twitter:title",
      content: "Virtual Board Zone - Connect & Play",
    },
    {
      hid: "twitter:description",
      name: "twitter:description",
      content:
        "Dive into the exciting world of online board games with Virtual Board Zone. Enjoy a variety of games, from strategy to family favorites, in an interactive online setting.",
    },
    {
      hid: "twitter:image",
      name: "twitter:image",
      content: "https://virtualboardzone.com/HomeBanner.jpg",
    },
  ],
  // Additional tags for canonical URL, hreflang (if applicable), and schema markup
});

onMounted(() => {});
</script>


<template>
  <div class="h-full flex flex-col">
    <TheHeader />
    <NuxtPage />
    <TheFooter />
  </div>
</template>
