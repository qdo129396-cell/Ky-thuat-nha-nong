import type { PageMeta, PostStatus } from "../api/blog-api";

export function formatPostDate(value: string | null): string {
  if (!value) return "Chưa xuất bản";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function postStatusLabel(status: PostStatus): string {
  switch (status) {
    case "DRAFT": return "Bản nháp";
    case "PUBLISHED": return "Đã xuất bản";
    case "HIDDEN": return "Đã ẩn";
    case "DELETED": return "Đã xóa";
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function compactText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function pageNumbers(meta: PageMeta): number[] {
  const start = Math.max(1, Math.min(meta.page - 2, Math.max(1, meta.totalPages - 4)));
  const end = Math.min(meta.totalPages, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
