'use client';

import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

interface UploadThingProviderProps {
  children: React.ReactNode;
}

export default function UploadThingProvider({ children }: UploadThingProviderProps) {
  return <>{children}</>;
}