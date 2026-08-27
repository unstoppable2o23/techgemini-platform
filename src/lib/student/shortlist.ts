import { prisma } from "../prisma.ts";

export type ShortlistItemType = "CAREER" | "EDUCATION" | "UNIVERSITY";

export async function listShortlist(
  studentId: string,
  itemType?: ShortlistItemType
) {
  return prisma.studentShortlist.findMany({
    where: itemType
      ? { studentId, itemType }
      : { studentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addShortlist(input: {
  studentId: string;
  itemType: ShortlistItemType;
  itemId: string;
  note?: string | null;
}) {
  return prisma.studentShortlist.upsert({
    where: {
      studentId_itemType_itemId: {
        studentId: input.studentId,
        itemType: input.itemType,
        itemId: input.itemId,
      },
    },
    update: { note: input.note ?? null },
    create: {
      studentId: input.studentId,
      itemType: input.itemType,
      itemId: input.itemId,
      note: input.note ?? null,
    },
  });
}

export async function removeShortlist(
  studentId: string,
  itemType: ShortlistItemType,
  itemId: string
) {
  return prisma.studentShortlist.deleteMany({
    where: { studentId, itemType, itemId },
  });
}

export async function isSaved(
  studentId: string,
  itemType: ShortlistItemType,
  itemId: string
): Promise<boolean> {
  const count = await prisma.studentShortlist.count({
    where: { studentId, itemType, itemId },
  });
  return count > 0;
}
