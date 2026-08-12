import { useState, type ImgHTMLAttributes, type ReactNode } from "react";

interface FruitAssetImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  fallback?: ReactNode;
}

export function FruitAssetImage({
  src,
  fallback,
  className,
  alt,
  onError,
  ...props
}: FruitAssetImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      {...props}
      className={className}
      src={src}
      alt={alt}
      decoding="async"
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
