import React, { useState, useEffect } from 'react';
import { ZoomIn, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  id?: string;
  src?: string;
  alt?: string;
  className?: string;
}

type ImageVariant = 'technical' | 'visual';

/**
 * Helper to determine the image variant based on ID pattern
 */
const determineVariant = (id: string | undefined): ImageVariant => {
  if (!id) return 'visual'; // Default fallback
  if (id.startsWith('gen_')) return 'technical';
  if (id.startsWith('ret_')) return 'visual';
  return 'visual'; // Default
};

export function SmartImage({ id, src, alt, className = '', ...props }: SmartImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  
  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const variant = determineVariant(id);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setNaturalWidth(e.currentTarget.naturalWidth);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!src) return null;

  // Case A: Technical Diagram (gen_)
  // Strategy: Preservation over Aesthetics
  if (variant === 'technical') {
    return (
      <>
        <div 
          className={`relative group overflow-hidden bg-white border border-gray-200 rounded-lg ${className}`}
          style={{ height: '320px' }} // Fixed height container as requested
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}

          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-sm">Failed to load diagram</span>
            </div>
          ) : (
            <div 
              className="relative w-full h-full cursor-zoom-in"
              onClick={() => setIsModalOpen(true)}
            >
              <img
                src={src}
                alt={alt}
                id={id}
                className={`w-full h-full object-contain p-4 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                {...props}
              />
              
              {/* Hover Overlay with Magnifying Glass */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm text-gray-700">
                  <ZoomIn size={20} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {isModalOpen && createPortal(
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setIsModalOpen(false)}
          >
            <button 
              className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[100]"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
            >
              <X size={32} />
            </button>
            <div 
              className="relative max-w-[95vw] max-h-[95vh] overflow-auto flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={src} 
                alt={alt} 
                className="w-auto h-auto max-w-full max-h-full object-contain rounded-sm select-none"
              />
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Case B: Visual Asset (ret_)
  // Strategy: Aesthetics over Completeness
  const isSmallImage = naturalWidth > 0 && naturalWidth < 200;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      {/* Aspect Ratio Container (16/9 default if not specified elsewhere, but typically managed by container or aspect-ratio class) */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16/9 Aspect Ratio */}
        <div className="absolute inset-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-full h-full animate-pulse bg-gray-200" />
            </div>
          )}

          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">Image unavailable</span>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              id={id}
              className={`w-full h-full transition-opacity duration-500
                ${isLoading ? 'opacity-0' : 'opacity-100'} 
                ${isSmallImage ? 'object-scale-down object-center' : 'object-cover'}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              {...props}
            />
          )}
        </div>
      </div>
    </div>
  );
}
