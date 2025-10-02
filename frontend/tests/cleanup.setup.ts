import { test as cleanup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

cleanup('cleanup test artifacts', async () => {
  console.log('🧹 Cleaning up test artifacts...');
  
  // Keep authentication files but clean up other temporary data
  const cleanupPaths = [
    path.join(__dirname, '../test-results/screenshots'),
    path.join(__dirname, '../test-results/videos'),
    path.join(__dirname, '../test-results/traces')
  ];

  for (const cleanupPath of cleanupPaths) {
    if (fs.existsSync(cleanupPath)) {
      const files = fs.readdirSync(cleanupPath);
      const oldFiles = files.filter(file => {
        const filePath = path.join(cleanupPath, file);
        const stats = fs.statSync(filePath);
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        return ageInHours > 24; // Remove files older than 24 hours
      });

      for (const oldFile of oldFiles) {
        fs.unlinkSync(path.join(cleanupPath, oldFile));
      }

      if (oldFiles.length > 0) {
        console.log(`🗑️  Removed ${oldFiles.length} old files from ${cleanupPath}`);
      }
    }
  }

  console.log('✅ Cleanup completed');
});