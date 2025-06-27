#!/usr/bin/env node

/**
 * Post-build script for genie-textarea package
 * Copies the IIFE bundle to the genie-playground public folder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const packageRoot = path.dirname(__dirname);
const sourceFile = path.join(packageRoot, 'dist', 'genie-textarea.iife.js');
const playgroundPublicDir = path.join(packageRoot, '..', '..', 'apps', 'genie-playground', 'public');
const destinationFile = path.join(playgroundPublicDir, 'genie-textarea.iife.js');

console.log('🚀 Running post-build script...');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ Source file not found:', sourceFile);
    process.exit(1);
  }

  // Ensure destination directory exists
  if (!fs.existsSync(playgroundPublicDir)) {
    console.log('📁 Creating playground public directory...');
    fs.mkdirSync(playgroundPublicDir, { recursive: true });
  }

  // Copy the file
  fs.copyFileSync(sourceFile, destinationFile);
  
  // Get file stats for confirmation
  const stats = fs.statSync(destinationFile);
  const fileSizeKB = (stats.size / 1024).toFixed(2);
  
  console.log('✅ Successfully copied IIFE bundle:');
  console.log(`   From: ${path.relative(process.cwd(), sourceFile)}`);
  console.log(`   To:   ${path.relative(process.cwd(), destinationFile)}`);
  console.log(`   Size: ${fileSizeKB} KB`);
  
} catch (error) {
  console.error('❌ Failed to copy IIFE bundle:', error.message);
  process.exit(1);
}
