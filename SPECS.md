# Product Requirements Document: Inventory Management System

## 1. Executive Summary

### 1.1 Product Overview
This document outlines requirements for a comprehensive inventory management system to track and manage both hardware equipment and software subscriptions for ProfiCo. The system will streamline equipment allocation, approval workflows, and compliance reporting while reducing administrative overhead.

### 1.2 Business Objectives
- Eliminate manual tracking of equipment and software licenses
- Automate approval workflows for equipment requests
- Ensure compliance with accounting and tax requirements
- Provide real-time visibility into company assets
- Streamline onboarding and offboarding processes

## 2. User Roles and Permissions

### 2.1 Regular User
**Capabilities:**
- View personal equipment inventory
- Request new equipment
- Report equipment issues or malfunctions
- Add notes and ratings to assigned equipment
- Submit annual inventory confirmations

### 2.2 Team Lead/Manager
**Capabilities:**
- All regular user capabilities
- View team members' equipment
- Approve/reject equipment requests from team members
- Create and invite new users
- Assign equipment between team members

### 2.3 Admin
**Capabilities:**
- Full system access
- Add new equipment to inventory
- Manage all users and roles
- Generate reports for accounting
- Configure equipment categories and tags
- Trigger inventory checkups
- Export data for compliance

## 3. Hardware Equipment Management

### 3.1 Equipment Categories

#### 3.1.1 Work Equipment (Individual Assignment)
- **Computers**: Laptops, desktops
- **Mobile Devices**: Phones, tablets
- **Peripherals**: Displays, keyboards, mice
- **Accessories**: Dongles, cables, headphones
- **Other**: Miscellaneous work-related equipment

#### 3.1.2 Office Equipment (Shared/Company Assets)
- **Digital Equipment**: Printers, TVs, cameras
- **Office Furniture**: Desks, chairs, whiteboards, storage
- **Other**: Refrigerators, water coolers, testing devices

### 3.2 Equipment Data Model

#### 3.2.1 Required Fields
- Serial number
- Equipment name (brand + model)
- Equipment category
- Purchase date
- Purchase method (company card, ZOPI, leasing, personal)
- Current owner/assignee
- Status (available, assigned, pending, broken, lost, stolen)

#### 3.2.2 Optional Fields
- Purchase price
- Technical specifications (RAM, storage, processor)
- Warranty information
- PINs/passwords (for tablets/phones)
- Purchase invoice (PDF upload)
- Photos

#### 3.2.3 Equipment Tags
Admin-configurable tags for purchase classification:
- **ProfiCo**: Standard company purchase
- **ZOPI**: Croatian government initiative
- **Leasing**: Leased equipment
- **Off-the-shelf**: Other purchase methods

### 3.3 Equipment Lifecycle

#### 3.3.1 Equipment Statuses
- **Pending**: Ordered but not yet received
- **Available**: In inventory, unassigned
- **Assigned**: Currently assigned to user
- **Maintenance**: Being repaired
- **Broken**: Non-functional
- **Lost/Stolen**: Missing equipment
- **Decommissioned**: Removed from service

#### 3.3.2 Ownership History
- Track complete ownership chain
- Maintain logs of all transfers
- Support inactive users (former employees)
- Note condition during transfers

### 3.4 Equipment Requests and Approval

#### 3.4.1 Request Process
1. User creates request with justification
2. Team lead reviews and approves/rejects
3. Approved requests go to admin for final approval
4. Admin marks as ordered when purchased
5. Equipment associated with request when received

#### 3.4.2 Request Types
- New equipment
- Equipment replacement
- Equipment transfer between users
- Equipment upgrade

### 3.5 Inventory Tracking Features

#### 3.5.1 Small Inventory Items
- Items under €150 (dongles, cables, adapters)
- Track by quantity rather than serial numbers
- Set minimum stock levels with alerts
- Simple request/approval flow

#### 3.5.2 QR Code/Barcode Support
- Generate printable labels for equipment
- Mobile scanning capability for check-in/check-out
- Scan existing manufacturer barcodes where available

#### 3.5.3 Bulk Operations
- Annual inventory verification
- Equipment condition assessments
- Mass equipment transfers

## 4. Software Subscription Management

### 4.1 Subscription Types

#### 4.1.1 Individual Licenses
- Assigned to specific user email
- Personal productivity tools
- Development tools

#### 4.1.2 Team/Company Licenses
- Shared across teams or entire company
- Collaboration tools
- Enterprise software

### 4.2 Subscription Data Model

#### 4.2.1 Required Fields
- Software name
- Assigned user email
- Price and billing frequency (monthly/yearly)
- Payment method
- Invoice recipient
- Payment responsibility (company card vs. reimbursement)

#### 4.2.2 Payment Methods
- **Company Card + Company Invoice**: Full company expense
- **Company Card + Personal Invoice**: Personal purchase on company card
- **Personal Card + Reimbursement**: User pays, company reimburses

### 4.3 Invoice Management
- Upload monthly/yearly invoices
- Automated reminders for pending invoices
- Export capabilities for accounting
- Link subscriptions to invoice uploads

## 5. Reporting and Compliance

### 5.1 Equipment Reports
- Asset inventory by category and owner
- Equipment age analysis (flag 3+ year old devices)
- Purchase method breakdown
- Depreciation tracking (2-year cycle)
- Serial number and owner exports

### 5.2 Software Reports
- Active subscriptions by cost and frequency
- Missing invoice tracking
- Reimbursement tracking
- Subscription renewal alerts

### 5.3 Annual Inventory Verification
- System-triggered user confirmations
- Equipment condition reporting
- Discrepancy identification
- Audit trail maintenance

## 6. User Experience Requirements

### 6.1 Mobile Responsiveness
- Mobile-first design for equipment scanning
- Responsive interface for all device types
- QR code scanning functionality

### 6.2 Onboarding Integration
- Invitation-based user creation
- Role assignment during setup
- Integration with existing HR processes

### 6.3 Notification System
- Equipment request status updates
- Inventory verification reminders
- Low stock alerts
- Invoice upload reminders

## 7. Technical Considerations

### 7.1 Data Import/Export
- Excel/CSV export capabilities
- PDF invoice handling with OCR
- Manufacturer barcode recognition
- Integration with accounting systems

### 7.2 User Management
- Inactive user handling (former employees)
- Team hierarchy management
- Role-based access control
- Audit logging

### 7.3 Equipment Transfer Workflows
- Check-out/check-in processes
- Condition assessment forms
- Transfer approval chains
- Remote employee considerations

## 8. Future Considerations (Phase 2)

### 8.1 Advanced Features
- Book and learning material tracking
- Integration with absence management systems
- Automated depreciation calculations
- Advanced analytics and insights

### 8.2 API Integrations
- Accounting system integration
- Stripe/payment processor connections
- Manufacturer warranty lookups
- Equipment specification databases

## 9. Success Metrics

### 9.1 Operational Efficiency
- Reduction in manual tracking time
- Faster equipment request processing
- Improved compliance reporting accuracy
- Decreased equipment loss/theft

### 9.2 User Adoption
- User engagement with system features
- Completion rate of inventory verifications
- Request processing time
- System satisfaction scores

## 10. Implementation Phases

### Phase 1: Core Hardware Management
- Basic equipment tracking
- User roles and permissions
- Request/approval workflows
- QR code functionality

### Phase 2: Software Subscription Management
- Subscription tracking
- Invoice management
- Reporting capabilities

### Phase 3: Advanced Features
- Analytics dashboard
- API integrations
- Advanced reporting
- Workflow automation

---

*This PRD serves as the foundation for developing a comprehensive inventory management solution that addresses ProfiCo's specific needs while maintaining flexibility for future growth and requirements.*
