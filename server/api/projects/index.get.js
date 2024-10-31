// server/api/user-websites.get.js
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#imports'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabase.url
  const supabaseKey = config.public.supabase.key

  // Verify Supabase config
  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase URL or Key is missing in runtime config' })
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Retrieve the token from headers
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')

  // Verify authentication token
  if (!token) {
    throw createError({ statusCode: 401, message: 'User not authenticated' })
  }

  // Authenticate user with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw createError({ statusCode: 401, message: 'User session invalid or expired' })
  }

  // Look up the user in Prisma by Supabase user ID (loggedInId in Prisma)
  const prismaUser = await prisma.user.findFirst({
    where: {
      loggedInId: user.id,
    },
  })

  if (!prismaUser) {
    throw createError({ statusCode: 404, message: 'User not found in database' })
  }

  // Fetch websites associated with the authenticated Prisma user ID
  const websites = await prisma.websites.findMany({
    where: {
      userId: prismaUser.id,
    },
  })

  return websites
})
