import { prisma } from "@/lib/db";

export async function createLoginEvent(params: {
  userId: string;
  userAgent?: string;
  ip?: string;
}) {
  return prisma.loginEvent.create({
    data: {
      userId: params.userId,
      userAgent: params.userAgent,
      ip: params.ip,
    },
  });
}
