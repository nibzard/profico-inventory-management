// ABOUTME: Equipment photo gallery component for viewing and managing uploaded photos
// ABOUTME: Displays photos with lightbox, delete functionality, and metadata

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Image as ImageIcon,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Grid3X3,
  List,
} from "lucide-react";

interface EquipmentPhoto {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  description?: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface EquipmentPhotoGalleryProps {
  equipmentId: string;
  equipmentName: string;
  canDelete?: boolean;
  className?: string;
}

export function EquipmentPhotoGallery({
  equipmentId,
  equipmentName,
  canDelete = false,
  className = "",
}: EquipmentPhotoGalleryProps) {
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<EquipmentPhoto | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [equipmentId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/equipment/files?equipmentId=${equipmentId}&category=photo`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const data = await response.json();
      const photoFiles = data.files.filter((file: any) => file.type.startsWith('image/'));
      setPhotos(photoFiles);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo: EquipmentPhoto, index: number) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId);
      const response = await fetch(`/api/equipment/files?fileId=${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast.success('Photo deleted successfully');
      
      // Close lightbox if the deleted photo was being viewed
      if (selectedPhoto?.id === photoId) {
        setLightboxOpen(false);
        setSelectedPhoto(null);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleDownloadPhoto = async (photo: EquipmentPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = photo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Photo downloaded');
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast.error('Failed to download photo');
    }
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? (currentPhotoIndex - 1 + photos.length) % photos.length
      : (currentPhotoIndex + 1) % photos.length;
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Photos ({photos.length})</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No photos uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload photos to help identify and track this equipment
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={
                    viewMode === 'grid'
                      ? 'group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow'
                      : 'flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50'
                  }
                >
                  {viewMode === 'grid' ? (
                    <>
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                        onClick={() => handlePhotoClick(photo, index)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePhotoClick(photo, index)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePhotoClick(photo, index)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPhoto(photo)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      disabled={deletingPhoto === photo.id}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this photo? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeletePhoto(photo.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-12 h-12 object-cover rounded cursor-pointer"
                        onClick={() => handlePhotoClick(photo, index)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{photo.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(photo.size)}</span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(photo.createdAt)}
                          </span>
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {photo.uploadedBy.name}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePhotoClick(photo, index)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPhoto(photo)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    disabled={deletingPhoto === photo.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this photo? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePhoto(photo.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedPhoto?.name}</DialogTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {currentPhotoIndex + 1} of {photos.length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLightboxOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 relative overflow-hidden">
            {selectedPhoto && (
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="w-full h-full object-contain"
              />
            )}
            
            {photos.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={() => navigateLightbox('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() => navigateLightbox('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <DialogFooter className="p-4 pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500 space-y-1">
                {selectedPhoto && (
                  <>
                    <div className="flex items-center space-x-4">
                      <span>{formatFileSize(selectedPhoto.size)}</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(selectedPhoto.createdAt)}
                      </span>
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {selectedPhoto.uploadedBy.name}
                      </span>
                    </div>
                    {selectedPhoto.description && (
                      <div className="flex items-start">
                        <FileText className="h-3 w-3 mr-1 mt-0.5" />
                        <span>{selectedPhoto.description}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {selectedPhoto && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPhoto(selectedPhoto)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                {canDelete && selectedPhoto && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={deletingPhoto === selectedPhoto.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this photo? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => selectedPhoto && handleDeletePhoto(selectedPhoto.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}