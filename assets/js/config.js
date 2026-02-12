// Supabase Configuration
// ======================
// This file is loaded by both user and admin pages.
// It exposes the Supabase client as a global variable `db` and constants.

const SUPABASE_URL    = 'https://thozwctjtuzjhneupqvr.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRob3p3Y3RqdHV6amhuZXVwcXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDI3NTYsImV4cCI6MjA4NjM3ODc1Nn0.5cZcLZdtNodPwhPUxh1iwWaD0GQerAETQokautcf7WE';
const STORAGE_BUCKET  = 'applications';
const DB_TABLE        = 'applications';

// Initialize Supabase Client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
