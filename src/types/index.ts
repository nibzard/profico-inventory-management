// ABOUTME: Central type definitions for the ProfiCo Inventory Management System
// ABOUTME: Contains TypeScript interfaces and types for equipment, users, subscriptions, and API responses

import type {
  User as PrismaUser,
  Team as PrismaTeam,
  Equipment as PrismaEquipment,
  EquipmentRequest as PrismaEquipmentRequest,
  EquipmentHistory as PrismaEquipmentHistory,
  Subscription as PrismaSubscription,
  MaintenanceRecord as PrismaMaintenanceRecord,
  InventoryCheck as PrismaInventoryCheck,
  SmallInventoryItem as PrismaSmallInventoryItem,
} from "@prisma/client";

// Re-export Prisma types
export type User = PrismaUser;
export type Team = PrismaTeam;
export type Equipment = PrismaEquipment;
export type EquipmentRequest = PrismaEquipmentRequest;
export type EquipmentHistory = PrismaEquipmentHistory;
export type Subscription = PrismaSubscription;
export type MaintenanceRecord = PrismaMaintenanceRecord;
export type InventoryCheck = PrismaInventoryCheck;
export type SmallInventoryItem = PrismaSmallInventoryItem;

// Enum types
export type UserRole = "admin" | "team_lead" | "user";

export type EquipmentStatus =
  | "pending"
  | "available"
  | "assigned"
  | "maintenance"
  | "broken"
  | "lost"
  | "stolen"
  | "decommissioned";

export type EquipmentCategory =
  | "computers"
  | "mobile_devices"
  | "peripherals"
  | "accessories"
  | "digital_equipment"
  | "office_furniture"
  | "other";

export type PurchaseMethod = "company_card" | "zopi" | "leasing" | "personal";

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ordered"
  | "fulfilled";

export type BillingFrequency = "monthly" | "yearly";

export type PaymentMethod = "company_card" | "personal_card";

// Extended types with relations
export type UserWithTeam = User & {
  team?: Team;
};

export type UserWithEquipment = User & {
  ownedEquipment: Equipment[];
};

export type EquipmentWithOwner = Equipment & {
  currentOwner?: User;
};

export type EquipmentWithHistory = Equipment & {
  history: EquipmentHistory[];
};

export type RequestWithUser = EquipmentRequest & {
  requester: User;
  approver?: User;
  equipment?: Equipment;
};

export type SubscriptionWithUser = Subscription & {
  assignedUser: User;
};

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface EquipmentFormData {
  serialNumber: string;
  name: string;
  brand?: string;
  model?: string;
  category: EquipmentCategory;
  purchaseDate: string;
  purchaseMethod: PurchaseMethod;
  purchasePrice?: number;
  specifications?: string;
  warrantyInfo?: string;
  pins?: string;
  tags?: string;
  location?: string;
  condition?: string;
  notes?: string;
}

export interface EquipmentRequestFormData {
  equipmentType: string;
  justification: string;
  priority?: string;
}

export interface SubscriptionFormData {
  softwareName: string;
  assignedUserEmail: string;
  price: number;
  billingFrequency: BillingFrequency;
  paymentMethod: PaymentMethod;
  invoiceRecipient: string;
  isReimbursement: boolean;
  renewalDate: string;
  vendor?: string;
  licenseKey?: string;
  notes?: string;
}

// NextAuth.js type augmentation
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      image?: string;
    };
  }

  interface User {
    role: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
  }
}
