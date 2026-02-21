import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import logo from "./logo.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [showExitToast, setShowExitToast] = useState(false);
  const exitIntent = useRef(false);

  // 안드로이드 뒤로가기 버튼 제어
  useEffect(() => {
    let backListener;
    const setupListener = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        if (exitIntent.current) {
          CapacitorApp.exitApp();
        } else {
          exitIntent.current = true;
          setShowExitToast(true);
          setTimeout(() => {
            exitIntent.current = false;
            setShowExitToast(false);
          }, 2000);
        }
      });
    };
    setupListener();
    return () => {
      if (backListener) backListener.remove();
    };
  }, []);

  return (
    <div className="home-container">
      <div className="bg-shape shape-blue"></div>
      <div className="bg-shape shape-beige"></div>
      
      <div className="home-content">
        <div className="logo-box">
          <img src={logo} alt="logo" className="home-logo" />
        </div>
        <h1 className="home-title">학원명당</h1>
        <p className="home-desc">
          데이터 기반 최적의 학원 입지 분석<br />성공적인 개원의 첫걸음
        </p>
      </div>

      <button className="home-btn" onClick={() => navigate("/map")}>
        분석 시작하기
      </button>

      {showExitToast && (
        <div className="exit-toast">
          '뒤로' 버튼을 한 번 더 누르시면 종료됩니다.
        </div>
      )}
    </div>
  );
}
