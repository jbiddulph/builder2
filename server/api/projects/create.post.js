// server/api/createProject.post.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const { title, description, repo_name, image, category, status, userId } = await readBody(event)

  // Ensure userId is provided (from Supabase user or auth)
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User not authenticated' })
  }

  // Check if the user exists in Prisma, or create a new record if not
  let user = await prisma.user.findFirst({
    where: { loggedInId: userId },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        loggedInId: userId,
        // You may need additional properties from the Supabase auth user data
      },
    })
  }

  // Create the new website project associated with the user
  const website = await prisma.websites.create({
    data: {
      title,
      description,
      repo_name,
      image,
      category,
      status,
      userId: user.id,
    },
  })

  return website
})
