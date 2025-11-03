#!/usr/bin/env node
// scripts/check-npm-package.js - Check what will be published to npm

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         NPM Package Contents Checker                   ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📦 Checking what will be published to npm...\n');

try {
    // Run npm pack --dry-run to see what would be included
    const output = execSync('npm pack --dry-run', { encoding: 'utf8' });
    
    console.log('Files that WILL be included in the package:\n');
    console.log(output);
    
    // Parse the output to get file list from "Tarball Contents" section
    const lines = output.split('\n');
    const contentStart = lines.findIndex(line => line.includes('Tarball Contents'));
    const contentEnd = lines.findIndex(line => line.includes('Tarball Details'));
    
    const files = [];
    if (contentStart !== -1 && contentEnd !== -1) {
        for (let i = contentStart + 1; i < contentEnd; i++) {
            const line = lines[i].trim();
            if (line && line.includes('npm notice')) {
                // Extract filename from lines like "npm notice 34.4kB lib/neoapi.js"
                const match = line.match(/npm notice\s+[\d.]+[kKmMgG]?[bB]?\s+(.+)/);
                if (match && match[1]) {
                    files.push(match[1]);
                }
            }
        }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`Total files: ${files.length}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Check for files that should NOT be included
    const shouldNotInclude = [
        'test/',
        'benchmark/',
        'plugins/',
        'examples/',
        'scripts/',
        'PRE-RELEASE-CHECKLIST.md',
        'SHIPPING-GUIDE.md',
        'MIGRATION.md',
        'QUICK-START.md',
        '.git/',
        'node_modules/',
        'package-lock.json',
        'server.js'
    ];
    
    console.log('🔍 Checking for files that should NOT be included:\n');
    
    let foundIssues = false;
    shouldNotInclude.forEach(pattern => {
        const found = files.some(file => file.includes(pattern));
        if (found) {
            console.log(`❌ Found: ${pattern} (should be excluded)`);
            foundIssues = true;
        } else {
            console.log(`✅ Excluded: ${pattern}`);
        }
    });
    
    // Check for files that SHOULD be included
    console.log('\n🔍 Checking for files that SHOULD be included:\n');
    
    const shouldInclude = [
        'lib/neoapi.js',
        'lib/plugins/jsonParser.js',
        'lib/plugins/cors.js',
        'lib/plugins/basePlugin.js',
        'package.json',
        'README.md',
        'LICENSE',
        'CHANGELOG.md'
    ];
    
    shouldInclude.forEach(file => {
        const found = files.some(f => f.includes(file));
        if (found) {
            console.log(`✅ Included: ${file}`);
        } else {
            console.log(`❌ Missing: ${file} (should be included)`);
            foundIssues = true;
        }
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    if (foundIssues) {
        console.log('\n⚠️  Some issues found. Review .npmignore file.\n');
        process.exit(1);
    } else {
        console.log('\n✅ Package contents look good!\n');
        console.log('Next steps:');
        console.log('  1. Run: npm pack');
        console.log('  2. Extract and inspect: tar -xzf neoapi-0.0.1-preview.tgz');
        console.log('  3. If satisfied: npm publish --tag preview\n');
        process.exit(0);
    }
    
} catch (error) {
    console.error('❌ Error checking package:', error.message);
    console.error('\nMake sure you have npm installed and package.json is valid.');
    process.exit(1);
}
