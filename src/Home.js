import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "./logo.png"; 

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.logoSection}>
        <img src={logo} alt="학원명당 로고" style={styles.logoImage} />
        <h1 style={styles.title}>학원명당</h1>
        <p style={styles.subtitle}>성공적인 학원 입지의 시작</p>
      </div>

      <div style={styles.buttonSection}>
        <button 
          style={styles.startButton} 
          onClick={() => navigate("/map")}
        >
          지도에서 명당 찾기 
        </button>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerTitle}>Data Source</p>
        <div style={styles.footerTags}>
          
          <span style={styles.tag}>공공데이터포털</span>
        </div>
        <p style={styles.copyright}>© 2026 Academy Myungdang</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  logoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "20vh", 
  },
  logoImage: {
    width: "120px",
    height: "120px",
    marginBottom: "15px",
    objectFit: "contain",
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#333",
    margin: "0",
    letterSpacing: "-1px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
    marginTop: "8px",
  },
  buttonSection: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: "30px",
  },
  startButton: {
    width: "80%",
    padding: "18px 0",
    fontSize: "18px",
    fontWeight: "bold",
    color: "white",
    backgroundColor: "#4aa8d8", 
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  footer: {
    width: "100%",
    textAlign: "center",
    marginBottom: "20px",
    paddingTop: "20px",
    borderTop: "1px solid #eee",
  },
  footerTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#999",
    marginBottom: "8px",
  },
  footerTags: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  tag: {
    fontSize: "11px",
    color: "#777",
    backgroundColor: "#f5f5f5",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  copyright: {
    fontSize: "10px",
    color: "#ccc",
    marginTop: "5px",
  }
};