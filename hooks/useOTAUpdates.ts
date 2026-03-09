import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useOTAUpdates() {
  useEffect(() => {
    if (__DEV__) return;

    let Updates: typeof import("expo-updates");
    try {
      Updates = require("expo-updates");
    } catch {
      return;
    }

    async function checkAndFetch() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch (e) {
        console.warn("OTA update check failed:", e);
      }
    }

    checkAndFetch();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          checkAndFetch();
        }
      }
    );

    return () => subscription.remove();
  }, []);
}
