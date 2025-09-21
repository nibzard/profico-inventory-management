// ABOUTME: Unit tests for email notification service
// ABOUTME: Tests email templates, notification service, and integration with Resend

import { EmailTemplates, EmailNotificationService, type EquipmentRequestEmailData, type EmailUser } from '../email';
import { Resend } from 'resend';

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Get the mock functions after module is loaded
let mockSend: jest.Mock;
let mockResendConstructor: jest.Mock;

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockUser: EmailUser = {
  id: 'user_123',
  name: 'John Doe',
  email: 'john.doe@profico.com',
  role: 'user',
};

const mockTeamLead: EmailUser = {
  id: 'lead_123',
  name: 'Jane Smith',
  email: 'jane.smith@profico.com',
  role: 'team_lead',
};

const mockAdmin: EmailUser = {
  id: 'admin_123',
  name: 'Admin User',
  email: 'admin@profico.com',
  role: 'admin',
};

const mockRequest: EquipmentRequestEmailData = {
  id: 'req_12345678',
  equipmentType: 'MacBook Pro 16"',
  justification: 'Need a powerful laptop for development work including Docker containers and multiple VMs',
  priority: 'high',
  neededBy: new Date('2024-02-15'),
  budget: 3500,
  specificRequirements: 'Must have 32GB RAM and 1TB SSD',
  status: 'pending',
  requester: mockUser,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

describe('EmailTemplates', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = 'https://inventory.profico.com';
  });

  describe('newRequestForTeamLead', () => {
    it('should generate correct email template for team lead notification', () => {
      const template = EmailTemplates.newRequestForTeamLead(mockRequest);

      expect(template.subject).toBe('New Equipment Request: MacBook Pro 16" (high priority)');
      expect(template.html).toContain('New Equipment Request');
      expect(template.html).toContain('MacBook Pro 16"');
      expect(template.html).toContain('John Doe');
      expect(template.html).toContain('john.doe@profico.com');
      expect(template.html).toContain('HIGH');
      expect(template.html).toContain('€3,500');
      expect(template.html).toContain('32GB RAM');
      expect(template.html).toContain('development work');
      expect(template.html).toContain('Review Request');
      expect(template.html).toContain('/dashboard/requests/req_12345678');

      expect(template.text).toContain('Request ID: #12345678');
      expect(template.text).toContain('MacBook Pro 16"');
      expect(template.text).toContain('John Doe');
      expect(template.text).toContain('HIGH');
    });

    it('should handle optional fields correctly', () => {
      const requestWithoutOptionals = {
        ...mockRequest,
        neededBy: undefined,
        budget: undefined,
        specificRequirements: undefined,
      };

      const template = EmailTemplates.newRequestForTeamLead(requestWithoutOptionals);

      expect(template.html).not.toContain('Needed by:');
      expect(template.html).not.toContain('Budget:');
      expect(template.html).not.toContain('Requirements:');
    });

    it('should apply correct priority styling', () => {
      const urgentRequest = { ...mockRequest, priority: 'urgent' };
      const template = EmailTemplates.newRequestForTeamLead(urgentRequest);

      expect(template.html).toContain('priority-urgent');
      expect(template.html).toContain('URGENT');
    });
  });

  describe('requestNeedsAdminApproval', () => {
    it('should generate correct email template for admin approval', () => {
      const template = EmailTemplates.requestNeedsAdminApproval(mockRequest);

      expect(template.subject).toBe('Admin Approval Required: MacBook Pro 16" (high priority)');
      expect(template.html).toContain('Admin Approval Required');
      expect(template.html).toContain('Team Lead Approved');
      expect(template.html).toContain('MacBook Pro 16"');
      expect(template.html).toContain('final admin approval');

      expect(template.text).toContain('TEAM LEAD APPROVED');
      expect(template.text).toContain('final admin approval');
    });
  });

  describe('requestApproved', () => {
    it('should generate correct approval notification', () => {
      const approvedRequest = {
        ...mockRequest,
        status: 'approved' as const,
        approver: mockTeamLead,
      };

      const template = EmailTemplates.requestApproved(approvedRequest);

      expect(template.subject).toBe('✅ Equipment Request Approved: MacBook Pro 16"');
      expect(template.html).toContain('Request Approved!');
      expect(template.html).toContain('Jane Smith');
      expect(template.html).toContain('procurement queue');
      expect(template.html).toContain('Next Steps');

      expect(template.text).toContain('✅ Equipment Request Approved!');
      expect(template.text).toContain('Jane Smith');
      expect(template.text).toContain('procurement queue');
    });

    it('should handle missing approver', () => {
      const template = EmailTemplates.requestApproved(mockRequest);

      expect(template.html).not.toContain('Approved by:');
      expect(template.text).not.toContain('Approved by:');
    });
  });

  describe('requestRejected', () => {
    it('should generate correct rejection notification', () => {
      const rejectedRequest = {
        ...mockRequest,
        status: 'rejected' as const,
        approver: mockTeamLead,
        rejectionReason: 'Budget constraints - please reduce specification requirements',
      };

      const template = EmailTemplates.requestRejected(rejectedRequest);

      expect(template.subject).toBe('❌ Equipment Request Declined: MacBook Pro 16"');
      expect(template.html).toContain('Request Declined');
      expect(template.html).toContain('Budget constraints');
      expect(template.html).toContain('Jane Smith');
      expect(template.html).toContain('Submit New Request');

      expect(template.text).toContain('❌ Equipment Request Declined');
      expect(template.text).toContain('Budget constraints');
    });

    it('should handle missing rejection reason', () => {
      const rejectedRequest = {
        ...mockRequest,
        status: 'rejected' as const,
        approver: mockTeamLead,
      };

      const template = EmailTemplates.requestRejected(rejectedRequest);

      expect(template.html).not.toContain('Reason for Decline');
      expect(template.text).not.toContain('Reason for Decline');
    });
  });

  describe('requestStatusChanged', () => {
    it('should generate correct status change notification', () => {
      const orderedRequest = {
        ...mockRequest,
        status: 'ordered' as const,
        updatedAt: new Date('2024-01-20'),
      };

      const template = EmailTemplates.requestStatusChanged(orderedRequest, 'approved');

      expect(template.subject).toBe('Equipment Request Update: MacBook Pro 16" (ordered)');
      expect(template.html).toContain('Status Changed');
      expect(template.html).toContain('APPROVED</strong> → <strong>ORDERED</strong>');
      expect(template.html).toContain('ORDERED');

      expect(template.text).toContain('APPROVED → ORDERED');
      expect(template.text).toContain('Current Status: ORDERED');
    });
  });
});

describe('EmailNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock functions from the mocked module
    const ResendMock = require('resend').Resend;
    mockResendConstructor = ResendMock;
    const mockInstance = new ResendMock();
    mockSend = mockInstance.emails.send;
    mockSend.mockResolvedValue({ id: 'email_123' });
    
    // Reset the email service instance to use our mock
    EmailNotificationService.resetInstance();

    process.env.RESEND_API_KEY = 'test_api_key';
    process.env.EMAIL_FROM = 'noreply@profico.com';
  });

  describe('notifyTeamLeadOfNewRequest', () => {
    it('should send email to team leads successfully', async () => {
      const teamLeadEmails = ['lead1@profico.com', 'lead2@profico.com'];
      
      await EmailNotificationService.notifyTeamLeadOfNewRequest(mockRequest, teamLeadEmails);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@profico.com',
        to: teamLeadEmails,
        subject: 'New Equipment Request: MacBook Pro 16" (high priority)',
        html: expect.stringContaining('New Equipment Request'),
        text: expect.stringContaining('MacBook Pro 16"'),
      });
    });

    it('should handle empty team lead emails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await EmailNotificationService.notifyTeamLeadOfNewRequest(mockRequest, []);

      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No team leads found to notify')
      );

      consoleSpy.mockRestore();
    });

    it('should handle email sending errors', async () => {
      mockSend.mockRejectedValue(new Error('Email service unavailable'));

      await expect(
        EmailNotificationService.notifyTeamLeadOfNewRequest(mockRequest, ['lead@profico.com'])
      ).rejects.toThrow('Failed to send team lead notification email');
    });
  });

  describe('notifyAdminOfApprovalNeeded', () => {
    it('should send email to admins successfully', async () => {
      mockSend.mockResolvedValue({ id: 'email_456' });

      const adminEmails = ['admin1@profico.com', 'admin2@profico.com'];
      
      await EmailNotificationService.notifyAdminOfApprovalNeeded(mockRequest, adminEmails);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@profico.com',
        to: adminEmails,
        subject: 'Admin Approval Required: MacBook Pro 16" (high priority)',
        html: expect.stringContaining('Admin Approval Required'),
        text: expect.stringContaining('TEAM LEAD APPROVED'),
      });
    });
  });

  describe('notifyRequesterOfApproval', () => {
    it('should send approval email to requester', async () => {
      mockSend.mockResolvedValue({ id: 'email_789' });

      await EmailNotificationService.notifyRequesterOfApproval(mockRequest);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@profico.com',
        to: 'john.doe@profico.com',
        subject: '✅ Equipment Request Approved: MacBook Pro 16"',
        html: expect.stringContaining('Request Approved!'),
        text: expect.stringContaining('✅ Equipment Request Approved!'),
      });
    });
  });

  describe('notifyRequesterOfRejection', () => {
    it('should send rejection email to requester', async () => {
      mockSend.mockResolvedValue({ id: 'email_101' });

      const rejectedRequest = {
        ...mockRequest,
        status: 'rejected' as const,
        rejectionReason: 'Budget not available',
      };

      await EmailNotificationService.notifyRequesterOfRejection(rejectedRequest);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@profico.com',
        to: 'john.doe@profico.com',
        subject: '❌ Equipment Request Declined: MacBook Pro 16"',
        html: expect.stringContaining('Request Declined'),
        text: expect.stringContaining('❌ Equipment Request Declined'),
      });
    });
  });

  describe('notifyStatusChange', () => {
    it('should send status change email to specified recipients', async () => {
      mockSend.mockResolvedValue({ id: 'email_202' });

      const notifyEmails = ['john.doe@profico.com', 'jane.smith@profico.com'];
      
      await EmailNotificationService.notifyStatusChange(mockRequest, 'approved', notifyEmails);

      expect(mockSend).toHaveBeenCalledWith({
        from: 'noreply@profico.com',
        to: notifyEmails,
        subject: 'Equipment Request Update: MacBook Pro 16" (pending)',
        html: expect.stringContaining('Status Changed'),
        text: expect.stringContaining('approved → PENDING'),
      });
    });

    it('should handle empty notification emails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await EmailNotificationService.notifyStatusChange(mockRequest, 'approved', []);

      expect(mockSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No emails provided for status change notification')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Database helper methods', () => {
    const { prisma } = require('../prisma');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('getTeamLeadEmails', () => {
      it('should return team lead emails for user in team', async () => {
        prisma.user.findUnique.mockResolvedValue({
          team: {
            members: [
              { email: 'lead1@profico.com' },
              { email: 'lead2@profico.com' },
            ],
          },
        });

        const emails = await EmailNotificationService.getTeamLeadEmails('user_123');

        expect(emails).toEqual(['lead1@profico.com', 'lead2@profico.com']);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user_123' },
          include: {
            team: {
              include: {
                members: {
                  where: { role: 'team_lead' },
                  select: { email: true },
                },
              },
            },
          },
        });
      });

      it('should return all team leads when user has no team', async () => {
        prisma.user.findUnique.mockResolvedValue({ team: null });
        prisma.user.findMany.mockResolvedValue([
          { email: 'lead1@profico.com' },
          { email: 'lead2@profico.com' },
        ]);

        const emails = await EmailNotificationService.getTeamLeadEmails('user_123');

        expect(emails).toEqual(['lead1@profico.com', 'lead2@profico.com']);
        expect(prisma.user.findMany).toHaveBeenCalledWith({
          where: { role: 'team_lead', isActive: true },
          select: { email: true },
        });
      });

      it('should handle database errors gracefully', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('Database error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const emails = await EmailNotificationService.getTeamLeadEmails('user_123');

        expect(emails).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get team lead emails'),
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('getAdminEmails', () => {
      it('should return admin emails', async () => {
        prisma.user.findMany.mockResolvedValue([
          { email: 'admin1@profico.com' },
          { email: 'admin2@profico.com' },
        ]);

        const emails = await EmailNotificationService.getAdminEmails();

        expect(emails).toEqual(['admin1@profico.com', 'admin2@profico.com']);
        expect(prisma.user.findMany).toHaveBeenCalledWith({
          where: { role: 'admin', isActive: true },
          select: { email: true },
        });
      });

      it('should handle database errors gracefully', async () => {
        prisma.user.findMany.mockRejectedValue(new Error('Database error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const emails = await EmailNotificationService.getAdminEmails();

        expect(emails).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to get admin emails:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });
});

describe('Email Service Configuration', () => {
  it('should throw error when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY;

    expect(() => {
      // Re-import to trigger the environment check
      jest.resetModules();
      require('../email');
    }).toThrow('RESEND_API_KEY environment variable is required');
  });
});