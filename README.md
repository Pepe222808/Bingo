# Backup Integration Networked Grid Operations

Online multiplayer web app built with React + Vite.

## Quick Start

```bash
npm install
npm run dev
```

For API routes locally with the same behavior as production:

```bash
npm run dev:vercel
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

## Supabase Migration

Schema is tracked in:

`supabase/migrations/20260327091810_multiplayer_schema.sql`

Push migration:

```bash
npx supabase db push
```

## Security Notes

- Never commit `.env*` files except `.env.example`.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
