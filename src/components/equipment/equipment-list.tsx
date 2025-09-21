// ABOUTME: Equipment list component displaying equipment cards with pagination
// ABOUTME: Shows equipment items with actions based on user role and equipment status

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  UserMinus,
  Wrench,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EquipmentAssignDialog } from "./equipment-assign-dialog";
import { EquipmentUnassignDialog } from "./equipment-unassign-dialog";
import type { Equipment, User } from "@prisma/client";

interface EquipmentWithOwner extends Equipment {
  currentOwner: User | null;
}

interface EquipmentListProps {
  equipment: EquipmentWithOwner[];
  currentPage: number;
  totalPages: number;
  userRole: string;
  userId: string;
  selectedItems?: string[];
  onSelectionChange?: (selected: string[]) => void;
}

export function EquipmentList({
  equipment,
  currentPage,
  totalPages,
  userRole,
  selectedItems: externalSelectedItems,
  onSelectionChange,
}: EquipmentListProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentWithOwner | null>(null);
  // Use external selection state if provided, otherwise use internal state
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());
  const selectedItems = externalSelectedItems ? new Set(externalSelectedItems) : internalSelectedItems;

  const getStatusBadge = (status: string) => {
    const variants = {
      available: "default",
      assigned: "secondary",
      maintenance: "destructive",
      broken: "destructive",
      decommissioned: "outline",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const canEdit = () => {
    return userRole === "admin" || userRole === "team_lead";
  };

  const canAssign = (equipment: EquipmentWithOwner) => {
    return (
      (userRole === "admin" || userRole === "team_lead") &&
      equipment.status === "available"
    );
  };

  const canUnassign = (equipment: EquipmentWithOwner) => {
    return (
      (userRole === "admin" || userRole === "team_lead") &&
      equipment.status === "assigned"
    );
  };

  const handleAssign = (equipment: EquipmentWithOwner) => {
    setSelectedEquipment(equipment);
    setAssignDialogOpen(true);
  };

  const handleUnassign = (equipment: EquipmentWithOwner) => {
    setSelectedEquipment(equipment);
    setUnassignDialogOpen(true);
  };

  const handleSelectItem = (equipmentId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(equipmentId)) {
      newSelected.delete(equipmentId);
    } else {
      newSelected.add(equipmentId);
    }
    
    const newSelectedArray = Array.from(newSelected);
    
    if (onSelectionChange) {
      onSelectionChange(newSelectedArray);
    } else {
      setInternalSelectedItems(newSelected);
    }
  };

  const handleSelectAll = () => {
    const newSelected = selectedItems.size === equipment.length ? 
      new Set<string>() : 
      new Set(equipment.map(item => item.id));
    
    const newSelectedArray = Array.from(newSelected);
    
    if (onSelectionChange) {
      onSelectionChange(newSelectedArray);
    } else {
      setInternalSelectedItems(newSelected);
    }
  };

  if (equipment.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500 text-lg">No equipment found</p>
          <p className="text-gray-400 mt-2">
            Try adjusting your search or filter criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      {equipment.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="select-all"
              checked={selectedItems.size === equipment.length && equipment.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All
            </label>
            {selectedItems.size > 0 && (
              <Badge variant="secondary">
                {selectedItems.size} selected
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <Card key={item.id} className={`hover:shadow-lg transition-shadow ${selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-2 flex-1">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => handleSelectItem(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>
                      {item.brand} {item.model}
                    </CardDescription>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {item.serialNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(item.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/equipment/${item.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>

                      {canEdit() && (
                        <DropdownMenuItem asChild>
                          <Link href={`/equipment/${item.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {canAssign(item) && (
                        <DropdownMenuItem onClick={() => handleAssign(item)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign User
                        </DropdownMenuItem>
                      )}

                      {canUnassign(item) && (
                        <DropdownMenuItem onClick={() => handleUnassign(item)}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unassign
                        </DropdownMenuItem>
                      )}

                      {canEdit() && (
                        <DropdownMenuItem asChild>
                          <Link href={`/equipment/${item.id}/maintenance`}>
                            <Wrench className="h-4 w-4 mr-2" />
                            Maintenance
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem asChild>
                        <Link href={`/equipment/${item.id}/qr`}>
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Category */}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {item.category.replace("_", " ")}
                  </Badge>
                </div>

                {/* Current Owner */}
                {item.currentOwner ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Assigned to:</span>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.currentOwner.image || ""} />
                        <AvatarFallback className="text-xs">
                          {item.currentOwner.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{item.currentOwner.name}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Assigned to:</span>
                    <span className="text-sm text-gray-400">Unassigned</span>
                  </div>
                )}

                {/* Purchase Date */}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Purchased:</span>
                  <span className="text-sm">
                    {new Date(item.purchaseDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Location */}
                {item.location && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm">{item.location}</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-2 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/equipment/${item.id}`}>
                      View Full Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            asChild
          >
            <Link href={`/equipment?page=${currentPage - 1}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
              )
              .map((page, index, array) => (
                <div key={page} className="flex items-center">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-gray-400 px-2">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={`/equipment?page=${page}`}>{page}</Link>
                  </Button>
                </div>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            asChild
          >
            <Link href={`/equipment?page=${currentPage + 1}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* Assignment Dialogs */}
      {selectedEquipment && (
        <>
          <EquipmentAssignDialog
            equipment={selectedEquipment}
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
          />
          <EquipmentUnassignDialog
            equipment={selectedEquipment}
            open={unassignDialogOpen}
            onOpenChange={setUnassignDialogOpen}
          />
        </>
      )}
    </div>
  );
}
