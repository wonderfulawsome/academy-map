import React, { useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import Home from "./Home";
import MapPage from "./MapPage";
import Splash from "./Splash"; // 1. Splash 컴포넌트 불러오기

function AppData() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let backButtonListener; 

    const setupListener = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // 스플래시 화면이거나 홈 화면이면 종료
        if (location.pathname === '/' || location.pathname === '/home') {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [navigate, location]);

  return (
    <Routes>
      {/* 2. 첫 화면("/")을 Splash로 변경 */}
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