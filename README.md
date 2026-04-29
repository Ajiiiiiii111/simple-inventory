This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase Backend Setup

1. Create a Supabase project and copy your project URL, anon key, and service role key.
2. Copy `.env.example` to `.env.local` and set real values.
3. Enable email confirmations in Supabase Auth so new registrations must verify their email.
	If you want a 6-digit code email, update the Supabase Auth email template to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}` so it sends a verification code instead of a magic link.
4. Open Supabase SQL Editor and run `supabase/schema.sql`.
5. Start the app with `npm run dev`.

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### API Routes Added

- `GET /api/products` list all products
- `POST /api/products` create a product
- `PATCH /api/products/:id` update a product
- `DELETE /api/products/:id` delete a product
- `POST /api/stock-movement` apply IN/OUT stock movement and log transaction

The home page now serves login and register forms instead of the old dashboard links.
Products and stock movements are scoped to the signed-in Supabase user, so each account only sees its own records.
