import { ImageError } from "@/lib/image/resize";
import { UploadError } from "@/lib/supabase/storage";
import { VideoError } from "@/lib/video/ffmpeg";

interface DbErrorLike {
  message: string;
  code?: string;
}

/** Thrown for a failed database write so the form can show a clear reason. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

export function describeDbError(error: DbErrorLike): string {
  const { code, message } = error;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Нет соединения с сервером. Проверь интернет и повтори.";
  }
  if (code === "42501" || /row-level security/i.test(message)) {
    return "Нет прав на запись. Сессия могла истечь — войди заново.";
  }
  if (code === "PGRST301" || /jwt/i.test(message)) {
    return "Сессия истекла. Войди заново и повтори.";
  }
  if (code === "23503") return "Связанная запись уже удалена. Обнови страницу.";
  if (code === "23514") return "База отклонила данные: значение вне допустимого набора.";
  return `База данных ответила ошибкой: ${message}`;
}

/** A user-facing message for anything thrown during an upload / save flow. */
export function describeError(error: unknown): string {
  if (
    error instanceof UploadError ||
    error instanceof ImageError ||
    error instanceof SaveError ||
    error instanceof VideoError
  ) {
    return error.message;
  }
  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "Нет соединения с сервером. Проверь интернет и повтори.";
    }
    return error.message;
  }
  return "Что-то пошло не так. Повтори попытку.";
}
