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

Use the language selector to switch between Kinyarwanda, English, Kiswahili, and French. In **Manage content**, choose a content language and enter each lesson, question, exam, or resource in that language. Switch the content-language selector and edit the same item to add translations later; students see the available text when their selected language is not yet translated. Students can search topics, notes, and practice questions, bookmark lessons and questions, and request private teacher support. The administrator's **Manage content → Teacher requests** tab includes the student's email/phone and lets you update request status.

### Creating exercises and timed exams

- Under **Manage content → Practice**, create an exercise for instant feedback or attach a question to an exam. Add the question and four choices in the selected content language, select its correct choice, and provide an explanation. Add other language versions later by editing the item after switching the content language.
- Under **Manage content → Exams**, create a draft with its subject and time limit. Add questions one at a time with **Add question**, or download the CSV template and import up to 100 questions. CSV columns are `question_type,prompt,option_a,option_b,option_c,option_d,answer,model_answer,explanation`. Set `question_type` to `multiple_choice` or `open`; multiple-choice rows need four options and an `answer` letter (A–D), while open rows need a `model_answer`. All rows need a prompt and explanation. Choose the topic that applies to all imported questions, and enter content in the selected content language. Publish only when the questions and answer key are ready.
- Students take published exams online. They see correct answers and explanations after submission. Open responses show the model answer immediately and are marked correct/incorrect by an administrator under **Manage content → Open answers to grade**; the score is provisional until those answers are graded. Students can revisit their updated review from **My progress → Review your answers**.
- Under **Manage content → Exams**, use **Upload exam paper** to jump to the resource uploader with the exam-paper category selected. Upload downloadable PDF or Office papers (up to 50 MB); students can download them from Study resources. These files are separate from interactive exercises and timed exams.
- Under **Manage content → Study resources**, upload downloadable notes, past papers, exercise sheets, or other resources.

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

After running `backend/resources.sql`, sign in with the administrator account and open **Manage content → Study resources**. Add a title in the selected content language, choose a category and optional subject, then upload a PDF, Office document, image, or text file (up to 50 MB). Switch the content language and edit the resource to add a translated title or description later. Students can browse and download published resources from **Study resources**. Files stay in a private Storage bucket; the API issues short-lived download links only to signed-in students.

Vercel and Supabase offer free tiers subject to their current limits and terms. Review usage and pricing on both platforms before production use.

Never expose or commit `SUPABASE_SERVICE_ROLE_KEY`. If it is ever exposed, rotate it in Supabase immediately.
