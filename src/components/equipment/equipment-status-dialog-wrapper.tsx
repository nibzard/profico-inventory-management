"use client";

import { useState } from "react";
import { EquipmentStatusDialog } from "@/components/equipment/equipment-status-dialog";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

interface EquipmentStatusDialogWrapperProps {
  equipment: any;
  canEdit: boolean;
}

export function EquipmentStatusDialogWrapper({ equipment, canEdit }: EquipmentStatusDialogWrapperProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => setStatusDialogOpen(true)}
      >
        <Wrench className="h-4 w-4 mr-2" />
        Change Status
      </Button>
      <EquipmentStatusDialog
        equipment={equipment}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onSuccess={() => {
          // Handle success - could refresh data or show message
          setStatusDialogOpen(false);
        }}
      />
    </>
  );
}