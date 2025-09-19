# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfiCo Inventory Management System - A comprehensive inventory management solution for tracking hardware equipment and software subscriptions with role-based access, approval workflows, and compliance reporting.

**Current Status**: Initial project setup phase. The Next.js application has not yet been initialized.

## Architecture & Technology Stack

### Core Technologies
- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Server Actions
- **Database**: SQLite with Turso for edge deployment, Prisma ORM
- **Authentication**: NextAuth.js v5 with role-based access control
- **UI Components**: shadcn/ui with Radix UI primitives
- **PWA**: next-pwa with offline-first caching strategy
- **File Storage**: Uploadthing or AWS S3
- **QR/Barcode**: @zxing/browser for equipment scanning

### Target Architecture (Post-Setup)
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
- **Equipment**: Hardware tracking with lifecycle management (pending → available → assigned → maintenance → decommissioned)
- **Subscriptions**: Software license management with billing cycles
- **Requests**: Multi-level approval workflows (User → Team Lead → Admin)
- **Users**: Role hierarchy with team assignments

## Development Commands

**Note**: These commands will be available after Next.js project initialization.

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

### Database Operations
```bash
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema to database
npx prisma studio       # Open Prisma Studio
npx prisma migrate dev  # Create and apply migration
```

### Testing
```bash
npm test              # Run Jest unit tests
npm run test:watch    # Run tests in watch mode
npm run test:e2e      # Run Playwright e2e tests
```

## Key Implementation Phases

### Phase 1: Foundation (Current)
- Project initialization with Next.js 14+ and TypeScript
- Database schema design with Prisma
- Authentication setup with NextAuth.js v5
- Basic UI components with shadcn/ui

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

The immediate development priorities are outlined in todo.md Phase 1:
1. Next.js project initialization (currently in progress)
2. Tailwind CSS and project structure setup
3. Prisma database schema implementation
4. NextAuth.js authentication configuration

Refer to todo.md for the complete 6-phase development roadmap with detailed task breakdowns and priority levels.