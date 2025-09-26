// OptionalFontLoader.tsx - Ładowanie opcjonalnych fontów w tle
import React, { useEffect, useState } from "react";
import { useOptionalFonts } from "../app/config/fonts";

interface OptionalFontLoaderProps {
  children: React.ReactNode;
}

export const OptionalFontLoader: React.FC<OptionalFontLoaderProps> = ({
  children,
}) => {
  const [optionalFontsLoaded] = useOptionalFonts();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (optionalFontsLoaded && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      console.log("🎨 Optional fonts loaded successfully");
    }
  }, [optionalFontsLoaded, hasLoadedOnce]);

  // Render children immediately, fonts will load in background
  return <>{children}</>;
};
