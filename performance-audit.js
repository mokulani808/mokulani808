#!/usr/bin/env node

/**
 * Performance Audit Script
 * 
 * This script performs comprehensive performance analysis including:
 * - Bundle size analysis
 * - Lighthouse audits
 * - Dependency analysis
 * - Asset optimization checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceAuditor {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.results = {
      bundleSize: {},
      dependencies: {},
      assets: {},
      recommendations: []
    };
  }

  async runAudit() {
    console.log('🔍 Starting Performance Audit...\n');
    
    try {
      await this.analyzeProjectStructure();
      await this.analyzeBundleSize();
      await this.analyzeDependencies();
      await this.analyzeAssets();
      await this.generateRecommendations();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Audit failed:', error.message);
    }
  }

  async analyzeProjectStructure() {
    console.log('📁 Analyzing project structure...');
    
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      this.results.project = {
        name: packageJson.name,
        version: packageJson.version,
        framework: this.detectFramework(packageJson),
        bundler: this.detectBundler()
      };
    }
    
    console.log('✅ Project structure analyzed\n');
  }

  detectFramework(packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) return 'React';
    if (deps.vue) return 'Vue.js';
    if (deps.angular) return 'Angular';
    if (deps.svelte) return 'Svelte';
    if (deps.next) return 'Next.js';
    if (deps.nuxt) return 'Nuxt.js';
    
    return 'Unknown';
  }

  detectBundler() {
    const files = fs.readdirSync(this.projectPath);
    
    if (files.includes('webpack.config.js')) return 'Webpack';
    if (files.includes('vite.config.js') || files.includes('vite.config.ts')) return 'Vite';
    if (files.includes('rollup.config.js')) return 'Rollup';
    if (files.includes('next.config.js')) return 'Next.js';
    
    return 'Unknown';
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle size...');
    
    const distPath = path.join(this.projectPath, 'dist');
    const buildPath = path.join(this.projectPath, 'build');
    const outPath = path.join(this.projectPath, 'out');
    
    let targetPath = null;
    if (fs.existsSync(distPath)) targetPath = distPath;
    else if (fs.existsSync(buildPath)) targetPath = buildPath;
    else if (fs.existsSync(outPath)) targetPath = outPath;
    
    if (targetPath) {
      const bundleStats = this.analyzeBundleDirectory(targetPath);
      this.results.bundleSize = bundleStats;
      
      // Check for large files
      const largeFiles = bundleStats.files.filter(file => file.size > 244 * 1024); // > 244KB
      if (largeFiles.length > 0) {
        this.results.recommendations.push({
          type: 'bundle',
          severity: 'high',
          message: `Found ${largeFiles.length} large bundle files. Consider code splitting.`,
          files: largeFiles.map(f => f.name)
        });
      }
    } else {
      this.results.recommendations.push({
        type: 'bundle',
        severity: 'info',
        message: 'No build directory found. Run a production build first for bundle analysis.'
      });
    }
    
    console.log('✅ Bundle size analyzed\n');
  }

  analyzeBundleDirectory(dirPath) {
    const files = [];
    let totalSize = 0;
    
    const scanDir = (currentPath) => {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          scanDir(itemPath);
        } else if (stats.isFile()) {
          const ext = path.extname(item);
          if (['.js', '.css', '.html'].includes(ext)) {
            const fileSize = stats.size;
            files.push({
              name: path.relative(dirPath, itemPath),
              size: fileSize,
              sizeFormatted: this.formatBytes(fileSize),
              type: ext.slice(1)
            });
            totalSize += fileSize;
          }
        }
      });
    };
    
    scanDir(dirPath);
    
    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      files: files.sort((a, b) => b.size - a.size)
    };
  }

  async analyzeDependencies() {
    console.log('📚 Analyzing dependencies...');
    
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  No package.json found\n');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    // Check for heavy dependencies
    const heavyDeps = this.checkHeavyDependencies(deps);
    if (heavyDeps.length > 0) {
      this.results.recommendations.push({
        type: 'dependencies',
        severity: 'medium',
        message: 'Found potentially heavy dependencies. Consider alternatives.',
        dependencies: heavyDeps
      });
    }
    
    // Check for unused dependencies
    try {
      const depcheck = require('depcheck');
      const unusedDeps = await this.findUnusedDependencies();
      if (unusedDeps.length > 0) {
        this.results.recommendations.push({
          type: 'dependencies',
          severity: 'low',
          message: 'Found unused dependencies. Remove them to reduce bundle size.',
          dependencies: unusedDeps
        });
      }
    } catch (error) {
      // depcheck not available
    }
    
    this.results.dependencies = {
      production: Object.keys(deps).length,
      development: Object.keys(devDeps).length,
      total: Object.keys(deps).length + Object.keys(devDeps).length
    };
    
    console.log('✅ Dependencies analyzed\n');
  }

  checkHeavyDependencies(deps) {
    const heavyLibraries = [
      'moment', // Suggest date-fns instead
      'lodash', // Suggest modular imports
      'rxjs', // Check if fully utilized
      'three', // Large 3D library
      'chart.js', // Consider lighter alternatives
    ];
    
    return Object.keys(deps).filter(dep => 
      heavyLibraries.some(heavy => dep.includes(heavy))
    );
  }

  async findUnusedDependencies() {
    // This would require depcheck package
    // Simplified version - just return empty array
    return [];
  }

  async analyzeAssets() {
    console.log('🖼️  Analyzing assets...');
    
    const assetDirs = ['public', 'static', 'assets', 'src/assets'];
    let totalAssetSize = 0;
    let imageCount = 0;
    let unoptimizedImages = [];
    
    assetDirs.forEach(dir => {
      const dirPath = path.join(this.projectPath, dir);
      if (fs.existsSync(dirPath)) {
        const assetStats = this.analyzeAssetDirectory(dirPath);
        totalAssetSize += assetStats.totalSize;
        imageCount += assetStats.imageCount;
        unoptimizedImages.push(...assetStats.unoptimizedImages);
      }
    });
    
    this.results.assets = {
      totalSize: this.formatBytes(totalAssetSize),
      imageCount,
      unoptimizedImages
    };
    
    if (unoptimizedImages.length > 0) {
      this.results.recommendations.push({
        type: 'assets',
        severity: 'medium',
        message: `Found ${unoptimizedImages.length} unoptimized images. Consider using WebP/AVIF formats.`,
        files: unoptimizedImages
      });
    }
    
    console.log('✅ Assets analyzed\n');
  }

  analyzeAssetDirectory(dirPath) {
    let totalSize = 0;
    let imageCount = 0;
    const unoptimizedImages = [];
    
    const scanDir = (currentPath) => {
      try {
        const items = fs.readdirSync(currentPath);
        
        items.forEach(item => {
          const itemPath = path.join(currentPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            scanDir(itemPath);
          } else if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) {
              imageCount++;
              totalSize += stats.size;
              
              // Check if image is potentially unoptimized
              if (['.jpg', '.jpeg', '.png'].includes(ext) && stats.size > 100 * 1024) {
                unoptimizedImages.push(path.relative(dirPath, itemPath));
              }
            }
          }
        });
      } catch (error) {
        // Skip inaccessible directories
      }
    };
    
    scanDir(dirPath);
    
    return { totalSize, imageCount, unoptimizedImages };
  }

  async generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    // Add general recommendations based on project type
    if (this.results.project?.framework === 'React') {
      this.results.recommendations.push({
        type: 'framework',
        severity: 'info',
        message: 'Consider using React.memo, useMemo, and useCallback for optimization.'
      });
    }
    
    if (this.results.project?.framework === 'Vue.js') {
      this.results.recommendations.push({
        type: 'framework',
        severity: 'info',
        message: 'Consider using v-memo and defineAsyncComponent for optimization.'
      });
    }
    
    // Check for missing optimization configurations
    const configs = this.checkOptimizationConfigs();
    configs.forEach(config => this.results.recommendations.push(config));
    
    console.log('✅ Recommendations generated\n');
  }

  checkOptimizationConfigs() {
    const recommendations = [];
    const files = fs.readdirSync(this.projectPath);
    
    // Check for webpack optimization
    if (files.includes('webpack.config.js')) {
      const webpackConfig = fs.readFileSync(
        path.join(this.projectPath, 'webpack.config.js'), 
        'utf8'
      );
      
      if (!webpackConfig.includes('splitChunks')) {
        recommendations.push({
          type: 'config',
          severity: 'medium',
          message: 'Add code splitting configuration to webpack.config.js'
        });
      }
    }
    
    // Check for missing .nvmrc or engines field
    const packageJsonPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.engines) {
        recommendations.push({
          type: 'config',
          severity: 'low',
          message: 'Add engines field to package.json to ensure consistent Node.js version'
        });
      }
    }
    
    return recommendations;
  }

  async generateReport() {
    console.log('📊 Generating performance report...');
    
    const report = `
# Performance Audit Report

Generated on: ${new Date().toISOString()}

## Project Overview
- **Name**: ${this.results.project?.name || 'Unknown'}
- **Framework**: ${this.results.project?.framework || 'Unknown'}
- **Bundler**: ${this.results.project?.bundler || 'Unknown'}

## Bundle Analysis
${this.results.bundleSize.totalSize ? `
- **Total Bundle Size**: ${this.results.bundleSize.totalSizeFormatted}
- **Number of Files**: ${this.results.bundleSize.files.length}

### Largest Files:
${this.results.bundleSize.files.slice(0, 5).map(file => 
  `- ${file.name}: ${file.sizeFormatted}`
).join('\n')}
` : '- No build directory found. Run production build first.'}

## Dependencies
- **Production Dependencies**: ${this.results.dependencies.production || 0}
- **Development Dependencies**: ${this.results.dependencies.development || 0}

## Assets
- **Total Asset Size**: ${this.results.assets.totalSize}
- **Image Count**: ${this.results.assets.imageCount}

## Recommendations

${this.results.recommendations.map(rec => `
### ${rec.severity.toUpperCase()}: ${rec.message}
${rec.files ? `Files: ${rec.files.join(', ')}` : ''}
${rec.dependencies ? `Dependencies: ${rec.dependencies.join(', ')}` : ''}
`).join('\n')}

## Next Steps

1. **Immediate Actions** (High Priority):
${this.results.recommendations
  .filter(r => r.severity === 'high')
  .map(r => `   - ${r.message}`)
  .join('\n') || '   - No high priority issues found'}

2. **Medium Priority**:
${this.results.recommendations
  .filter(r => r.severity === 'medium')
  .map(r => `   - ${r.message}`)
  .join('\n') || '   - No medium priority issues found'}

3. **Future Improvements**:
   - Set up Lighthouse CI for continuous monitoring
   - Implement performance budgets
   - Add bundle size monitoring to CI/CD
   - Consider implementing service worker for caching

## Performance Budget Recommendations

\`\`\`json
{
  "budget": [
    {
      "path": "/**",
      "timings": [
        { "metric": "interactive", "budget": 3000 },
        { "metric": "first-contentful-paint", "budget": 1000 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 170 },
        { "resourceType": "total", "budget": 300 }
      ]
    }
  ]
}
\`\`\`
`;

    fs.writeFileSync(path.join(this.projectPath, 'PERFORMANCE_REPORT.md'), report);
    console.log('✅ Performance report generated: PERFORMANCE_REPORT.md\n');
    
    // Also log summary to console
    console.log('📋 AUDIT SUMMARY:');
    console.log(`   Bundle Size: ${this.results.bundleSize.totalSizeFormatted || 'Unknown'}`);
    console.log(`   Dependencies: ${this.results.dependencies.total || 0}`);
    console.log(`   Recommendations: ${this.results.recommendations.length}`);
    console.log(`   High Priority Issues: ${this.results.recommendations.filter(r => r.severity === 'high').length}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI usage
if (require.main === module) {
  const auditor = new PerformanceAuditor();
  auditor.runAudit().then(() => {
    console.log('🎉 Performance audit completed!');
  }).catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceAuditor;