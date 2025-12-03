import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwqkrsvbmabodvmfktvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWtyc3ZibWFib2R2bWZrdHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjQ1NDYsImV4cCI6MjA4MDE0MDU0Nn0.JnGHMS4cWo6qdUW0K6RdSOaOQnou5K4BdWsZqEQpLKU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
