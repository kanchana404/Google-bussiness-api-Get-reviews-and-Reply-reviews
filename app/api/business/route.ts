// app/api/business/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getValidAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('google_access_token')?.value;
  const tokenExpiry = cookieStore.get('google_token_expiry')?.value;
  
  if (!accessToken) {
    return null;
  }
  
  // Check if token is expired
  if (tokenExpiry) {
    const expiryTime = parseInt(tokenExpiry);
    const currentTime = Date.now();
    
    if (currentTime >= expiryTime) {
      return null;
    }
  }
  
  return accessToken;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Business API called');
    
    // Get valid access token from cookies
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      console.log('No valid access token found');
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    console.log('Access token found, making API calls...');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountName = searchParams.get('accountName');
    const locationName = searchParams.get('locationName');

    console.log('Request type:', type, 'Account:', accountName, 'Location:', locationName);

    switch (type) {
      case 'debug':
        // Debug endpoint to check token info
        console.log('Debug: Checking token info...');
        
        const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
        
        if (tokenInfoResponse.ok) {
          const tokenInfo = await tokenInfoResponse.json();
          console.log('Token info:', tokenInfo);
          
          return NextResponse.json({
            tokenInfo: tokenInfo,
            accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'null',
            connectionStatus: 'connected'
          });
        } else {
          const errorText = await tokenInfoResponse.text();
          console.error('Token info error:', errorText);
          return NextResponse.json({
            error: 'Failed to get token info',
            status: tokenInfoResponse.status,
            details: errorText,
            connectionStatus: 'invalid_token'
          });
        }

      case 'accounts':
        console.log('Fetching business accounts...');
        
        // Try to get business accounts
        const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Accounts API response status:', accountsResponse.status);

        if (!accountsResponse.ok) {
          const errorText = await accountsResponse.text();
          console.error('Accounts API error:', errorText);
          return NextResponse.json(
            { error: `Failed to fetch accounts: ${accountsResponse.status} - ${errorText}` },
            { status: accountsResponse.status }
          );
        }

        const accountsData = await accountsResponse.json();
        console.log('Accounts data:', accountsData);
        
        return NextResponse.json({ 
          accounts: accountsData.accounts || [],
          total: accountsData.accounts?.length || 0 
        });

      case 'locations':
        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for locations' },
            { status: 400 }
          );
        }

        console.log('Fetching locations for account:', accountName);
        
        // First, try the simple approach without read_mask
        let locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`;
        
        console.log('Trying locations URL without read_mask:', locationsUrl);
        
        let locationsResponse = await fetch(locationsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Locations API response status (no read_mask):', locationsResponse.status);

        // If that fails, try with minimal read_mask
        if (!locationsResponse.ok) {
          console.log('Trying with minimal read_mask...');
          locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`;
          
          locationsResponse = await fetch(locationsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Locations API response status (minimal read_mask):', locationsResponse.status);
        }

        // If that also fails, try the account management API
        if (!locationsResponse.ok) {
          console.log('Trying account management API...');
          locationsUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/${accountName}/locations`;
          
          locationsResponse = await fetch(locationsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Account management API response status:', locationsResponse.status);
        }

        if (!locationsResponse.ok) {
          const errorText = await locationsResponse.text();
          console.error('All locations API attempts failed:', errorText);
          return NextResponse.json(
            { error: `Failed to fetch locations: ${locationsResponse.status} - ${errorText}` },
            { status: locationsResponse.status }
          );
        }

        const locationsData = await locationsResponse.json();
        console.log('Locations data:', locationsData);
        
        return NextResponse.json({ 
          locations: locationsData.locations || [],
          total: locationsData.locations?.length || 0 
        });

      case 'reviews':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for reviews' },
            { status: 400 }
          );
        }

        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for reviews' },
            { status: 400 }
          );
        }

        console.log('Fetching reviews for location:', locationName);
        
        // Construct the parent path for v4 API: accounts/*/locations/*
        let parentPath;
        
        // Handle different input formats
        if (locationName.includes('accounts/') && locationName.includes('locations/')) {
          // locationName is already a full path like "accounts/123/locations/456"
          parentPath = locationName;
        } else if (locationName.startsWith('locations/')) {
          // locationName is like "locations/456", combine with accountName
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          parentPath = `${cleanAccountName}/${locationName}`;
        } else {
          // locationName is just an ID like "456"
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          parentPath = `${cleanAccountName}/locations/${locationName}`;
        }
        
        console.log('Parent path for v4 reviews API:', parentPath);
        
        // Use Google My Business v4 API for reviews
        const reviewsUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/reviews`;
        
        console.log('Reviews URL (v4 API):', reviewsUrl);
        
        const reviewsResponse = await fetch(reviewsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Reviews API response status:', reviewsResponse.status);

        if (!reviewsResponse.ok) {
          const errorText = await reviewsResponse.text();
          console.error('Reviews API error:', errorText);
          console.error('Reviews API response headers:', Object.fromEntries(reviewsResponse.headers.entries()));
          
          // If reviews API fails with 404, the location might not have reviews or reviews access is restricted
          if (reviewsResponse.status === 404) {
            console.log('Reviews not found for this location');
            return NextResponse.json({ 
              reviews: [],
              total: 0,
              message: 'No reviews found for this location or reviews access may be restricted'
            });
          }
          
          // If 403, access is forbidden
          if (reviewsResponse.status === 403) {
            console.log('Reviews access forbidden for this location');
            return NextResponse.json({ 
              reviews: [],
              total: 0,
              message: 'Reviews access is restricted for this location'
            });
          }
          
          // If 401, authentication issue - token might need refresh
          if (reviewsResponse.status === 401) {
            console.log('Authentication failed for reviews - token may need refresh');
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          }
          
          return NextResponse.json(
            { 
              error: `Failed to fetch reviews: ${reviewsResponse.status} - ${errorText}`,
              url: reviewsUrl,
              parentPath: parentPath
            },
            { status: reviewsResponse.status }
          );
        }

        const reviewsData = await reviewsResponse.json();
        console.log('Reviews data:', reviewsData);
        
        return NextResponse.json({ 
          reviews: reviewsData.reviews || [],
          total: reviewsData.reviews?.length || 0,
          parentPath: parentPath,
          url: reviewsUrl
        });

      case 'connection-status':
        // Check connection status
        const hasConnection = !!(await getValidAccessToken());
        return NextResponse.json({
          connected: hasConnection
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: debug, accounts, locations, reviews, or connection-status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Business API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business data', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}