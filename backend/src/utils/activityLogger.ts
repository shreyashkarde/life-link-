import prisma from '../db';
import { broadcastToSuperAdmin } from '../socket';

export interface LogMetadata {
  patientId?: string;
  patientName?: string;
  requestId?: string;
  hospitalId?: string;
  hospitalName?: string;
  bedNumber?: string;
  status?: string;
  ip?: string;
  details?: string;
  [key: string]: any;
}

/**
 * Persists an administrative activity log in PostgreSQL and broadcasts
 * an 'admin-activity' event in real time to the super-admin room.
 */
export async function logAdminActivity(
  adminId: string,
  action: string,
  metadata?: LogMetadata
) {
  try {
    const logEntry = await prisma.activityLog.create({
      data: {
        adminId,
        action,
        metadata: metadata ? (metadata as any) : undefined,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            hospital: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Real-time broadcast to super admin monitoring room
    broadcastToSuperAdmin('admin-activity', logEntry);

    return logEntry;
  } catch (error) {
    console.error('[ActivityLogger Error] Failed to record activity log:', error);
    return null;
  }
}
