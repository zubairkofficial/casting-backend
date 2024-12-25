import cron from 'node-cron';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

// Run every day at 00:00
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily sheet refresh:', new Date().toISOString());
    
    const response = await fetch(`${API_URL}/api/v1/cron/refresh-sheets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Sheet refresh completed:', data);
  } catch (error) {
    console.error('Sheet refresh failed:', error);
  }
});

console.log('Cron job scheduled to run daily at midnight'); 