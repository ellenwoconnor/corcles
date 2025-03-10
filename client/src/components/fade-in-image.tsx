
import { motion } from "framer-motion";
import { useState } from "react";

interface FadeInImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function FadeInImage({ src, alt, ...props }: FadeInImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.img
      src={src}
      alt={alt}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      onLoad={() => setIsLoaded(true)}
      {...props}
    />
  );
}
