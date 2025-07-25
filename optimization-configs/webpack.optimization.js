// Webpack Performance Optimization Configuration
// Copy and adapt these configurations to your webpack.config.js

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // Optimization configuration for production builds
  optimization: {
    // Enable minimization
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.logs in production
            drop_debugger: true,
          },
          mangle: true,
        },
        parallel: true,
      }),
    ],

    // Code splitting configuration
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000, // 244KB chunks
      cacheGroups: {
        // Vendor chunk for node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Common chunk for shared code
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
        },
        // Large libraries get their own chunks
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
        },
        lodash: {
          test: /[\\/]node_modules[\\/]lodash[\\/]/,
          name: 'lodash',
          chunks: 'all',
          priority: 20,
        },
      },
    },

    // Runtime chunk configuration
    runtimeChunk: {
      name: 'runtime',
    },

    // Module concatenation (scope hoisting)
    concatenateModules: true,

    // Side effects configuration
    sideEffects: false,
  },

  // Resolve configuration for better tree shaking
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Add aliases for commonly used paths
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // Prefer ES modules for better tree shaking
    mainFields: ['module', 'main'],
  },

  // Module rules for optimization
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  modules: false, // Preserve ES modules for tree shaking
                  useBuiltIns: 'usage',
                  corejs: 3,
                },
              ],
              '@babel/preset-react',
            ],
            plugins: [
              // Remove unused imports
              'babel-plugin-transform-remove-unused-imports',
              // Import only what's needed from lodash
              'babel-plugin-lodash',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[hash:base64:5]', // Shorter class names
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8KB - inline small images
          },
        },
        generator: {
          filename: 'images/[name].[contenthash:8][ext]',
        },
      },
    ],
  },

  // Plugins for optimization
  plugins: [
    // Gzip compression
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    
    // Bundle analyzer (remove in production)
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),

  // Performance configuration
  performance: {
    maxAssetSize: 244000, // 244KB
    maxEntrypointSize: 244000,
    hints: 'warning',
  },

  // Cache configuration for faster rebuilds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },

  // Development server optimization
  devServer: {
    compress: true,
    historyApiFallback: true,
    hot: true,
  },
};

/*
Usage Instructions:

1. Install required dependencies:
   npm install --save-dev terser-webpack-plugin compression-webpack-plugin webpack-bundle-analyzer
   npm install --save-dev babel-plugin-transform-remove-unused-imports babel-plugin-lodash

2. Add to your package.json scripts:
   "build": "webpack --mode=production",
   "build:analyze": "ANALYZE=true webpack --mode=production",

3. For environment-specific configurations:
   - Copy relevant sections to your webpack.config.js
   - Adjust paths and settings based on your project structure
   - Test bundle sizes before and after implementation

4. Monitor performance:
   - Use webpack-bundle-analyzer to visualize bundle composition
   - Set up performance budgets in CI/CD
   - Monitor bundle sizes over time
*/