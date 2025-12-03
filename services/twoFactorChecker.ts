// Common domains that support 2FA
const SUPPORTS_2FA = [
  'google.com', 'gmail.com', 'github.com', 'facebook.com', 'twitter.com', 'x.com',
  'instagram.com', 'linkedin.com', 'microsoft.com', 'amazon.com', 'apple.com',
  'dropbox.com', 'slack.com', 'discord.com', 'reddit.com', 'paypal.com',
  'stripe.com', 'coinbase.com', 'binance.com', 'aws.amazon.com', 'digitalocean.com',
  'cloudflare.com', 'netlify.com', 'vercel.com', 'heroku.com', 'gitlab.com',
  'bitbucket.org', 'atlassian.com', 'notion.so', 'figma.com', 'adobe.com'
];

//TODO: Implement real 2FA check APIs

export const checkUrlSupports2FA = (url?: string): boolean => {
  if (!url) return false;
  
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    return SUPPORTS_2FA.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
};
