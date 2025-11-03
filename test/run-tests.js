#!/usr/bin/env node
// test/run-tests.js - Simple test runner

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running NeoAPI Test Suite...\n');

const testFile = path.join(__dirname, 'test-suite.js');
const testProcess = spawn('node', [testFile], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
});

testProcess.on('exit', (code) => {
    if (code === 0) {
        console.log('\n✨ All tests completed successfully!\n');
    } else {
        console.log('\n💥 Tests failed. Please review the output above.\n');
    }
    process.exit(code);
});

testProcess.on('error', (err) => {
    console.error('❌ Failed to run tests:', err);
    process.exit(1);
});
