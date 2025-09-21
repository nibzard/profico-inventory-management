// ABOUTME: API endpoint for uploading equipment photos and documentation
// ABOUTME: Handles file uploads, metadata extraction, and file association with equipment

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

const uploadApi = new UTApi();

const fileUploadSchema = z.object({
  equipmentId: z.string().cuid(),
  files: z.array(z.object({
    key: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    url: z.string(),
  })),
  metadata: z.array(z.object({
    fileKey: z.string(),
    description: z.string().optional(),
    category: z.enum(["photo", "invoice", "warranty", "manual", "other"]),
    tags: z.array(z.string()).optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = fileUploadSchema.parse(body);

    // Verify equipment exists and user has permission
    const equipment = await db.equipment.findUnique({
      where: { id: validatedData.equipmentId },
      include: { currentOwner: true },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Check permissions
    const hasPermission = 
      session.user.role === "admin" ||
      session.user.role === "team_lead" ||
      equipment.currentOwnerId === session.user.id;

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Process file uploads
    const uploadedFiles = await Promise.all(
      validatedData.files.map(async (file, index) => {
        const metadata = validatedData.metadata?.[index];
        
        const uploadedFile = await db.file.create({
          data: {
            name: file.name,
            url: file.url,
            size: file.size,
            type: file.type,
            description: metadata?.description || null,
            equipmentId: validatedData.equipmentId,
            uploadedById: session.user.id,
          },
        });

        return uploadedFile;
      })
    );

    // Update equipment's photos field if photos were uploaded
    const photoFiles = uploadedFiles.filter(file => file.type.startsWith('image/'));
    if (photoFiles.length > 0) {
      const currentPhotos = equipment.photos ? JSON.parse(equipment.photos) : [];
      const newPhotos = [
        ...currentPhotos,
        ...photoFiles.map(file => ({
          id: file.id,
          url: file.url,
          name: file.name,
          uploadedAt: file.createdAt.toISOString(),
        }))
      ];

      await db.equipment.update({
        where: { id: validatedData.equipmentId },
        data: {
          photos: JSON.stringify(newPhotos),
          updatedAt: new Date(),
        },
      });
    }

    // Create history record
    await db.equipmentHistory.create({
      data: {
        equipmentId: validatedData.equipmentId,
        action: "files_uploaded",
        notes: `Uploaded ${uploadedFiles.length} file(s) to equipment record`,
      },
    });

    return NextResponse.json({
      message: "Files uploaded successfully",
      files: uploadedFiles,
      equipment: {
        id: equipment.id,
        name: equipment.name,
        fileCount: uploadedFiles.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get("equipmentId");
    const category = searchParams.get("category");

    if (!equipmentId) {
      return NextResponse.json({ error: "Equipment ID required" }, { status: 400 });
    }

    // Verify equipment exists and user has permission
    const equipment = await db.equipment.findUnique({
      where: { id: equipmentId },
      include: { currentOwner: true },
    });

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    // Check permissions
    const hasPermission = 
      session.user.role === "admin" ||
      session.user.role === "team_lead" ||
      equipment.currentOwnerId === session.user.id;

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const where: any = { equipmentId };
    if (category) {
      where.type = category === "photo" ? { startsWith: "image/" } : { contains: category };
    }

    const files = await db.file.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      files,
      equipment: {
        id: equipment.id,
        name: equipment.name,
        photoCount: files.filter(f => f.type.startsWith('image/')).length,
        documentCount: files.filter(f => !f.type.startsWith('image/')).length,
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Get file details
    const file = await db.file.findUnique({
      where: { id: fileId },
      include: {
        equipment: {
          include: { currentOwner: true },
        },
        uploadedBy: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions
    const hasPermission = 
      session.user.role === "admin" ||
      (session.user.role === "team_lead" && file.uploadedById === session.user.id) ||
      file.uploadedById === session.user.id;

    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Delete from UploadThing
    const fileKey = file.url.split('/').pop();
    if (fileKey) {
      await uploadApi.deleteFiles([fileKey]);
    }

    // Delete from database
    await db.file.delete({
      where: { id: fileId },
    });

    // Update equipment photos if this was an image
    if (file.type.startsWith('image/') && file.equipment?.photos) {
      const currentPhotos = JSON.parse(file.equipment.photos);
      const updatedPhotos = currentPhotos.filter((photo: any) => photo.id !== fileId);
      
      if (file.equipmentId) {
        await db.equipment.update({
          where: { id: file.equipmentId },
          data: {
            photos: JSON.stringify(updatedPhotos),
            updatedAt: new Date(),
          },
        });
      }
    }

    // Create history record if equipmentId exists
    if (file.equipmentId) {
      await db.equipmentHistory.create({
        data: {
          equipmentId: file.equipmentId,
          action: "file_deleted",
          notes: `Deleted file: ${file.name}`,
        },
      });
    }

    return NextResponse.json({
      message: "File deleted successfully",
      deletedFile: {
        id: file.id,
        name: file.name,
      },
    });
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}