'use client';

import { useState, useEffect } from 'react';
import { FileText, Upload, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { InvoiceUpload } from '@/components/invoice/invoice-upload';
import { OCRReview } from '@/components/invoice/ocr-review';

interface InvoiceRecord {
  id: string;
  vendor: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  amount?: number;
  status: 'draft' | 'processed' | 'completed';
  confidence: number;
  equipmentCount: number;
  createdAt: string;
  processedByUser: {
    name: string;
    email: string;
  };
}

interface ProcessingResult {
  success: boolean;
  filename: string;
  processingTime: number;
  data?: {
    vendor?: string;
    invoiceNumber?: string;
    date?: string;
    amount?: number;
    equipment?: Array<{
      name: string;
      serialNumber?: string;
      specifications?: string;
      quantity?: number;
    }>;
    purchaseMethod?: string;
    depreciationPeriod?: number;
    confidence?: number;
  };
  error?: string;
}

export default function InvoiceManagementPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [reviewData, setReviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/ocr/process-invoice');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessingComplete = (results: ProcessingResult[]) => {
    // Auto-open review for the first successful result
    const firstSuccess = results.find(r => r.success && r.data);
    if (firstSuccess && firstSuccess.data) {
      setReviewData(firstSuccess.data);
    }
  };

  const handleSaveInvoice = async (data: any, createEquipment: boolean, createSubscriptions: boolean, saveAsDraft: boolean) => {
    try {
      const response = await fetch('/api/ocr/process-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ocrData: data,
          createEquipment,
          createSubscriptions,
          saveAsDraft,
        }),
      });

      if (response.ok) {
        setReviewData(null);
        fetchInvoices();
      } else {
        console.error('Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'processed':
        return <Badge variant="default">Processed</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (reviewData) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Review Invoice Data</h1>
          <p className="text-gray-600 mt-2">
            Review and edit the extracted information before saving
          </p>
        </div>
        
        <OCRReview
          ocrData={reviewData}
          onSave={handleSaveInvoice}
          onCancel={() => setReviewData(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
        <p className="text-gray-600 mt-2">
          Upload and process PDF invoices using AI-powered OCR
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Invoices
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Invoice History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <InvoiceUpload onProcessingComplete={handleProcessingComplete} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Processed Invoices</CardTitle>
              <CardDescription>
                View all processed invoices and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No invoices processed yet</p>
                  <p className="text-sm">Upload your first invoice to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="font-medium">{invoice.vendor}</h3>
                            <p className="text-sm text-gray-600">
                              {invoice.invoiceNumber && `Invoice: ${invoice.invoiceNumber}`}
                              {invoice.invoiceDate && ` • ${new Date(invoice.invoiceDate).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(invoice.status)}
                          <Badge variant="outline">
                            {Math.round(invoice.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Amount:</span>{' '}
                          {invoice.amount ? `€${invoice.amount.toFixed(2)}` : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Equipment:</span>{' '}
                          {invoice.equipmentCount} items
                        </div>
                        <div>
                          <span className="font-medium">Processed by:</span>{' '}
                          {invoice.processedByUser.name}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Created: {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>OCR Configuration</CardTitle>
                <CardDescription>
                  Configure OCR processing settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confidence Threshold</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="0.8">80% (Recommended)</option>
                    <option value="0.6">60%</option>
                    <option value="0.4">40%</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Purchase Method</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="Off-the-shelf">Off-the-shelf</option>
                    <option value="ProfiCo">ProfiCo</option>
                    <option value="ZOPI">ZOPI</option>
                    <option value="Leasing">Leasing</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Depreciation Period</label>
                  <input
                    type="number"
                    defaultValue="24"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Processing</CardTitle>
                <CardDescription>
                  File upload and processing settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max File Size</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="10">10 MB</option>
                    <option value="20">20 MB</option>
                    <option value="50">50 MB</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Files Per Upload</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="5">5 files</option>
                    <option value="10">10 files</option>
                    <option value="20">20 files</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Auto-create equipment records</span>
                  </label>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked />
                    <span className="text-sm">Enable validation</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}