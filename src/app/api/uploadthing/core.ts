import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const f = createUploadthing();

export const ourFileRouter = {
  equipmentPhotos: f({ image: { maxFileSize: "8MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedFile = await prisma.file.create({
        data: {
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
          description: `Equipment photo - ${file.name}`,
          uploadedById: metadata.userId,
        },
      });

      return { fileId: uploadedFile.id, url: file.url, name: file.name };
    }),

  equipmentImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedFile = await prisma.file.create({
        data: {
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
          uploadedById: metadata.userId,
        },
      });

      return { fileId: uploadedFile.id };
    }),

  invoice: f({ image: { maxFileSize: "4MB", maxFileCount: 5 }, pdf: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async ({ req }) => {
      const session = await auth();

      if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "team_lead")) {
        throw new Error("Unauthorized");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedFile = await prisma.file.create({
        data: {
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
          uploadedById: metadata.userId,
        },
      });

      return { fileId: uploadedFile.id };
    }),

  document: f({ 
    image: { maxFileSize: "4MB", maxFileCount: 3 }, 
    pdf: { maxFileSize: "4MB", maxFileCount: 3 } 
  })
    .middleware(async ({ req }) => {
      const session = await auth();

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedFile = await prisma.file.create({
        data: {
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
          uploadedById: metadata.userId,
        },
      });

      return { fileId: uploadedFile.id };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;