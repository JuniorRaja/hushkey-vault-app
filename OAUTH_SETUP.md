# OAuth Setup Guide

## Quick Setup (5 minutes)

### 1. Google OAuth
1. Visit: https://console.cloud.google.com/
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
5. Copy Client ID & Secret

### 2. GitHub OAuth
1. Visit: https://github.com/settings/developers
2. New OAuth App
3. Callback URL: `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
4. Copy Client ID & Secret

### 3. Supabase Configuration
1. Go to: https://app.supabase.com/project/[YOUR-PROJECT]/auth/providers
2. Enable Google → Paste Client ID & Secret
3. Enable GitHub → Paste Client ID & Secret
4. Save changes

### 4. Test
```bash
npm run dev
```
- Click "Google" or "GitHub" on login page
- Authenticate
- Set PIN when prompted
- Access vault

## Done! 🎉

OAuth is now enabled. Users can sign in with Google or GitHub.

## Troubleshooting
- **Redirect error**: Check callback URL matches exactly
- **Email exists**: Supabase prevents duplicate emails automatically
- **PIN not showing**: Clear browser cache and try again
