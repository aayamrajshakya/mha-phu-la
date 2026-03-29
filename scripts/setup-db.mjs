import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

if (!process.env.SUPABASE_DB_URL) {
  console.error('Error: SUPABASE_DB_URL is not set in .env.local')
  console.error('Find it in: Supabase dashboard → Project Settings → Database → Connection string (URI)')
  process.exit(1)
}

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require' })

const files = [
  'supabase/schema.sql',
  'supabase/migrations/20260327000000_create_conversation_fn.sql',
  'supabase/migrations/20260327000001_create_outings.sql',
  'supabase/migrations/20260328000000_reward_points.sql',
  'supabase/migrations/20260328000001_award_points_fn.sql',
  'supabase/migrations/20260328000002_posts_storage_bucket.sql',
  'supabase/migrations/20260328000003_onboarding_prefs.sql',
  'supabase/migrations/20260328000004_fix_conversation_rls.sql',
]

for (const file of files) {
  process.stdout.write(`Running ${file}... `)
  const content = readFileSync(join(root, file), 'utf8')
  await sql.unsafe(content)
  console.log('done')
}

await sql.end()
console.log('\nDatabase setup complete.')
