export function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatPath(path: string) {
  if (path.length <= 60) {
    return path;
  }

  return `${path.slice(0, 24)}...${path.slice(-28)}`;
}

export function getFileBaseName(inputPath: string) {
  const parts = inputPath.split(/[/\\]/);
  const fileName = parts[parts.length - 1] ?? "image";
  return fileName.replace(/\.[^.]+$/, "");
}

export function getOutputExtension(targetFormat: string) {
  return targetFormat === "jpeg" ? "jpg" : targetFormat;
}

export function getDefaultFileName(inputPath: string, suffix: string, targetFormat: string) {
  const baseName = getFileBaseName(inputPath);
  const extension = getOutputExtension(targetFormat);
  return `${baseName}-${suffix}.${extension}`;
}
