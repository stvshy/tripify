import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Base dimensions (iPhone X as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const useResponsiveScaling = () => {
  // Calculate screen area ratio
  const currentArea = width * height;
  const baseArea = BASE_WIDTH * BASE_HEIGHT;
  const areaRatio = Math.sqrt(currentArea / baseArea);

  // Calculate basic scale factors
  const shortSide = Math.min(width, height);
  const basicScale = shortSide / BASE_WIDTH;

  // Different scaling strategies
  const getScale = {
    // Conservative scaling for UI elements (buttons, inputs) - increased range for large screens
    ui: () => Math.max(0.8, Math.min(basicScale, 1.25)),

    // Moderate scaling for text (titles, subtitles) - adjusted based on console values
    text: () => {
      if (areaRatio < 0.91) {
        return Math.max(0.9, Math.min(areaRatio, 1.0)); // smaller on small screens
      }
      return Math.max(0.95, Math.min(areaRatio, 1.13)); // larger on big screens
    },

    // Responsive scaling for spacing
    spacing: () => Math.max(0.95, Math.min(areaRatio, 1.1)),
  };

  // Helper functions
  const scaleFont = (baseSize: number, type: "ui" | "text" = "ui") => {
    return baseSize * getScale[type]();
  };

  const scaleSize = (baseSize: number, type: "ui" | "spacing" = "ui") => {
    return Math.round(baseSize * getScale[type]());
  };

  // Debug info
  if (__DEV__) {
    console.log(
      `Scaling - Screen: ${width}x${height}, Area Ratio: ${areaRatio.toFixed(3)}, UI Scale: ${getScale.ui().toFixed(3)}, Text Scale: ${getScale.text().toFixed(3)}`
    );
  }

  return {
    // Scale factors
    uiScale: getScale.ui(),
    textScale: getScale.text(),
    spacingScale: getScale.spacing(),

    // Helper functions
    scaleFont,
    scaleSize,

    // Raw values for custom calculations
    areaRatio,
    basicScale,
  };
};
