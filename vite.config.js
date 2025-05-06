export default {
    server: {
      proxy: {
        '/api': 'http://localhost:3000'
      }
    },
    build: {
      outDir: 'public',          // pour que vite build dépose le HTML/JS/CSS dans public/
      emptyOutDir: true
    }
  };
  