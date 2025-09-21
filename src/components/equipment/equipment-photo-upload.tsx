// ABOUTME: Equipment photo upload component with drag-and-drop support
// ABOUTME: Handles multiple photo uploads using UploadThing integration

"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadButton, UploadDropzone } from "@uploadthing/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileImage,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

interface UploadedPhoto {
  id: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

interface EquipmentPhotoUploadProps {
  equipmentId: string;
  onUploadComplete?: (photos: UploadedPhoto[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  className?: string;
}

export function EquipmentPhotoUpload({
  equipmentId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  className = "",
}: EquipmentPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedPhoto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 8 * 1024 * 1024) { // 8MB limit
        toast.error(`${file.name} is too large (max 8MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [selectedFiles, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    maxFiles: maxFiles,
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Note: This is a simplified version. In production, you'd use UploadThing's upload directly
      toast.info('Please use the Upload Button below for now. Drag & drop will be enhanced in future updates.');
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Equipment Photos</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the images here...</p>
          ) : (
            <div>
              <p className="text-gray-600">Drag & drop images here, or click to select</p>
              <p className="text-sm text-gray-500 mt-1">
                Maximum {maxFiles} files, up to 8MB each
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: JPEG, PNG, GIF, WebP
              </p>
            </div>
          )}
        </div>

        {/* UploadThing Upload Button */}
        <div className="flex justify-center">
          <UploadButton<OurFileRouter, "equipmentPhotos">
            endpoint="equipmentPhotos"
            onClientUploadComplete={async (res) => {
              if (res) {
                try {
                  const newPhotos = res.map(file => ({
                    id: file.fileId || file.key,
                    url: file.url,
                    name: file.name || 'Unknown',
                    size: file.size || 0,
                    uploadedAt: new Date().toISOString(),
                  }));
                  
                  // Associate uploaded files with equipment
                  const associateResponse = await fetch('/api/equipment/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      equipmentId,
                      files: res.map(r => ({
                        key: r.key,
                        name: r.name || 'Unknown',
                        size: r.size || 0,
                        type: 'image/jpeg', // UploadThing handles image validation
                        url: r.url,
                      })),
                      metadata: res.map(r => ({
                        fileKey: r.key,
                        description: `Equipment photo - ${r.name || 'Unknown'}`,
                        category: 'photo' as const,
                      })),
                    }),
                  });

                  if (!associateResponse.ok) {
                    throw new Error('Failed to associate photos with equipment');
                  }

                  setUploadedFiles(prev => [...prev, ...newPhotos]);
                  toast.success(`Successfully uploaded ${newPhotos.length} photo(s)`);
                  onUploadComplete?.(newPhotos);
                } catch (error) {
                  console.error('Error associating photos:', error);
                  toast.error('Photos uploaded but failed to associate with equipment');
                  onUploadError?.('Association failed');
                }
              }
            }}
            onUploadError={(error: Error) => {
              console.error('Upload error:', error);
              toast.error(`Upload failed: ${error.message}`);
              onUploadError?.(error.message);
            }}
            config={{
              mode: "auto",
            }}
            appearance={{
              button: "ut-ready:bg-blue-600 ut-ready:hover:bg-blue-700 ut-uploading:bg-blue-600/50",
              allowedContent: "text-gray-600 text-sm",
            }}
            content={{
              button: ({ ready, isUploading }) => {
                if (isUploading) return "Uploading...";
                if (ready) return "Upload Equipment Photos";
                return "Getting ready...";
              },
              allowedContent: ({ ready, fileTypes, isUploading }) => {
                if (!ready) return "Checking...";
                if (isUploading) return "Uploading photos...";
                return `Images up to 8MB (${fileTypes.join(", ")})`;
              },
            }}
          />
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
              <Button
                onClick={uploadFiles}
                disabled={uploading}
                className="px-4 py-2"
              >
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                  <FileImage className="h-4 w-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  {!uploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                {uploadedFiles.length} photo(s) uploaded successfully
              </span>
            </div>
          </div>
        )}

        {/* Upload Guidelines */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Upload high-quality photos for better equipment identification</p>
          <p>• Include multiple angles: front, back, sides, ports, labels</p>
          <p>• Ensure serial numbers and labels are clearly visible</p>
          <p>• Photos help with maintenance, audits, and insurance claims</p>
        </div>
      </CardContent>
    </Card>
  );
}