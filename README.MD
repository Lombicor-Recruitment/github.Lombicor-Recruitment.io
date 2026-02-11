All your fields with live validation (SA ID Luhn check, 10-digit phone format, required fields)
Conditional sections — payslip upload only shows if packhouse = Yes, forklift licence upload only shows if forklift = Yes
Drag-and-drop or click-to-upload file areas (PDF/JPG/PNG, 5 MB max) with visual feedback
A progress bar at the top that fills as the user completes fields
Clear inline error messages on every field and file input
Thank you screen with a reference number after successful submission
To go live — 3 steps:
1. Supabase setup
Create a free project at supabase.com
Go to SQL Editor and run the supabase_setup.sql file — it creates the table, sets security rules, and creates the storage bucket
Go to Project Settings → API and copy your Project URL and anon public key
2. Plug in your keys
Open index.html and replace these two lines near the top of the script:
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
3. GitHub Pages
Push index.html to a GitHub repo (it's the only file needed)
Go to repo Settings → Pages, set source to your main branch, and it'll give you a public link
