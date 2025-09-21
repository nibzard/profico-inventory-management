# ProfiCo Inventory Management System - Documentation

## 📋 Table of Contents

### User Documentation
- **[User Guide](user-guide.md)** - Complete guide for all user roles and daily operations
- **[Mobile & PWA Guide](mobile-pwa-guide.md)** - Progressive Web App features and mobile usage
- **[Admin Guide](admin-guide.md)** - System administration and configuration

### Technical Documentation
- **[API Reference](api-reference.md)** - Complete API documentation with examples
- **[Deployment Guide](deployment.md)** - Installation, configuration, and deployment
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

---

## 🚀 Quick Start

The ProfiCo Inventory Management System is a comprehensive solution for tracking hardware equipment and software subscriptions with role-based access, approval workflows, and compliance reporting.

### Key Features
- **Equipment Management**: Complete lifecycle tracking with QR codes and photo management
- **Request/Approval Workflows**: Multi-level approval chains with email notifications
- **Software Subscriptions**: Billing management with OCR invoice processing
- **Progressive Web App**: Offline capabilities with mobile optimization
- **Role-Based Access**: Admin, Team Lead, and User roles with granular permissions
- **Reporting & Analytics**: Depreciation tracking and compliance reporting

### User Roles

| Role | Access Level | Key Capabilities |
|------|-------------|------------------|
| **Regular User** | Personal equipment | View equipment, submit requests, report issues |
| **Team Lead** | Team management | Approve requests, assign equipment, manage team members |
| **Admin** | Full system | User management, reports, system configuration |

---

## 🏗️ System Architecture

### Technology Stack
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Server Actions
- **Database**: SQLite with Prisma ORM (Turso for production)
- **Authentication**: NextAuth.js v5 with magic link authentication
- **PWA**: Advanced offline capabilities with IndexedDB
- **OCR**: Google Gemini 2.5 Pro for invoice processing

### Core Components
- **Equipment Management**: CRUD operations, lifecycle tracking, QR codes
- **Request System**: Multi-level approval workflows with audit trails
- **Subscription Management**: Billing cycles, payment tracking, analytics
- **File Management**: Photo uploads, invoice OCR, document storage
- **PWA Features**: Offline sync, mobile optimization, installation prompts

---

## 📱 Getting Started

### For End Users
1. **Access the System**: Navigate to your organization's ProfiCo URL
2. **Sign In**: Use your email address for magic link authentication
3. **Install PWA**: Follow the installation prompt for mobile app experience
4. **View Equipment**: Browse your assigned equipment and request new items
5. **Mobile Usage**: Use QR scanner for quick equipment identification

### For Administrators
1. **Initial Setup**: Follow the [Deployment Guide](deployment.md)
2. **User Management**: Invite users and configure teams
3. **Equipment Setup**: Import equipment inventory and configure categories
4. **Workflow Configuration**: Set up approval chains and notifications

---

## 📚 Documentation Structure

### User-Focused Documentation
- **User guides** with step-by-step instructions and screenshots
- **Mobile-specific guidance** for PWA features and QR scanning
- **Role-based workflows** tailored to each user type

### Technical Documentation
- **Complete API reference** with TypeScript types and examples
- **Deployment procedures** for development and production environments
- **Troubleshooting guides** for common issues and solutions

### Administrative Resources
- **Configuration management** for system settings and workflows
- **Maintenance procedures** for ongoing system health
- **Security guidelines** and best practices

---

## 🔗 Quick Links

### For Users
- [Getting Started with Equipment Management](user-guide.md#equipment-management)
- [How to Request Equipment](user-guide.md#requesting-equipment)
- [Using the Mobile App](mobile-pwa-guide.md#installation-guide)
- [QR Code Scanning](mobile-pwa-guide.md#qr-code-scanning)

### For Team Leads
- [Approving Requests](user-guide.md#team-lead-approval-workflows)
- [Managing Team Equipment](user-guide.md#team-equipment-management)
- [Assignment Workflows](user-guide.md#equipment-assignment)

### For Administrators
- [System Configuration](admin-guide.md#system-configuration)
- [User Management](admin-guide.md#user-management)
- [Reports and Analytics](admin-guide.md#reports-analytics)
- [Deployment Setup](deployment.md#installation)

### For Developers
- [API Endpoints](api-reference.md#core-endpoints)
- [Authentication Flow](api-reference.md#authentication)
- [Database Schema](api-reference.md#database-models)
- [Development Setup](deployment.md#development-environment)

---

## 📞 Support

For technical support or questions about this documentation:
- Review the [Troubleshooting Guide](troubleshooting.md)
- Check the [API Reference](api-reference.md) for integration questions
- Contact your system administrator for access-related issues

---

*Last Updated: September 2025*
*Version: 1.0.0 (Production Ready)*