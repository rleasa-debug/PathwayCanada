/**
 * Copyright 2026 Pathways Canada. All Rights Reserved.
 * This code is the proprietary property of Pathways Canada and is subject to Invention Assignment Agreements.
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        studentDashboard: resolve(__dirname, 'student-dashboard.html'),
        academicRecords: resolve(__dirname, 'academic-records.html'),
        counselorDashboard: resolve(__dirname, 'counselor-dashboard.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        privacyPolicy: resolve(__dirname, 'privacy-policy.html')
      }
    }
  }
});
