export default defineNuxtPlugin((nuxtApp) => {
    if (process.client) {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "G-97ZE2FX3BX");
    }
})
  