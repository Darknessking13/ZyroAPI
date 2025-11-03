#!/usr/bin/env node
// scripts/validate-release.js - Pre-release validation script

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     NeoAPI v0.0.1-preview Release Validator           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;
const issues = [];

function check(condition, message, fix = null) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
        return true;
    } else {
        console.log(`❌ ${message}`);
        if (fix) console.log(`   💡 Fix: ${fix}`);
        failed++;
        issues.push(message);
        return false;
    }
}

function fileExists(filePath) {
    return fs.existsSync(path.join(__dirname, '..', filePath));
}

function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8'));
    } catch (e) {
        return null;
    }
}

console.log('📦 Checking Package Configuration...\n');

const pkg = readJSON('package.json');
check(pkg !== null, 'package.json exists and is valid JSON');
check(pkg && pkg.version === '0.0.1-preview', 'Version is 0.0.1-preview', 'Update version in package.json');
check(pkg && pkg.name === 'neoapi', 'Package name is correct');
check(pkg && pkg.description, 'Description exists');
check(pkg && pkg.main === './lib/neoapi.js', 'Main entry point is correct');
check(pkg && pkg.license, 'License is specified');
check(pkg && pkg.engines && pkg.engines.node, 'Node.js version requirement specified');

console.log('\n📄 Checking Documentation...\n');

check(fileExists('README.md'), 'README.md exists');
check(fileExists('CHANGELOG.md'), 'CHANGELOG.md exists');
check(fileExists('LICENSE'), 'LICENSE file exists', 'Add a LICENSE file (e.g., MIT)');
check(fileExists('docs/getting-started.md'), 'Getting started guide exists');
check(fileExists('docs/optimizations.md'), 'Optimizations documentation exists');

console.log('\n🏗️  Checking Core Files...\n');

check(fileExists('lib/neoapi.js'), 'Core library exists');
check(fileExists('lib/plugins/jsonParser.js'), 'JSON Parser plugin exists');
check(fileExists('lib/plugins/cors.js'), 'CORS plugin exists');
check(fileExists('lib/plugins/basePlugin.js'), 'Base plugin exists');

console.log('\n🧪 Checking Tests...\n');

check(fileExists('test/test-suite.js'), 'Test suite exists');
check(pkg && pkg.scripts && pkg.scripts.test, 'Test script configured');

console.log('\n📊 Checking Benchmarks...\n');

check(fileExists('benchmark/simple-route.js'), 'Benchmark script exists');
check(pkg && pkg.scripts && pkg.scripts.benchmark, 'Benchmark script configured');

console.log('\n🔍 Checking Dependencies...\n');

const requiredDeps = ['find-my-way', 'mime-types', 'log-symbols', 'accepts', 'type-is'];
requiredDeps.forEach(dep => {
    check(pkg && pkg.dependencies && pkg.dependencies[dep], `Dependency '${dep}' is listed`);
});

console.log('\n🔒 Checking Security...\n');

try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    const vulnerabilities = audit.metadata?.vulnerabilities || {};
    const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
    check(total === 0, `No security vulnerabilities found`, 'Run: npm audit fix');
} catch (e) {
    console.log('⚠️  Could not run npm audit (may need npm install first)');
}

console.log('\n📝 Checking Code Quality...\n');

// Check for common issues in main file
const mainFile = fs.readFileSync(path.join(__dirname, '..', 'lib/neoapi.js'), 'utf8');
// Allow console.log in logging system, but not debug statements
const hasDebugConsoleLog = mainFile.split('\n').some(line => 
    line.includes('console.log(') && 
    !line.includes('else console.log(formattedMessage') &&
    !line.includes('// console.log')
);
check(!hasDebugConsoleLog, 'No debug console.log in production code', 'Remove debug console.log statements');
check(!mainFile.includes('TODO'), 'No TODO comments in main file', 'Address or document TODOs');

console.log('\n🎯 Checking Examples...\n');

check(fileExists('example/server.js'), 'Example server exists');

console.log('\n═══════════════════════════════════════════════════════');
console.log('                    VALIDATION SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${passed + failed}`);
console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`);

if (failed === 0) {
    console.log('🎉 All validation checks passed!\n');
    console.log('Next steps:');
    console.log('  1. Run tests: npm test');
    console.log('  2. Run benchmarks: npm run benchmark');
    console.log('  3. Review PRE-RELEASE-CHECKLIST.md');
    console.log('  4. Commit and tag: git tag v0.0.2-preview');
    console.log('  5. Publish: npm publish --tag preview\n');
} else {
    console.log('⚠️  Some validation checks failed:\n');
    issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
    });
    console.log('\nPlease fix these issues before releasing.\n');
}

console.log('═══════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
