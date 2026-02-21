// 스플래시 컴포넌트
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from '@capacitor/splash-screen';
import "./Splash.css";
import logo from "./logo.png";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    SplashScreen.hide();
    const timer = setTimeout(() => navigate("/home"), 2800); 
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-wrapper">
      <div className="splash-bg-shape shape-1"></div>
      <div className="splash-bg-shape shape-2"></div>
      
      <div className="splash-content-box">
        <div className="splash-logo-container">
          <img src={logo} alt="logo" className="splash-brand-logo" />
        </div>
        <h1 className="splash-brand-name">학원명당</h1>
        <p className="splash-brand-sub">데이터로 완성하는 최적의 입지</p>
      </div>

      <div className="splash-loader">
        <div className="splash-loader-bar"></div>
      </div>
    </div>
  );
}
