'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getEquipmentForQR(equipmentId: string) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        currentOwner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    return {
      equipment,
      userRole: session.user.role,
    };
  } catch (error) {
    console.error('Error fetching equipment for QR:', error);
    throw new Error('Failed to fetch equipment');
  }
}