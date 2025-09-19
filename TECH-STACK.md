## Frontend

### Next.js App Router (v14+)
```
- App Router for modern routing and server components
- TypeScript for type safety
- Tailwind CSS for styling
- React Hook Form + Zod for form validation
- Tanstack Query for server state management
- Zustand for client state management
```

### PWA Configuration
```
- next-pwa for PWA setup
- Workbox for service worker management
- Web App Manifest for installability
- Offline-first caching strategy for critical data
```

### QR/Barcode Scanning
```
- @zxing/browser for QR code scanning
- html5-qrcode as alternative/fallback
- Camera API integration
- File upload fallback for devices without camera
```

### UI Components
```
- shadcn/ui for consistent component library
- Radix UI primitives for accessibility
- Lucide React for icons
- React Hot Toast for notifications
```

## Backend

### Alternative: Next.js API Routes
```
- Keep everything in Next.js monorepo
- API routes with App Router
- Server actions for mutations
- Simpler deployment but less flexible scaling
```

## Database

### Alternative: SQLite with Turso
```
- Simpler setup for smaller teams
- Edge deployment capabilities
- Still relational with good performance
```

## File Storage & Processing

### File Uploads
```
- Uploadthing (Next.js optimized) or AWS S3
- PDF.js for invoice parsing
- Google Gemini 2.5 pro API for image recognition

```

## Authentication & Authorization

### NextAuth.js v5
```
- Role-based access control
- Email/password + OAuth providers
- Session management
- Invitation-based user creation
```

## Additional Tools

### Development
```
- ESLint + Prettier for code quality
- Husky for git hooks
- Docker for containerization
- GitHub Actions for CI/CD
```

### Monitoring & Analytics
```
- PostHog for product analytics
```

## Deployment Options

### Recommended: Vercel + Railway/Supabase
```
Frontend: Vercel (excellent Next.js integration)
Backend: Railway or Fly.io
Database: Supabase PostgreSQL or Railway PostgreSQL
Files: Vercel Blob or S3
```

### Alternative: Self-hosted
```
- Docker containers on VPS
- Nginx reverse proxy
- PostgreSQL instance
- Backup automation
```

## Project Structure
```
inventory-management/
├── apps/
│   ├── web/                 # Next.js app
│   └── api/                 # Fastify API (optional)
├── packages/
│   ├── ui/                  # Shared components
│   ├── database/            # Prisma schema
│   ├── types/               # TypeScript types
│   └── utils/               # Shared utilities
├── docker-compose.yml
└── package.json
```

## Key PWA Features to Implement

1. **Offline Capability**: Cache equipment lists and allow offline QR scanning
2. **Push Notifications**: Equipment requests and inventory reminders  
3. **Background Sync**: Sync offline actions when connection returns
4. **Install Prompt**: Custom install banner for mobile users
5. **Camera Integration**: Direct camera access for QR scanning


