# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfiCo Inventory Management System - A comprehensive inventory management solution for tracking hardware equipment and software subscriptions with role-based access, approval workflows, and compliance reporting.

**Current Status**: Next.js application initialized with App Router. Prisma schema implemented with comprehensive data models including NextAuth.js integration. Basic project structure established with shadcn/ui components.

## Architecture & Technology Stack

### Core Technologies
- **Frontend**: Next.js 15+ with App Router, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes with Server Actions
- **Database**: SQLite with Prisma ORM (Turso for production)
- **Authentication**: NextAuth.js v5 with role-based access control
- **UI Components**: shadcn/ui with Radix UI primitives (installed)
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with class-variance-authority
- **Icons**: Lucide React

### Current Architecture
```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API routes
│   ├── (auth)/             # Authentication pages
│   ├── dashboard/          # User dashboards
│   ├── admin/              # Admin panel
│   └── equipment/          # Equipment management
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── lib/                    # Utilities and helpers
├── prisma/                 # Database schema and migrations
└── types/                  # TypeScript definitions
```

## Role-Based System Architecture

### User Roles
- **Regular User**: Personal equipment view, request equipment, report issues
- **Team Lead/Manager**: Team equipment view, approve requests, assign equipment
- **Admin**: Full system access, user management, reports, configuration

### Core Domain Models

The Prisma schema includes comprehensive models for the inventory system:

**Core Business Models:**
- **User**: Role-based system (admin/team_lead/user) with NextAuth.js integration
- **Team**: Team organization with leader assignments
- **Equipment**: Full lifecycle management with status tracking, ownership history
- **EquipmentRequest**: Multi-level approval workflows with justification
- **EquipmentHistory**: Complete audit trail for equipment transfers
- **Subscription**: Software license management with billing cycles
- **MaintenanceRecord**: Equipment maintenance tracking
- **InventoryCheck**: Annual verification workflows
- **SmallInventoryItem**: Quantity-based tracking for consumables

**Authentication Models (NextAuth.js):**
- **Account**: OAuth provider accounts
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

**Key Relationships:**
- Users can own equipment, make requests, and have approval authority
- Equipment has complete history tracking and maintenance records
- Teams have leaders who can approve requests from team members

## Development Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run typecheck    # Run TypeScript checks
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Run database seed script
npx prisma migrate dev  # Create and apply migration (not aliased)
```

### Code Quality
```bash
npx lint-staged      # Run pre-commit hooks (ESLint + Prettier)
npm run prepare      # Setup Husky git hooks
```

**Note**: Testing framework not yet configured. Will be added in Phase 2.

## Key Implementation Phases

### Phase 1: Foundation (Partially Complete)
- ✅ Project initialization with Next.js 15+ and TypeScript
- ✅ Database schema design with Prisma (comprehensive models)
- ✅ Basic project structure with App Router
- ✅ shadcn/ui components foundation
- 🔄 Authentication setup with NextAuth.js v5 (schema ready)
- 🔄 Basic UI components implementation

### Phase 2: Core Features
- Equipment CRUD operations with lifecycle management
- QR code generation and scanning
- Request/approval workflows
- User dashboard interfaces

### Phase 3: Advanced Features
- PWA implementation with offline capabilities
- Reporting and analytics
- File upload and OCR processing
- Software subscription management

## Specialized Subagents

This project includes three custom subagents for specific workflows:

- **todo-agent**: Maintains project todo.md file and progress tracking
- **git-master**: Handles git operations with conventional commits
- **senior-engineer**: Implements all technical features and development tasks

## Development Workflow

### Git Workflow
- Use conventional commits (feat:, fix:, docs:, etc.)
- NEVER use --no-verify flag
- Pre-commit hooks must pass before committing
- Feature branches: feature/, fix/, docs/, refactor/

### Code Standards
- TypeScript strict mode enabled
- Components start with ABOUTME comments
- Mobile-first responsive design
- No mock implementations - always use real data
- Follow existing codebase patterns

## Project Files

### Documentation
- `SPECS.md`: Complete product requirements document (278 lines)
- `TECH-STACK.md`: Technology stack decisions and deployment options
- `todo.md`: Detailed development roadmap with 80+ tasks across 6 phases

### Configuration
- `.claude/agents/`: Custom subagents for specialized workflows
- `.claude/settings.local.json`: Permitted bash operations
- `.gitignore`: Next.js project exclusions

## Equipment Management Features

### Equipment Lifecycle
- Status flow: pending → available → assigned → maintenance/broken → decommissioned
- Complete ownership history tracking
- QR code labels for physical tracking
- Bulk operations for inventory management

### Request System
- Multi-level approval chains (User → Team Lead → Admin)
- Equipment justification requirements
- Status tracking with email notifications
- Audit trail for compliance

### Small Inventory Items
- Quantity-based tracking for items under €150
- Minimum stock level alerts
- Simplified request workflows

## Integration Points

### External Services
- **Turso**: Edge database deployment
- **Uploadthing/S3**: File storage for invoices and photos
- **Google Gemini 2.5 Pro**: OCR for invoice processing
- **PostHog**: Product analytics (Phase 3)

### Compliance Requirements
- 2-year depreciation cycle tracking
- Purchase method classification (ProfiCo, ZOPI, Leasing, Off-the-shelf)
- Annual inventory verification workflows
- Accounting system export capabilities

## Next Steps

The immediate development priorities are outlined in todo.md:
1. ✅ Next.js project initialization
2. ✅ Prisma database schema implementation
3. 🔄 NextAuth.js authentication configuration
4. 🔄 Basic UI components and layouts
5. 🔄 Equipment management features

Refer to todo.md for the complete 6-phase development roadmap with detailed task breakdowns and priority levels.
- Everytime before starting any work use task master sub agent to check todo.md and understand what was done and what should we work on next.