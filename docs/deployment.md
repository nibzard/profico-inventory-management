# Deployment Guide - ProfiCo Inventory Management System

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Development Environment](#development-environment)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Configuration](#security-configuration)

---

## 💻 System Requirements

### Minimum Requirements

#### Development Environment
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (or yarn/pnpm equivalent)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space for dependencies and build cache
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

#### Production Environment
- **Node.js**: Version 18.x LTS or 20.x LTS
- **Memory**: 2GB RAM minimum, 4GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Storage**: 10GB minimum, 50GB recommended
- **Network**: Stable internet connection for external services

### External Services

#### Required Services
1. **Database**: SQLite (development) or Turso (production)
2. **Email Service**: Resend or compatible SMTP provider
3. **File Storage**: UploadThing or S3-compatible storage
4. **OCR Service**: Google Gemini 2.5 Pro API access

#### Optional Services
- **Analytics**: PostHog or Google Analytics
- **Error Monitoring**: Sentry or similar service
- **CDN**: Cloudflare or similar CDN provider
- **Load Balancer**: For high-availability deployments

---

## 🔧 Development Environment

### Initial Setup

#### 1. Clone Repository
```bash
git clone https://github.com/your-org/profico-inventory-management.git
cd profico-inventory-management
```

#### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

#### 4. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database (optional)
npm run db:seed
```

#### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Development Scripts

#### Common Commands
```bash
# Development server with Turbopack
npm run dev

# Type checking
npm run typecheck

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema changes
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed database

# Testing
npm run test          # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Build and production
npm run build         # Build for production
npm run start         # Start production server
```

### Development Tools

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

#### Git Hooks
```bash
# Install git hooks
npm run prepare

# Pre-commit hooks will run:
# - ESLint with auto-fix
# - Prettier formatting
# - TypeScript type checking
```

---

## 🚀 Production Deployment

### Vercel Deployment (Recommended)

#### 1. Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod
```

#### 2. Environment Variables
Configure in Vercel dashboard or via CLI:

```bash
# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add RESEND_API_KEY
# ... add all required variables
```

#### 3. Custom Domain Setup
```bash
# Add custom domain
vercel domains add yourdomain.com

# Configure DNS records as shown in Vercel dashboard
```

### Docker Deployment

#### 1. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - RESEND_API_KEY=${RESEND_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. Build and Deploy
```bash
# Build Docker image
docker build -t profico-inventory .

# Run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Traditional VPS Deployment

#### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

#### 2. Application Setup
```bash
# Clone repository
git clone https://github.com/your-org/profico-inventory-management.git
cd profico-inventory-management

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push
```

#### 3. PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'profico-inventory',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/profico-inventory-management',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### 4. Start with PM2
```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### 5. Nginx Configuration
```nginx
# /etc/nginx/sites-available/profico-inventory
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # PWA files
    location /manifest.json {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /sw.js {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

## ⚙️ Environment Configuration

### Environment Variables

#### Required Variables
```bash
# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="libsql://[DATABASE-NAME]-[ORG-NAME].turso.io?authToken=[TOKEN]"  # Turso for production

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"  # Update for production

# Email Service
RESEND_API_KEY="re_xxxxxxxxxx"
FROM_EMAIL="noreply@yourdomain.com"

# File Upload
UPLOADTHING_SECRET="sk_live_xxxxxxxxxx"
UPLOADTHING_APP_ID="your-app-id"

# OCR Service
GOOGLE_API_KEY="your-google-gemini-api-key"

# External Services (Optional)
POSTHOG_KEY="phc_xxxxxxxxxx"
POSTHOG_HOST="https://app.posthog.com"
SENTRY_DSN="https://xxxxxxxxxx@sentry.io/xxxxxxxxxx"
```

#### Environment-Specific Configuration

##### Development (.env.local)
```bash
NODE_ENV=development
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key"

# Development services
RESEND_API_KEY="re_dev_xxxxxxxxxx"
UPLOADTHING_SECRET="sk_dev_xxxxxxxxxx"
```

##### Production (.env.production)
```bash
NODE_ENV=production
DATABASE_URL="libsql://production-db.turso.io?authToken=your-token"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="secure-production-secret-key"

# Production services
RESEND_API_KEY="re_live_xxxxxxxxxx"
UPLOADTHING_SECRET="sk_live_xxxxxxxxxx"
```

### Configuration Management

#### Vercel Environment Variables
```bash
# Set production variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add RESEND_API_KEY production

# Set preview variables
vercel env add DATABASE_URL preview
vercel env add NEXTAUTH_SECRET preview

# Set development variables
vercel env add DATABASE_URL development
```

#### Docker Environment Variables
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - RESEND_API_KEY=${RESEND_API_KEY}
    env_file:
      - .env.production
```

---

## 🗃️ Database Setup

### SQLite (Development)

#### Local Development
```bash
# Initialize database
npm run db:push

# View data in Prisma Studio
npm run db:studio

# Reset database
rm prisma/dev.db
npm run db:push
```

### Turso (Production)

#### Turso Setup
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create profico-inventory --location closest

# Get database URL
turso db show profico-inventory --url

# Create authentication token
turso db tokens create profico-inventory
```

#### Database Configuration
```bash
# Update environment variable
DATABASE_URL="libsql://profico-inventory-[org].turso.io?authToken=[token]"

# Push schema to Turso
npx prisma db push
```

#### Database Migration
```bash
# Generate migration
npx prisma migrate dev --name initial

# Deploy migration to production
npx prisma migrate deploy
```

### Database Backup

#### SQLite Backup
```bash
# Manual backup
cp prisma/dev.db backups/dev-$(date +%Y%m%d).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
cp prisma/dev.db "$BACKUP_DIR/dev-$DATE.db"
```

#### Turso Backup
```bash
# Export database
turso db dump profico-inventory --output backup.sql

# Restore from backup
turso db shell profico-inventory < backup.sql
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

#### Main Workflow
```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Generate Prisma client
        run: npx prisma generate
      
      - name: Build application
        run: npm run build

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### Environment-Specific Deployments
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Docker CI/CD

#### Docker Build and Push
```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: your-org/profico-inventory
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

### Deployment Scripts

#### Automated Deployment Script
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Restart application
pm2 restart profico-inventory

echo "✅ Deployment completed successfully!"
```

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

URL="https://yourdomain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application health check failed (HTTP $RESPONSE)"
    exit 1
fi
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring

#### Health Checks
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}
```

#### Performance Monitoring
```typescript
// src/lib/monitoring.ts
export function trackPerformance(name: string, fn: () => Promise<any>) {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn.apply(this, args);
      const duration = performance.now() - start;
      
      // Log performance metrics
      console.log(`${name} completed in ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}
```

### Log Management

#### Structured Logging
```typescript
// src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

#### Error Tracking with Sentry
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});

export { Sentry };
```

### Backup Strategies

#### Automated Database Backup
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/$(date +%Y/%m)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Export database
turso db dump profico-inventory --output "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Clean old backups (keep 30 days)
find /backups -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
```

#### File Backup
```bash
#!/bin/bash
# backup-files.sh

SOURCE_DIR="/app/uploads"
BACKUP_DIR="/backups/files/$(date +%Y/%m)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create tar archive
tar -czf "$BACKUP_DIR/files_$TIMESTAMP.tar.gz" -C "$SOURCE_DIR" .

# Clean old backups
find /backups/files -name "*.tar.gz" -mtime +60 -delete

echo "File backup completed: $BACKUP_DIR/files_$TIMESTAMP.tar.gz"
```

---

## 🔒 Security Configuration

### SSL/TLS Configuration

#### Nginx SSL Setup
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;

# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

#### Let's Encrypt SSL
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

#### UFW Firewall Setup
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow only specific IPs for admin access (optional)
sudo ufw allow from YOUR_IP_ADDRESS to any port 22
```

### Security Headers

#### Next.js Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Environment Security

#### Secrets Management
```bash
# Use environment variables for secrets
export DATABASE_URL="secure-connection-string"
export NEXTAUTH_SECRET="$(openssl rand -base64 32)"
export RESEND_API_KEY="re_live_xxxxxxxxxx"

# Never commit secrets to git
echo "*.env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

#### Production Security Checklist
- [ ] All secrets stored in environment variables
- [ ] Database connections encrypted
- [ ] SSL/TLS certificates configured
- [ ] Security headers implemented
- [ ] Rate limiting enabled
- [ ] Regular security updates applied
- [ ] Access logs monitored
- [ ] Backup strategy implemented
- [ ] Error reporting configured
- [ ] Performance monitoring active

---

*This deployment guide provides comprehensive instructions for deploying the ProfiCo Inventory Management System in various environments. For system administration, see the [Admin Guide](admin-guide.md), and for troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).*