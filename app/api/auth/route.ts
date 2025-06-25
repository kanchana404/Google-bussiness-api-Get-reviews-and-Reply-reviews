// app/api/auth/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://portforward.kavithakanchana.xyz/api/auth/callback'
);

export async function GET(request: NextRequest) {
  try {
    console.log('Starting OAuth flow...');
    
    // Define the scopes for Google Business Profile
    const scopes = [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/places',
      'https://www.googleapis.com/auth/business.readonly',
    ];

    // Generate the OAuth authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      include_granted_scopes: true,
    });

    console.log('Generated auth URL:', authUrl);

    // Return the URL instead of redirecting
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
}