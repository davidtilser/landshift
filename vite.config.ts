import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        onboarding: 'index.html',
        game: 'game.html',
      },
    },
  },
})
