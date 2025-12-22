import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import app from "./app.js";
import { getSupabaseAdminClient } from "./pkg/db/supabaseClient.js";

const PORT = process.env.PORT || 3000;

// Retry database connection with exponential backoff
const connectWithRetry = async (maxRetries = 5, delay = 2000): Promise<void> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const supabase = getSupabaseAdminClient();
      // Test connection by making a simple request to verify Supabase is accessible
      // Using auth.getUser() as a lightweight connection test
      const { error } = await supabase.auth.getUser();
      
      // If we get an auth error (not logged in), that's fine - connection works
      // If we get a network/connection error, that's what we're checking for
      if (error && error.message && !error.message.includes('JWT')) {
        // Connection errors don't typically include JWT in the message
        // JWT errors mean the connection works but auth failed (which is expected)
        const isConnectionError = error.message.includes('fetch') || 
                                  error.message.includes('network') ||
                                  error.message.includes('ECONNREFUSED') ||
                                  error.message.includes('timeout');
        
        if (isConnectionError) {
          throw error;
        }
      }
      
      console.log('Database connection test successful');
      return;
    } catch (error: any) {
      if (i === maxRetries - 1) {
        console.error('Database connection test failed after retries:', error.message);
        console.error('Please check your database configuration in .env.local');
        throw error;
      }
      console.log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

// Start server and connect to database
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  
  await connectWithRetry();
});

