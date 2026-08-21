export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message && data.message.trim().length > 0) {
      return data.message;
    }
  }
  return fallback;
}
