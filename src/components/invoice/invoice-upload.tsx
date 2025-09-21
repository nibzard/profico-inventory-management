'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProcessingResult {
  success: boolean;
  filename: string;
  processingTime: number;
  data?: {
    vendor?: string;
    invoiceNumber?: string;
    date?: string;
    amount?: number;
    currency?: string;
    vatAmount?: number;
    invoiceType?: 'equipment' | 'subscription' | 'mixed';
    equipment?: Array<{
      name: string;
      serialNumber?: string;
      specifications?: string;
      quantity?: number;
      unitPrice?: number;
      category?: string;
    }>;
    subscriptions?: Array<{
      softwareName: string;
      licenseType?: string;
      subscriptionPeriod?: string;
      seats?: number;
      unitPrice?: number;
      totalPrice?: number;
      renewalDate?: string;
    }>;
    purchaseMethod?: string;
    depreciationPeriod?: number;
    confidence?: number;
    extractionDetails?: {
      processingTime: number;
      modelUsed: string;
      tokensUsed?: number;
    };
  };
  error?: string;
}

interface InvoiceUploadProps {
  onProcessingComplete?: (results: ProcessingResult[]) => void;
}

export function InvoiceUpload({ onProcessingComplete }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      file => file.type === 'application/pdf' || file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setResults([]);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const data = await response.json();
      setResults(data.results);
      
      if (onProcessingComplete) {
        onProcessingComplete(data.results);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setResults(selectedFiles.map(file => ({
        success: false,
        filename: file.name,
        processingTime: 0,
        error: 'Processing failed',
      })));
    } finally {
      setIsProcessing(false);
    }
  };

  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Upload & OCR Processing
          </CardTitle>
          <CardDescription>
            Upload PDF invoices to automatically extract equipment information using AI-powered OCR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Drop invoices here or click to select
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Maximum file size: 10MB. Supported: PDF, JPG, PNG, WebP
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Select Files
              </label>
            </Button>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Selected Files ({selectedFiles.length})</h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || selectedFiles.length === 0}
                >
                  {isProcessing ? 'Processing...' : 'Process Invoices'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFiles([])}
                  disabled={isProcessing}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-sm font-medium">Processing invoices...</span>
              </div>
              <Progress value={75} className="w-full" />
              <p className="text-xs text-gray-600">
                This may take a few moments depending on the number and size of files.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {successfulResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {failedResults.length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {results.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Successful Results */}
          {successfulResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Successfully Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {successfulResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{result.filename}</span>
                          <Badge variant="outline">
                            {result.processingTime}ms
                          </Badge>
                        </div>
                        <Badge variant="secondary">
                          {Math.round((result.data?.confidence || 0) * 100)}% confidence
                        </Badge>
                      </div>
                      
                      {result.data && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              result.data.invoiceType === 'equipment' ? 'default' :
                              result.data.invoiceType === 'subscription' ? 'secondary' : 'outline'
                            }>
                              {result.data.invoiceType || 'equipment'} invoice
                            </Badge>
                            {result.data.extractionDetails && (
                              <Badge variant="outline" className="text-xs">
                                {result.data.extractionDetails.modelUsed}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Vendor:</span> {result.data.vendor || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Invoice:</span> {result.data.invoiceNumber || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Date:</span> {result.data.date || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span> {result.data.currency || '€'}{result.data.amount?.toFixed(2) || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Purchase Method:</span> {result.data.purchaseMethod || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Equipment Items:</span> {result.data.equipment?.length || 0}
                            </div>
                            {result.data.subscriptions && result.data.subscriptions.length > 0 && (
                              <div>
                                <span className="font-medium">Subscriptions:</span> {result.data.subscriptions.length}
                              </div>
                            )}
                            {result.data.vatAmount && (
                              <div>
                                <span className="font-medium">VAT Amount:</span> {result.data.currency || '€'}{result.data.vatAmount.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Results */}
          {failedResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Processing Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {failedResults.map((result, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.filename}</span>
                          <span className="text-sm">{result.error}</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}