// Vite Performance Optimization Configuration
// Copy and adapt these configurations to your vite.config.js

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  // Build optimization
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2015',
    
    // Minimize CSS and JS
    minify: 'terser',
    
    // Terser options for better compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // Rollup options for advanced bundling
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Framework chunks
          'react-vendor': ['react', 'react-dom'],
          'vue-vendor': ['vue'],
          
          // Utility libraries
          'utils': ['lodash-es', 'date-fns'],
          
          // UI libraries
          'ui-vendor': ['@mui/material', 'antd'],
          
          // Large libraries get their own chunks
          'chart-libs': ['chart.js', 'd3'],
        },
        
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^/.]+$/, '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      
      // External dependencies (for library builds)
      external: (id) => {
        // Externalize peer dependencies in library mode
        return ['react', 'react-dom', 'vue'].includes(id);
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Generate sourcemaps for production debugging
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Report compressed sizes
    reportCompressedSize: true,
  },
  
  // Development server optimization
  server: {
    // Enable compression
    compress: true,
    
    // HTTP/2 for better performance
    http2: true,
    
    // Pre-bundling configuration
    force: false, // Only re-bundle when necessary
  },
  
  // Dependency pre-bundling optimization
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: [
      'react',
      'react-dom',
      'lodash-es',
    ],
    
    // Exclude dependencies from pre-bundling
    exclude: [
      // Large libraries that should be code-split
    ],
    
    // ESBuild options for pre-bundling
    esbuildOptions: {
      target: 'es2015',
    },
  },
  
  // CSS optimization
  css: {
    // CSS modules configuration
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[hash:base64:5]', // Shorter class names
    },
    
    // PostCSS configuration
    postcss: {
      plugins: [
        // Add autoprefixer, cssnano, etc.
      ],
    },
    
    // CSS code splitting
    codeSplit: true,
  },
  
  // Plugin configuration
  plugins: [
    // Built-in vendor chunk splitting
    splitVendorChunkPlugin(),
    
    // Bundle analyzer (conditional)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
    
    // Custom plugin for asset optimization
    {
      name: 'asset-optimization',
      generateBundle(options, bundle) {
        // Custom logic for asset optimization
        Object.keys(bundle).forEach(fileName => {
          const chunk = bundle[fileName];
          if (chunk.type === 'chunk' && chunk.code) {
            // Additional optimizations can be added here
          }
        });
      },
    },
  ].filter(Boolean),
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'src'),
    },
  },
  
  // ESBuild configuration for faster builds
  esbuild: {
    // Drop console and debugger in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  
  // Preview server configuration
  preview: {
    port: 3000,
    open: true,
  },
  
  // Environment variables optimization
  define: {
    // Replace with actual values at build time
    __DEV__: process.env.NODE_ENV === 'development',
    __VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});

/*
Performance Tips for Vite:

1. Install recommended dependencies:
   npm install --save-dev rollup-plugin-visualizer

2. Environment-specific builds:
   - Use different configs for dev/prod
   - Enable/disable source maps based on environment
   - Adjust chunk splitting for optimal loading

3. Bundle Analysis:
   npm run build -- --mode=analyze

4. Recommended package.json scripts:
   {
     "scripts": {
       "build": "vite build",
       "build:analyze": "ANALYZE=true vite build",
       "preview": "vite preview",
       "build:prod": "NODE_ENV=production vite build"
     }
   }

5. Additional optimizations:
   - Use dynamic imports for route-based code splitting
   - Implement lazy loading for components
   - Use Vite's built-in optimizations for static assets
   - Consider using Vite's legacy plugin for older browser support

6. Monitoring:
   - Use Lighthouse CI in your deployment pipeline
   - Set up bundle size monitoring
   - Monitor Core Web Vitals in production
*/