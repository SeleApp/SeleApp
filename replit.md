# Overview

This is a hunting reservation management system called SeleApp built for Cison di Val Marino. It's a full-stack web application that allows hunters to make reservations for hunting zones and administrators to manage wildlife quotas and track hunting activities.

The application uses a modern tech stack with Express.js backend, React frontend with TypeScript, PostgreSQL database with Drizzle ORM, and shadcn/ui components for the interface.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: JWT tokens with bcrypt password hashing
- **API Design**: RESTful API with role-based access control

## Database Design
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Connection**: Neon serverless with WebSocket support

# Key Components

## Authentication System
- JWT-based authentication with role-based access (HUNTER/ADMIN)
- Password hashing using bcrypt
- Persistent login state via localStorage
- Protected routes with middleware validation

## Zone Management
- 16 hunting zones for Cison di Val Marino
- Real-time quota tracking for different species (roe deer, red deer)
- Visual quota status indicators (available/low/exhausted)
- Zone availability checking for reservations

## Reservation System
- Time-slot based reservations (morning/afternoon)
- Hunting day restrictions (no hunting on Tuesdays and Fridays)
- Conflict prevention for duplicate bookings
- Status tracking (active/completed/cancelled)

## Wildlife Quota Management
- Species-specific quotas (roe deer, red deer)
- Gender and age class tracking (male/female, adult/young)
- Real-time harvest tracking
- Admin controls for quota updates

## Hunt Reporting
- Post-hunt report submission by hunters
- Harvest details recording (species, sex, age class)
- Automatic quota updates upon harvest reports
- Notes and outcome tracking

# Data Flow

1. **User Authentication**: Login credentials → JWT token → Role-based dashboard redirect
2. **Zone Selection**: Zone listing → Quota checking → Reservation creation
3. **Reservation Management**: Time slot selection → Conflict validation → Database storage
4. **Hunt Reporting**: Post-hunt form → Harvest validation → Quota updates
5. **Admin Oversight**: Statistics dashboard → Quota management → System monitoring

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing

## Development Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundling

# Deployment Strategy

## Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module
- **Development Server**: Vite dev server on port 5000
- **Hot Reload**: Enabled with Vite HMR

## Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Deployment**: Autoscale deployment target
- **Port Mapping**: Internal 5000 → External 80

## Database Management
- **Migrations**: Drizzle Kit for schema changes
- **Seeding**: Automated seeding with admin/hunter accounts
- **Connection**: Environment variable DATABASE_URL required

# Changelog

Changelog:
- June 23, 2025. Initial setup and core functionality implemented
- June 23, 2025. Added quota management system with inline editing for both total quotas and harvested counts
- June 23, 2025. Enhanced hunt reporting with detailed animal selection and automatic quota updates
- June 24, 2025. Redesigned quota management with table format for better organization and real-time updates
- June 24, 2025. Implemented species-specific categories: Capriolo (M0,F0,FA,M1,MA) and Cervo (CL0,FF,MM,MCL1)
- June 24, 2025. **CRITICAL ARCHITECTURE CHANGE**: Migrated from zone-level to regional-level quota management
  - Added new `regional_quotas` table for proper quota tracking
  - Updated hunt reporting logic to scale regional quotas instead of zone quotas
  - When any category reaches 0 quota, it becomes unavailable across all zones
  - Improved category mapping logic for accurate quota decrements
- June 24, 2025. **FINAL IMPLEMENTATION**: Completed regional quota management system
  - Replaced admin dashboard with regional-only quota table
  - Added custom deer logo to login page
  - Fixed all authentication and API errors
  - System now shows: Species, Class/Sex, Assigned Quota, Harvested, Remaining
  - Removed all zone references from quota display
  - Added inline editing with pencil button for quota modifications

# User Preferences

Preferred communication style: Simple, everyday language.