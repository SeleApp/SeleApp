import { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = "h-20 w-20 object-contain", alt = "SeleApp Logo" }: LogoProps) {
  const [currentSrc, setCurrentSrc] = useState("/logo.png");
  const [hasError, setHasError] = useState(false);
  const [useSvg, setUseSvg] = useState(false);

  const fallbacks = [
    "/seleapp-logo-optimized.png",
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
      setUseSvg(true);
    }
  };

  const handleLoad = () => {
    console.log('Logo loaded successfully:', currentSrc);
    setHasError(false);
  };

  // If all images fail, use inline SVG version of SeleApp logo
  if (useSvg) {
    return (
      <svg className={className} viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background circle */}
        <circle cx="200" cy="200" r="200" fill="#ffffff"/>
        
        {/* Deer head silhouette in green */}
        <g transform="translate(200, 120)">
          {/* Antlers */}
          <path d="M-60 -20L-80 -40M-60 -20L-70 -30M60 -20L80 -40M60 -20L70 -30" stroke="#4a5d23" strokeWidth="8" strokeLinecap="round"/>
          
          {/* Head */}
          <path d="M0 -20C-40 -20 -60 0 -60 30C-60 35 -58 40 -55 44L-70 55C-75 58 -78 63 -78 69C-78 77 -72 83 -64 83C-60 83 -57 81 -54 79L-40 67C-25 77 -12 84 0 84C12 84 25 77 40 67L54 79C57 81 60 83 64 83C72 83 78 77 78 69C78 63 75 58 70 55L55 44C58 40 60 35 60 30C60 0 40 -20 0 -20Z" fill="#4a5d23"/>
        </g>
        
        {/* SeleApp text */}
        <text x="200" y="320" fontSize="48" fontWeight="bold" textAnchor="middle" fill="#4a5d23" fontFamily="system-ui, sans-serif">
          SeleApp
        </text>
      </svg>
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