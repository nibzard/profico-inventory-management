import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export interface EquipmentItem {
  name: string;
  serialNumber?: string;
  specifications?: string;
  quantity?: number;
  unitPrice?: number;
  category?: string;
}

export interface SubscriptionItem {
  softwareName: string;
  licenseType?: string;
  subscriptionPeriod?: string;
  seats?: number;
  unitPrice?: number;
  totalPrice?: number;
  renewalDate?: string;
}

export interface OCRResult {
  vendor?: string;
  invoiceNumber?: string;
  date?: string;
  amount?: number;
  currency?: string;
  vatAmount?: number;
  equipment?: EquipmentItem[];
  subscriptions?: SubscriptionItem[];
  invoiceType?: 'equipment' | 'subscription' | 'mixed';
  purchaseMethod?: 'ProfiCo' | 'ZOPI' | 'Leasing' | 'Off-the-shelf';
  depreciationPeriod?: number;
  confidence?: number;
  rawText?: string;
  extractionDetails?: {
    processingTime: number;
    modelUsed: string;
    tokensUsed?: number;
  };
}

export class GeminiOCRService {
  private model: ReturnType<typeof genAI.getGenerativeModel>;
  private visionModel: ReturnType<typeof genAI.getGenerativeModel>;

  constructor() {
    // Use Gemini 2.5 Pro model for text processing
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent extraction
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    
    // Use Gemini 2.5 Flash for vision tasks (PDF/image processing)
    this.visionModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }

  async extractInvoiceData(pdfBuffer: Buffer, _filename?: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      // Extract text from PDF using pdf-parse
      const pdfText = await this.extractTextFromPDF(pdfBuffer);
      
      // Determine if this is likely an equipment or subscription invoice
      const invoiceType = this.detectInvoiceType(pdfText);
      
      // Create enhanced prompt based on invoice type
      const prompt = this.createEnhancedPrompt(pdfText, invoiceType);
      
      // Use Gemini to extract structured data
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean and parse the JSON response
      const cleanedText = this.cleanJsonResponse(text);
      
      try {
        const extractedData = JSON.parse(cleanedText);
        const processingTime = Date.now() - startTime;
        
        return {
          ...extractedData,
          rawText: pdfText,
          invoiceType,
          extractionDetails: {
            processingTime,
            modelUsed: 'gemini-2.5-pro',
          }
        };
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        
        // Fallback: try to extract basic information using regex
        return this.fallbackExtraction(pdfText, Date.now() - startTime);
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw new Error(`Failed to extract invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdf(pdfBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }
  
  private detectInvoiceType(text: string): 'equipment' | 'subscription' | 'mixed' {
    const lowerText = text.toLowerCase();
    
    // Keywords for subscription invoices
    const subscriptionKeywords = [
      'license', 'subscription', 'saas', 'software service', 'monthly fee',
      'annual fee', 'renewal', 'seat', 'user license', 'cloud service',
      'hosting', 'domain', 'ssl certificate', 'api usage'
    ];
    
    // Keywords for equipment invoices
    const equipmentKeywords = [
      'laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'tablet',
      'smartphone', 'printer', 'scanner', 'server', 'switch', 'router',
      'cable', 'adapter', 'hard drive', 'ssd', 'ram', 'processor',
      'graphics card', 'motherboard', 'power supply', 'case'
    ];
    
    const subscriptionMatches = subscriptionKeywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length;
    
    const equipmentMatches = equipmentKeywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length;
    
    if (subscriptionMatches > equipmentMatches && subscriptionMatches > 0) {
      return 'subscription';
    } else if (equipmentMatches > subscriptionMatches && equipmentMatches > 0) {
      return 'equipment';
    } else if (subscriptionMatches > 0 && equipmentMatches > 0) {
      return 'mixed';
    } else {
      return 'equipment'; // Default assumption
    }
  }
  
  private createEnhancedPrompt(text: string, invoiceType: string): string {
    const baseInstructions = `
Analyze this ${invoiceType} invoice text and extract structured information in JSON format.

IMPORTANT RULES:
- Return ONLY valid JSON, no explanations or markdown
- Use null for missing values, never leave fields undefined
- Dates must be in YYYY-MM-DD format
- All amounts must be numbers (no currency symbols)
- Be precise with quantities and specifications
- Confidence score should reflect extraction certainty (0.0-1.0)
- Extract VAT/tax information when available
`;

    if (invoiceType === 'subscription') {
      return `${baseInstructions}

Expected JSON structure:
{
  "vendor": "Company name",
  "invoiceNumber": "Invoice number",
  "date": "YYYY-MM-DD",
  "amount": 1234.56,
  "currency": "EUR",
  "vatAmount": 123.45,
  "invoiceType": "subscription",
  "subscriptions": [
    {
      "softwareName": "Software/Service name",
      "licenseType": "Standard/Premium/Enterprise",
      "subscriptionPeriod": "monthly/yearly",
      "seats": 1,
      "unitPrice": 29.99,
      "totalPrice": 29.99,
      "renewalDate": "YYYY-MM-DD"
    }
  ],
  "purchaseMethod": "ProfiCo",
  "confidence": 0.95
}

Invoice text:
${text}`;
    } else if (invoiceType === 'equipment') {
      return `${baseInstructions}

Expected JSON structure:
{
  "vendor": "Company name",
  "invoiceNumber": "Invoice number",
  "date": "YYYY-MM-DD",
  "amount": 1234.56,
  "currency": "EUR",
  "vatAmount": 123.45,
  "invoiceType": "equipment",
  "equipment": [
    {
      "name": "Equipment name",
      "serialNumber": "Serial number if available",
      "specifications": "Technical specifications",
      "quantity": 1,
      "unitPrice": 299.99,
      "category": "laptop/desktop/monitor/etc"
    }
  ],
  "purchaseMethod": "ProfiCo",
  "depreciationPeriod": 24,
  "confidence": 0.95
}

Invoice text:
${text}`;
    } else {
      // Mixed invoice type
      return `${baseInstructions}

Expected JSON structure:
{
  "vendor": "Company name",
  "invoiceNumber": "Invoice number",
  "date": "YYYY-MM-DD",
  "amount": 1234.56,
  "currency": "EUR",
  "vatAmount": 123.45,
  "invoiceType": "mixed",
  "equipment": [
    {
      "name": "Equipment name",
      "serialNumber": "Serial number",
      "specifications": "Technical specs",
      "quantity": 1,
      "unitPrice": 299.99,
      "category": "laptop/desktop/monitor/etc"
    }
  ],
  "subscriptions": [
    {
      "softwareName": "Software name",
      "licenseType": "License type",
      "subscriptionPeriod": "monthly/yearly",
      "seats": 1,
      "unitPrice": 29.99,
      "totalPrice": 29.99,
      "renewalDate": "YYYY-MM-DD"
    }
  ],
  "purchaseMethod": "ProfiCo",
  "depreciationPeriod": 24,
  "confidence": 0.95
}

Invoice text:
${text}`;
    }
  }
  
  private cleanJsonResponse(text: string): string {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\s*|```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Find the first { and last } to extract just the JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned;
  }
  
  private fallbackExtraction(text: string, processingTime: number): OCRResult {
    // Basic regex-based extraction as fallback
    const vendorMatch = text.match(/(?:from|vendor|company):\s*([^\n]+)/i);
    const amountMatch = text.match(/(?:total|amount|sum):\s*[€$]?([\d,]+\.?\d*)/i);
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    
    return {
      vendor: vendorMatch?.[1]?.trim() || undefined,
      amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : undefined,
      date: dateMatch ? this.normalizeDateFormat(dateMatch[1]) : undefined,
      confidence: 0.3, // Low confidence for fallback
      rawText: text,
      extractionDetails: {
        processingTime,
        modelUsed: 'fallback-regex',
      }
    };
  }
  
  private normalizeDateFormat(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return dateStr; // Return original if parsing fails
    }
  }

  async validateExtractedData(data: OCRResult): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data.vendor) errors.push('Vendor name is required');
    if (!data.amount || data.amount <= 0) errors.push('Valid amount is required');
    if (!data.date) errors.push('Invoice date is required');
    if (!data.equipment || data.equipment.length === 0) errors.push('At least one equipment item is required');
    if (!data.purchaseMethod) errors.push('Purchase method is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async generateEquipmentFromOCR(data: OCRResult): Promise<Array<Record<string, unknown>>> {
    const equipmentItems = [];

    for (const item of data.equipment || []) {
      const equipment = {
        name: item.name,
        serialNumber: item.serialNumber || undefined,
        specifications: item.specifications || undefined,
        category: this.categorizeEquipment(item.name),
        status: 'pending',
        purchasePrice: data.amount ? data.amount / (data.equipment?.length || 1) : 0,
        purchaseDate: new Date(data.date || Date.now()),
        purchaseMethod: data.purchaseMethod || 'Off-the-shelf',
        depreciationPeriod: data.depreciationPeriod || 24,
        vendor: data.vendor || '',
        invoiceNumber: data.invoiceNumber || '',
        confidence: data.confidence || 0
      };

      equipmentItems.push(equipment);
    }

    return equipmentItems;
  }
  
  async generateSubscriptionsFromOCR(data: OCRResult): Promise<Array<Record<string, unknown>>> {
    const subscriptionItems = [];

    for (const item of data.subscriptions || []) {
      const subscription = {
        softwareName: item.softwareName,
        assignedUserEmail: '', // To be assigned later
        price: item.unitPrice || item.totalPrice || 0,
        billingFrequency: this.normalizeBillingFrequency(item.subscriptionPeriod),
        paymentMethod: data.purchaseMethod === 'ProfiCo' ? 'company_card' : 'personal_card',
        invoiceRecipient: data.vendor || '',
        isReimbursement: data.purchaseMethod !== 'ProfiCo',
        isActive: true,
        renewalDate: new Date(item.renewalDate || this.calculateRenewalDate(data.date, item.subscriptionPeriod)),
        vendor: data.vendor || '',
        licenseKey: null, // To be filled manually
        notes: `Created from invoice ${data.invoiceNumber || 'N/A'}. ` +
               `Seats: ${item.seats || 1}. ` +
               (data.confidence && data.confidence < 0.8 ? 
                 `OCR confidence: ${Math.round((data.confidence) * 100)}%` : ''),
        // Additional metadata for processing
        _ocrData: {
          licenseType: item.licenseType,
          seats: item.seats || 1,
          extractedPrice: item.unitPrice,
          confidence: data.confidence
        }
      };

      subscriptionItems.push(subscription);
    }

    return subscriptionItems;
  }

  private categorizeEquipment(name: string): string {
    const nameLower = name.toLowerCase();
    
    // Computing devices
    if (nameLower.includes('laptop') || nameLower.includes('notebook') || nameLower.includes('macbook')) return 'laptop';
    if (nameLower.includes('desktop') || nameLower.includes('pc') || nameLower.includes('workstation') || nameLower.includes('imac')) return 'desktop';
    if (nameLower.includes('server') || nameLower.includes('nas') || nameLower.includes('rack')) return 'server';
    
    // Mobile devices
    if (nameLower.includes('phone') || nameLower.includes('mobile') || nameLower.includes('iphone') || nameLower.includes('android')) return 'mobile';
    if (nameLower.includes('tablet') || nameLower.includes('ipad')) return 'tablet';
    
    // Displays
    if (nameLower.includes('monitor') || nameLower.includes('display') || nameLower.includes('screen')) return 'monitor';
    if (nameLower.includes('projector') || nameLower.includes('beamer')) return 'monitor';
    
    // Peripherals
    if (nameLower.includes('keyboard') || nameLower.includes('mouse') || nameLower.includes('trackpad')) return 'peripheral';
    if (nameLower.includes('printer') || nameLower.includes('scanner') || nameLower.includes('copier')) return 'peripheral';
    if (nameLower.includes('webcam') || nameLower.includes('camera') || nameLower.includes('microphone')) return 'peripheral';
    if (nameLower.includes('speaker') || nameLower.includes('headphone') || nameLower.includes('headset')) return 'peripheral';
    
    // Network equipment
    if (nameLower.includes('switch') || nameLower.includes('router') || nameLower.includes('gateway')) return 'network';
    if (nameLower.includes('firewall') || nameLower.includes('access point') || nameLower.includes('wifi')) return 'network';
    
    // Storage
    if (nameLower.includes('hard drive') || nameLower.includes('hdd') || nameLower.includes('ssd') || nameLower.includes('storage')) return 'storage';
    if (nameLower.includes('usb') || nameLower.includes('external drive') || nameLower.includes('backup')) return 'storage';
    
    // Components
    if (nameLower.includes('ram') || nameLower.includes('memory') || nameLower.includes('processor') || nameLower.includes('cpu')) return 'component';
    if (nameLower.includes('graphics card') || nameLower.includes('gpu') || nameLower.includes('motherboard')) return 'component';
    if (nameLower.includes('power supply') || nameLower.includes('psu') || nameLower.includes('cooling')) return 'component';
    
    // Software
    if (nameLower.includes('software') || nameLower.includes('license') || nameLower.includes('subscription')) return 'software';
    
    return 'other';
  }
  
  private generateSerialNumber(equipmentName: string, index?: number): string {
    const prefix = this.getSerialPrefix(equipmentName);
    const timestamp = Date.now().toString().slice(-6);
    const suffix = index ? `-${index.toString().padStart(2, '0')}` : '';
    return `${prefix}${timestamp}${suffix}`;
  }
  
  private getSerialPrefix(name: string): string {
    const category = this.categorizeEquipment(name);
    const prefixes: Record<string, string> = {
      laptop: 'LT',
      desktop: 'DT',
      monitor: 'MN',
      mobile: 'MB',
      tablet: 'TB',
      server: 'SV',
      network: 'NW',
      peripheral: 'PR',
      storage: 'ST',
      component: 'CP',
      software: 'SW',
      other: 'OT'
    };
    return prefixes[category] || 'GN';
  }
  
  private getDefaultDepreciationPeriod(equipmentName: string): number {
    const category = this.categorizeEquipment(equipmentName);
    const periods: Record<string, number> = {
      laptop: 36,
      desktop: 48,
      monitor: 60,
      mobile: 24,
      tablet: 36,
      server: 60,
      network: 60,
      peripheral: 36,
      storage: 48,
      component: 36,
      software: 12, // Handled separately for subscriptions
      other: 24
    };
    return periods[category] || 24;
  }
  
  private calculateWarrantyExpiry(purchaseDate?: string, equipmentName?: string): Date | null {
    if (!purchaseDate) return null;
    
    const purchase = new Date(purchaseDate);
    const category = equipmentName ? this.categorizeEquipment(equipmentName) : 'other';
    
    // Default warranty periods in months
    const warrantyPeriods: Record<string, number> = {
      laptop: 24,
      desktop: 24,
      monitor: 36,
      mobile: 12,
      tablet: 12,
      server: 36,
      network: 60, // Often longer warranty
      peripheral: 12,
      storage: 36,
      component: 24,
      other: 12
    };
    
    const months = warrantyPeriods[category] || 12;
    const warranty = new Date(purchase);
    warranty.setMonth(warranty.getMonth() + months);
    
    return warranty;
  }
  
  private normalizeBillingFrequency(period?: string): 'monthly' | 'yearly' {
    if (!period) return 'monthly';
    
    const lowerPeriod = period.toLowerCase();
    if (lowerPeriod.includes('year') || lowerPeriod.includes('annual') || lowerPeriod.includes('12')) {
      return 'yearly';
    }
    return 'monthly';
  }
  
  private calculateRenewalDate(invoiceDate?: string, period?: string): string {
    const base = invoiceDate ? new Date(invoiceDate) : new Date();
    const isYearly = this.normalizeBillingFrequency(period) === 'yearly';
    
    const renewal = new Date(base);
    if (isYearly) {
      renewal.setFullYear(renewal.getFullYear() + 1);
    } else {
      renewal.setMonth(renewal.getMonth() + 1);
    }
    
    return renewal.toISOString().split('T')[0];
  }
  
  // Enhanced image processing capability
  async extractFromImage(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };
      
      const prompt = `
Analyze this invoice image and extract structured information in JSON format.

IMPORTANT RULES:
- Return ONLY valid JSON, no explanations or markdown
- Use null for missing values
- Dates must be in YYYY-MM-DD format
- All amounts must be numbers (no currency symbols)
- Include confidence score (0.0-1.0)

Expected JSON structure:
{
  "vendor": "Company name",
  "invoiceNumber": "Invoice number",
  "date": "YYYY-MM-DD",
  "amount": 1234.56,
  "currency": "EUR",
  "invoiceType": "equipment/subscription/mixed",
  "equipment": [
    {
      "name": "Item name",
      "quantity": 1,
      "unitPrice": 299.99
    }
  ],
  "subscriptions": [
    {
      "softwareName": "Software name",
      "subscriptionPeriod": "monthly/yearly",
      "seats": 1,
      "unitPrice": 29.99
    }
  ],
  "confidence": 0.95
}`;
      
      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      const cleanedText = this.cleanJsonResponse(text);
      const extractedData = JSON.parse(cleanedText);
      
      return {
        ...extractedData,
        extractionDetails: {
          processingTime: Date.now() - startTime,
          modelUsed: 'gemini-2.5-flash-vision',
        }
      };
    } catch (error) {
      console.error('Image OCR extraction failed:', error);
      throw new Error(`Failed to extract data from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const geminiOCRService = new GeminiOCRService();