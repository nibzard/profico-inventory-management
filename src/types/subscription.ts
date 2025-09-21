// ABOUTME: TypeScript type definitions for subscription management system
// ABOUTME: Enums and interfaces for subscriptions, billing, and related entities

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ONE_TIME = 'one_time'
}

export enum PaymentMethod {
  COMPANY_CARD = 'company_card',
  PERSONAL_CARD = 'personal_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  OTHER = 'other'
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  vendor: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoiceNumber?: string;
  description?: string;
  invoiceUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionWithDetails {
  id: string;
  softwareName: string;
  assignedUserId: string;
  assignedUserEmail: string;
  price: number;
  billingFrequency: string;
  paymentMethod: string;
  invoiceRecipient: string;
  isReimbursement: boolean;
  isActive: boolean;
  renewalDate: Date;
  invoices?: string;
  vendor?: string;
  licenseKey?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  assignedUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  subscriptionInvoices?: SubscriptionInvoice[];
}

export interface SubscriptionFilters {
  vendors: string[];
  billingCycles: BillingCycle[];
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expiredCount: number;
  expiringSoonCount: number;
}