import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const users = [
  { email: 'baucha@mhafula.com', password: 'Boston123!' },
  { email: 'maicha@mhafula.com', password: 'Boston123!' },
]

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
  })

  if (error) {
    console.error(`Error creating user ${user.email}:`, error.message)
    process.exit(1)
  }

  console.log(`User created: ${user.email} (${data.user.id})`)
}
