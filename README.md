# Google Business Reviews Management System

A powerful Next.js application for managing Google Business Profile reviews with OAuth authentication, real-time review fetching, and reply functionality.

## ✨ Features

- 🔐 **Secure OAuth 2.0 Authentication** with Google Business Profile
- 📊 **Real-time Review Management** - View, filter, and manage all your business reviews
- 💬 **Direct Reply System** - Respond to reviews directly from the dashboard
- 🔍 **Advanced Filtering** - Filter by sentiment (positive/negative), reply status, and search
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🚀 **Fast Performance** - Built with Next.js 14 and modern React patterns
- 🎯 **Pagination** - Efficiently browse through large numbers of reviews
- 🏢 **Multi-location Support** - Manage reviews for multiple business locations

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Google OAuth 2.0
- **API**: Google My Business API v4
- **State Management**: React Hooks

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Google Cloud Console account
- A Google Business Profile with review access
- Git installed on your machine

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/kanchana404/Google-bussiness-api-Get-reviews-and-Reply-reviews.git
cd Google-bussiness-api-Get-reviews-and-Reply-reviews
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google My Business API
   - Google Places API
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Set application type to **Web application**
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (for development)
     - `https://yourdomain.com/api/auth/callback` (for production)

### 4. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Google API Keys
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🔧 Configuration

### Google Business Profile Setup

1. Ensure your Google account has access to the Google Business Profile you want to manage
2. The business location must be verified in Google Business Profile
3. You need owner or manager access to reply to reviews

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | ✅ |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI (must match Google Console) | ✅ |
| `GOOGLE_API_KEY` | Google API Key for additional API calls | ✅ |
| `GOOGLE_PLACES_API_KEY` | Google Places API Key for location data | ✅ |

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/route.ts    # OAuth callback handler
│   │   │   └── status/route.ts      # Auth status check
│   │   ├── business/route.ts        # Business data API
│   │   └── google-business-reply/   # Review reply API
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main application page
├── components/
│   └── ui/                          # UI components (shadcn/ui)
├── lib/                             # Utility functions
├── public/                          # Static assets
├── .env.local                       # Environment variables
├── next.config.js                   # Next.js configuration
├── package.json                     # Dependencies
├── tailwind.config.js               # Tailwind CSS configuration
└── tsconfig.json                    # TypeScript configuration
```

## 🎯 Usage

### 1. Connect Google Business Account

1. Click "Connect Google Business" on the main page
2. Authenticate with your Google account
3. Grant necessary permissions for business profile access

### 2. Select Business Location

1. Choose your business account from the dropdown
2. Select the specific location you want to manage
3. Reviews will automatically load for the selected location

### 3. Manage Reviews

- **View Reviews**: Browse all reviews with ratings and customer information
- **Filter Reviews**: Use search, sentiment filters, and status filters
- **Reply to Reviews**: Click "Reply" to respond directly to Google Business
- **Edit Replies**: Modify existing replies as needed

### 4. Navigation

- Use pagination to browse through multiple pages of reviews
- 10 reviews are displayed per page for optimal performance

## 🔍 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | GET | Generate OAuth authorization URL |
| `/api/auth/callback` | GET | Handle OAuth callback and store tokens |
| `/api/auth/status` | GET | Check authentication status |
| `/api/auth/status` | DELETE | Logout and clear tokens |
| `/api/business?type=accounts` | GET | Fetch business accounts |
| `/api/business?type=locations` | GET | Fetch business locations |
| `/api/business?type=reviews` | GET | Fetch reviews for location |
| `/api/google-business-reply` | PUT | Send reply to review |
| `/api/google-business-reply` | DELETE | Delete reply from review |

## 🚨 Troubleshooting

### Common Issues

1. **"No reviews found"**
   - Verify your business location has reviews on Google
   - Check if your account has proper permissions
   - Ensure the location is verified in Google Business Profile

2. **Authentication errors**
   - Verify your Google Client ID and Secret are correct
   - Check if redirect URIs match in Google Console
   - Ensure Google My Business API is enabled

3. **Token expiration**
   - Tokens automatically refresh when needed
   - If issues persist, try disconnecting and reconnecting

### Debug Mode

Visit `http://localhost:3000/api/business?type=debug` to check:
- Token validity
- API connectivity
- Permission status

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update Google Console redirect URIs with your production domain
5. Deploy!

### Other Platforms

1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Configure environment variables on your hosting platform
4. Update Google Console redirect URIs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Review Google My Business API documentation

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Google My Business API](https://developers.google.com/my-business) for the review management capabilities

---

⭐ **Star this repository if it helped you manage your Google Business reviews more efficiently!**
