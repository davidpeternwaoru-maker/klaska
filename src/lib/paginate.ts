// Pagination helpers for list endpoints, so responses stay bounded as data
// grows. `toPrisma` turns a validated {page,pageSize} into Prisma take/skip;
// `page` wraps rows + a total count into a consistent response shape.

export type PageInput = { page: number; pageSize: number };
export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number; pages: number };

export function toPrisma({ page, pageSize }: PageInput): { take: number; skip: number } {
  return { take: pageSize, skip: (page - 1) * pageSize };
}

export function paged<T>(rows: T[], total: number, { page, pageSize }: PageInput): Paged<T> {
  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
