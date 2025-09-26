// Simple script to run ESLint
import { ESLint } from 'eslint';
import path from 'path';

async function main() {
  console.log('Starting ESLint check on ./src directory...');
  try {
    // Create an instance of ESLint with the config file in the current directory
    const eslint = new ESLint();
    
    // Lint the files
    console.log('Linting files...');
    const results = await eslint.lintFiles(['./src/**/*.{js,jsx,ts,tsx}']);
    
    // Count issues
    const errorCount = results.reduce((sum, result) => sum + result.errorCount, 0);
    const warningCount = results.reduce((sum, result) => sum + result.warningCount, 0);
    
    // Format the results if there are issues
    if (errorCount > 0 || warningCount > 0) {
      const formatter = await eslint.loadFormatter('stylish');
      const resultText = formatter.format(results);
      console.log(resultText);
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✓ No ESLint errors or warnings found!');
    }
    
    // Summary
    console.log(`\nLinting complete: ${results.length} files checked`);
    if (errorCount > 0 || warningCount > 0) {
      console.log(`Found ${errorCount} errors and ${warningCount} warnings`);
    }
    
    // Exit with appropriate code
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error running ESLint:', error);
    process.exit(1);
  }
}

main(); 