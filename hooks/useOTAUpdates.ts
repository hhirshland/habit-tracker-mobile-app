import { useEffect } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";

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
          promptReload(Updates);
        }
      } catch (e) {
        console.warn("OTA update check failed:", e);
      }
    }

    function promptReload(updates: typeof Updates) {
      Alert.alert(
        "Update Available",
        "A new version has been downloaded. Restart now to apply it.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Restart",
            onPress: () => updates.reloadAsync(),
          },
        ],
      );
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
