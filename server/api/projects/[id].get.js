// server/api/projects/[id].get.js

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Initialize Prisma and Supabase clients
const prisma = new PrismaClient()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY) // Use the service role key on server side

export default defineEventHandler(async (event) => {
  const { id } = event.context.params

  // Log the incoming ID for debugging purposes
  console.log("Received request for project with ID:", id)

  // Validate the ID to ensure it's a number
  if (!id || isNaN(Number(id))) {
    console.error("Invalid ID format:", id)
    throw createError({ statusCode: 400, statusMessage: "Invalid ID format" })
  }

  // Retrieve the user from Supabase using the access token in the request header
  const authHeader = event.req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const { data: user, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    console.error("Error fetching user from Supabase:", error)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  try {
    // Attempt to fetch the project, verifying ownership with the user ID
    const website = await prisma.websites.findFirst({
      where: {
        id: Number(id),
        user: {
          loggedInId: user.user.id, // Ensure project belongs to the authenticated user
        },
      },
    })

    // If no project is found or the user is not the owner, return a 403 or 404 error
    if (!website) {
      console.error("Access denied or project not found for ID:", id)
      throw createError({ statusCode: 403, statusMessage: "Access denied" })
    }

    // Return the website details if authorized
    return website

  } catch (error) {
    // Log and rethrow the error for server-side debugging
    console.error("Error fetching project details:", error)
    throw createError({ statusCode: 500, statusMessage: "Internal Server Error" })
  } finally {
    // Ensure Prisma client disconnection after the query
    await prisma.$disconnect()
  }
})
