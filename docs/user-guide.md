# User Guide - ProfiCo Inventory Management System

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [Equipment Management](#equipment-management)
3. [Requesting Equipment](#requesting-equipment)
4. [Team Lead Features](#team-lead-features)
5. [Admin Features](#admin-features)
6. [Mobile & PWA Usage](#mobile--pwa-usage)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Account Access
1. **Receive Invitation**: You'll receive an email invitation to join the system
2. **Sign In**: Click the link in your email and use magic link authentication
3. **First Login**: Complete your profile setup with name and contact information
4. **Dashboard Access**: You'll be directed to your role-appropriate dashboard

### User Roles

#### Regular User
- View and manage your assigned equipment
- Submit equipment requests
- Report equipment issues or maintenance needs
- Add notes and ratings to equipment

#### Team Lead/Manager
- All regular user capabilities
- Approve/reject team member requests
- Assign equipment between team members
- View team equipment overview
- Invite new users to the system

#### Admin
- Full system access and configuration
- User and team management
- Equipment inventory management
- System reports and analytics
- Compliance and audit features

---

## 🖥️ Equipment Management

### Viewing Your Equipment

#### Personal Dashboard
1. **Navigate** to your dashboard after signing in
2. **Equipment Overview**: See all equipment assigned to you
3. **Status Indicators**: 
   - 🟢 **Available**: Ready for use
   - 🟡 **In Use**: Currently assigned
   - 🔴 **Maintenance**: Under repair
   - ⚫ **Broken**: Needs replacement

#### Equipment Details
1. **Click Equipment**: Select any equipment item for detailed view
2. **Information Available**:
   - Equipment specifications and serial number
   - Assignment history and previous users
   - Maintenance records and issues
   - Photos and documentation
   - QR code for mobile identification

#### Equipment Actions
- **Report Issue**: Submit maintenance requests or report problems
- **Add Notes**: Record usage notes or observations
- **Upload Photos**: Add pictures for documentation
- **View History**: See complete assignment and maintenance history

### Equipment Categories

#### Work Equipment (Individual Assignment)
- **Computers**: Laptops, desktops, workstations
- **Mobile Devices**: Phones, tablets, smartwatches
- **Peripherals**: Monitors, keyboards, mice, headsets
- **Audio/Video**: Cameras, microphones, speakers

#### Shared Equipment
- **Meeting Room**: Projectors, conference phones, whiteboards
- **Kitchen**: Coffee machines, appliances, utensils
- **Office Supplies**: Printers, scanners, office furniture

#### Small Inventory Items (Under €150)
- Cables, adapters, and accessories
- Office supplies and consumables
- Simplified tracking with quantity management

---

## 📋 Requesting Equipment

### Creating Equipment Requests

#### Step 1: Navigate to Requests
1. **Dashboard Menu**: Click "Equipment Requests" or "New Request"
2. **Request Type**: Choose between new equipment or replacement

#### Step 2: Fill Request Form
1. **Equipment Details**:
   - Category (Computer, Mobile Device, etc.)
   - Specific model or specifications
   - Priority level (Low, Medium, High, Urgent)
2. **Justification**:
   - Business reason for the equipment
   - Expected usage and duration
   - Budget considerations if known
3. **Additional Information**:
   - Preferred delivery date
   - Special requirements or configurations
   - Supporting documentation (if any)

#### Step 3: Submit and Track
1. **Review**: Verify all information is correct
2. **Submit**: Click "Submit Request"
3. **Confirmation**: Receive email confirmation with request ID
4. **Track Progress**: Monitor status in your dashboard

### Request Status Flow

```
Pending → Team Lead Review → Admin Review → Approved → Fulfilled
    ↓         ↓                 ↓           ↓
Rejected ← Rejected ← Rejected ← Back for Changes
```

#### Status Descriptions
- **Pending**: Awaiting initial review
- **Under Review**: Being evaluated by approvers
- **Approved**: Request approved, awaiting fulfillment
- **Rejected**: Request denied with reason provided
- **Fulfilled**: Equipment delivered and assigned
- **Cancelled**: Request withdrawn by requester

### Request Management

#### Viewing Your Requests
1. **Requests Page**: Access from main navigation
2. **Request List**: See all your submitted requests
3. **Filter Options**: Sort by status, date, or priority
4. **Search**: Find specific requests quickly

#### Request Details
- **Timeline View**: Visual progress through approval stages
- **Comments**: Communication with approvers
- **Attachments**: Supporting documents or specifications
- **Approval Chain**: See who needs to approve and their status

#### Modifying Requests
- **Edit Draft**: Modify requests that haven't been submitted
- **Add Comments**: Provide additional information to approvers
- **Cancel Request**: Withdraw pending requests if no longer needed
- **Request Changes**: Work with approvers to refine requirements

---

## 👥 Team Lead Features

### Team Equipment Management

#### Team Overview Dashboard
1. **Navigate**: Access "Team Equipment" from main menu
2. **Equipment Grid**: View all equipment assigned to team members
3. **Status Summary**: Quick overview of equipment status across team
4. **Member Filter**: View equipment by specific team member

#### Team Member Management
- **View Members**: See all team members and their equipment
- **Equipment Assignment**: Assign available equipment to team members
- **Transfer Equipment**: Move equipment between team members
- **Monitor Usage**: Track equipment utilization across team

### Approval Workflows

#### Request Review Process
1. **Pending Approvals**: Dedicated section for requests requiring approval
2. **Request Details**: Review complete request information
3. **Team Context**: Consider team equipment needs and availability
4. **Decision Making**: Approve, reject, or request modifications

#### Approval Actions
- **Approve**: Accept request and forward to next approval level
- **Reject**: Decline request with detailed reasoning
- **Request Changes**: Ask for additional information or modifications
- **Assign Priority**: Adjust priority level based on team needs

#### Approval Best Practices
- **Timely Response**: Review requests within 48 hours
- **Clear Communication**: Provide detailed feedback for rejections
- **Team Coordination**: Consider team-wide equipment needs
- **Budget Awareness**: Factor in budget constraints and allocations

### Equipment Assignment

#### Assignment Process
1. **Available Equipment**: View unassigned equipment inventory
2. **Team Needs**: Assess team member requirements
3. **Assignment Action**: Use assignment workflow tools
4. **Documentation**: Record assignment reasoning and duration

#### Assignment Types
- **Permanent Assignment**: Long-term equipment allocation
- **Temporary Assignment**: Short-term loans or trials
- **Project Assignment**: Equipment for specific projects
- **Rotation Assignment**: Regular equipment rotation policies

#### Transfer Management
- **Between Members**: Move equipment within team
- **Condition Assessment**: Verify equipment condition before transfer
- **Documentation**: Update assignment records and history
- **User Notification**: Inform relevant team members of changes

---

## 🔧 Admin Features

### User Management

#### User Administration
1. **User Directory**: Access complete user list and details
2. **Role Management**: Assign and modify user roles
3. **Team Assignment**: Organize users into teams
4. **Account Status**: Activate, deactivate, or suspend accounts

#### Invitation System
1. **Send Invitations**: Invite new users via email
2. **Role Assignment**: Assign initial roles during invitation
3. **Team Placement**: Add users to appropriate teams
4. **Bulk Invitations**: Import multiple users from CSV files

#### Team Management
- **Create Teams**: Establish new team structures
- **Assign Leaders**: Designate team leads with approval authority
- **Team Hierarchy**: Set up reporting relationships
- **Team Equipment**: Manage team-specific equipment pools

### Equipment Inventory Management

#### Equipment Administration
1. **Equipment Database**: Complete inventory management
2. **Bulk Operations**: Import/export equipment data
3. **Category Management**: Create and modify equipment categories
4. **Tag System**: Implement tagging for better organization

#### Equipment Lifecycle
- **Add Equipment**: Register new equipment in the system
- **Status Management**: Update equipment status and condition
- **Maintenance Scheduling**: Plan and track maintenance activities
- **Retirement Process**: Manage equipment decommissioning

#### Bulk Operations
- **Excel Import/Export**: Mass data operations
- **QR Code Generation**: Bulk QR code creation for physical labels
- **Status Updates**: Batch status changes
- **Assignment Management**: Bulk assignment and transfer operations

### System Configuration

#### Workflow Configuration
1. **Approval Chains**: Set up multi-level approval workflows
2. **Notification Settings**: Configure email notifications and alerts
3. **Request Categories**: Define equipment request categories
4. **Priority Levels**: Establish priority classifications

#### Security Settings
- **Access Control**: Configure role-based permissions
- **Data Privacy**: Manage data retention and privacy settings
- **Audit Logging**: Review system activity and access logs
- **Security Policies**: Implement security and compliance requirements

### Reports & Analytics

#### Standard Reports
1. **Equipment Inventory**: Complete equipment listing and status
2. **Depreciation Tracking**: Asset depreciation for accounting
3. **Assignment Reports**: Equipment assignment history and current status
4. **Maintenance Reports**: Maintenance schedules and completed work

#### Custom Analytics
- **Usage Analytics**: Equipment utilization patterns
- **Cost Analysis**: Equipment costs and budget tracking
- **Trend Analysis**: Equipment request and assignment trends
- **Compliance Reports**: Regulatory and audit compliance data

#### Export Options
- **Excel Format**: Detailed spreadsheet reports
- **PDF Reports**: Formatted reports for presentations
- **CSV Data**: Raw data for external analysis
- **API Access**: Programmatic data access for integration

---

## 📱 Mobile & PWA Usage

### Progressive Web App Installation

#### Installation Guide
1. **Browser Access**: Visit the system URL on your mobile device
2. **Installation Prompt**: Look for "Install App" notification
3. **Add to Home Screen**: Follow browser-specific installation steps
4. **App Icon**: ProfiCo icon will appear on your home screen

#### PWA Benefits
- **Offline Access**: View equipment data without internet connection
- **Native Feel**: App-like experience with smooth navigation
- **Push Notifications**: Receive approval and assignment notifications
- **Quick Access**: Fast loading from home screen icon

### Mobile-Optimized Features

#### QR Code Scanning
1. **Scanner Access**: Tap QR scanner icon in mobile navigation
2. **Camera Permission**: Allow camera access for scanning
3. **Equipment Lookup**: Scan QR codes on equipment labels
4. **Quick Actions**: Access equipment details and actions immediately

#### Offline Capabilities
- **Equipment Viewing**: Browse assigned equipment offline
- **Status Updates**: Record equipment status changes offline
- **Maintenance Logging**: Log maintenance issues offline
- **Sync on Reconnection**: Automatic data sync when online

#### Touch-Optimized Interface
- **Large Touch Targets**: Easy navigation on mobile devices
- **Swipe Gestures**: Intuitive mobile navigation
- **Responsive Design**: Optimized layouts for various screen sizes
- **Voice Input**: Voice-to-text for notes and descriptions

### Field Worker Guide

#### Equipment Identification
1. **QR Scanning**: Use built-in scanner for equipment identification
2. **Equipment Cards**: Tap for quick equipment information
3. **Status Updates**: Update equipment status in the field
4. **Photo Documentation**: Capture photos for maintenance or issues

#### Maintenance Workflows
- **Issue Reporting**: Report equipment problems immediately
- **Maintenance Logging**: Record completed maintenance work
- **Photo Evidence**: Document maintenance activities with photos
- **Offline Recording**: Work without internet connectivity

---

## 🔍 Troubleshooting

### Common Issues

#### Login Problems
**Issue**: Cannot access the system
**Solutions**:
1. Check email for magic link (may be in spam folder)
2. Ensure you're using the correct email address
3. Try requesting a new magic link
4. Contact your team lead or admin for account verification

#### Equipment Not Visible
**Issue**: Missing equipment in your dashboard
**Solutions**:
1. Verify equipment is assigned to you
2. Check if equipment status filters are applied
3. Refresh the page or clear browser cache
4. Contact admin to verify equipment assignment

#### Request Approval Delays
**Issue**: Equipment request stuck in approval
**Solutions**:
1. Check request status and approval chain
2. Add comments to provide additional information
3. Contact approvers directly if urgent
4. Verify all required information is provided

#### Mobile App Issues
**Issue**: PWA not working correctly
**Solutions**:
1. Update to latest browser version
2. Clear browser cache and data
3. Reinstall the PWA from browser
4. Check internet connection for sync issues

### Performance Issues

#### Slow Loading Times
**Solutions**:
1. Check internet connection stability
2. Clear browser cache and cookies
3. Close unnecessary browser tabs
4. Try accessing from different browser

#### Sync Problems
**Solutions**:
1. Ensure stable internet connection
2. Force refresh the application
3. Log out and log back in
4. Contact admin if problems persist

### Data Issues

#### Missing Information
**Solutions**:
1. Verify data entry was completed and saved
2. Check if you have appropriate permissions
3. Contact admin to verify data integrity
4. Use export features to verify data completeness

#### Incorrect Equipment Status
**Solutions**:
1. Verify you have permission to view current status
2. Check if status was recently updated by another user
3. Refresh the page to get latest data
4. Report discrepancies to admin

### Contact Support

For technical issues not covered in this guide:
1. **Internal Support**: Contact your system administrator
2. **Documentation**: Review the troubleshooting guide
3. **User Community**: Check with other users in your organization
4. **System Logs**: Admins can check system logs for detailed error information

---

*This user guide covers the essential features and workflows of the ProfiCo Inventory Management System. For technical documentation and API details, see the [API Reference](api-reference.md) and [Admin Guide](admin-guide.md).*