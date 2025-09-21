// ABOUTME: Simple Timeline component for displaying chronological events
// ABOUTME: Basic timeline implementation for request history visualization

"use client";

import { cn } from "@/lib/utils";

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineItemProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineSeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

interface TimelineConnectorProps {
  className?: string;
}

interface TimelineContentProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineDotProps {
  children?: React.ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

export function TimelineItem({ children, className }: TimelineItemProps) {
  return (
    <div className={cn("relative flex items-start space-x-4", className)}>
      {children}
    </div>
  );
}

export function TimelineSeparator({ children, className }: TimelineSeparatorProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {children}
    </div>
  );
}

export function TimelineConnector({ className }: TimelineConnectorProps) {
  return (
    <div className={cn("w-px h-full bg-gray-200", className)} />
  );
}

export function TimelineContent({ children, className }: TimelineContentProps) {
  return (
    <div className={cn("flex-1 min-w-0", className)}>
      {children}
    </div>
  );
}

export function TimelineDot({ children, className }: TimelineDotProps) {
  return (
    <div className={cn(
      "flex-shrink-0 w-4 h-4 rounded-full border-2 border-white bg-gray-400",
      "shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}