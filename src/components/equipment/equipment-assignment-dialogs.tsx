"use client";

import { EquipmentAssignDialog } from "@/components/equipment/equipment-assign-dialog";
import { EquipmentUnassignDialog } from "@/components/equipment/equipment-unassign-dialog";

interface EquipmentAssignmentDialogsProps {
  equipment: any;
  canAssign: boolean;
  canUnassign: boolean;
}

export function EquipmentAssignmentDialogs({ equipment, canAssign, canUnassign }: EquipmentAssignmentDialogsProps) {
  return (
    <>
      {canAssign && (
        <EquipmentAssignDialog equipment={equipment} />
      )}
      {canUnassign && (
        <EquipmentUnassignDialog equipment={equipment} />
      )}
    </>
  );
}