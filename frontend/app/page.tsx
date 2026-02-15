"use client";
import { useEffect, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import AuthGate from "./components/AuthGate";
import HomeScreen from "./screens/HomeScreen";
import ExploreScreen from "./screens/ExploreScreen";

export default function App() {
  const { setMiniAppReady, isMiniAppReady } = useMiniKit();
  const [currentScreen, setCurrentScreen] = useState<"home" | "explore">("home");

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  return (
    <AuthGate>
      {currentScreen === "explore" ? (
        <ExploreScreen onNavigate={setCurrentScreen} />
      ) : (
        <HomeScreen onNavigate={setCurrentScreen} />
      )}
    </AuthGate>
  );
}
