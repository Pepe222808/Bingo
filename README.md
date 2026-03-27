# Backup Integration Networked Grid Operations

Online multiplayer web app built with React + Vite.

## Quick Start

```bash
npm install
npm run dev
```

## CLI Setup

Install locally in this project directory:

```bash
npm install supabase vercel --save-dev
```

Login is required only to your own accounts:

```bash
npx supabase login
npx vercel login
```

## Environment Variables

1. Copy `.env.example` to `.env.local`.
2. Fill values from Supabase Project Settings -> API.
3. In Vercel, set the same values for `Preview` and `Production`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

After adding/changing env vars in Vercel, redeploy the project.

## Security Notes

- Never commit `.env*` files except `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
