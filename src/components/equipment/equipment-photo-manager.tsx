// ABOUTME: Equipment photo manager dialog for integration with equipment forms
// ABOUTME: Allows photo upload and management during equipment creation/editing

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Plus } from "lucide-react";
import { EquipmentPhotoUpload } from "./equipment-photo-upload";
import { EquipmentPhotoGallery } from "./equipment-photo-gallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EquipmentPhoto {
  id: string;
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
}

interface EquipmentPhotoManagerProps {
  equipmentId?: string; // Optional for new equipment
  photoCount?: number;
  onPhotoCountChange?: (count: number) => void;
  disabled?: boolean;
  className?: string;
}

export function EquipmentPhotoManager({
  equipmentId,
  photoCount = 0,
  onPhotoCountChange,
  disabled = false,
  className = "",
}: EquipmentPhotoManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPhotoCount, setCurrentPhotoCount] = useState(photoCount);
  const [activeTab, setActiveTab] = useState("upload");

  useEffect(() => {
    setCurrentPhotoCount(photoCount);
  }, [photoCount]);

  const handleUploadComplete = (photos: EquipmentPhoto[]) => {
    const newCount = currentPhotoCount + photos.length;
    setCurrentPhotoCount(newCount);
    onPhotoCountChange?.(newCount);
    setActiveTab("gallery"); // Switch to gallery after upload
  };

  const isNewEquipment = !equipmentId;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isNewEquipment}
          className={`flex items-center space-x-2 ${className}`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>
            {isNewEquipment 
              ? "Photos (Save first)" 
              : currentPhotoCount > 0 
                ? `Photos (${currentPhotoCount})` 
                : "Add Photos"
            }
          </span>
          {currentPhotoCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {currentPhotoCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Equipment Photos</span>
            {currentPhotoCount > 0 && (
              <Badge variant="secondary">{currentPhotoCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isNewEquipment ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <ImageIcon className="h-16 w-16 mx-auto text-gray-400" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Save Equipment First
                </h3>
                <p className="text-gray-500 mt-1">
                  You need to save the equipment details before you can upload photos.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Upload Photos</span>
                </TabsTrigger>
                <TabsTrigger value="gallery" className="flex items-center space-x-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>View Gallery</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="flex-1 mt-4 overflow-auto">
                <EquipmentPhotoUpload
                  equipmentId={equipmentId}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={(error) => {
                    console.error('Upload error:', error);
                  }}
                  maxFiles={10}
                />
              </TabsContent>

              <TabsContent value="gallery" className="flex-1 mt-4 overflow-auto">
                <EquipmentPhotoGallery
                  equipmentId={equipmentId}
                  equipmentName="Equipment"
                  canDelete={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}