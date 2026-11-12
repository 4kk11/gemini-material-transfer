import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, '.', '');
    // This application currently calls Gemini directly from the browser.
    // Production bundles must never contain the developer's provider key.
    if (command === 'build' && env.GEMINI_API_KEY) {
      throw new Error('Production builds with GEMINI_API_KEY are disabled. Move Gemini calls to an authenticated server-side proxy before deploying.');
    }
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
