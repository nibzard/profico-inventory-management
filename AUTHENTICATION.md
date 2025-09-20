# Magic Link Authentication Setup

## Overview

ProfiCo Inventory Management System uses **passwordless magic link authentication** powered by NextAuth.js v5 and Resend for secure, user-friendly access.

## Features

- ✨ **Passwordless Authentication**: Users sign in via email magic links
- 🔐 **Role-Based Access Control**: Three-tier permission system (Admin, Team Lead, User)
- 🚀 **Automatic User Registration**: New users are automatically created on first sign-in
- 🛡️ **Secure by Default**: JWT sessions with database persistence
- 📧 **Professional Email Delivery**: Resend for reliable magic link delivery

## Architecture

### Authentication Flow

1. **Sign-in Request**: User enters email address
2. **Magic Link Generation**: NextAuth.js generates secure verification token
3. **Email Delivery**: Resend sends magic link to user's email
4. **Link Verification**: User clicks link, NextAuth.js validates token
5. **Session Creation**: Authenticated session with role-based permissions

### Role Hierarchy

```typescript
export const roleHierarchy: Record<UserRole, number> = {
  user: 1,        // Personal equipment view, create requests
  team_lead: 2,   // Team management, approve requests, assign equipment
  admin: 3,       // Full system access, user management, reports
};
```

## Configuration

### Environment Variables

```bash
# Required
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secure-random-secret"
RESEND_API_KEY="re_your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"

# Database
DATABASE_URL="your-database-connection-string"
```

### NextAuth.js Configuration

Located in `src/lib/auth.ts`:

```typescript
export const config = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Auto-create users on first sign-in
      if (account?.provider === "resend") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split('@')[0],
              role: "user" as UserRole,
              emailVerified: new Date(),
            },
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token }) {
      // Fetch latest user role from database
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true, id: true },
        });
        
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.id = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
};
```

## Setup Instructions

### 1. Resend Configuration

1. **Create Resend Account**: Visit [resend.com](https://resend.com)
2. **Generate API Key**: Go to API Keys → Create API Key
3. **Verify Domain**: Add your domain for professional email delivery
4. **Set Environment Variables**:
   ```bash
   RESEND_API_KEY="re_xxxxxxxxxxxx"
   EMAIL_FROM="noreply@yourdomain.com"
   ```

### 2. Database Setup

Ensure your Prisma User model includes required fields:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          String    @default("user")
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // NextAuth.js required fields
  accounts Account[]
  sessions Session[]
  
  // Your app relations
  ownedEquipment Equipment[] @relation("EquipmentOwner")
  // ... other relations
}

// NextAuth.js required models
model Account {
  // ... NextAuth.js account fields
}

model Session {
  // ... NextAuth.js session fields
}

model VerificationToken {
  // ... NextAuth.js verification token fields
}
```

### 3. Middleware Protection

Routes are protected via middleware in `src/middleware.ts`:

```typescript
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes
  const publicRoutes = ["/", "/auth/signin"];
  
  // Role-based route protection
  const adminRoutes = ["/admin"];
  const managerRoutes = ["/requests/approve", "/equipment/assign"];

  // Redirect logic based on authentication and roles
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  if (session?.user?.role !== "admin" && isAdminRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});
```

## Usage

### Component-Level Protection

```typescript
import { RoleGuard, AdminOnly, ManagersOnly } from '@/components/auth/role-guard';

// General role protection
<RoleGuard allowedRoles={["admin", "team_lead"]}>
  <AdminPanel />
</RoleGuard>

// Convenience components
<AdminOnly>
  <UserManagement />
</AdminOnly>

<ManagersOnly fallback={<AccessDenied />}>
  <ApprovalWorkflow />
</ManagersOnly>
```

### Hook-Based Permissions

```typescript
import { useAuth } from '@/hooks/use-auth';

function EquipmentList() {
  const { user, permissions } = useAuth();

  return (
    <div>
      {permissions.canManageEquipment && <AddEquipmentButton />}
      {permissions.canApproveRequests && <PendingRequests />}
      {permissions.canAccessReports && <ReportsLink />}
    </div>
  );
}
```

## Email Templates

Resend uses default NextAuth.js email templates. For custom branding:

1. **Override Templates**: Implement custom email templates in NextAuth.js config
2. **Brand Assets**: Add logo and styling to match your company branding
3. **Localization**: Add multi-language support if needed

## Security Features

- **Token Expiration**: Magic links expire in 24 hours
- **Single Use**: Each token can only be used once
- **CSRF Protection**: Built-in CSRF protection
- **Secure Cookies**: httpOnly, secure, sameSite cookies
- **JWT Signing**: Tokens signed with NEXTAUTH_SECRET

## Testing

### Local Development

1. **Set Test Environment**:
   ```bash
   NEXTAUTH_URL="http://localhost:3000"
   # Use Resend sandbox mode for testing
   ```

2. **Create Test Users**: Database seeding with different roles
3. **Test Magic Links**: Check email delivery and link validation

### Production Deployment

1. **Domain Verification**: Verify sending domain with Resend
2. **Environment Variables**: Set production API keys and secrets
3. **Database Migration**: Run Prisma migrations
4. **Health Checks**: Verify authentication flow

## Troubleshooting

### Common Issues

1. **Magic Link Not Received**:
   - Check spam folder
   - Verify Resend API key and domain
   - Check rate limits

2. **Authentication Errors**:
   - Verify NEXTAUTH_SECRET is set
   - Check database connectivity
   - Validate environment variables

3. **Role Permission Issues**:
   - Verify user role in database
   - Check middleware configuration
   - Validate role hierarchy

### Debug Mode

Enable NextAuth.js debug logging:

```bash
NEXTAUTH_DEBUG=true
```

## Migration from Password Auth

If migrating from password authentication:

1. **Remove Password Fields**: Clean up database schema
2. **Update UI Components**: Replace password forms with magic link UI
3. **User Communication**: Notify users about the change
4. **Fallback Support**: Consider temporary dual authentication

## Best Practices

- **Regular Security Audits**: Review authentication logs
- **Role Management**: Implement admin interface for role changes
- **Email Monitoring**: Monitor delivery rates and bounce handling
- **Session Management**: Implement proper logout and session cleanup
- **Rate Limiting**: Protect against magic link abuse

## Support

For issues or questions:
- Check NextAuth.js documentation: [next-auth.js.org](https://next-auth.js.org)
- Resend documentation: [resend.com/docs](https://resend.com/docs)
- Project repository issues