# Deploying Klaska to a real URL (Vercel)

The app is deploy-ready: production build passes, `postinstall` runs
`prisma generate` automatically, and the database (Neon) is already cloud-hosted
— the deployed app talks to the same database you use locally.

## One-time steps (~10 minutes)

### 1. Put the code on GitHub
1. Create a GitHub account (github.com) if you don't have one.
2. Create a **new empty repository** named `klaska` (Private is fine).
3. In a terminal:
   ```bash
   cd C:\Users\david\Documents\klaska
   git remote add origin https://github.com/YOUR_USERNAME/klaska.git
   git push -u origin master
   ```
   (Sign in when Git asks.)

### 2. Import into Vercel
1. Go to **vercel.com** → sign up **with your GitHub account** (free Hobby plan).
2. Click **Add New… → Project** → import the `klaska` repository.
3. Framework is auto-detected (Next.js). Before clicking Deploy, open
   **Environment Variables** and add these three (copy values from your `.env`):
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **pooled** URL |
   | `DIRECT_URL` | your Neon **direct** URL |
   | `AUTH_SECRET` | the long random string from `.env` |
4. Click **Deploy**. ~2 minutes later you get a live URL like
   `https://klaska.vercel.app`.

### 3. Smoke-test the live URL
Open the URL → `/signup` → create a school → run the wizard → check students,
attendance, results, fees. (It's the same Neon database, so your existing
school login also works there.)

## Every update after that
```bash
git push
```
Vercel redeploys automatically on every push. That's the whole workflow.

## Notes
- `.env` is never pushed (gitignored) — that's why the values are entered in
  Vercel's dashboard instead.
- Custom domain (e.g. app.klaska.ng): Vercel → Project → Settings → Domains.
- Schema changes: run `npm run db:migrate` locally (it updates Neon), then push.
