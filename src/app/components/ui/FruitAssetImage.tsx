import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { getProcessedFruitUrl } from "../../lib/fruitAssetProcessing";

interface FruitAssetImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  fallback?: React.ReactNode;
}

export function FruitAssetImage({
  src,
  fallback,
  className,
  alt,
  ...props
}: FruitAssetImageProps) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setProcessedSrc(null);
    setFailed(false);

    void getProcessedFruitUrl(src)
      .then((url) => {
        if (active) setProcessedSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!processedSrc || failed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <img {...props} className={className} src={processedSrc} alt={alt} />;
}
