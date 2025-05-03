import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error('Auth callback error:', error)
      // Redirect to home page with error parameter
      return NextResponse.redirect(`${requestUrl.origin}?auth_error=true`)
    }
  }

  // Return the user to the homepage after sign in
  return NextResponse.redirect(requestUrl.origin)
} 