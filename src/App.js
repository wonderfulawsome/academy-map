import React, { useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import Home from "./Home";
import MapPage from "./MapPage";
import Splash from "./Splash";

function AppData() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let lastTime = 0;
    let backListener;

    const setupListener = async () => {
      // 리스너 비동기 등록
      backListener = await CapacitorApp.addListener('backButton', () => {
        if (location.pathname === '/' || location.pathname === '/home') {
          const now = Date.now();
          if (now - lastTime < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastTime = now;
          }
        } else if (location.pathname !== '/map') {
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [navigate, location]);

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<Home />} />
      <Route path="/map" element={<MapPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppData />
    </HashRouter>
  );
}
