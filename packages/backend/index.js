// This is the shared backend package.
// You can initialize your Supabase client here and export it to be used in both apps/web and apps/mobile.

import { createClient } from '@supabase/supabase-js';

// Replace with your actual project URL and anon key from .env
// const supabaseUrl = process.env.VITE_SUPABASE_URL;
// const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// export const supabase = createClient(supabaseUrl, supabaseKey);

export function helloFromBackend() {
  console.log("Hello from the shared backend!");
}
