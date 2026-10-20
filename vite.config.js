import { defineConfig } from 'vite'

// Default `vite build` bundles the demo (index.html).
// `vite build --mode lib` bundles the component as a distributable ES module.
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: false,
        lib: {
          entry: 'src/rerum-history-tree.js',
          formats: ['es'],
          fileName: () => 'rerum-history-tree.js'
        }
      }
    }
  }

  return {}
})
