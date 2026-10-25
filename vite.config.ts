import { defineConfig, loadEnv } from 'vite'
import { createCommunityMiddleware } from './server/community-api.ts'

export default defineConfig({
  plugins: [
    {
      name: 'landshift-community-api',
      configureServer(server): void {
        server.middlewares.use(
          createCommunityMiddleware(() => {
            const env = loadEnv(
              server.config.mode,
              server.config.root,
              'OPENROUTER_',
            )
            return {
              apiKey:
                process.env['OPENROUTER_API_KEY'] ||
                env['OPENROUTER_API_KEY'] ||
                '',
              model:
                process.env['OPENROUTER_MODEL'] ||
                env['OPENROUTER_MODEL'] ||
                'google/gemini-2.5-flash-lite',
            }
          }),
        )
      },
      configurePreviewServer(server): void {
        server.middlewares.use(
          createCommunityMiddleware(() => {
            const env = loadEnv(
              server.config.mode,
              server.config.root,
              'OPENROUTER_',
            )
            return {
              apiKey:
                process.env['OPENROUTER_API_KEY'] ||
                env['OPENROUTER_API_KEY'] ||
                '',
              model:
                process.env['OPENROUTER_MODEL'] ||
                env['OPENROUTER_MODEL'] ||
                'google/gemini-2.5-flash-lite',
            }
          }),
        )
      },
    },
  ],
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
