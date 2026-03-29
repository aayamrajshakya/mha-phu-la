import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Delete all existing users
const { data: existing } = await supabase.auth.admin.listUsers()
for (const user of existing?.users ?? []) {
  await supabase.auth.admin.deleteUser(user.id)
  console.log(`Deleted: ${user.email}`)
}

// Create team accounts
const team = [
  { name: 'Aayam',     email: 'aayam@mhaphula.com' },
  { name: 'Ashriya',   email: 'ashriya@mhaphula.com' },
  { name: 'Yuvraj',    email: 'yuvraj@mhaphula.com' },
  { name: 'Deepankha', email: 'deepankha@mhaphula.com' },
  { name: 'Rashmi',    email: 'rashmi@mhaphula.com' },
]

for (const member of team) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: member.email,
    password: 'Boston123!',
    email_confirm: true,
  })

  if (error) {
    console.error(`Failed to create ${member.email}:`, error.message)
    continue
  }

  console.log(`Created: ${member.email} (${data.user.id})`)
}
