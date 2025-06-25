// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('Callback received - Code:', code ? 'Present' : 'Missing', 'Error:', error);

  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent('OAuth failed'), 'https://portforward.kavithakanchana.xyz')
    );
  }

  // Handle missing authorization code
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent('No authorization code'), 'https://portforward.kavithakanchana.xyz')
    );
  }

  try {
    console.log('Attempting to exchange code for tokens...');
    console.log('Using client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Using redirect URI: https://portforward.kavithakanchana.xyz/api/auth/callback');
    
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
        redirect_uri: 'https://portforward.kavithakanchana.xyz/api/auth/callback',
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
    const response = NextResponse.redirect(new URL('/?auth=success', 'https://portforward.kavithakanchana.xyz'));
    
    // Set cookies for localhost development (not secure for dev)
    response.cookies.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });
    
    response.cookies.set('google_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    response.cookies.set('google_token_expiry', expiryTime.toString(), {
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    console.log('Tokens stored successfully in cookies');
    console.log('Cookie settings: httpOnly=true, secure=false, sameSite=lax, path=/');

    return response;
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.redirect(
      new URL('/?auth=error&message=' + encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'), 'https://portforward.kavithakanchana.xyz')
    );
  }
}