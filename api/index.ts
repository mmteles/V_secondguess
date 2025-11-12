/**
 * Vercel Serverless Function Entry Point
 * This file exports the Express app for Vercel's serverless environment
 */

import { createApp } from '../src/api/server';

// Create the Express app
const app = createApp();

// Export for Vercel
export default app;
