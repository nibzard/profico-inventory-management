# AGENTS.md

## Commands
- **Dev/Build**: `npm run dev` (with turbopack), `npm run build`, `npm start`
- **Linting**: `npm run lint`, `npm run lint:fix`, `npm run typecheck`  
- **Database**: `npm run db:push`, `npm run db:generate`, `npm run db:studio`, `npm run db:seed`
- **Format**: `npm run format`, `npm run format:check`

## Architecture
- **Next.js 15** app router with TypeScript strict mode
- **Database**: SQLite + Prisma ORM, seed data via `prisma/seed.ts`
- **Auth**: NextAuth.js v5 with role-based access (User/Team Lead/Admin)
- **UI**: shadcn/ui components, Tailwind CSS 4, Radix UI primitives
- **Core domains**: Equipment lifecycle, Subscriptions, Approval workflows

## Code Style
- **Imports**: Use `@/*` aliases for src imports
- **Components**: shadcn/ui pattern, functional components with TypeScript
- **Formatting**: Prettier (semicolons, double quotes, 2 spaces, 80 char width)
- **Forms**: react-hook-form + Zod validation
- **Error handling**: Use react-hot-toast/sonner for notifications
- **Database**: Prisma models in schema.prisma, use @auth/prisma-adapter

## Project Guidelines
- TypeScript strict mode required
- Follow existing component structure (ui/, forms/, layout/ organization)
- Mobile-first responsive design
- Equipment status flow: pending → available → assigned → maintenance → decommissioned
