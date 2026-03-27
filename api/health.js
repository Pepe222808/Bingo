import process from 'node:process'

export default async function handler(_request, response) {
  response.status(200).json({
    ok: true,
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseAnon: Boolean(process.env.SUPABASE_ANON_KEY),
    hasSupabaseServiceRole: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    ),
  })
}
