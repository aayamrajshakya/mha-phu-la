import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'aayam@demo.com',
  password: 'Boston123@',
  email_confirm: true,
})

if (error) {
  console.error('Error creating demo user:', error.message)
  process.exit(1)
}

console.log('Demo user created:', data.user.id)
