import React, { useState, useEffect } from 'react';
import type { TestReportScreenshot } from '../types';

interface ScreenshotGalleryProps {
  screenshots: TestReportScreenshot[];
}

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ screenshots }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const navigateLightbox = (direction: number) => {
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = screenshots.length - 1;
    if (newIndex >= screenshots.length) newIndex = 0;
    setCurrentIndex(newIndex);
  };

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!lightboxOpen) return;

      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxOpen, currentIndex]);

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No screenshots captured yet
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {screenshots.map((screenshot, index) => (
          <div
            key={index}
            className="cursor-pointer group relative rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all"
            onClick={() => openLightbox(index)}
          >
            <img
              src={screenshot.url}
              alt={screenshot.description}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
              <div className="text-xs text-primary font-semibold">
                {screenshot.phase}
              </div>
              <div className="text-xs text-gray-300 truncate">
                {screenshot.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 text-white text-2xl bg-primary/80 hover:bg-primary w-12 h-12 rounded-md transition-colors"
            onClick={closeLightbox}
          >
            ✕
          </button>

          {/* Navigation Buttons */}
          <button
            className="absolute left-4 text-white text-4xl bg-primary/80 hover:bg-primary w-14 h-14 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox(-1);
            }}
          >
            ‹
          </button>

          <button
            className="absolute right-4 text-white text-4xl bg-primary/80 hover:bg-primary w-14 h-14 rounded-md transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigateLightbox(1);
            }}
          >
            ›
          </button>

          {/* Image */}
          <div
            className="max-w-[90%] max-h-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={screenshots[currentIndex].url}
              alt={screenshots[currentIndex].description}
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <div className="mt-4 text-center bg-black/80 rounded-md p-4">
              <div className="text-primary font-semibold mb-1">
                {screenshots[currentIndex].phase}
              </div>
              <div className="text-white">
                {screenshots[currentIndex].description}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenshotGallery;

