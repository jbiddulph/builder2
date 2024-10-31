// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  target: 'server', // or 'static' for static sites
  ssr: true, // ensures the app is rendered server-side
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      githubToken: process.env.GITHUB_TOKEN,
      githubUser: process.env.GITHUB_USER,
      netlifyToken: process.env.NETLIFY_TOKEN,
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY,
        redirect: false,
      }
    }
  },
  hooks: {
    'nitro:config'(nitroConfig) {
      if (!globalThis.fetch) {
        import('node-fetch').then((fetchModule) => {
          globalThis.fetch = fetchModule.default;
        });
      }
    }
  },
  monacoEditor: {
    // These are default values:
    locale: 'en',
    componentName: {
      codeEditor: 'MonacoEditor',
      diffEditor: 'MonacoDiffEditor'
    }
  },
  modules: [
    '@nuxt/icon',
    '@nuxtjs/supabase',
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-monaco-editor',
  ],
})