# Replit.md - US Housing Stats Dashboard

## Overview

This is a US housing statistics visualization dashboard built as a full-stack TypeScript application. The project displays historical housing data (median home values, year-over-year changes) and rental price data (ZORI) across US states and counties using interactive maps and time-series charts. Data is sourced from Zillow CSV files (ZHVI for home values, ZORI for rental prices) and stored in PostgreSQL.

The application includes user accounts with email confirmation, Stripe subscription plans for API/embed access, a contact form, a "For Business" page, and a subscriber dashboard with custom embed color picker.

The application follows a monorepo structure with a React frontend (Vite), Express backend, and shared types/schemas between client and server.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library (Radix primitives + Tailwind CSS)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Visualization**: 
  - Plotly.js for time-series line charts
  - react-simple-maps with d3-scale for interactive US state choropleth map
  - County-level choropleth heat map for rental prices (ZORI data)
  - Housing/Rental toggle switch to switch between data views
  - Embeddable iframe widgets: housing map, housing chart, rental map, rental chart (ZORI), metro-level charts
  - Dark/light theme support for embeds via CSS variable override (`:root` = light grey, `.dark` = dark)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **Authentication**: express-session with connect-pg-simple, bcryptjs for password hashing
- **Payments**: Stripe via stripe-replit-sync for subscription management
- **Email**: AgentMail via Replit Connectors for confirmation and contact emails
- **File Processing**: Multer for CSV uploads, csv-parse for parsing Zillow data
- **Development**: tsx for TypeScript execution, Vite middleware for HMR
- **SSR**: Server-side rendered HTML pages for SEO (/, /states, /state/:slug, /metros, /metro/:slug)

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui + custom + signup-prompt)
│   ├── hooks/           # Custom React hooks (useHousingStats, useStates, useAuth)
│   ├── pages/           # Route pages (dashboard, login, register, subscribe, account, for-business, contact, embed)
│   └── lib/             # Utilities and query client
├── client/public/       # Static assets
│   └── robots.txt       # Search engine directives
├── server/              # Express backend
│   ├── routes.ts        # API endpoints + SSR routes + auth/subscription routes
│   ├── auth.ts          # User auth (register, login, confirm, session middleware)
│   ├── stripeClient.ts  # Stripe client initialization
│   ├── webhookHandlers.ts # Stripe webhook handlers
│   ├── emailService.ts  # AgentMail email sending (confirmation, contact form)
│   ├── seed-stripe.ts   # Stripe product/price seeding script
│   ├── ssr.ts           # SSR HTML template rendering
│   ├── build-seo-data.ts # Build script for SEO data index
│   ├── seo-data.json    # Precomputed states/metros data (generated)
│   ├── storage.ts       # Database access layer
│   └── db.ts            # Drizzle database connection
└── shared/              # Shared between client/server
    ├── schema.ts        # Drizzle table definitions (housing_stats, users, contact_messages)
    └── routes.ts        # API route type definitions
```

### Authentication & Subscriptions
- **User Registration**: POST /api/auth/register — creates user, sends confirmation email via AgentMail
- **Login**: POST /api/auth/login — bcrypt password verification, express-session
- **Email Confirmation**: GET /api/auth/confirm/:token — confirms email, redirects to /login
- **Session**: GET /api/auth/me — returns current user + subscription status
- **Subscription Plans**: API ($14.99/mo), Embed ($24.99/mo), Both ($29.99/mo)
- **Stripe Checkout**: POST /api/subscriptions/create-checkout — creates Stripe Checkout session
- **Webhook**: POST /api/webhooks/stripe — handles checkout.session.completed, subscription updates
- **Cancel**: POST /api/subscriptions/cancel — cancels Stripe subscription
- **Billing Portal**: POST /api/subscriptions/portal — redirects to Stripe billing portal
- **Signup Prompt**: 30-second timer shows signup modal for non-logged-in users (sessionStorage dismissal)

### SEO Implementation
- **Domain**: https://housing-intel.com
- **SSR Pages**: HTML-first rendering for /, /states, /state/:slug, /metros, /metro/:slug
- **Metadata**: Each page includes title, meta description, canonical URL, Open Graph, Twitter cards
- **Sitemap**: /sitemap.xml with lastmod timestamps for all pages
- **Robots**: /robots.txt with sitemap reference
- **Internal Linking**: Strong bidirectional links between home, states, and metros
- **Build Command**: Run `npx tsx server/build-seo-data.ts` to regenerate SEO data index

### Data Flow
1. CSV data (Zillow format) is uploaded or seeded from attached_assets
2. Backend parses CSV and stores in PostgreSQL housing_stats table
3. Frontend fetches via React Query with optional filters (state, date range)
4. Data displayed in interactive map and trend charts

### API Design
- RESTful endpoints defined in shared/routes.ts with Zod schemas
- Endpoints: GET /api/housing (with filters), GET /api/states, POST /api/housing/upload
- Auth endpoints: /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout
- Subscription endpoints: /api/subscriptions/create-checkout, /api/subscriptions/cancel, /api/subscriptions/portal
- Contact: POST /api/contact
- Type-safe request/response using shared schema definitions

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via DATABASE_URL environment variable
- **Drizzle ORM**: Schema management and queries
- **drizzle-kit**: Database migrations (db:push command)
- **connect-pg-simple**: Session storage in PostgreSQL

### Third-Party Services
- **Zillow Data**: CSV files in ZHVI format for housing statistics
- **Stripe**: Subscription billing via stripe-replit-sync
- **AgentMail**: Email delivery via Replit Connectors (confirmation emails, contact form forwarding to Sonnett.sells.mufreesboro@gmail.com)
- **CDN Resources**: 
  - us-atlas TopoJSON for map geography (jsdelivr CDN)
  - Google Fonts (Inter, Space Grotesk, JetBrains Mono)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session secret (required)
- `ADMIN_TOKEN`: Admin access token
- Stripe keys managed via stripe-replit-sync

### Key Runtime Dependencies
- express, express-session, connect-pg-simple for server
- stripe, stripe-replit-sync for payments
- bcryptjs for password hashing
- @replit/connectors-sdk for AgentMail
- @tanstack/react-query for data fetching
- recharts, react-simple-maps, d3-scale for visualization
- date-fns for date formatting
- zod for validation throughout
