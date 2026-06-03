const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",

  // Audio
  mp3: "audio/mp3",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
  aiff: "audio/aiff",
  m4a: "audio/mp4",

  // Documents
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
};

export function normalizeMimeType(mimeType: string = ""): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function getMimeType(fileName: string, currentType: string = ""): string {
  const cleanType = normalizeMimeType(currentType);

  if (cleanType && cleanType !== "application/octet-stream") {
    return cleanType;
  }

  const extension = fileName.toLowerCase().split(".").pop() || "";
  return MIME_TYPE_MAP[extension] || "application/octet-stream";
}