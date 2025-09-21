// ABOUTME: Combined equipment photos component with upload and gallery functionality
// ABOUTME: Integrates photo upload and gallery components for comprehensive photo management

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Images, ImageIcon } from "lucide-react";
import { EquipmentPhotoUpload } from "./equipment-photo-upload";
import { EquipmentPhotoGallery } from "./equipment-photo-gallery";

interface EquipmentPhotosProps {
  equipmentId: string;
  equipmentName: string;
  canUpload?: boolean;
  canDelete?: boolean;
  className?: string;
}

export function EquipmentPhotos({
  equipmentId,
  equipmentName,
  canUpload = false,
  canDelete = false,
  className = "",
}: EquipmentPhotosProps) {
  const [activeTab, setActiveTab] = useState("gallery");
  const [photoCount, setPhotoCount] = useState(0);

  const handleUploadComplete = (photos: any[]) => {
    setPhotoCount(prev => prev + photos.length);
    // Switch to gallery tab after successful upload
    setActiveTab("gallery");
    // Force gallery refresh by updating key
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('equipment-photos-updated'));
    }, 500);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5" />
          <span>Equipment Photos</span>
          {photoCount > 0 && (
            <Badge variant="secondary">{photoCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery" className="flex items-center space-x-2">
              <Images className="h-4 w-4" />
              <span>View Photos</span>
            </TabsTrigger>
            {canUpload && (
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload Photos</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <EquipmentPhotoGallery
              equipmentId={equipmentId}
              equipmentName={equipmentName}
              canDelete={canDelete}
            />
          </TabsContent>

          {canUpload && (
            <TabsContent value="upload" className="mt-4">
              <EquipmentPhotoUpload
                equipmentId={equipmentId}
                onUploadComplete={handleUploadComplete}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                }}
                maxFiles={10}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}