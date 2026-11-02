import { api } from "./api/client";

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a single file to the local backend storage.
 * Files are saved to backend/uploads/{category}/ on disk and served at /uploads/{category}/...
 */
export async function uploadFile(
  file: File,
  category: string,
): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api.post<UploadResult>(
    `/api/upload?category=${encodeURIComponent(category)}`,
    fd,
  );
  return res.data;
}

/**
 * Upload multiple files sequentially, returning results for each.
 * Skips files that exceed maxBytes (default 10 MB).
 */
export async function uploadFiles(
  files: File[],
  category: string,
  options?: {
    maxBytes?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<UploadResult[]> {
  const maxBytes = options?.maxBytes ?? 10 * 1024 * 1024;
  const results: UploadResult[] = [];
  let done = 0;
  for (const file of files) {
    if (file.size > maxBytes) {
      done++;
      options?.onProgress?.(done, files.length);
      continue;
    }
    const result = await uploadFile(file, category);
    results.push(result);
    done++;
    options?.onProgress?.(done, files.length);
  }
  return results;
}
