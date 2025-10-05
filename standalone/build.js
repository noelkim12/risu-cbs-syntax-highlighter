/**
 * Build script - Concatenates all source files into single bundle
 * Creates both regular and minified versions
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const outputFile = path.join(distDir, 'cbs-editor.js');
const minifiedFile = path.join(distDir, 'cbs-editor.min.js');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read source files in order
const files = [
  'cbs-core.js',
  'cbs-highlighter.js',
  'cbs-autocomplete.js',
  'cbs-signature.js',
  'cbs-textarea.js'
];

console.log('🔨 Building CBS Editor...');

// Read and inject CSS
const cssPath = path.join(srcDir, 'cbs-styles.css');
const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

let bundle = `/**
 * CBS Editor - Standalone JavaScript Library
 * Version: 1.0.0
 * Build Date: ${new Date().toISOString()}
 *
 * Usage:
 *   <script src="cbs-editor.js"></script>
 *   <script>
 *     const editor = new CBSTextarea(document.getElementById('my-textarea'));
 *   </script>
 */

(function() {
  'use strict';

  // Inject CSS
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = \`${cssContent.replace(/`/g, '\\`')}\`;
    document.head.appendChild(style);
  }

`;

// Concatenate all source files
for (const file of files) {
  const filePath = path.join(srcDir, file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${file} not found`);
    process.exit(1);
  }

  console.log(`  📄 Adding ${file}...`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Remove any export statements (we're bundling)
  const cleaned = content
    .replace(/export\s+(default\s+)?/g, '')
    .replace(/module\.exports\s*=.*$/gm, '');

  bundle += `\n// ========================================\n`;
  bundle += `// ${file}\n`;
  bundle += `// ========================================\n\n`;
  bundle += cleaned;
  bundle += '\n\n';
}

bundle += `
})();

// Make sure CBSTextarea is available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CBSTextarea;
}
`;

// Write regular bundle
fs.writeFileSync(outputFile, bundle, 'utf8');

// Get regular file size
const stats = fs.statSync(outputFile);
const fileSizeInKB = (stats.size / 1024).toFixed(2);

console.log(`✅ Regular build complete!`);
console.log(`   Output: ${outputFile}`);
console.log(`   Size: ${fileSizeInKB} KB`);
console.log('');

// Create minified version
console.log('🔨 Creating minified version...');

minify(bundle, {
  compress: {
    dead_code: true,
    drop_console: false,
    drop_debugger: true,
    keep_classnames: true,
    keep_fnames: false,
    passes: 2
  },
  mangle: {
    keep_classnames: true,
    reserved: ['CBSTextarea', 'CBSHighlighter', 'CBSAutocomplete', 'CBSSignature', 'CBSDatabase', 'CBSParser']
  },
  format: {
    comments: false,
    preamble: `/* CBS Editor v1.0.0 - Minified */`
  }
}).then(result => {
  fs.writeFileSync(minifiedFile, result.code, 'utf8');

  // Get minified file size
  const minStats = fs.statSync(minifiedFile);
  const minFileSizeInKB = (minStats.size / 1024).toFixed(2);
  const reduction = (((stats.size - minStats.size) / stats.size) * 100).toFixed(1);

  console.log(`✅ Minified build complete!`);
  console.log(`   Output: ${minifiedFile}`);
  console.log(`   Size: ${minFileSizeInKB} KB (${reduction}% smaller)`);
  console.log('');
  console.log('📦 Usage:');
  console.log('   Regular: <script src="dist/cbs-editor.js"></script>');
  console.log('   Minified: <script src="dist/cbs-editor.min.js"></script>');
}).catch(err => {
  console.error('❌ Minification failed:', err);
  process.exit(1);
});
