/**
 * Deploy Script - ZIP and upload built site to PHP shared host
 *
 * This script:
 * 1. ZIPs the 11ty build output (_site directory)
 * 2. POSTs the ZIP to the creator's deployer.php endpoint
 * 3. Reports success/failure
 *
 * Environment variables (set in GitHub Actions workflow):
 * - DEPLOY_URL: URL to deployer.php (e.g., https://mycomic.com/deployer.php)
 * - DEPLOY_SECRET: Secret key matching what's in deployer.php
 * - BUILD_DIR: Build output directory (default: _site)
 */

import fs from 'fs';
import archiver from 'archiver';
import FormData from 'form-data';

// Configuration from environment
const config = {
  deployUrl: process.env.DEPLOY_URL,
  deploySecret: process.env.DEPLOY_SECRET,
  buildDir: process.env.BUILD_DIR || '_site',
  zipPath: './site-bundle.zip',
};

// Validate required config
if (!config.deployUrl) {
  console.error('Error: DEPLOY_URL environment variable is required');
  process.exit(1);
}

if (!config.deploySecret) {
  console.error('Error: DEPLOY_SECRET environment variable is required');
  process.exit(1);
}

/**
 * Create a ZIP archive of the build directory
 */
async function createZipBundle() {
  console.log(`Creating ZIP bundle from ${config.buildDir}/...`);

  // Verify build directory exists
  if (!fs.existsSync(config.buildDir)) {
    throw new Error(`Build directory not found: ${config.buildDir}`);
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(config.zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`ZIP created: ${sizeMB} MB`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Add the build directory contents (not the directory itself)
    archive.directory(config.buildDir, false);

    archive.finalize();
  });
}

/**
 * Upload the ZIP bundle to the deployer endpoint
 */
async function uploadBundle() {
  console.log(`Uploading to ${config.deployUrl}...`);

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('secret', config.deploySecret);
    form.append('bundle', fs.createReadStream(config.zipPath), {
      filename: 'site-bundle.zip',
      contentType: 'application/zip',
    });

    form.submit(config.deployUrl, (err, res) => {
      if (err) {
        reject(new Error(`Upload failed: ${err.message}`));
        return;
      }

      let responseText = '';
      res.on('data', (chunk) => {
        responseText += chunk.toString();
      });

      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Deploy failed (${res.statusCode}): ${responseText}`));
        } else {
          console.log(`Server response: ${responseText}`);
          resolve(responseText);
        }
      });

      res.on('error', (err) => {
        reject(new Error(`Response error: ${err.message}`));
      });
    });
  });
}

/**
 * Clean up temporary files
 */
function cleanup() {
  if (fs.existsSync(config.zipPath)) {
    fs.unlinkSync(config.zipPath);
    console.log('Cleaned up temporary ZIP file');
  }
}

/**
 * Main deploy function
 */
async function deploy() {
  console.log('Starting deployment...');
  console.log(`  Build dir: ${config.buildDir}`);
  console.log(`  Target: ${config.deployUrl}`);

  try {
    await createZipBundle();
    await uploadBundle();
    console.log('Deployment successful!');
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Run
deploy();
