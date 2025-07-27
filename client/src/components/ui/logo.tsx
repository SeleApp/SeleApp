import { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = "h-20 w-20 object-contain", alt = "SeleApp Logo" }: LogoProps) {
  const [currentSrc, setCurrentSrc] = useState("/seleapp-logo-optimized.png");
  const [hasError, setHasError] = useState(false);

  const fallbacks = [
    "/seleapp-logo.jpg",
    "/seleapp-logo.png", 
    "/icon-192.png"
  ];

  const handleError = () => {
    console.error('Logo loading error for:', currentSrc);
    const currentIndex = fallbacks.indexOf(currentSrc);
    if (currentIndex < fallbacks.length - 1) {
      setCurrentSrc(fallbacks[currentIndex + 1]);
    } else {
      setHasError(true);
    }
  };

  const handleLoad = () => {
    console.log('Logo loaded successfully:', currentSrc);
    setHasError(false);
  };

  if (hasError) {
    // Fallback to a simple green circle with deer icon
    return (
      <div className={`${className} bg-green-600 rounded-full flex items-center justify-center`}>
        <span className="text-white font-bold text-xl">S</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
}