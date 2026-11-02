# Amasomo Meza

A mobile-friendly multilingual learning website built with React, Vite, Tailwind CSS, Express, Node.js, and Supabase. The interface and starter lessons support Kinyarwanda, English, Kiswahili, and French.

## Features

- Supabase email/password signup, login, email confirmation, and password reset
- Subjects, topics, translated text lessons, image links, and video links
- Practice questions with immediate grading and explanations
- Timed exams, server-side grading, scores, and answer-by-answer review
- Search across topics, lessons, and practice questions; retry missed answers and shuffle exam questions and choices
- Personal bookmarks, student-to-teacher support requests, and an administrator request inbox
- Saved lesson completions, past results, subject progress, and weak-topic insights
- Admin-only lesson and question create, edit, and delete tools
- A multilingual resource library for notes, past papers, exercises, and exams, with private storage and student downloads
- Responsive, low-data layouts for phones, tablets, and desktop; lesson images load lazily and use system fonts
- Developer contact details displayed before sign-in and throughout the learning space

## Requirements

- Node.js 20.19+ and npm
- A free Supabase project

## Set up Supabase

1. Create a Supabase project and open **SQL Editor**.
2. Run `backend/schema.sql`, followed by `backend/seed.sql`. This creates the tables and translated starter lessons, practice questions, and exam.
3. Run `backend/resources.sql`. This creates the resource metadata table and private Supabase Storage bucket. It supports PDF, Office, image, and text files up to 50 MB.
4. Run `backend/study-tools.sql`. This adds private teacher requests, per-student bookmarks and missed-answer tracking, and migrates existing exam mistakes into retry practice.
5. In **Authentication → URL Configuration**, add `http://localhost:5173` to the allowed redirect URLs. Add your production website URL when deploying.
6. In **Project Settings → API**, copy the project URL, the publishable/anon key, and the `service_role` secret. The service-role secret is backend-only and must never be added to a `VITE_` variable or committed to source control.

Tables have row-level security enabled. The browser only uses Supabase Auth; the Express API verifies each Supabase access token and accesses content with the server-only service role. Answer keys are not returned to students before exercise checks or exam submission. Admin access is determined on the server by an exact match to `ADMIN_EMAIL`.

## Run locally (Windows PowerShell)

From this folder:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set these values in `.env` before signing in:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_API_URL=http://localhost:3001

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
ADMIN_EMAIL=you@example.com
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

Open <http://localhost:5173>. Create your account using the email in `ADMIN_EMAIL` to get the content-management page; other accounts are students. If Supabase email confirmation is enabled, confirm the signup email before signing in.

Use the language selector to switch between Kinyarwanda, English, Kiswahili, and French. The admin editor requires the title, summary/notes, question, answers, and explanation to be entered in all four languages. Students can search the translated topics, notes, and practice questions, bookmark lessons and questions, and request private teacher support. The administrator's **Manage content → Teacher requests** tab includes the student's email/phone and lets you update request status.

To brand signup confirmation emails, edit the confirmation subject and body under **Authentication → Email Templates → Confirm signup** in Supabase; the body can say “Amasomo Meza” and should retain Supabase's `{{ .ConfirmationURL }}` link. The default Supabase sender identity cannot be renamed by application code. A custom From name/address requires configuring a custom SMTP provider in Supabase **Authentication → SMTP Settings** and verifying the sending domain.

## Production

The project is configured for a single Vercel deployment: Vite builds static files into `public`, and Vercel serves them alongside an Express catch-all serverless function for `/api` routes. The frontend calls `/api` on the same origin.

1. Create a Vercel project from this folder, or run `npx vercel login` and `npx vercel` from PowerShell. The production site is `https://amasomo.vercel.app`.
2. In Vercel project **Settings → Environment Variables**, set the following for **Production** (and Preview if you want preview deployments):
   - `VITE_SUPABASE_URL`: your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: your Supabase publishable/anon key
   - `SUPABASE_URL`: your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role secret (backend only)
   - `ADMIN_EMAIL`: the exact email address you will use for your administrator account
3. Deploy the project. Set `VITE_API_URL` to an empty value or leave it unset so the app uses its same-origin API.
4. In Supabase **Authentication → URL Configuration**, set the **Site URL** to `https://amasomo.vercel.app` and add it as an allowed redirect URL. Add `http://localhost:5173` too if you also use the local app.
5. Add the deployed origin as `FRONTEND_ORIGIN` in Vercel if you later make cross-origin API requests. Redeploy after changing frontend environment variables.
6. Open the production site, sign up with the exact `ADMIN_EMAIL`, confirm the email if requested, and sign in. The Manage content page appears only for that email.

## Uploading and downloading resources

After running `backend/resources.sql`, sign in with the administrator account and open **Manage content → Study resources**. Add a translated title, choose a category and optional subject, then upload a PDF, Office document, image, or text file (up to 50 MB). Students can browse and download published resources from **Study resources**. Files stay in a private Storage bucket; the API issues short-lived download links only to signed-in students.

Vercel and Supabase offer free tiers subject to their current limits and terms. Review usage and pricing on both platforms before production use.

Never expose or commit `SUPABASE_SERVICE_ROLE_KEY`. If it is ever exposed, rotate it in Supabase immediately.
