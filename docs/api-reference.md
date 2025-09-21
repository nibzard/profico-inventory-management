# API Reference - ProfiCo Inventory Management System

## 📋 Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Core Endpoints](#core-endpoints)
4. [Database Models](#database-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## 🔧 Overview

The ProfiCo Inventory Management System provides a comprehensive REST API built with Next.js 15+ App Router. All endpoints support TypeScript types and follow RESTful conventions.

### Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

### Content Types
- **Request**: `application/json`
- **Response**: `application/json`
- **File Uploads**: `multipart/form-data`

### API Versioning
Current API version: `v1` (implicit, no version prefix required)

---

## 🔐 Authentication

### Authentication Flow
The system uses NextAuth.js v5 with magic link authentication and session-based authorization.

#### Authentication Methods
1. **Magic Link**: Email-based passwordless authentication
2. **Session Cookies**: HTTP-only secure cookies for API access
3. **CSRF Protection**: Built-in CSRF token validation

### Session Management

#### Login Flow
```typescript
// Magic link authentication
POST /api/auth/signin
{
  "email": "user@example.com",
  "callbackUrl": "https://your-domain.com/dashboard"
}
```

#### Session Verification
```typescript
// Check current session
GET /api/auth/session
```

**Response:**
```json
{
  "user": {
    "id": "cuid_string",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "teamId": "team_cuid"
  },
  "expires": "2024-12-31T23:59:59.999Z"
}
```

### Role-Based Access Control (RBAC)

#### Roles
- **admin**: Full system access
- **team_lead**: Team management and approval authority
- **user**: Personal equipment access

#### Protected Routes
All API routes require authentication. Additional role checks are implemented per endpoint.

```typescript
// Example role check middleware
if (!session || !["admin", "team_lead"].includes(session.user.role)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

---

## 🔌 Core Endpoints

### Equipment Management

#### Get Equipment List
```typescript
GET /api/equipment
```

**Query Parameters:**
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)
- `status?: string` - Filter by status
- `category?: string` - Filter by category
- `userId?: string` - Filter by assigned user

**Response:**
```json
{
  "equipment": [
    {
      "id": "eq_cuid",
      "name": "MacBook Pro 16\"",
      "category": "Computer",
      "status": "assigned",
      "serialNumber": "MB123456789",
      "assignedTo": {
        "id": "user_cuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "pages": 8,
    "currentPage": 1,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Create Equipment
```typescript
POST /api/equipment
```

**Request Body:**
```json
{
  "name": "MacBook Pro 16\"",
  "category": "Computer",
  "serialNumber": "MB123456789",
  "manufacturer": "Apple",
  "model": "MacBook Pro",
  "purchasePrice": 2499.99,
  "purchaseDate": "2024-01-15",
  "warranty": "2026-01-15",
  "location": "Office A",
  "tags": ["laptop", "development"]
}
```

**Response:**
```json
{
  "id": "eq_cuid",
  "message": "Equipment created successfully",
  "equipment": {
    "id": "eq_cuid",
    "name": "MacBook Pro 16\"",
    "status": "available",
    "qrCode": "data:image/png;base64,..."
  }
}
```

#### Get Single Equipment
```typescript
GET /api/equipment/[id]
```

**Response:**
```json
{
  "id": "eq_cuid",
  "name": "MacBook Pro 16\"",
  "category": "Computer",
  "status": "assigned",
  "serialNumber": "MB123456789",
  "assignedTo": {
    "id": "user_cuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "history": [
    {
      "id": "hist_cuid",
      "action": "assigned",
      "fromUser": null,
      "toUser": "John Doe",
      "timestamp": "2024-01-20T14:45:00.000Z",
      "notes": "Initial assignment"
    }
  ],
  "maintenanceRecords": [
    {
      "id": "maint_cuid",
      "type": "routine",
      "description": "Software update",
      "completedAt": "2024-02-01T09:00:00.000Z"
    }
  ],
  "files": [
    {
      "id": "file_cuid",
      "name": "equipment_photo.jpg",
      "url": "https://uploadthing.com/...",
      "type": "image"
    }
  ]
}
```

#### Update Equipment
```typescript
PUT /api/equipment/[id]
PATCH /api/equipment/[id]
```

#### Delete Equipment
```typescript
DELETE /api/equipment/[id]
```

#### Equipment Actions

##### Assign Equipment
```typescript
POST /api/equipment/[id]/assign
```

**Request Body:**
```json
{
  "userId": "user_cuid",
  "notes": "Assignment for new project"
}
```

##### Unassign Equipment
```typescript
POST /api/equipment/[id]/unassign
```

##### Update Status
```typescript
POST /api/equipment/[id]/status
```

**Request Body:**
```json
{
  "status": "maintenance",
  "notes": "Keyboard repair needed"
}
```

##### Add Maintenance Record
```typescript
POST /api/equipment/[id]/maintenance
```

**Request Body:**
```json
{
  "type": "repair",
  "description": "Replaced keyboard",
  "cost": 150.00,
  "vendor": "Apple Authorized Service",
  "completedAt": "2024-02-15T16:30:00.000Z"
}
```

### Equipment Requests

#### Get Requests
```typescript
GET /api/requests
```

**Query Parameters:**
- `status?: string` - Filter by status
- `requesterId?: string` - Filter by requester
- `approverId?: string` - Filter by approver

#### Create Request
```typescript
POST /api/requests
```

**Request Body:**
```json
{
  "equipmentType": "laptop",
  "category": "Computer",
  "justification": "Development work requires high-performance laptop",
  "priority": "medium",
  "specifications": {
    "ram": "32GB",
    "storage": "1TB SSD",
    "processor": "Apple M3 Pro"
  }
}
```

#### Approve Request
```typescript
POST /api/requests/[id]/approve
```

**Request Body:**
```json
{
  "notes": "Approved for Q2 budget allocation",
  "conditions": ["Must return previous equipment"]
}
```

#### Reject Request
```typescript
POST /api/requests/[id]/reject
```

**Request Body:**
```json
{
  "reason": "Budget constraints for Q1",
  "feedback": "Consider alternatives or resubmit in Q2"
}
```

### User Management

#### Get Users
```typescript
GET /api/users
```

**Admin Only** - Returns list of all users with filtering options.

#### Create User Invitation
```typescript
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "teamId": "team_cuid"
}
```

### Subscription Management

#### Get Subscriptions
```typescript
GET /api/subscriptions
```

#### Create Subscription
```typescript
POST /api/subscriptions
```

**Request Body:**
```json
{
  "name": "Adobe Creative Suite",
  "vendor": "Adobe",
  "type": "software",
  "billing": {
    "amount": 599.88,
    "cycle": "annual",
    "currency": "EUR"
  },
  "licenses": 5,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### File Management

#### Upload Files
```typescript
POST /api/equipment/files
```

**Content-Type**: `multipart/form-data`

**Form Data:**
- `file`: File to upload (max 8MB)
- `equipmentId`: Equipment ID
- `type`: File type (`photo`, `manual`, `invoice`, `other`)

#### Download File
```typescript
GET /api/equipment/files/[fileId]
```

### Reports & Analytics

#### Equipment Reports
```typescript
GET /api/reports
```

**Query Parameters:**
- `type: string` - Report type (`inventory`, `depreciation`, `assignments`)
- `format?: string` - Output format (`json`, `excel`, `pdf`)
- `dateFrom?: string` - Start date for filtering
- `dateTo?: string` - End date for filtering

#### Depreciation Report
```typescript
GET /api/reports/depreciation
```

**Response:**
```json
{
  "summary": {
    "totalEquipment": 150,
    "totalValue": 125000.00,
    "depreciatedValue": 85000.00,
    "depreciationRate": 32.0
  },
  "categories": [
    {
      "category": "Computer",
      "count": 45,
      "originalValue": 67500.00,
      "currentValue": 45000.00,
      "depreciationRate": 33.3
    }
  ],
  "ageDistribution": [
    {
      "ageRange": "0-6 months",
      "count": 15,
      "value": 22500.00
    }
  ]
}
```

### Bulk Operations

#### Bulk QR Generation
```typescript
POST /api/equipment/bulk-qr
```

**Request Body:**
```json
{
  "equipmentIds": ["eq_1", "eq_2", "eq_3"],
  "format": "pdf"
}
```

#### Equipment Import
```typescript
POST /api/equipment/import
```

**Content-Type**: `multipart/form-data`

#### Import Template
```typescript
GET /api/equipment/import-template
```

Returns Excel template for bulk equipment import.

---

## 🗃️ Database Models

### Core Types

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'team_lead' | 'user';
  teamId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  team?: Team;
  ownedEquipment: Equipment[];
  equipmentRequests: EquipmentRequest[];
}
```

#### Equipment Model
```typescript
interface Equipment {
  id: string;
  name: string;
  category: string;
  status: 'available' | 'assigned' | 'maintenance' | 'broken' | 'decommissioned';
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchasePrice?: number;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  location?: string;
  notes?: string;
  tags: string[];
  
  // Relations
  assignedTo?: User;
  createdBy: User;
  history: EquipmentHistory[];
  maintenanceRecords: MaintenanceRecord[];
  files: File[];
}
```

#### EquipmentRequest Model
```typescript
interface EquipmentRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  equipmentType: string;
  category: string;
  justification: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  specifications?: Record<string, any>;
  
  // Relations
  requester: User;
  approver?: User;
  equipment?: Equipment;
  history: RequestHistory[];
}
```

#### Subscription Model
```typescript
interface Subscription {
  id: string;
  name: string;
  vendor: string;
  type: 'software' | 'service' | 'platform';
  status: 'active' | 'cancelled' | 'expired';
  
  // Billing
  billingAmount: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  currency: string;
  
  // Dates
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  
  // Usage
  licenses: number;
  usedLicenses: number;
  
  // Relations
  owner: User;
  invoices: Invoice[];
  payments: Payment[];
}
```

### Relationship Mapping

#### One-to-Many Relationships
- User → Equipment (owned)
- User → EquipmentRequest (requested)
- Equipment → EquipmentHistory
- Equipment → MaintenanceRecord
- Subscription → Invoice

#### Many-to-Many Relationships
- User ↔ Team (via teamId)
- Equipment ↔ Tags (via tags array)

#### Polymorphic Relationships
- File → Equipment (photos, manuals)
- File → Invoice (OCR documents)

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Business logic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server errors |

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
}
```

### Common Error Examples

#### Validation Error (400)
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": {
    "email": "Invalid email format",
    "name": "Name is required"
  },
  "timestamp": "2024-02-15T10:30:00.000Z",
  "path": "/api/users"
}
```

#### Authorization Error (403)
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions for this operation",
  "timestamp": "2024-02-15T10:30:00.000Z",
  "path": "/api/admin/users"
}
```

#### Resource Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Equipment with ID 'eq_invalid' not found",
  "timestamp": "2024-02-15T10:30:00.000Z",
  "path": "/api/equipment/eq_invalid"
}
```

---

## 🚦 Rate Limiting

### Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Equipment Read | 100 requests | 1 minute |
| Equipment Write | 20 requests | 1 minute |
| File Upload | 10 requests | 1 minute |
| Reports | 5 requests | 1 minute |
| General API | 60 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645875600
X-RateLimit-Window: 60
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

---

## 📝 Examples

### Complete Equipment Management Flow

#### 1. Create Equipment
```typescript
const createEquipment = async () => {
  const response = await fetch('/api/equipment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'MacBook Pro 16"',
      category: 'Computer',
      serialNumber: 'MB123456789',
      manufacturer: 'Apple',
      purchasePrice: 2499.99,
      purchaseDate: '2024-01-15'
    })
  });
  
  return response.json();
};
```

#### 2. Assign Equipment
```typescript
const assignEquipment = async (equipmentId: string, userId: string) => {
  const response = await fetch(`/api/equipment/${equipmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      notes: 'Assignment for new project'
    })
  });
  
  return response.json();
};
```

#### 3. Update Equipment Status
```typescript
const updateEquipmentStatus = async (equipmentId: string, status: string) => {
  const response = await fetch(`/api/equipment/${equipmentId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      notes: 'Status updated via API'
    })
  });
  
  return response.json();
};
```

### Request Management Flow

#### 1. Create Equipment Request
```typescript
const createRequest = async () => {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      equipmentType: 'laptop',
      category: 'Computer',
      justification: 'Need high-performance laptop for development',
      priority: 'medium',
      specifications: {
        ram: '32GB',
        storage: '1TB SSD'
      }
    })
  });
  
  return response.json();
};
```

#### 2. Approve Request
```typescript
const approveRequest = async (requestId: string) => {
  const response = await fetch(`/api/requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes: 'Approved for Q2 budget',
      conditions: ['Return previous equipment']
    })
  });
  
  return response.json();
};
```

### File Upload Example

```typescript
const uploadEquipmentPhoto = async (equipmentId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('equipmentId', equipmentId);
  formData.append('type', 'photo');
  
  const response = await fetch('/api/equipment/files', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

### Bulk Operations Example

```typescript
const generateBulkQRCodes = async (equipmentIds: string[]) => {
  const response = await fetch('/api/equipment/bulk-qr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      equipmentIds,
      format: 'pdf'
    })
  });
  
  // Response will be a PDF blob
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  // Download the PDF
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment-qr-codes.pdf';
  a.click();
};
```

### TypeScript Client Example

```typescript
// api-client.ts
class ProfiCoAPIClient {
  private baseURL: string;
  
  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }
  
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }
  
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }
  
  // Equipment methods
  getEquipment = (id: string) => this.get<Equipment>(`/equipment/${id}`);
  createEquipment = (data: CreateEquipmentRequest) => 
    this.post<Equipment>('/equipment', data);
  
  // Request methods
  getRequests = () => this.get<EquipmentRequest[]>('/requests');
  approveRequest = (id: string, data: ApprovalData) => 
    this.post(`/requests/${id}/approve`, data);
}

// Usage
const client = new ProfiCoAPIClient();
const equipment = await client.getEquipment('eq_123');
```

---

*This API reference provides comprehensive documentation for integrating with the ProfiCo Inventory Management System. For user-focused documentation, see the [User Guide](user-guide.md).*