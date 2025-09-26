import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

let hideTimer: NodeJS.Timeout | null = null;
let autoHideInterval: NodeJS.Timeout | null = null;

// Make Android nav bar transparent while remaining visible (edge-to-edge)
export async function enableTransparentNavBar(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setPositionAsync("absolute");
    await NavigationBar.setBackgroundColorAsync("#00000000");
    await NavigationBar.setButtonStyleAsync("light");
    await NavigationBar.setVisibilityAsync("visible");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Failed to enable transparent nav bar:", error);
  }
}

// Restore defaults (inline nav bar with opaque background)
export async function restoreDefaultNavBar(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setPositionAsync("relative");
    await NavigationBar.setBackgroundColorAsync("#000000");
    await NavigationBar.setButtonStyleAsync("dark");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Failed to restore default nav bar:", error);
  }
}

// Hide/show helpers used for auth screens
export async function hideNavBar(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    // Clear any existing timer
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    // Keep edge-to-edge so when the bar is revealed transiently,
    // it overlays content instead of resizing the app area
    await NavigationBar.setPositionAsync("absolute");
    await NavigationBar.setBackgroundColorAsync("#00000000");
    await NavigationBar.setVisibilityAsync("hidden");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Failed to hide nav bar:", error);
  }
}

export async function showNavBar(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    // Clear any existing timer
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    // Reveal bar as overlay (translucent effect) without resizing content
    await NavigationBar.setPositionAsync("absolute");
    // darker translucent background
    await NavigationBar.setBackgroundColorAsync("#00000080");
    await NavigationBar.setVisibilityAsync("visible");
    await NavigationBar.setButtonStyleAsync("light"); // Light icons on dark bg

    // Auto-hide after 3 seconds
    hideTimer = setTimeout(() => {
      hideNavBar();
    }, 3000);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Failed to show nav bar:", error);
  }
}

// Restore normal navigation bar (for non-auth screens)
export async function restoreNavBar(
  backgroundColor: string = "#000000",
  isDarkTheme: boolean = false
): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    // Clear any existing timers
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (autoHideInterval) {
      clearInterval(autoHideInterval);
      autoHideInterval = null;
    }

    // Restore to normal position and visibility
    await NavigationBar.setPositionAsync("relative");
    await NavigationBar.setBackgroundColorAsync(backgroundColor);
    await NavigationBar.setVisibilityAsync("visible");

    // Set button style based on theme for better contrast
    await NavigationBar.setButtonStyleAsync(isDarkTheme ? "light" : "dark");

    // Debug log
    console.log(
      `NavBar restored: backgroundColor=${backgroundColor}, isDarkTheme=${isDarkTheme}, buttonStyle=${isDarkTheme ? "light" : "dark"}`
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log("Failed to restore nav bar:", error);
  }
}

// Clean up timer on app unmount
export function cleanupNavBarTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

// Periodically re-hide the bar (covers the case when user swipes it up)
export function startNavBarAutoHide(intervalMs: number = 2000): void {
  if (autoHideInterval) return;
  autoHideInterval = setInterval(() => {
    hideNavBar();
  }, intervalMs);
}

export function stopNavBarAutoHide(): void {
  if (autoHideInterval) {
    clearInterval(autoHideInterval);
    autoHideInterval = null;
  }
}
