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
- June 24, 2025. **FINAL DUAL SYSTEM IMPLEMENTATION**: Completed hybrid zone-regional architecture
  - **Admin Dashboard**: Regional quota management only (9 categories: 5 capriolo + 4 cervo)
  - **Hunter Dashboard**: Physical zone selection (16 zones of Cison di Val Marino territory)
  - **Critical Fix**: Removed zone-level quota seeding - zones are now pure location containers
  - **Hunter Features**: Added informational regional quota tab with real-time data sync
  - **Statistics Sync**: Hunter dashboard now shows accurate regional quota data
  - **UI Enhancements**: 4-tab layout for hunters (Zones/Regional Quotas/Reservations/Reports)
  - **Data Integrity**: Fixed 32-zone bug by limiting display to exactly 16 zones
  - **Elderly-Friendly**: Simplified period management with text prompts instead of date pickers
  - System architecture: 16 physical zones + 9 regional quotas + real-time synchronization
- June 24, 2025. **ADMIN HUNTER MANAGEMENT**: Replaced advanced quota management with hunter administration
  - **Removed**: Complex advanced quota management interface
  - **Added**: Hunter account management (create/edit/disable/delete accounts)
  - **Added**: Hunt report correction system for fixing elderly hunter mistakes
  - **Enhanced**: Admin can modify incorrect reports and manage user accounts
  - **Elderly-Friendly Forms**: Redesigned reservation modal with large buttons, visual time slots, and compact zone grid
- June 24, 2025. **CATEGORY LABELS CORRECTION**: Fixed category display to show exact user-specified codes
  - **Capriolo Categories**: M0, F0, FA, M1, MA (no translations, exact codes as provided)
  - **Cervo Categories**: CL0, FF, MM, MCL1 (no translations, exact codes as provided)
  - **Removed**: Incorrect translations like "Cerbiatto", "Femmina Fertile" etc.
  - **Display**: Now shows exact category codes as specified by user requirements
- June 24, 2025. **ADMIN FEATURES ENHANCEMENT**: Replaced advanced quota management with hunter account management
  - **Added**: Complete hunter account management system (create/edit/activate/deactivate/delete)
  - **Added**: New intuitive reservation form with step-by-step process for elderly users
  - **Fixed**: Database query issues causing reservation errors
  - **UI**: Large buttons, clear visual steps, and simplified elderly-friendly interface
  - **Admin Interface**: "Gestione Cacciatori" button moved to header area, tab removed as requested
- June 24, 2025. **FLEXIBLE RESERVATION SYSTEM**: Enhanced reservation logic for same-day multiple bookings
  - **Added**: "Tutto il Giorno" (Full Day) time slot option for Alba-Tramonto hunting
  - **Enhanced**: Same hunter can book multiple time slots on same date (morning + afternoon)
  - **Smart Conflicts**: Prevents conflicting bookings (full day vs specific slots)
  - **User-Friendly**: Clear error messages for booking conflicts
  - **Database**: Updated time_slot enum to include 'full_day' option
  - **Natural Times**: Updated to use Alba-12:00, 12:00-Tramonto, Alba-Tramonto format
  - **UI Cleanup**: Removed emoji and "SELEZIONATA" text for cleaner interface
- June 24, 2025. **MOBILE LAYOUT OPTIMIZATION**: Enhanced mobile responsiveness for hunter dashboard
  - **Responsive Tabs**: Added horizontal scrolling and proper spacing for small screens
  - **Mobile-First Design**: Reorganized layout with title above tabs, wrapped filter buttons
  - **Table Optimization**: Added horizontal scroll and smaller text sizes for mobile tables
  - **Touch-Friendly**: Improved button sizes and spacing for better mobile interaction
- June 24, 2025. **USER REGISTRATION SYSTEM**: Added public hunter registration functionality
  - **Login/Register Toggle**: Interactive toggle between login and registration forms
  - **Self-Registration**: New hunters can create their own accounts with validation
  - **Form Validation**: Password confirmation, length validation, and duplicate email checks
  - **Auto-Role Assignment**: Public registrations automatically assigned HUNTER role
  - **User-Friendly**: Clear UI with icons, proper spacing, and responsive design
- June 25, 2025. **RESERVATION CANCELLATION**: Added ability for hunters to cancel active reservations
  - **Cancel Button**: Added cancel button for active reservations in hunter dashboard
  - **Confirmation Dialog**: Browser confirmation before canceling to prevent accidents
  - **Real-time Updates**: Automatic refresh of reservation list after cancellation
  - **User-Friendly**: Clear visual feedback and error handling for cancellation process
  - **Admin Control**: Added cancel button in admin dashboard for managing all active reservations
  - **Consistent UI**: Same cancellation functionality available to both hunters and admins
  - **Clean History**: Cancelled reservations are hidden from hunter view to keep interface clean

# User Preferences

Preferred communication style: Simple, everyday language.