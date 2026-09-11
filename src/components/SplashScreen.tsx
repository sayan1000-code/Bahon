import React, { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  isDataReady: boolean;
  onFinished?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isDataReady,
  onFinished,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const mountTimeRef = useRef(Date.now());

  // Handle normal video playback completion (fires after ~3.78s)
  const handleVideoEnded = () => {
    setIsVideoFinished(true);
  };

  // Fallback: If video fails to load or play, enforce a 2-second minimum before proceeding
  const handleVideoFallback = () => {
    const elapsed = Date.now() - mountTimeRef.current;
    const remainingTime = Math.max(0, 2000 - elapsed);
    setTimeout(() => {
      setIsVideoFinished(true);
    }, remainingTime);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was blocked or format unsupported
          handleVideoFallback();
        });
      }
    }

    // Safety timeout: If video stalls or takes longer than 4.8 seconds, proceed anyway
    const safetyTimer = setTimeout(() => {
      setIsVideoFinished(true);
    }, 4800);

    return () => clearTimeout(safetyTimer);
  }, []);

  // When BOTH the video has finished playing AND initial data fetch is complete,
  // initiate smooth fade-out transition (250-300ms)
  useEffect(() => {
    if (isVideoFinished && isDataReady && !isFadingOut && !isDismissed) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsDismissed(true);
        onFinished?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVideoFinished, isDataReady, isFadingOut, isDismissed, onFinished]);

  if (isDismissed) return null;

  return (
    <div
      id="app-splash-screen"
      className={`fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center overflow-hidden transition-opacity duration-300 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden={isFadingOut}
    >
      <video
        ref={videoRef}
        src="/assets/splash.mp4"
        autoPlay
        muted
        playsInline
        controls={false}
        onEnded={handleVideoEnded}
        onError={handleVideoFallback}
        className="w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
};
