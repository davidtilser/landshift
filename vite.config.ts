import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium/'),
  },
  build: {
    rolldownOptions: {
      input: {
        onboarding: 'index.html',
        game: 'game.html',
      },
    },
  },
})
