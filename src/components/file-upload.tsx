'use client';

import { useState } from 'react';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileImage,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react';

interface FileUploadProps {
  equipmentId?: string;
  onUploadComplete?: (files: Array<{ name: string; url: string; size: number; type: string }>) => void;
  currentFiles?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    createdAt: string;
  }>;
  type: 'equipmentImage' | 'invoice' | 'document';
  title?: string;
  description?: string;
  maxFiles?: number;
}

export function FileUpload({
  equipmentId,
  onUploadComplete,
  currentFiles = [],
  type,
  title,
  description,
  maxFiles = 5,
}: FileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileDescription, setFileDescription] = useState('');

  const getTypeConfig = () => {
    switch (type) {
      case 'equipmentImage':
        return {
          endpoint: 'equipmentImage' as const,
          icon: ImageIcon,
          title: title || 'Equipment Images',
          description: description || 'Upload photos of the equipment',
          acceptedTypes: 'Images (JPG, PNG, WebP)',
          maxFileSize: '4MB',
          maxFiles: 1,
        };
      case 'invoice':
        return {
          endpoint: 'invoice' as const,
          icon: FileText,
          title: title || 'Invoices & Receipts',
          description: description || 'Upload purchase invoices and receipts',
          acceptedTypes: 'Images & PDFs',
          maxFileSize: '10MB',
          maxFiles: 5,
        };
      case 'document':
        return {
          endpoint: 'document' as const,
          icon: FileText,
          title: title || 'Documents',
          description: description || 'Upload manuals, certificates, and other documents',
          acceptedTypes: 'Images & PDFs',
          maxFileSize: '4MB',
          maxFiles: 3,
        };
      default:
        return {
          endpoint: 'document' as const,
          icon: FileText,
          title: 'Files',
          description: 'Upload files',
          acceptedTypes: 'Images & PDFs',
          maxFileSize: '4MB',
          maxFiles: 3,
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          {config.title}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon className="h-5 w-5 mr-2" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{config.acceptedTypes} up to {config.maxFileSize}</span>
              <span>Max {config.maxFiles} files</span>
            </div>

            <UploadButton<OurFileRouter>
              endpoint={config.endpoint}
              onClientUploadComplete={(res) => {
                if (res) {
                  onUploadComplete?.(res);
                  setIsOpen(false);
                }
              }}
              onUploadError={(error: Error) => {
                console.error('Upload error:', error);
              }}
              className="ut-button:bg-primary ut-button:hover:bg-primary/90"
            />

            {equipmentId && (
              <div>
                <Label htmlFor="file-description">Description (Optional)</Label>
                <Input
                  id="file-description"
                  placeholder="Add a description for the uploaded files..."
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Current Files */}
          {currentFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Current Files</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.type)}
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Upload Guidelines</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use clear, high-quality images for equipment photos</li>
                  <li>• Ensure invoices are readable and complete</li>
                  <li>• Name files descriptively (e.g., &quot;laptop-invoice-2024.pdf&quot;)</li>
                  <li>• Remove any sensitive information before uploading</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}