import { useState, useCallback, useEffect, useRef } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { GeoJsonLayer } from "@deck.gl/layers";
import "./MapLoading.css";
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const INITIAL_VIEW_STATE = {
  longitude: 127.1,
  latitude: 37,
  zoom: 7.5,
  minZoom: 7,
  pitch: 0,
  bearing: 0,
};

// 이모지 복구
const COLUMN_GROUPS = {
  "클러스터": {
    icon: "🗺️",
    columns: [{ id: "cluster_label", label: "클러스터 유형", type: "category" }]
  },
  "분석 지표": {
    icon: "📊",
    columns: [
      { id: "EPI", label: "시장 구매력", type: "numeric" },
      { id: "ROI_GAP", label: "입지 가성비", type: "numeric" },
      { id: "학원밀도", label: "학원밀도", type: "numeric" },
      { id: "유소년비율", label: "유소년비율", type: "numeric" },
    ]
  },
  "인구": {
    icon: "👥",
    columns: [
      { id: "총인구_값", label: "총인구", type: "numeric" },
      { id: "유아_값", label: "유아 (10세미만)", type: "numeric" },
      { id: "초중고_값", label: "초중고 (10대)", type: "numeric" },
      { id: "청년_값", label: "청년 (20~30대)", type: "numeric" },
      { id: "중장년_값", label: "중장년 (40~50대)", type: "numeric" },
      { id: "노년_값", label: "노년 (60대이상)", type: "numeric" },
      { id: "평균나이_값", label: "평균 나이", type: "numeric" },
    ]
  },
  "학교": {
    icon: "🏫",
    columns: [
      { id: "총학생수", label: "총학생수", type: "numeric" },
      { id: "초등학생수", label: "초등학생수", type: "numeric" },
      { id: "중학생수", label: "중학생수", type: "numeric" },
      { id: "고등학생수", label: "고등학생수", type: "numeric" },
      { id: "총학교수", label: "총학교수", type: "numeric" },
      { id: "초등학교수", label: "초등학교수", type: "numeric" },
      { id: "중학교수", label: "중학교수", type: "numeric" },
      { id: "고등학교수", label: "고등학교수", type: "numeric" },
    ]
  },
  "학원": {
    icon: "📚",
    columns: [{ id: "총학원수", label: "총학원수", type: "numeric" }]
  },
  "학원 종류별": {
    icon: "📖",
    columns: [],
    dynamic: true,
    sourceKey: "학원수별",
  },
  "부동산": {
    icon: "🏠",
    columns: [
      { id: "평균아파트가격", label: "아파트 평균가격", type: "numeric" },
      { id: "평당가격", label: "아파트 평당가격", type: "numeric" },
      { id: "거래건수", label: "아파트 거래건수", type: "numeric" },
      { id: "평균상가가격", label: "상가 평균가격", type: "numeric" },
      { id: "상가평당가격", label: "상가 평당가격", type: "numeric" },
      { id: "상가거래건수", label: "상가 거래건수", type: "numeric" },
    ]
  },
};

const CLUSTER_COLORS = {
  "학원밀집지":  { fill: [239, 68, 68],   border: [185, 28, 28],  hex: "#EF4444" },
  "고급주거지":  { fill: [245, 158, 11],  border: [180, 83, 9],   hex: "#F59E0B" },
  "일반주거지":  { fill: [107, 114, 128], border: [55, 65, 81],   hex: "#6B7280" },
  "블루오션":    { fill: [59, 130, 246],  border: [29, 78, 216],  hex: "#3B82F6" },
  "교육저활성지":{ fill: [139, 92, 246],  border: [109, 40, 217], hex: "#8B5CF6" },
  "소규모주거지":{ fill: [20, 83, 45],    border: [14, 60, 33],   hex: "#14532D" },
};

function getHeatColorRgb(ratio) {
  return [Math.round(255 * ratio), 80, Math.round(255 * (1 - ratio))];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDong, setSelectedDong] = useState(null);
  const [hoveredDong, setHoveredDong] = useState(null);
  const [activeGroup, setActiveGroup] = useState("클러스터");
  const [activeColumn, setActiveColumn] = useState({ id: "cluster_label", label: "클러스터 유형", type: "category" });
  const [activeClusterFilter, setActiveClusterFilter] = useState(null);
  const [dynamicAcademyCols, setDynamicAcademyCols] = useState([]);
  const [dynamicAcademyTypeCols, setDynamicAcademyTypeCols] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(!window.innerWidth < 768);
  const [bottomSheetMode, setBottomSheetMode] = useState("menu"); 
  const [bottomSheetHeight, setBottomSheetHeight] = useState("half"); 
  const [search, setSearch] = useState("");
  const [showAllCols, setShowAllCols] = useState({});
  const [popupTab, setPopupTab] = useState("기본");
  const [dongSearch, setDongSearch] = useState("");
  const [dongSearchResults, setDongSearchResults] = useState([]);
  const [showRanking, setShowRanking] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showSwipeGuide, setShowSwipeGuide] = useState(true);

  const dragStartY = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let backListener;
    const setupListener = async () => {
      backListener = await CapacitorApp.addListener('backButton', () => {
        if (showFormula) {
          setShowFormula(false);
        } else if (showRanking) {
          setShowRanking(false); 
        } else if (bottomSheetMode === "detail" || selectedDong) {
          setBottomSheetMode("menu"); 
          setSelectedDong(null);
        } else if (bottomSheetMode === "menu") {
          setBottomSheetMode("none"); 
        } else {
          navigate(-1); 
        }
      });
    };
    setupListener();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [showFormula, showRanking, bottomSheetMode, selectedDong, navigate]);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/dong_map_merged.json`)
      .then(r => r.json())
      .then(data => {
        const academyKeys = new Set();
        const academyTypeKeys = new Set();
        data.features.forEach(f => {
          const cd = f.properties["학원경쟁도별"];
          if (cd) Object.keys(cd).forEach(k => academyKeys.add(k));
          const at = f.properties["학원수별"];
          if (at) Object.keys(at).forEach(k => academyTypeKeys.add(k));
        });
        
        setDynamicAcademyCols(Array.from(academyKeys).sort().map(k => ({ 
            id: k, 
            label: k, 
            type: "competition", 
            sourceKey: "학원경쟁도별" 
        })));
        
        setDynamicAcademyTypeCols(Array.from(academyTypeKeys).sort().map(k => ({ 
            id: k, 
            label: k.replace('학원_', ''), 
            type: "numeric", 
            sourceKey: "학원수별" 
        })));
        
        setGeoData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getMinMax = useCallback((col) => {
    if (!geoData) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    geoData.features.forEach(f => {
      const p = f.properties;
      let val = col.sourceKey ? p[col.sourceKey]?.[col.id] : p[col.id];
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        if (num < min) min = num;
        if (num > max) max = num;
      }
    });
    return { min, max };
  }, [geoData]);

  const getFillColor = useCallback((feature) => {
    const props = feature.properties;
    const isSelected = selectedDong?.key === props.key;
    const isHovered = hoveredDong?.key === props.key;
    const alpha = isSelected ? 255 : isHovered ? 220 : 180;

    if (activeColumn.type === "category") {
      const label = props.cluster_label;
      if (activeClusterFilter && label !== activeClusterFilter) return [200, 200, 200, 40];
      const c = CLUSTER_COLORS[label];
      return c ? [...c.fill, alpha] : [107, 114, 128, alpha];
    }

    let val = activeColumn.sourceKey ? props[activeColumn.sourceKey]?.[activeColumn.id] : props[activeColumn.id];
    val = parseFloat(val);
    if (!val || isNaN(val)) return [30, 41, 59, 50];
    const { min, max } = getMinMax(activeColumn);
    if (max === min) return [30, 41, 59, 50];
    const ratio = (val - min) / (max - min);
    return [...getHeatColorRgb(ratio), Math.round(80 + ratio * 150)];
  }, [activeColumn, activeClusterFilter, hoveredDong, selectedDong, getMinMax]);

  const getLineColor = useCallback((feature) => {
    const props = feature.properties;
    const isSelected = selectedDong?.key === props.key;
    if (isSelected) return [0, 0, 0, 255];
    if (activeColumn.type === "category") {
      const label = props.cluster_label;
      if (activeClusterFilter && label !== activeClusterFilter) return [150, 150, 150, 50];
      const c = CLUSTER_COLORS[label];
      return c ? [...c.border, 255] : [100, 110, 120, 255];
    }
    return [100, 110, 120, 150];
  }, [activeColumn, activeClusterFilter, selectedDong]);

  const getLineWidth = useCallback((feature) => {
    return selectedDong?.key === feature.properties.key ? 3 : 1;
  }, [selectedDong]);

  const layer = geoData ? new GeoJsonLayer({
    id: "dong-layer",
    data: geoData,
    pickable: true,
    stroked: true,
    filled: true,
    getFillColor,
    getLineColor,
    getLineWidth,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getFillColor: [activeColumn, activeClusterFilter, hoveredDong, selectedDong],
      getLineColor: [activeColumn, activeClusterFilter, selectedDong],
      getLineWidth: [selectedDong],
    },
    onClick: ({ object }) => {
      if (object) {
        setSelectedDong(object.properties);
        setPopupTab("기본");
        if (isMobile) setBottomSheetMode("detail");
      }
    },
    onHover: ({ object }) => setHoveredDong(object?.properties || null),
  }) : null;

  const getDynamicCols = (sourceKey) =>
    sourceKey === "학원수별" ? dynamicAcademyTypeCols : dynamicAcademyCols;

  const allColumns = Object.entries(COLUMN_GROUPS).flatMap(([, { columns, dynamic, sourceKey }]) =>
    dynamic ? getDynamicCols(sourceKey) : columns
  );

  const filteredColumns = search
    ? allColumns.filter(c => c.label.includes(search) || c.id.includes(search))
    : [];

  const handleDongSearch = (value) => {
    setDongSearch(value);
    if (!value || !geoData) return setDongSearchResults([]);
    setDongSearchResults(
      geoData.features
        .filter(f => f.properties.dong?.includes(value) || f.properties["시도"]?.includes(value))
        .slice(0, 10)
        .map(f => f.properties)
    );
  };

  const moveToDong = (props) => {
    const feature = geoData.features.find(f => f.properties.key === props.key);
    if (!feature) return;
    const coords = feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0][0];
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    setViewState(prev => ({
      ...prev,
      longitude: (Math.max(...lngs) + Math.min(...lngs)) / 2,
      latitude: (Math.max(...lats) + Math.min(...lats)) / 2,
      zoom: 13,
      transitionDuration: 800,
    }));
    setSelectedDong(props);
    setPopupTab("기본");
    setDongSearch("");
    setDongSearchResults([]);
    setShowRanking(false);
    if (isMobile) { setBottomSheetMode("detail"); setBottomSheetHeight("half"); }
  };

  const fmt = (val, suffix = "") => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "number") return `${val.toLocaleString()}${suffix}`;
    return String(val);
  };

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (dragStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    
    if (deltaY < -50) { 
      if (bottomSheetMode === "none") {
        setBottomSheetMode(selectedDong ? "detail" : "menu");
        setBottomSheetHeight("half");
      } else if (bottomSheetHeight === "half") {
        setBottomSheetHeight("full");
      }
    } else if (deltaY > 50) {
      if (bottomSheetHeight === "full") {
        setBottomSheetHeight("half");
      } else {
        setBottomSheetMode("none");
        setBottomSheetHeight("half");
      }
    }
    dragStartY.current = null;
  };

  const sidebarContent = (
    <>
      <div style={{ padding: isMobile ? "12px 16px 8px" : "16px 16px 8px", borderBottom: "1px solid #EAE6DF" }}>
        {!isMobile && <h1 style={{ color: "#2C2A28", fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>학원 입지 분석</h1>}
        <input
          placeholder="컬럼 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, background: "#F4F3EE", border: "1px solid #EAE6DF", color: "#524E4A", fontSize: 12, boxSizing: "border-box" }}
        />
        {search && filteredColumns.length > 0 && (
          <div style={{ marginTop: 6, background: "#FCFBF8", borderRadius: 6, border: "1px solid #EAE6DF", maxHeight: 200, overflowY: "auto" }}>
            {filteredColumns.map(col => (
              <button key={col.id} onClick={() => { setActiveColumn(col); setSearch(""); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", color: "#6E6961", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #F4F3EE" }}>
                {col.label}
              </button>
            ))}
          </div>
        )}
        <input
          placeholder="지역 검색 (동 이름)..."
          value={dongSearch}
          onChange={e => handleDongSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, marginTop: 8, background: "#F4F3EE", border: "1px solid #EAE6DF", color: "#524E4A", fontSize: 12, boxSizing: "border-box" }}
        />
        {dongSearchResults.length > 0 && (
          <div style={{ marginTop: 4, background: "#FCFBF8", borderRadius: 6, border: "1px solid #EAE6DF", maxHeight: 200, overflowY: "auto" }}>
            {dongSearchResults.map(props => (
              <button key={props.key} onClick={() => moveToDong(props)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", color: "#6E6961", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #F4F3EE" }}>
                <span style={{ color: "#8A857E", fontSize: 10 }}>{props["시도"]} </span><span style={{ color: "#524E4A" }}>{props.dong}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {Object.entries(COLUMN_GROUPS).map(([group, { icon, columns, dynamic, sourceKey }]) => {
          const cols = dynamic ? getDynamicCols(sourceKey) : columns;
          const isActive = activeGroup === group;
          return (
            <div key={group}>
              <button onClick={() => setActiveGroup(isActive ? null : group)}
                style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: isActive ? "#F4F3EE" : "transparent", border: "none", color: "#524E4A", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{icon}</span>
                <span style={{ flex: 1 }}>{group}</span>
                <span style={{ fontSize: 10, color: "#8A857E" }}>{isActive ? "▲" : "▼"}</span>
              </button>

              {isActive && group === "클러스터" && (
                <div style={{ padding: "8px 16px 12px", background: "#FCFBF8", borderBottom: "1px solid #EAE6DF" }}>
                  <p style={{ color: "#8A857E", fontSize: 11, fontWeight: 700, margin: "0 0 8px" }}>클러스터 필터</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(CLUSTER_COLORS).map(([label, color]) => (
                      <button key={label} onClick={() => {
                        setActiveClusterFilter(activeClusterFilter === label ? null : label);
                        setActiveColumn({ id: "cluster_label", label: "클러스터 유형", type: "category" });
                      }}
                        style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${activeClusterFilter === label ? color.hex : "#EAE6DF"}`, background: activeClusterFilter === label ? color.hex + "1A" : "#F4F3EE", color: activeClusterFilter === label ? color.hex : "#6E6961", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: color.hex }} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isActive && (
                <div style={{ paddingBottom: 4 }}>
                  {(showAllCols[group] ? cols : cols.slice(0, 10)).map(col => (
                    <button key={col.id} onClick={() => { setActiveColumn(col); setActiveClusterFilter(null); }}
                      style={{ width: "100%", textAlign: "left", padding: "8px 16px 8px 28px", background: activeColumn.id === col.id ? "#EDF3F8" : "transparent", border: "none", borderLeft: activeColumn.id === col.id ? "3px solid #3D7CA6" : "3px solid transparent", color: activeColumn.id === col.id ? "#3D7CA6" : "#6E6961", fontSize: 12, fontWeight: activeColumn.id === col.id ? 600 : 400, cursor: "pointer" }}>
                      {col.label}
                    </button>
                  ))}
                  {cols.length > 10 && (
                    <button onClick={() => setShowAllCols(prev => ({ ...prev, [group]: !prev[group] }))}
                      style={{ width: "100%", textAlign: "center", padding: "8px 16px", background: "transparent", border: "none", color: "#3D7CA6", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {showAllCols[group] ? "접기 ▲" : `+${cols.length - 10}개 더보기 ▼`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeColumn.type !== "category" && activeColumn.type !== "text" && (() => {
        const { min, max } = geoData ? getMinMax(activeColumn) : { min: 0, max: 0 };
        return (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #EAE6DF", background: "#F4F3EE" }}>
            <p style={{ color: "#6E6961", fontSize: 11, fontWeight: 700, margin: "0 0 8px" }}>범례</p>
            <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(to right, rgb(0,80,255), rgb(255,80,0))" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ color: "#8A857E", fontSize: 10, fontWeight: 600 }}>{min === Infinity ? "-" : min.toLocaleString()}</span>
              <span style={{ color: "#8A857E", fontSize: 10, fontWeight: 600 }}>{max === -Infinity ? "-" : max.toLocaleString()}</span>
            </div>
          </div>
        );
      })()}
    </>
  );

  const detailContent = (
    <>
      {isMobile && (
        <button onClick={() => setBottomSheetMode("menu")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "#F4F3EE", border: "1px solid #EAE6DF", color: "#524E4A", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 16px", borderRadius: 8, marginBottom: 16 }}>
          지표 선택으로
        </button>
      )}
      {selectedDong && (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#8A857E", margin: 0 }}>{selectedDong["시도"]}</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0", color: "#2C2A28" }}>{selectedDong["dong"]}</h2>
            </div>
            {!isMobile && (
              <button onClick={() => setSelectedDong(null)} style={{ background: "#F4F3EE", border: "none", color: "#8A857E", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 16, fontWeight: "bold" }}>×</button>
            )}
          </div>

          {selectedDong.cluster_label && (
            <div style={{ background: (CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280") + "1A", border: `1px solid ${CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280"}`, borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
              <span style={{ color: CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280", fontWeight: 700, fontSize: 13 }}>{selectedDong.cluster_label}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid #EAE6DF", paddingBottom: 10 }}>
            {["기본", "학원", "부동산"].map(tab => (
              <button key={tab} onClick={() => setPopupTab(tab)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: popupTab === tab ? "#3D7CA6" : "#F4F3EE", color: popupTab === tab ? "#FCFCFA" : "#6E6961" }}>{tab}</button>
            ))}
          </div>

          {popupTab === "기본" && <>
            <InfoSection title="분석 지표">
              <InfoRow label="시장 구매력" value={selectedDong.EPI ? `${Number(selectedDong.EPI).toLocaleString()} (${selectedDong["EPI_상위%"]})` : "-"} />
              <InfoRow label="입지 가성비" value={selectedDong.ROI_GAP ? `${Number(selectedDong.ROI_GAP).toFixed(2)} (${selectedDong["ROI_GAP_상위%"]})` : "-"} />
              <InfoRow label="학원밀도" value={selectedDong.학원밀도 ? Number(selectedDong.학원밀도).toFixed(4) : "-"} />
              <InfoRow label="유소년비율" value={selectedDong.유소년비율 ? `${(Number(selectedDong.유소년비율) * 100).toFixed(1)}%` : "-"} />
            </InfoSection>
            <InfoSection title="인구">
              <InfoRow label="총인구" value={`${fmt(selectedDong["총인구_값"], "명")} (${selectedDong["총인구_상위%"] || "-"})`} />
              <InfoRow label="평균나이" value={`${fmt(selectedDong["평균나이_값"], "세")} (${selectedDong["평균나이_상위%"] || "-"})`} />
              <InfoRow label="유아" value={fmt(selectedDong["유아_값"], "명")} />
              <InfoRow label="초중고" value={fmt(selectedDong["초중고_값"], "명")} />
              <InfoRow label="청년" value={fmt(selectedDong["청년_값"], "명")} />
              <InfoRow label="중장년" value={fmt(selectedDong["중장년_값"], "명")} />
              <InfoRow label="노년" value={fmt(selectedDong["노년_값"], "명")} />
            </InfoSection>
            <InfoSection title="학교">
              <InfoRow label="총학생수" value={fmt(selectedDong["총학생수"], "명")} />
              <InfoRow label="초등학생수" value={fmt(selectedDong["초등학생수"], "명")} />
              <InfoRow label="중학생수" value={fmt(selectedDong["중학생수"], "명")} />
              <InfoRow label="고등학생수" value={fmt(selectedDong["고등학생수"], "명")} />
              <InfoRow label="총학원수" value={fmt(selectedDong["총학원수"], "개")} />
            </InfoSection>
          </>}

          {popupTab === "학원" && <>
            {selectedDong["학원수별"] && Object.keys(selectedDong["학원수별"]).length > 0 && (
              <InfoSection title="학원 현황">
                {Object.entries(selectedDong["학원수별"]).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <InfoRow key={name} label={name.replace('학원_', '')} value={`${count}개`} />
                ))}
              </InfoSection>
            )}
            {selectedDong["학원경쟁도별"] && Object.keys(selectedDong["학원경쟁도별"]).length > 0 && (
              <InfoSection title="학원 경쟁도">
                {Object.entries(selectedDong["학원경쟁도별"]).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 10).map(([name, val]) => (
                  <InfoRow key={name} label={name} value={(val || 0).toFixed(4)} />
                ))}
              </InfoSection>
            )}
          </>}

          {popupTab === "부동산" && (
            <InfoSection title="부동산">
              <InfoRow label="아파트 평균" value={fmt(selectedDong["평균아파트가격"], "만원")} />
              <InfoRow label="아파트 평당" value={fmt(selectedDong["평당가격"], "만원")} />
              <InfoRow label="상가 평균" value={fmt(selectedDong["평균상가가격"], "만원")} />
              <InfoRow label="상가 평당" value={fmt(selectedDong["상가평당가격"], "만원")} />
            </InfoSection>
          )}
        </>
      )}
    </>
  );

  const sheetHeight = bottomSheetHeight === "full" ? "90vh" : "45vh";

  return (
    <div style={{ 
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      fontFamily: "'Noto Sans KR', sans-serif", 
      height: "100dvh",
      display: "flex", 
      background: "#FCFBF8", 
      overflow: "hidden", 
      overscrollBehavior: "none",
      transition: "background-color 0.3s ease"
    }}>

      {!isMobile && (
        <div style={{
          width: sidebarOpen ? 280 : 0, minWidth: sidebarOpen ? 280 : 0,
          background: "#FCFBF8", borderRight: "1px solid #EAE6DF",
          display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s",
          boxShadow: "2px 0 8px rgba(0,0,0,0.03)", zIndex: 5
        }}>
          {sidebarContent}
        </div>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) => setViewState({
            ...vs,
            minZoom: 7,
            longitude: Math.min(Math.max(vs.longitude, 126.4), 127.9),
            latitude: Math.min(Math.max(vs.latitude, 36.9), 38.3),
          })}
          controller={true}
          layers={layer ? [layer] : []}
          getCursor={({ isHovering }) => isHovering ? "pointer" : "grab"}
        >
          <Map mapStyle={MAP_STYLE} />
        </DeckGL>

        {!isMobile && (
          <>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ position: "absolute", top: 16, left: 16, zIndex: 10, background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 8, color: "#6E6961", padding: "8px 12px", cursor: "pointer", fontSize: 13, boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <div style={{ position: "absolute", top: 16, left: sidebarOpen ? 80 : 64, zIndex: 10, background: "#FCFBF8ee", border: "1px solid #EAE6DF", borderRadius: 8, padding: "8px 14px", color: "#3D7CA6", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              {activeColumn.label}
            </div>
            
            <button onClick={() => setShowFormula(true)}
              style={{ position: "absolute", top: 16, right: selectedDong ? 440 : 100, zIndex: 10, background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 8, color: "#524E4A", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              분석지표 계산식
            </button>
            <button onClick={() => setShowRanking(!showRanking)}
              style={{ position: "absolute", top: 16, right: selectedDong ? 356 : 16, zIndex: 10, background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 8, color: "#524E4A", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
              순위표
            </button>

            {showRanking && geoData && (
              <div style={{ position: "absolute", top: 60, right: selectedDong ? 356 : 16, width: 300, background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 12, padding: 16, zIndex: 10, maxHeight: "70vh", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ color: "#2C2A28", fontSize: 14, fontWeight: 800, margin: 0 }}>{activeColumn.label} 상위 20</p>
                  <button onClick={() => setShowRanking(false)} style={{ background: "#F4F3EE", border: "none", color: "#8A857E", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>×</button>
                </div>
                {geoData.features
                  .map(f => f.properties)
                  .filter(p => { const val = activeColumn.sourceKey ? p[activeColumn.sourceKey]?.[activeColumn.id] : p[activeColumn.id]; return val !== null && val !== undefined && !isNaN(parseFloat(val)); })
                  .sort((a, b) => { const va = activeColumn.sourceKey ? a[activeColumn.sourceKey]?.[activeColumn.id] : a[activeColumn.id]; const vb = activeColumn.sourceKey ? b[activeColumn.sourceKey]?.[activeColumn.id] : b[activeColumn.id]; return parseFloat(vb) - parseFloat(va); })
                  .slice(0, 20)
                  .map((props, i) => (
                    <button key={props.key} onClick={() => moveToDong(props)}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", borderBottom: "1px solid #F4F3EE" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#EDF3F8"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: i < 3 ? "#F59E0B" : "#8A857E", fontSize: 13, fontWeight: 800, width: 22 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#2C2A28", fontSize: 13, fontWeight: 600, margin: 0 }}>{props.dong}</p>
                        <p style={{ color: "#8A857E", fontSize: 11, margin: 0 }}>{props["시도"]}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
            {selectedDong && (
              <div style={{ position: "absolute", top: 16, right: 16, width: "min(340px, calc(100vw - 32px))", background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 12, padding: 20, color: "#2C2A28", maxHeight: "85vh", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {detailContent}
              </div>
            )}
          </>
        )}

        {isMobile && (
          <>
            <div style={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ background: "#FCFBF8ee", border: "1px solid #EAE6DF", borderRadius: 8, padding: "8px 12px", color: "#3D7CA6", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                {activeColumn.label}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setShowFormula(true)}
                  style={{ background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 8, color: "#524E4A", padding: "8px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  분석지표 계산식
                </button>
                <button onClick={() => setShowRanking(!showRanking)}
                  style={{ background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 8, color: "#524E4A", padding: "8px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  순위표
                </button>
              </div>
            </div>

            {showRanking && geoData && (
              <div style={{ position: "absolute", top: 64, left: 16, right: 16, width: "auto", background: "#FCFBF8", border: "1px solid #EAE6DF", borderRadius: 12, padding: 16, zIndex: 20, maxHeight: "50vh", overflowY: "auto", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ color: "#2C2A28", fontSize: 14, fontWeight: 800, margin: 0 }}>{activeColumn.label} 상위 20</p>
                  <button onClick={() => setShowRanking(false)} style={{ background: "#F4F3EE", border: "none", color: "#8A857E", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 16, fontWeight: "bold" }}>×</button>
                </div>
                {geoData.features
                  .map(f => f.properties)
                  .filter(p => { const val = activeColumn.sourceKey ? p[activeColumn.sourceKey]?.[activeColumn.id] : p[activeColumn.id]; return val !== null && val !== undefined && !isNaN(parseFloat(val)); })
                  .sort((a, b) => { const va = activeColumn.sourceKey ? a[activeColumn.sourceKey]?.[activeColumn.id] : a[activeColumn.id]; const vb = activeColumn.sourceKey ? b[activeColumn.sourceKey]?.[activeColumn.id] : b[activeColumn.id]; return parseFloat(vb) - parseFloat(va); })
                  .slice(0, 20)
                  .map((props, i) => (
                    <button key={props.key} onClick={() => moveToDong(props)}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px", background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", borderBottom: "1px solid #F4F3EE" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#EDF3F8"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: i < 3 ? "#F59E0B" : "#8A857E", fontSize: 14, fontWeight: 800, width: 26 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#2C2A28", fontSize: 14, fontWeight: 600, margin: 0 }}>{props.dong}</p>
                        <p style={{ color: "#8A857E", fontSize: 11, margin: 0 }}>{props["시도"]}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
              background: "#FCFBF8", borderTop: "1px solid #EAE6DF",
              borderRadius: "20px 20px 0 0",
              height: bottomSheetMode === "none" ? 64 : sheetHeight,
              transition: "height 0.35s cubic-bezier(0.4,0,0.2,1)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 -4px 12px rgba(0,0,0,0.04)"
            }}>
              <div
                onTouchStart={(e) => {
                  setShowSwipeGuide(false);
                  handleTouchStart(e);
                }}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                  setShowSwipeGuide(false);
                  if (bottomSheetMode === "none") {
                    setBottomSheetMode(selectedDong ? "detail" : "menu");
                    setBottomSheetHeight("half");
                  } else if (bottomSheetHeight === "half") {
                    setBottomSheetHeight("full");
                  } else {
                    setBottomSheetMode("none");
                    setBottomSheetHeight("half");
                  }
                }}
                style={{ padding: "12px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0, position: "relative", touchAction: "none" }}
              >
                {showSwipeGuide && (
                  <div style={{ position: "absolute", top: "-10px", display: "flex", flexDirection: "column", alignItems: "center", color: "#3D7CA6", animation: "bounceUp 1.5s infinite", pointerEvents: "none" }}>
                    <style>{`@keyframes bounceUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
                    <span style={{ fontSize: "14px", fontWeight: "bold", lineHeight: "1" }}>↑</span>
                    <span style={{ fontSize: "11px", fontWeight: "bold", background: "#FCFBF8", padding: "4px 10px", borderRadius: "12px", border: "1px solid #3D7CA6", boxShadow: "0 4px 6px rgba(0,0,0,0.06)", marginTop: "2px" }}>위로 드래그하세요</span>
                  </div>
                )}
                <div style={{ width: 40, height: 5, borderRadius: 3, background: "#D1CCC5" }} />
                {bottomSheetMode === "none" && (
                  <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginTop: 10, paddingBottom: 4 }}>
                    <button onClick={e => { e.stopPropagation(); setBottomSheetMode("menu"); setBottomSheetHeight("half"); }}
                      style={{ background: "#F4F3EE", border: "none", color: "#524E4A", borderRadius: 8, padding: "8px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      지표 선택
                    </button>
                    {selectedDong && (
                      <button onClick={e => { e.stopPropagation(); setBottomSheetMode("detail"); setBottomSheetHeight("half"); }}
                        style={{ background: "#3D7CA6", border: "none", color: "#fff", borderRadius: 8, padding: "8px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 4px rgba(61, 124, 166, 0.2)" }}>
                        {selectedDong.dong}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {bottomSheetMode === "menu" && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  {sidebarContent}
                </div>
              )}

              {bottomSheetMode === "detail" && selectedDong && (
                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
                  {detailContent}
                </div>
              )}
            </div>
          </>
        )}

        {showFormula && (
          <div onClick={() => setShowFormula(false)} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(44, 42, 40, 0.5)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", padding: 20, boxSizing: "border-box" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#FCFBF8", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24, color: "#2C2A28", border: "1px solid #EAE6DF", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #EAE6DF", paddingBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>분석 지표 계산식</h3>
                <button onClick={() => setShowFormula(false)} style={{ background: "transparent", border: "none", color: "#8A857E", fontSize: 20, fontWeight: "bold", cursor: "pointer" }}>×</button>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: "#524E4A" }}>
                <p style={{ margin: "0 0 16px", padding: "12px", background: "#F4F3EE", borderRadius: "8px" }}><span style={{ color: "#3D7CA6", fontWeight: 800, display: "block", marginBottom: "4px" }}>EPI (시장 구매력)</span>평균아파트가격 × 총학생수</p>
                <p style={{ margin: "0 0 16px", padding: "12px", background: "#F4F3EE", borderRadius: "8px" }}><span style={{ color: "#3D7CA6", fontWeight: 800, display: "block", marginBottom: "4px" }}>ROI_GAP (입지 가성비)</span>(총학생수 / 평당가격) % 상가평당가격</p>
                <p style={{ margin: "0 0 16px", padding: "12px", background: "#F4F3EE", borderRadius: "8px" }}><span style={{ color: "#3D7CA6", fontWeight: 800, display: "block", marginBottom: "4px" }}>학원밀도</span>총 학원수 / 총 인구수</p>
                <p style={{ margin: 0, padding: "12px", background: "#F4F3EE", borderRadius: "8px" }}><span style={{ color: "#3D7CA6", fontWeight: 800, display: "block", marginBottom: "4px" }}>유소년비율</span>(유아 + 초중고 인구) / 총 인구수</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
            <div className="map-loading-container">
                <div className="book-loader">
                    <div className="page"></div>
                    <div className="page"></div>
                    <div className="page"></div>
                </div>
                <p className="loading-text">데이터 분석 중...</p>
            </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: "#8A857E", margin: "0 0 10px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px dashed #EAE6DF", paddingBottom: 6 }}>
      <span style={{ color: "#6E6961", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#2C2A28", fontWeight: 800 }}>{value}</span>
    </div>
  );
}
