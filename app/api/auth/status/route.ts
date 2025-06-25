// app/api/auth/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Check for access token
    const accessToken = cookieStore.get('google_access_token')?.value;
    const tokenExpiry = cookieStore.get('google_token_expiry')?.value;
    
    if (!accessToken) {
      return NextResponse.json({
        isAuthenticated: false,
        message: 'No access token found'
      });
    }
    
    // Check if token is expired
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const currentTime = Date.now();
      
      if (currentTime >= expiryTime) {
        return NextResponse.json({
          isAuthenticated: false,
          message: 'Access token has expired'
        });
      }
    }
    
    // Validate token with Google
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    
    if (!tokenInfoResponse.ok) {
      return NextResponse.json({
        isAuthenticated: false,
        message: 'Access token is invalid'
      });
    }
    
    const tokenInfo = await tokenInfoResponse.json();
    
    return NextResponse.json({
      isAuthenticated: true,
      tokenInfo: {
        scope: tokenInfo.scope,
        expires_in: tokenInfo.expires_in,
        audience: tokenInfo.audience
      },
      message: 'Successfully authenticated'
    });
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({
      isAuthenticated: false,
      message: 'Error checking authentication status'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    // Clear auth cookies
    response.cookies.delete('google_access_token');
    response.cookies.delete('google_refresh_token');
    response.cookies.delete('google_token_expiry');
    
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({
      success: false,
      message: 'Error during logout'
    }, { status: 500 });
  }
}