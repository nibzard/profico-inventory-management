// ABOUTME: Client wrapper for EquipmentForm to handle navigation callbacks
// ABOUTME: Separates server-side auth logic from client-side form interactions

"use client";

import { useRouter } from "next/navigation";
import { EquipmentForm } from "@/components/forms/equipment-form";

interface EquipmentFormWrapperProps {
  equipment?: any;
}

export function EquipmentFormWrapper({ equipment }: EquipmentFormWrapperProps) {
  const router = useRouter();

  const handleSuccess = () => {
    if (equipment?.id) {
      router.push(`/equipment/${equipment.id}`);
    } else {
      router.push("/equipment");
    }
  };

  const handleCancel = () => {
    if (equipment?.id) {
      router.push(`/equipment/${equipment.id}`);
    } else {
      router.push("/equipment");
    }
  };

  return (
    <EquipmentForm
      equipment={equipment}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}