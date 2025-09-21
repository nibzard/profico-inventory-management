# Troubleshooting Guide - ProfiCo Inventory Management System

## 📋 Table of Contents
1. [Common Issues](#common-issues)
2. [Authentication Problems](#authentication-problems)
3. [Database Issues](#database-issues)
4. [Performance Problems](#performance-problems)
5. [PWA & Mobile Issues](#pwa--mobile-issues)
6. [File Upload Issues](#file-upload-issues)
7. [Email & Notification Issues](#email--notification-issues)
8. [System Administration](#system-administration)

---

## 🚨 Common Issues

### Application Won't Start

#### Issue: Development server fails to start
```bash
Error: Cannot find module 'next'
```

**Solutions:**
1. **Install Dependencies**:
   ```bash
   npm install
   # or
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js Version**:
   ```bash
   node --version  # Should be 18.0.0 or higher
   nvm use 18      # If using nvm
   ```

3. **Clear Next.js Cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

#### Issue: Port already in use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. **Kill Process on Port 3000**:
   ```bash
   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use Different Port**:
   ```bash
   npm run dev -- -p 3001
   ```

### Environment Variable Issues

#### Issue: Environment variables not loading
**Solutions:**
1. **Check File Name**: Ensure file is named `.env.local` (not `.env`)
2. **Restart Server**: Restart development server after changing env vars
3. **Check Syntax**: Ensure no spaces around `=` in environment variables
   ```bash
   # Correct
   DATABASE_URL="file:./dev.db"
   
   # Incorrect
   DATABASE_URL = "file:./dev.db"
   ```

#### Issue: Database connection fails
```bash
Error: Environment variable not found: DATABASE_URL
```

**Solutions:**
1. **Verify Environment File**:
   ```bash
   cat .env.local | grep DATABASE_URL
   ```

2. **Check Environment Loading**:
   ```javascript
   // Add to page/component for debugging
   console.log('DATABASE_URL:', process.env.DATABASE_URL);
   ```

### Build Issues

#### Issue: TypeScript compilation errors
```bash
Type error: Property 'role' does not exist on type 'User'
```

**Solutions:**
1. **Update Types**:
   ```bash
   npm run db:generate  # Regenerate Prisma client
   npm run typecheck    # Check all type errors
   ```

2. **Clear TypeScript Cache**:
   ```bash
   rm -rf .next/cache
   npx tsc --build --clean
   ```

3. **Check Prisma Schema**: Ensure database schema is up to date
   ```bash
   npx prisma db push
   ```

---

## 🔐 Authentication Problems

### Login Issues

#### Issue: Magic link emails not received
**Solutions:**
1. **Check Email Configuration**:
   ```bash
   # Verify environment variables
   echo $RESEND_API_KEY
   echo $FROM_EMAIL
   ```

2. **Check Spam Folder**: Magic links may be filtered as spam

3. **Verify Email Service**:
   ```javascript
   // Test email sending
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"from":"test@yourdomain.com","to":"user@example.com","subject":"Test","html":"Test email"}'
   ```

4. **Check Domain Configuration**: Ensure sending domain is verified with Resend

#### Issue: Authentication redirects not working
**Solutions:**
1. **Check NEXTAUTH_URL**:
   ```bash
   # Development
   NEXTAUTH_URL="http://localhost:3000"
   
   # Production
   NEXTAUTH_URL="https://yourdomain.com"
   ```

2. **Verify Callback URLs**: Ensure callback URLs match in auth provider settings

3. **Clear Browser Cache**: Clear cookies and local storage

#### Issue: Session expires immediately
**Solutions:**
1. **Check System Clock**: Ensure server time is accurate
2. **Verify NEXTAUTH_SECRET**: Ensure secret is properly set and consistent
3. **Check Cookie Settings**: Verify cookie domain and security settings

### Permission Issues

#### Issue: Users can't access admin features
**Solutions:**
1. **Check User Role**:
   ```sql
   -- In Prisma Studio or database
   SELECT id, email, role FROM User WHERE email = 'user@example.com';
   ```

2. **Update User Role**:
   ```javascript
   // In Prisma Studio or via API
   await prisma.user.update({
     where: { email: 'user@example.com' },
     data: { role: 'admin' }
   });
   ```

3. **Verify Middleware**: Check if authentication middleware is working
   ```javascript
   // middleware.ts
   console.log('Session:', token);
   console.log('User role:', token?.role);
   ```

#### Issue: Role-based access not working
**Solutions:**
1. **Check RoleGuard Component**:
   ```typescript
   // Verify role checking logic
   <RoleGuard allowedRoles={['admin', 'team_lead']}>
     <AdminComponent />
   </RoleGuard>
   ```

2. **Verify API Route Protection**:
   ```typescript
   // Check API route authentication
   const session = await getServerSession(authOptions);
   if (!session || !['admin'].includes(session.user.role)) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
   }
   ```

---

## 🗃️ Database Issues

### Connection Problems

#### Issue: Database connection refused
```bash
Error: P1001: Can't reach database server
```

**Solutions:**
1. **SQLite Issues**:
   ```bash
   # Check file permissions
   ls -la prisma/dev.db
   
   # Recreate database
   rm prisma/dev.db
   npx prisma db push
   ```

2. **Turso Issues**:
   ```bash
   # Test connection
   turso db shell profico-inventory
   
   # Verify auth token
   turso auth token
   ```

3. **Check Database URL Format**:
   ```bash
   # SQLite
   DATABASE_URL="file:./dev.db"
   
   # Turso
   DATABASE_URL="libsql://database-name.turso.io?authToken=your-token"
   ```

#### Issue: Prisma client not generated
```bash
Error: @prisma/client did not initialize yet
```

**Solutions:**
1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Install Dependencies**:
   ```bash
   npm install @prisma/client
   npx prisma generate
   ```

3. **Check Schema Syntax**:
   ```bash
   npx prisma validate
   ```

### Migration Issues

#### Issue: Migration fails
```bash
Error: Migration cannot be applied to the database
```

**Solutions:**
1. **Reset Database** (Development only):
   ```bash
   npx prisma migrate reset
   npx prisma db push
   ```

2. **Resolve Migration Conflicts**:
   ```bash
   npx prisma migrate resolve --applied <migration-name>
   ```

3. **Force Migration** (Use carefully):
   ```bash
   npx prisma db push --force-reset
   ```

#### Issue: Schema out of sync
**Solutions:**
1. **Check Schema Differences**:
   ```bash
   npx prisma db pull  # Pull schema from database
   npx prisma format   # Format schema file
   ```

2. **Create New Migration**:
   ```bash
   npx prisma migrate dev --name fix-schema-sync
   ```

### Data Issues

#### Issue: Seed data not loading
**Solutions:**
1. **Run Seed Script**:
   ```bash
   npx prisma db seed
   ```

2. **Check Seed Script**:
   ```javascript
   // prisma/seed.ts
   console.log('Seeding database...');
   // Add logging to debug seed issues
   ```

3. **Manual Data Entry**:
   ```bash
   npx prisma studio  # Use Prisma Studio to add data manually
   ```

---

## ⚡ Performance Problems

### Slow Loading Times

#### Issue: Pages load slowly
**Solutions:**
1. **Enable Production Mode**:
   ```bash
   npm run build
   npm start
   ```

2. **Check Database Queries**:
   ```typescript
   // Add query logging
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   });
   ```

3. **Optimize Database Queries**:
   ```typescript
   // Use select to limit fields
   const equipment = await prisma.equipment.findMany({
     select: {
       id: true,
       name: true,
       status: true,
       assignedTo: {
         select: { name: true, email: true }
       }
     }
   });
   ```

4. **Implement Pagination**:
   ```typescript
   // Add pagination to large datasets
   const equipment = await prisma.equipment.findMany({
     skip: (page - 1) * limit,
     take: limit,
   });
   ```

#### Issue: Large bundle size
**Solutions:**
1. **Analyze Bundle**:
   ```bash
   npm install -g @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

2. **Dynamic Imports**:
   ```typescript
   // Lazy load components
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <div>Loading...</div>
   });
   ```

3. **Remove Unused Dependencies**:
   ```bash
   npm-check-unused  # Install first: npm install -g npm-check-unused
   ```

### Memory Issues

#### Issue: High memory usage
**Solutions:**
1. **Monitor Memory Usage**:
   ```javascript
   // Add memory monitoring
   setInterval(() => {
     const used = process.memoryUsage();
     console.log('Memory usage:', JSON.stringify(used, null, 2));
   }, 10000);
   ```

2. **Optimize Image Handling**:
   ```typescript
   // Use Next.js Image component
   import Image from 'next/image';
   
   <Image
     src="/equipment-photo.jpg"
     width={300}
     height={200}
     placeholder="blur"
   />
   ```

3. **Clean Up Event Listeners**:
   ```typescript
   // Properly clean up in useEffect
   useEffect(() => {
     const handler = () => { /* handler code */ };
     window.addEventListener('resize', handler);
     
     return () => window.removeEventListener('resize', handler);
   }, []);
   ```

---

## 📱 PWA & Mobile Issues

### Installation Problems

#### Issue: PWA install prompt not showing
**Solutions:**
1. **Check PWA Requirements**:
   - HTTPS (or localhost for development)
   - Valid manifest.json
   - Service worker registered
   - User engagement (visit site multiple times)

2. **Verify Manifest**:
   ```bash
   # Check manifest accessibility
   curl -I https://yourdomain.com/manifest.json
   ```

3. **Check Service Worker**:
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(console.log);
   ```

4. **Clear Browser Data**:
   - Clear site data in browser settings
   - Unregister service workers
   - Try in incognito mode

#### Issue: PWA not working offline
**Solutions:**
1. **Check Service Worker Registration**:
   ```javascript
   // In browser dev tools
   Application > Service Workers
   ```

2. **Verify Cache Strategy**:
   ```javascript
   // Check cached resources
   Application > Storage > Cache Storage
   ```

3. **Update Service Worker**:
   ```bash
   # Force service worker update
   # In browser console:
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.update());
   });
   ```

### Mobile-Specific Issues

#### Issue: QR scanner not working on mobile
**Solutions:**
1. **Check Camera Permissions**:
   - Go to browser settings
   - Allow camera access for the site

2. **iOS Safari Issues**:
   ```javascript
   // Add iOS-specific camera handling
   if (iOS && !navigator.userAgent.includes('CriOS')) {
     // Use different camera API for iOS Safari
   }
   ```

3. **Android Chrome Issues**:
   - Ensure site is served over HTTPS
   - Check if camera is being used by another app

#### Issue: Touch interactions not working
**Solutions:**
1. **Add Touch Event Handlers**:
   ```typescript
   // Add touch support
   const handleTouch = (e: TouchEvent) => {
     e.preventDefault();
     // Handle touch
   };
   
   element.addEventListener('touchstart', handleTouch, { passive: false });
   ```

2. **Check CSS Touch Actions**:
   ```css
   /* Ensure touch actions are enabled */
   .interactive-element {
     touch-action: manipulation;
   }
   ```

---

## 📎 File Upload Issues

### Upload Failures

#### Issue: File uploads fail
**Solutions:**
1. **Check File Size Limits**:
   ```typescript
   // Verify UploadThing configuration
   const f = createUploadthing();
   
   export const ourFileRouter = {
     imageUploader: f({ image: { maxFileSize: "4MB" } })
   };
   ```

2. **Check UploadThing Configuration**:
   ```bash
   # Verify environment variables
   echo $UPLOADTHING_SECRET
   echo $UPLOADTHING_APP_ID
   ```

3. **Network Issues**:
   ```javascript
   // Add upload error handling
   try {
     const res = await uploadFiles(endpoint, { files });
   } catch (error) {
     console.error('Upload failed:', error);
     // Show user-friendly error message
   }
   ```

#### Issue: Images not displaying
**Solutions:**
1. **Check File URLs**:
   ```javascript
   // Verify file URL format
   console.log('File URL:', fileUrl);
   ```

2. **CORS Issues**:
   ```typescript
   // Check if CORS headers are needed
   const response = await fetch(fileUrl, {
     mode: 'cors',
     credentials: 'include'
   });
   ```

3. **File Permissions**:
   ```bash
   # Check file permissions (for local storage)
   ls -la uploads/
   ```

### OCR Processing Issues

#### Issue: OCR not extracting data
**Solutions:**
1. **Check Google API Key**:
   ```bash
   # Verify API key is set
   echo $GOOGLE_API_KEY
   ```

2. **Test OCR Service**:
   ```javascript
   // Test Google Gemini API
   const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
     headers: {
       'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`
     }
   });
   ```

3. **Image Quality Issues**:
   - Ensure images are clear and readable
   - Check image format (PDF, PNG, JPG supported)
   - Verify image size (not too large or small)

---

## 📧 Email & Notification Issues

### Email Delivery Problems

#### Issue: Emails not being sent
**Solutions:**
1. **Check Resend Configuration**:
   ```bash
   # Test Resend API
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "test@yourdomain.com",
       "to": "recipient@example.com",
       "subject": "Test Email",
       "html": "This is a test email"
     }'
   ```

2. **Verify Domain Settings**:
   - Check if sending domain is verified
   - Verify SPF and DKIM records
   - Check domain reputation

3. **Check Email Logs**:
   ```javascript
   // Add logging to email service
   console.log('Sending email:', { to, subject, from });
   ```

#### Issue: Emails going to spam
**Solutions:**
1. **Improve Email Content**:
   - Use proper HTML structure
   - Include text version
   - Avoid spam trigger words

2. **Domain Authentication**:
   ```dns
   # Add SPF record
   TXT @ "v=spf1 include:_spf.resend.com ~all"
   
   # Add DKIM record (provided by Resend)
   TXT resend._domainkey "v=DKIM1; k=rsa; p=..."
   ```

3. **Sender Reputation**:
   - Use consistent "From" address
   - Monitor bounce rates
   - Implement proper unsubscribe handling

### Notification Issues

#### Issue: Push notifications not working
**Solutions:**
1. **Check Service Worker**:
   ```javascript
   // Verify push notification support
   if ('serviceWorker' in navigator && 'PushManager' in window) {
     // Push notifications supported
   }
   ```

2. **Request Permissions**:
   ```javascript
   // Request notification permission
   const permission = await Notification.requestPermission();
   console.log('Notification permission:', permission);
   ```

3. **Check Browser Support**:
   - iOS Safari: Limited push notification support
   - Chrome/Firefox: Full support
   - Check if notifications are blocked in browser settings

---

## ⚙️ System Administration

### Log Analysis

#### Issue: Finding error logs
**Solutions:**
1. **Next.js Logs**:
   ```bash
   # Development logs
   npm run dev 2>&1 | tee logs/dev.log
   
   # Production logs (PM2)
   pm2 logs profico-inventory
   ```

2. **Database Logs**:
   ```javascript
   // Enable Prisma logging
   const prisma = new PrismaClient({
     log: ['query', 'error', 'info', 'warn'],
   });
   ```

3. **Browser Console Logs**:
   ```javascript
   // Add detailed logging
   console.log('Debug info:', { user, equipment, action });
   ```

#### Issue: Performance monitoring
**Solutions:**
1. **Add Performance Tracking**:
   ```javascript
   // Track API response times
   console.time('API Call');
   const result = await fetch('/api/equipment');
   console.timeEnd('API Call');
   ```

2. **Monitor Resource Usage**:
   ```bash
   # Server resource monitoring
   top -p $(pgrep -f "npm\|node")
   htop
   ```

3. **Database Performance**:
   ```sql
   -- Check slow queries (SQLite)
   PRAGMA compile_options;
   
   -- Enable query logging
   PRAGMA query_only = ON;
   ```

### Backup and Recovery

#### Issue: Database backup fails
**Solutions:**
1. **SQLite Backup**:
   ```bash
   # Create backup
   sqlite3 prisma/dev.db ".backup backup.db"
   
   # Restore backup
   sqlite3 prisma/dev.db ".restore backup.db"
   ```

2. **Turso Backup**:
   ```bash
   # Export database
   turso db dump profico-inventory --output backup-$(date +%Y%m%d).sql
   
   # Restore database
   turso db shell profico-inventory < backup.sql
   ```

3. **File Backup**:
   ```bash
   # Backup uploads directory
   tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
   ```

### Security Issues

#### Issue: Suspicious activity detected
**Solutions:**
1. **Check Access Logs**:
   ```bash
   # Nginx access logs
   tail -f /var/log/nginx/access.log | grep "POST\|PUT\|DELETE"
   
   # Application logs
   grep "401\|403\|500" logs/combined.log
   ```

2. **Review User Activity**:
   ```sql
   -- Check recent user logins
   SELECT email, createdAt FROM Session 
   ORDER BY createdAt DESC LIMIT 50;
   ```

3. **Security Measures**:
   ```bash
   # Change secrets
   export NEXTAUTH_SECRET="$(openssl rand -base64 32)"
   
   # Update API keys
   # Rotate all external service keys
   ```

### Deployment Issues

#### Issue: Production deployment fails
**Solutions:**
1. **Check Build Process**:
   ```bash
   # Local build test
   npm run build
   npm run start
   ```

2. **Environment Variables**:
   ```bash
   # Verify all production env vars are set
   env | grep -E "(DATABASE_URL|NEXTAUTH_SECRET|RESEND_API_KEY)"
   ```

3. **Dependencies**:
   ```bash
   # Clear and reinstall dependencies
   rm -rf node_modules package-lock.json
   npm ci --only=production
   ```

### Getting Help

#### Issue: Need additional support
**Resources:**
1. **Documentation**: Check all documentation files in `/docs`
2. **GitHub Issues**: Search existing issues or create new one
3. **Community Support**: Check with other users in your organization
4. **Professional Support**: Contact system administrator or development team

#### Diagnostic Information
When reporting issues, include:
- **System Information**: OS, Node.js version, browser version
- **Error Messages**: Complete error messages and stack traces
- **Steps to Reproduce**: Detailed steps that lead to the issue
- **Environment**: Development, staging, or production
- **Recent Changes**: Any recent code or configuration changes

---

*This troubleshooting guide covers the most common issues encountered with the ProfiCo Inventory Management System. For additional help, consult the other documentation files or contact your system administrator.*