import prisma from '../../prisma/client';

export async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  oldValue?: string | null,
  newValue?: string | null,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: entityId ?? null,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}
