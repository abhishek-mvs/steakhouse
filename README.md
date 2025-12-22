# Steakhouse API

API server for Steakhouse application built with Bun, TypeScript, Express, and Supabase.

## Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Supabase account and project
- Node.js 18+ (if not using Bun)

### Installation

```bash
# Install dependencies
bun install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxx
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx

# Server
PORT=3000
NODE_ENV=development
```

### Database Setup

#### Running Migrations

**Option 1: Using Supabase Dashboard (Recommended)**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** → **New Query**
4. Copy and paste the contents of `supabase/migrations/001_create_users_table.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`

**Important Notes:**
- The `organizations` table must exist before running the users migration (it references `organizations(id)`)
- Make sure to run migrations in order if you have multiple migration files

**Option 2: Using Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

**Option 3: Manual SQL Execution**

You can also execute the SQL directly using any PostgreSQL client connected to your Supabase database.

### Running the Server

```bash
# Development
bun run dev

# Production
bun run start
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` env variable).

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user profile

## Project Structure

```
public/
├── controllers/    # HTTP request/response handlers
├── managers/       # Business logic orchestration
├── services/       # Database operations
├── schemas/        # Type definitions and interfaces
├── routes/         # Express route definitions
└── pkg/
    └── db/         # Database client configuration
```

## Architecture

- **Controllers** → Handle HTTP requests/responses
- **Managers** → Orchestrate business logic (multi-step operations)
- **Services** → Direct database operations (CRUD)
- **Schemas** → Type definitions and interfaces

