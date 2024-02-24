// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  plugins: [
  ],
  app: {
    head: {
      charset: 'utf-8',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover' },
      ],
    }
  },
  modules: [
    '@pinia/nuxt',
    'nuxt-gtag',
  ],
  gtag: {
    id: 'G-NZBHYKXKY2'
  },
  runtimeConfig: {
    public: {
    }
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})
