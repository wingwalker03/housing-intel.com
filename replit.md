# Replit.md - US Housing Stats Dashboard

## Overview

This is a US housing statistics visualization dashboard built as a full-stack TypeScript application. The project displays historical housing data (median home values, year-over-year changes) across US states using an interactive map and time-series charts. Data is sourced from Zillow CSV files and stored in PostgreSQL.

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
  - Recharts for time-series line charts
  - react-simple-maps with d3-scale for interactive US state choropleth map

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **File Processing**: Multer for CSV uploads, csv-parse for parsing Zillow data
- **Development**: tsx for TypeScript execution, Vite middleware for HMR

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui + custom)
│   ├── hooks/           # Custom React hooks (useHousingStats, useStates)
│   ├── pages/           # Route pages (dashboard, not-found)
│   └── lib/             # Utilities and query client
├── server/              # Express backend
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database access layer
│   └── db.ts            # Drizzle database connection
└── shared/              # Shared between client/server
    ├── schema.ts        # Drizzle table definitions
    └── routes.ts        # API route type definitions
```

### Data Flow
1. CSV data (Zillow format) is uploaded or seeded from attached_assets
2. Backend parses CSV and stores in PostgreSQL housing_stats table
3. Frontend fetches via React Query with optional filters (state, date range)
4. Data displayed in interactive map and trend charts

### API Design
- RESTful endpoints defined in shared/routes.ts with Zod schemas
- Endpoints: GET /api/housing (with filters), GET /api/states, POST /api/housing/upload
- Type-safe request/response using shared schema definitions

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via DATABASE_URL environment variable
- **Drizzle ORM**: Schema management and queries
- **drizzle-kit**: Database migrations (db:push command)

### Third-Party Services
- **Zillow Data**: CSV files in ZHVI format for housing statistics
- **CDN Resources**: 
  - us-atlas TopoJSON for map geography (jsdelivr CDN)
  - Google Fonts (Inter, Space Grotesk, JetBrains Mono)

### Key Runtime Dependencies
- express, express-session for server
- @tanstack/react-query for data fetching
- recharts, react-simple-maps, d3-scale for visualization
- date-fns for date formatting
- zod for validation throughout