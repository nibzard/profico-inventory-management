// ABOUTME: Email notification service for ProfiCo Inventory Management System
// ABOUTME: Handles sending emails for equipment requests using Resend infrastructure

import { Resend } from 'resend';
import { type UserRole } from '@/types/index';

const fromEmail = process.env.EMAIL_FROM || 'noreply@profico-inventory.com';

// Create Resend instance lazily to allow for testing
let resendInstance: Resend | null = null;

function getResendInstance(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface EmailUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface EquipmentRequestEmailData {
  id: string;
  equipmentType: string;
  justification: string;
  priority: string;
  neededBy?: Date;
  budget?: number;
  specificRequirements?: string;
  status: string;
  requester: EmailUser;
  approver?: EmailUser;
  equipment?: EmailEquipment;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailEquipment {
  id: string;
  name: string;
  serialNumber: string;
  status: string;
}

/**
 * Email templates for different notification types
 */
export class EmailTemplates {
  /**
   * Email template for notifying team leads about new requests from team members
   */
  static newRequestForTeamLead(request: EquipmentRequestEmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `New Equipment Request: ${request.equipmentType} (${request.priority} priority)`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .priority-high { color: #dc2626; font-weight: bold; }
            .priority-urgent { color: #991b1b; font-weight: bold; background-color: #fee2e2; padding: 2px 8px; border-radius: 4px; }
            .priority-medium { color: #ea580c; font-weight: bold; }
            .priority-low { color: #059669; font-weight: bold; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .action-button { 
              background-color: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              margin: 15px 10px 15px 0;
            }
            .action-button.approve { background-color: #16a34a; }
            .action-button.reject { background-color: #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Equipment Request</h1>
              <p>A team member has submitted a new equipment request that requires your approval.</p>
            </div>
            
            <div class="content">
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Requested by:</span> ${request.requester.name} (${request.requester.email})
              </div>
              <div class="detail-row">
                <span class="label">Equipment:</span> ${request.equipmentType}
              </div>
              <div class="detail-row">
                <span class="label">Priority:</span> 
                <span class="priority-${request.priority}">${request.priority.toUpperCase()}</span>
              </div>
              ${request.neededBy ? `
              <div class="detail-row">
                <span class="label">Needed by:</span> ${request.neededBy.toLocaleDateString()}
              </div>
              ` : ''}
              ${request.budget ? `
              <div class="detail-row">
                <span class="label">Budget:</span> €${request.budget.toLocaleString()}
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Justification:</span><br>
                <div style="margin-top: 8px; padding: 12px; background-color: white; border-radius: 4px; border-left: 4px solid #2563eb;">
                  ${request.justification}
                </div>
              </div>
              ${request.specificRequirements ? `
              <div class="detail-row">
                <span class="label">Requirements:</span><br>
                <div style="margin-top: 8px; padding: 12px; background-color: white; border-radius: 4px;">
                  ${request.specificRequirements}
                </div>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button">
                  Review Request
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                You received this email because you are a team lead and need to review equipment requests.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New Equipment Request

Request ID: #${request.id.slice(-8)}
Requested by: ${request.requester.name} (${request.requester.email})
Equipment: ${request.equipmentType}
Priority: ${request.priority.toUpperCase()}
${request.neededBy ? `Needed by: ${request.neededBy.toLocaleDateString()}\n` : ''}${request.budget ? `Budget: €${request.budget.toLocaleString()}\n` : ''}
Justification: ${request.justification}
${request.specificRequirements ? `\nRequirements: ${request.specificRequirements}` : ''}

Review this request at: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
    `.trim();

    return { subject, html, text };
  }

  /**
   * Email template for notifying admins about requests needing higher-level approval
   */
  static requestNeedsAdminApproval(request: EquipmentRequestEmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Admin Approval Required: ${request.equipmentType} (${request.priority} priority)`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .priority-high { color: #dc2626; font-weight: bold; }
            .priority-urgent { color: #991b1b; font-weight: bold; background-color: #fee2e2; padding: 2px 8px; border-radius: 4px; }
            .priority-medium { color: #ea580c; font-weight: bold; }
            .priority-low { color: #059669; font-weight: bold; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .action-button { 
              background-color: #dc2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              margin: 15px 10px 15px 0;
            }
            .approval-note { 
              background-color: #dcfce7; 
              border: 1px solid #16a34a; 
              padding: 12px; 
              border-radius: 6px; 
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Approval Required</h1>
              <p>An equipment request has been approved by a team lead and now needs admin approval.</p>
            </div>
            
            <div class="content">
              <div class="approval-note">
                <strong>✓ Team Lead Approved</strong><br>
                This request has already been approved by the team lead and is ready for final admin approval.
              </div>
              
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Requested by:</span> ${request.requester.name} (${request.requester.email})
              </div>
              <div class="detail-row">
                <span class="label">Equipment:</span> ${request.equipmentType}
              </div>
              <div class="detail-row">
                <span class="label">Priority:</span> 
                <span class="priority-${request.priority}">${request.priority.toUpperCase()}</span>
              </div>
              ${request.neededBy ? `
              <div class="detail-row">
                <span class="label">Needed by:</span> ${request.neededBy.toLocaleDateString()}
              </div>
              ` : ''}
              ${request.budget ? `
              <div class="detail-row">
                <span class="label">Budget:</span> €${request.budget.toLocaleString()}
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Justification:</span><br>
                <div style="margin-top: 8px; padding: 12px; background-color: white; border-radius: 4px; border-left: 4px solid #dc2626;">
                  ${request.justification}
                </div>
              </div>
              ${request.specificRequirements ? `
              <div class="detail-row">
                <span class="label">Requirements:</span><br>
                <div style="margin-top: 8px; padding: 12px; background-color: white; border-radius: 4px;">
                  ${request.specificRequirements}
                </div>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button">
                  Review Request
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                You received this email because you are an admin and need to provide final approval for equipment requests.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Admin Approval Required

✓ TEAM LEAD APPROVED - This request has already been approved by the team lead and is ready for final admin approval.

Request ID: #${request.id.slice(-8)}
Requested by: ${request.requester.name} (${request.requester.email})
Equipment: ${request.equipmentType}
Priority: ${request.priority.toUpperCase()}
${request.neededBy ? `Needed by: ${request.neededBy.toLocaleDateString()}\n` : ''}${request.budget ? `Budget: €${request.budget.toLocaleString()}\n` : ''}
Justification: ${request.justification}
${request.specificRequirements ? `\nRequirements: ${request.specificRequirements}` : ''}

Review this request at: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
    `.trim();

    return { subject, html, text };
  }

  /**
   * Email template for notifying requesters when their request is approved
   */
  static requestApproved(request: EquipmentRequestEmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `✅ Equipment Request Approved: ${request.equipmentType}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f0fdf4; padding: 20px; border: 1px solid #22c55e; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .action-button { 
              background-color: #16a34a; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              margin: 15px 10px 15px 0;
            }
            .success-icon { font-size: 24px; margin-right: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1><span class="success-icon">✅</span>Request Approved!</h1>
              <p>Great news! Your equipment request has been approved and will be processed soon.</p>
            </div>
            
            <div class="content">
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Equipment:</span> ${request.equipmentType}
              </div>
              ${request.approver ? `
              <div class="detail-row">
                <span class="label">Approved by:</span> ${request.approver.name}
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Approval Date:</span> ${request.updatedAt.toLocaleDateString()}
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background-color: white; border-radius: 6px; border-left: 4px solid #16a34a;">
                <h3 style="margin-top: 0; color: #16a34a;">Next Steps</h3>
                <ul style="margin-bottom: 0;">
                  <li>Your request will be added to the procurement queue</li>
                  <li>You'll receive updates on the ordering and delivery process</li>
                  <li>Equipment will be assigned to you once it arrives</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button">
                  View Request Details
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                Thank you for using our equipment request system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
✅ Equipment Request Approved!

Great news! Your equipment request has been approved and will be processed soon.

Request ID: #${request.id.slice(-8)}
Equipment: ${request.equipmentType}
${request.approver ? `Approved by: ${request.approver.name}\n` : ''}Approval Date: ${request.updatedAt.toLocaleDateString()}

Next Steps:
- Your request will be added to the procurement queue
- You'll receive updates on the ordering and delivery process
- Equipment will be assigned to you once it arrives

View request details at: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
    `.trim();

    return { subject, html, text };
  }

  /**
   * Email template for notifying requesters when their request is rejected
   */
  static requestRejected(request: EquipmentRequestEmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `❌ Equipment Request Declined: ${request.equipmentType}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #fef2f2; padding: 20px; border: 1px solid #f87171; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .action-button { 
              background-color: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              margin: 15px 10px 15px 0;
            }
            .rejection-reason { 
              background-color: white; 
              border: 1px solid #dc2626; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 15px 0;
              border-left: 4px solid #dc2626;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Request Declined</h1>
              <p>Unfortunately, your equipment request has been declined.</p>
            </div>
            
            <div class="content">
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Equipment:</span> ${request.equipmentType}
              </div>
              ${request.approver ? `
              <div class="detail-row">
                <span class="label">Reviewed by:</span> ${request.approver.name}
              </div>
              ` : ''}
              <div class="detail-row">
                <span class="label">Decision Date:</span> ${request.updatedAt.toLocaleDateString()}
              </div>
              
              ${request.rejectionReason ? `
              <div class="rejection-reason">
                <h3 style="margin-top: 0; color: #dc2626;">Reason for Decline</h3>
                <p style="margin-bottom: 0;">${request.rejectionReason}</p>
              </div>
              ` : ''}
              
              <div style="margin-top: 20px; padding: 15px; background-color: white; border-radius: 6px; border-left: 4px solid #2563eb;">
                <h3 style="margin-top: 0; color: #2563eb;">What's Next?</h3>
                <ul style="margin-bottom: 0;">
                  <li>Review the feedback provided above</li>
                  <li>Consider submitting a revised request if appropriate</li>
                  <li>Contact your team lead or admin if you have questions</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/new" class="action-button">
                  Submit New Request
                </a>
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button" style="background-color: #64748b;">
                  View Details
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                If you have questions about this decision, please contact your team lead or admin.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
❌ Equipment Request Declined

Unfortunately, your equipment request has been declined.

Request ID: #${request.id.slice(-8)}
Equipment: ${request.equipmentType}
${request.approver ? `Reviewed by: ${request.approver.name}\n` : ''}Decision Date: ${request.updatedAt.toLocaleDateString()}

${request.rejectionReason ? `Reason for Decline:\n${request.rejectionReason}\n\n` : ''}What's Next?
- Review the feedback provided above
- Consider submitting a revised request if appropriate
- Contact your team lead or admin if you have questions

Submit a new request: ${process.env.NEXTAUTH_URL}/dashboard/requests/new
View request details: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
    `.trim();

    return { subject, html, text };
  }

  /**
   * Email template for status change notifications
   */
  static requestStatusChanged(request: EquipmentRequestEmailData, oldStatus: string): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Equipment Request Update: ${request.equipmentType} (${request.status})`;
    
    const statusColors: Record<string, string> = {
      pending: '#ea580c',
      approved: '#16a34a', 
      rejected: '#dc2626',
      ordered: '#7c3aed',
      fulfilled: '#059669'
    };

    const color = statusColors[request.status] || '#64748b';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; display: inline-block; width: 120px; }
            .action-button { 
              background-color: ${color}; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              display: inline-block; 
              margin: 15px 10px 15px 0;
            }
            .status-change { 
              background-color: white; 
              border: 1px solid ${color}; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 15px 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Request Status Update</h1>
              <p>Your equipment request status has been updated.</p>
            </div>
            
            <div class="content">
              <div class="status-change">
                <h3 style="margin-top: 0;">Status Changed</h3>
                <p style="margin-bottom: 0;">
                  <strong>${oldStatus.toUpperCase()}</strong> → <strong>${request.status.toUpperCase()}</strong>
                </p>
              </div>
              
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Equipment:</span> ${request.equipmentType}
              </div>
              <div class="detail-row">
                <span class="label">Current Status:</span> ${request.status.toUpperCase()}
              </div>
              <div class="detail-row">
                <span class="label">Updated:</span> ${request.updatedAt.toLocaleDateString()}
              </div>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button">
                  View Request Details
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                Stay updated on your equipment request progress.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Equipment Request Status Update

Your equipment request status has been updated.

Status Changed: ${oldStatus.toUpperCase()} → ${request.status.toUpperCase()}

Request ID: #${request.id.slice(-8)}
Equipment: ${request.equipmentType}
Current Status: ${request.status.toUpperCase()}
Updated: ${request.updatedAt.toLocaleDateString()}

View request details at: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
    `.trim();

    return { subject, html, text };
  }

  /**
   * Email template for notifying requester about equipment assignment
   */
  static equipmentAssigned(request: EquipmentRequestEmailData): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Equipment Assigned: ${request.equipmentType}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .footer { background-color: #64748b; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; }
            .equipment-info { background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 6px; padding: 15px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
            .label { font-weight: bold; color: #475569; }
            .action-button { display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Equipment Assigned to You! 🎉</h1>
              <p>Your equipment request has been fulfilled</p>
            </div>
            
            <div class="content">
              <p>Great news! Your equipment request has been approved and the following equipment has been assigned to you:</p>
              
              ${request.equipment ? `
              <div class="equipment-info">
                <h3 style="margin-top: 0; color: #16a34a;">Assigned Equipment</h3>
                <div class="detail-row">
                  <span class="label">Equipment Name:</span> <span>${request.equipment.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Serial Number:</span> <span>${request.equipment.serialNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span> <span>${request.equipment.status.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="label">Request ID:</span> #${request.id.slice(-8)}
              </div>
              <div class="detail-row">
                <span class="label">Requested Equipment:</span> <span>${request.equipmentType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Request Status:</span> <span>${request.status.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="label">Assigned:</span> <span>${new Date().toLocaleDateString()}</span>
              </div>
              
              <p style="margin-top: 20px; padding: 10px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <strong>Next Steps:</strong> Please contact your team lead or admin to collect your equipment. Make sure to inspect the equipment upon receipt and report any issues immediately.
              </p>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}" class="action-button">
                  View Request Details
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>ProfiCo Inventory Management System</p>
              <p style="font-size: 12px; margin-top: 8px;">
                Your equipment is ready for collection. Please keep it safe and return it when no longer needed.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Equipment Assigned to You! 🎉

Great news! Your equipment request has been approved and equipment has been assigned to you.

${request.equipment ? `
ASSIGNED EQUIPMENT:
Equipment Name: ${request.equipment.name}
Serial Number: ${request.equipment.serialNumber}
Status: ${request.equipment.status.replace('_', ' ').toUpperCase()}
` : ''}

REQUEST DETAILS:
Request ID: #${request.id.slice(-8)}
Requested Equipment: ${request.equipmentType}
Request Status: ${request.status.toUpperCase()}
Assigned: ${new Date().toLocaleDateString()}

Next Steps: Please contact your team lead or admin to collect your equipment. Make sure to inspect the equipment upon receipt and report any issues immediately.

View request details at: ${process.env.NEXTAUTH_URL}/dashboard/requests/${request.id}

--
ProfiCo Inventory Management System
Your equipment is ready for collection. Please keep it safe and return it when no longer needed.
    `.trim();

    return { subject, html, text };
  }
}

/**
 * Email notification service for equipment requests
 */
export class EmailNotificationService {
  /**
   * Reset the Resend instance (primarily for testing)
   */
  static resetInstance(): void {
    resendInstance = null;
  }
  /**
   * Send notification to team leads when a team member submits a request
   */
  static async notifyTeamLeadOfNewRequest(
    request: EquipmentRequestEmailData,
    teamLeadEmails: string[]
  ): Promise<void> {
    if (teamLeadEmails.length === 0) {
      console.warn(`No team leads found to notify for request ${request.id}`);
      return;
    }

    const template = EmailTemplates.newRequestForTeamLead(request);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: teamLeadEmails,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Team lead notification sent for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send team lead notification for request ${request.id}:`, error);
      throw new Error('Failed to send team lead notification email');
    }
  }

  /**
   * Send notification to admins when a request needs higher-level approval
   */
  static async notifyAdminOfApprovalNeeded(
    request: EquipmentRequestEmailData,
    adminEmails: string[]
  ): Promise<void> {
    if (adminEmails.length === 0) {
      console.warn(`No admins found to notify for request ${request.id}`);
      return;
    }

    const template = EmailTemplates.requestNeedsAdminApproval(request);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: adminEmails,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Admin notification sent for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send admin notification for request ${request.id}:`, error);
      throw new Error('Failed to send admin notification email');
    }
  }

  /**
   * Send approval notification to the requester
   */
  static async notifyRequesterOfApproval(request: EquipmentRequestEmailData): Promise<void> {
    const template = EmailTemplates.requestApproved(request);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: request.requester.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Approval notification sent to requester for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send approval notification for request ${request.id}:`, error);
      throw new Error('Failed to send approval notification email');
    }
  }

  /**
   * Send rejection notification to the requester
   */
  static async notifyRequesterOfRejection(request: EquipmentRequestEmailData): Promise<void> {
    const template = EmailTemplates.requestRejected(request);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: request.requester.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Rejection notification sent to requester for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send rejection notification for request ${request.id}:`, error);
      throw new Error('Failed to send rejection notification email');
    }
  }

  /**
   * Send status change notification to relevant parties
   */
  static async notifyStatusChange(
    request: EquipmentRequestEmailData,
    oldStatus: string,
    notifyEmails: string[]
  ): Promise<void> {
    if (notifyEmails.length === 0) {
      console.warn(`No emails provided for status change notification for request ${request.id}`);
      return;
    }

    const template = EmailTemplates.requestStatusChanged(request, oldStatus);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: notifyEmails,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Status change notification sent for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send status change notification for request ${request.id}:`, error);
      throw new Error('Failed to send status change notification email');
    }
  }

  /**
   * Send equipment assignment notification to the requester
   */
  static async notifyRequesterOfEquipmentAssignment(request: EquipmentRequestEmailData): Promise<void> {
    const template = EmailTemplates.equipmentAssigned(request);

    try {
      const result = await getResendInstance().emails.send({
        from: fromEmail,
        to: request.requester.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Equipment assignment notification sent to requester for request ${request.id}:`, result);
    } catch (error) {
      console.error(`Failed to send equipment assignment notification for request ${request.id}:`, error);
      throw new Error('Failed to send equipment assignment notification email');
    }
  }

  /**
   * Get team lead emails for a user's team
   */
  static async getTeamLeadEmails(userId: string): Promise<string[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          team: {
            include: {
              members: {
                where: { role: 'team_lead' },
                select: { email: true }
              }
            }
          }
        }
      });

      if (!user?.team) {
        // If user is not in a team, get all team leads as fallback
        const teamLeads = await prisma.user.findMany({
          where: { role: 'team_lead', isActive: true },
          select: { email: true }
        });
        return teamLeads.map(tl => tl.email);
      }

      return user.team.members.map(member => member.email);
    } catch (error) {
      console.error(`Failed to get team lead emails for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get admin emails
   */
  static async getAdminEmails(): Promise<string[]> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { email: true }
      });
      return admins.map(admin => admin.email);
    } catch (error) {
      console.error('Failed to get admin emails:', error);
      return [];
    }
  }
}

// Import Prisma client
import { prisma } from './prisma';