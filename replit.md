# SeleApp - Hunting Reserve Management System

## Overview

SeleApp is a comprehensive digital hunting management platform designed for Italian hunting reserves ("caccia di selezione"). The system provides multi-role functionality for hunters, administrators, wildlife biologists, and super administrators to manage reservations, quotas, reports, and reserve operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for API state management
- **Authentication**: JWT tokens with role-based access control

### Project Structure
The application follows a monorepo structure with clear separation of concerns:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript schemas and types
- Database configuration and migrations at root level

## Key Components

### Frontend Architecture
- **Component-based UI**: Built with React and shadcn/ui component library
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **PWA Support**: Service worker implementation for offline capabilities
- **Multi-language Support**: Italian localization throughout the interface
- **Role-based Routing**: Different dashboards for hunters, admins, and super admins

### Backend Architecture
- **RESTful API**: Express.js with modular route handlers
- **Middleware Stack**: Authentication, role-based access control, and error handling
- **Database Layer**: Drizzle ORM with type-safe queries
- **Email Service**: Nodemailer integration for notifications
- **Demo System**: Temporary access system for demonstrations

### Authentication & Authorization
- **JWT-based Authentication**: Token-based session management
- **Role-based Access Control**: Four user roles (HUNTER, ADMIN, SUPERADMIN, BIOLOGO)
- **Reserve-scoped Permissions**: Users are associated with specific hunting reserves
- **Demo Mode**: Temporary access system with time-limited sessions

## Data Flow

### Core Entities
1. **Reserves**: Individual hunting properties with their own settings
2. **Users**: Multi-role system (hunters, admins, biologists, super admins)
3. **Zones**: Physical hunting areas within reserves
4. **Reservations**: Booking system for hunting sessions
5. **Wildlife Quotas**: Regional and reserve-specific hunting limits
6. **Hunt Reports**: Post-hunt documentation and harvest tracking

### Management Types
The system supports different reserve management approaches:
- **Standard Zones**: Traditional zone-based reservations (e.g., Cison di Valmarino)
- **Random Assignment**: Lottery-based animal assignment system
- **Group-based Quotas**: Zone and group combinations with quota management
- **Quota-only Management**: Simple quota tracking without zones

### Data Validation
- **Schema-driven**: Zod schemas shared between frontend and backend
- **Type Safety**: Full TypeScript coverage for data consistency
- **Input Validation**: Server-side validation for all API endpoints

## External Dependencies

### Email Services
- **Nodemailer**: SMTP integration for reservation confirmations and notifications
- **SendGrid**: Alternative email service provider support

### Database
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **Drizzle Kit**: Database migrations and schema management

### Authentication
- **bcrypt**: Password hashing for secure user authentication
- **jsonwebtoken**: JWT token generation and validation

### File Storage
- **Base64 Encoding**: Image storage for hunting documentation and kill cards

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for rapid development
- **tsx**: TypeScript execution for server development
- **Concurrent Development**: Frontend and backend run simultaneously

### Production Build
- **Frontend**: Vite production build with asset optimization
- **Backend**: esbuild bundling for optimized server deployment
- **Static Assets**: Served directly from Express for SPA routing

### Environment Configuration
- **Database URL**: PostgreSQL connection string
- **JWT Secret**: Token signing key for authentication
- **Email Credentials**: SMTP configuration for notifications

### Hosting Requirements
- **Node.js Runtime**: ES modules support required
- **PostgreSQL Database**: With connection pooling support
- **Static File Serving**: For client assets and uploaded content

### Progressive Web App
- **Service Worker**: Offline functionality and caching
- **App Manifest**: Native app-like installation
- **Responsive Design**: Mobile-optimized interface for field use

The system is designed for scalability with multi-tenant architecture, allowing multiple hunting reserves to operate independently within the same platform while maintaining data isolation and customized workflows.