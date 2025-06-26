// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('Callback received - Code:', code ? 'Present' : 'Missing', 'Error:', error);

  // Validate required environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    console.error('Missing required environment variables');
    return NextResponse.json(
      { error: 'OAuth configuration is incomplete' },
      { status: 500 }
    );
  }

  // Get base URL from environment or extract from redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.GOOGLE_REDIRECT_URI.replace('/api/auth/callback', '');

  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent('OAuth failed'), baseUrl)
    );
  }

  // Handle missing authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent('No authorization code'), baseUrl)
    );
  }

  try {
    console.log('Attempting to exchange code for tokens...');
    console.log('Using client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Using redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', Object.keys(tokens));
    console.log('Access token preview:', tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'null');

    // Validate required tokens
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing required tokens');
    }

    // Calculate expiry time
    const expiryTime = Date.now() + (tokens.expires_in * 1000);
    console.log('Token expires at:', new Date(expiryTime).toISOString());

    // Store tokens in cookies (temporary storage)
    const response = NextResponse.redirect(new URL('/?auth=success', baseUrl));
    
    // Determine if we're in development or production
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = baseUrl.startsWith('https://');
    
    // Set cookies with appropriate security settings
    response.cookies.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });
    
    response.cookies.set('google_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    response.cookies.set('google_token_expiry', expiryTime.toString(), {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    console.log('Tokens stored successfully in cookies');
    console.log(`Cookie settings: httpOnly=true, secure=${isProduction && isSecure}, sameSite=lax, path=/`);

    return response;
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'), baseUrl)
    );
  }
}