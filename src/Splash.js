import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from '@capacitor/splash-screen'; // 플러그인 불러오기
import "./Splash.css";
import logo from "./logo.png"; 

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. 이 화면(React)이 준비되자마자 기본 스플래시(그림)를 숨깁니다.
    // 그래야 PC버전처럼 애니메이션과 글자가 바로 보입니다.
    const hideNativeSplash = async () => {
      await SplashScreen.hide();
    };
    
    hideNativeSplash();

    // 2. 2.5초 동안 애니메이션을 보여주고 홈으로 이동
    const timer = setTimeout(() => {
      navigate("/home"); 
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <img src={logo} alt="학원명당" className="splash-logo" />
        <h1 className="splash-text">학원명당</h1>
      </div>
    </div>
  );
}