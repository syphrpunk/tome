export interface Env {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
  ENVIRONMENT: string;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_WEBHOOK_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SSO_SESSION_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  TOME_BUCKET: R2Bucket;
  TOME_DB: D1Database;
}

export interface User {
  api_token: string;
  avatar_url: string | null;
  created_at: string;
  email: string;
  id: string;
  name: string | null;
  plan: string;
  stripe_customer_id: string | null;
  updated_at: string;
}
