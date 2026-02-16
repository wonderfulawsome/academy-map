import { useState, useCallback, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { Map } from "react-map-gl/maplibre";
import { GeoJsonLayer } from "@deck.gl/layers";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW_STATE = {
  longitude: 127.1,
  latitude: 37,
  zoom: 7.5,
  minZoom: 7,
  pitch: 0,
  bearing: 0,
};

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
  "학원 경쟁도": {
    icon: "⚔️",
    columns: [],
    dynamic: true,
    sourceKey: "학원경쟁도별",
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
  "학원밀집지": { fill: [239, 68, 68],   border: [185, 28, 28],  hex: "#EF4444" },
  "고급주거지": { fill: [245, 158, 11],  border: [180, 83, 9],   hex: "#F59E0B" },
  "일반주거지": { fill: [107, 114, 128], border: [55, 65, 81],   hex: "#6B7280" },
  "블루오션":   { fill: [59, 130, 246],  border: [29, 78, 216],  hex: "#3B82F6" },
  "대형주거지": { fill: [139, 92, 246],  border: [109, 40, 217], hex: "#8B5CF6" },
  "교육소외지": { fill: [148, 163, 184], border: [100, 116, 139],hex: "#94A3B8" },
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
  const [bottomSheetMode, setBottomSheetMode] = useState("menu"); // "menu" | "detail" | "none"
  const [bottomSheetHeight, setBottomSheetHeight] = useState("half"); // "half" | "full"
  const [search, setSearch] = useState("");
  const [showAllCols, setShowAllCols] = useState({});
  const [popupTab, setPopupTab] = useState("기본");
  const [dongSearch, setDongSearch] = useState("");
  const [dongSearchResults, setDongSearchResults] = useState([]);
  const [showRanking, setShowRanking] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  useState(() => {
    fetch("/dong_map.geojson")
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
        setDynamicAcademyCols(Array.from(academyKeys).sort().map(k => ({ id: k, label: k, type: "competition", sourceKey: "학원경쟁도별" })));
        setDynamicAcademyTypeCols(Array.from(academyTypeKeys).sort().map(k => ({ id: k, label: k, type: "numeric", sourceKey: "학원수별" })));
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
    if (isSelected) return [255, 255, 255, 255];
    if (activeColumn.type === "category") {
      const label = props.cluster_label;
      if (activeClusterFilter && label !== activeClusterFilter) return [100, 100, 100, 50];
      const c = CLUSTER_COLORS[label];
      return c ? [...c.border, 255] : [55, 65, 81, 255];
    }
    return [15, 23, 42, 200];
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

  const SidebarContent = () => (
    <>
      <div style={{ padding: isMobile ? "12px 16px 8px" : "16px 16px 8px", borderBottom: "1px solid #334155" }}>
        {!isMobile && <h1 style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>🏫 학원 입지 분석</h1>}
        <input
          placeholder="컬럼 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, background: "#0F172A", border: "1px solid #334155", color: "#E2E8F0", fontSize: 12, boxSizing: "border-box" }}
        />
        {search && filteredColumns.length > 0 && (
          <div style={{ marginTop: 6, background: "#0F172A", borderRadius: 6, border: "1px solid #334155", maxHeight: 200, overflowY: "auto" }}>
            {filteredColumns.map(col => (
              <button key={col.id} onClick={() => { setActiveColumn(col); setSearch(""); if (isMobile) setBottomSheetMode("none"); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", background: "transparent", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer" }}>
                {col.label}
              </button>
            ))}
          </div>
        )}
        <input
          placeholder="지역 검색 (동 이름)..."
          value={dongSearch}
          onChange={e => handleDongSearch(e.target.value)}
          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, marginTop: 6, background: "#0F172A", border: "1px solid #334155", color: "#E2E8F0", fontSize: 12, boxSizing: "border-box" }}
        />
        {dongSearchResults.length > 0 && (
          <div style={{ marginTop: 4, background: "#0F172A", borderRadius: 6, border: "1px solid #334155", maxHeight: 200, overflowY: "auto" }}>
            {dongSearchResults.map(props => (
              <button key={props.key} onClick={() => moveToDong(props)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", background: "transparent", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer" }}>
                <span style={{ color: "#64748B", fontSize: 10 }}>{props["시도"]} </span>{props.dong}
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
                style={{ width: "100%", textAlign: "left", padding: "8px 16px", background: isActive ? "#334155" : "transparent", border: "none", color: "#94A3B8", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{icon}</span>
                <span style={{ flex: 1 }}>{group}</span>
                <span style={{ fontSize: 10 }}>{isActive ? "▲" : "▼"}</span>
              </button>

              {isActive && group === "클러스터" && (
                <div style={{ padding: "6px 16px 8px", background: "#0F172A", borderBottom: "1px solid #334155" }}>
                  <p style={{ color: "#64748B", fontSize: 10, fontWeight: 700, margin: "0 0 6px" }}>클러스터 필터</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {Object.entries(CLUSTER_COLORS).map(([label, color]) => (
                      <button key={label} onClick={() => {
                        setActiveClusterFilter(activeClusterFilter === label ? null : label);
                        setActiveColumn({ id: "cluster_label", label: "클러스터 유형", type: "category" });
                      }}
                        style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${activeClusterFilter === label ? color.hex : "#334155"}`, background: activeClusterFilter === label ? color.hex + "33" : "transparent", color: activeClusterFilter === label ? color.hex : "#64748B", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: color.hex }} />{label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isActive && (
                <div style={{ paddingBottom: 4 }}>
                  {(showAllCols[group] ? cols : cols.slice(0, 10)).map(col => (
                    <button key={col.id} onClick={() => { setActiveColumn(col); setActiveClusterFilter(null); if (isMobile) setBottomSheetMode("none"); }}
                      style={{ width: "100%", textAlign: "left", padding: "5px 16px 5px 28px", background: activeColumn.id === col.id ? "#3B82F622" : "transparent", border: "none", borderLeft: activeColumn.id === col.id ? "2px solid #3B82F6" : "2px solid transparent", color: activeColumn.id === col.id ? "#60A5FA" : "#64748B", fontSize: 12, cursor: "pointer" }}>
                      {col.label}
                    </button>
                  ))}
                  {cols.length > 10 && (
                    <button onClick={() => setShowAllCols(prev => ({ ...prev, [group]: !prev[group] }))}
                      style={{ width: "100%", textAlign: "center", padding: "5px 16px", background: "transparent", border: "none", color: "#3B82F6", fontSize: 11, cursor: "pointer" }}>
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
          <div style={{ padding: "12px 16px", borderTop: "1px solid #334155" }}>
            <p style={{ color: "#64748B", fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>범례</p>
            <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(to right, rgb(0,80,255), rgb(255,80,0))" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: "#64748B", fontSize: 10 }}>{min === Infinity ? "-" : min.toLocaleString()}</span>
              <span style={{ color: "#64748B", fontSize: 10 }}>{max === -Infinity ? "-" : max.toLocaleString()}</span>
            </div>
          </div>
        );
      })()}
    </>
  );

  const DetailContent = () => (
    <>
      {isMobile && (
        <button onClick={() => setBottomSheetMode("menu")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "#334155", border: "none", color: "#E2E8F0", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px 16px", borderRadius: 8, marginBottom: 12 }}>
          ← 지표 선택으로
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>{selectedDong["시도"]}</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 0", color: "#F1F5F9" }}>{selectedDong["dong"]}</h2>
        </div>
        {!isMobile && (
          <button onClick={() => setSelectedDong(null)} style={{ background: "#334155", border: "none", color: "#94A3B8", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 16 }}>×</button>
        )}
      </div>

      {selectedDong.cluster_label && (
        <div style={{ background: (CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280") + "33", border: `1px solid ${CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280"}`, borderRadius: 8, padding: "6px 12px", marginBottom: 12 }}>
          <span style={{ color: CLUSTER_COLORS[selectedDong.cluster_label]?.hex || "#6B7280", fontWeight: 700, fontSize: 13 }}>{selectedDong.cluster_label}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid #334155", paddingBottom: 8 }}>
        {["기본", "학원", "부동산"].map(tab => (
          <button key={tab} onClick={() => setPopupTab(tab)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, background: popupTab === tab ? "#3B82F6" : "#334155", color: popupTab === tab ? "#fff" : "#94A3B8" }}>{tab}</button>
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
            {Object.entries(selectedDong["학원수별"]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => (
              <InfoRow key={name} label={name} value={`${count}개`} />
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
  );
  const sheetHeight = bottomSheetHeight === "full" ? "90vh" : "45vh";

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", height: "100vh", display: "flex", background: "#0F172A", overflow: "hidden" }}>

      {!isMobile && (
        <div style={{
          width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0,
          background: "#1E293B", borderRight: "1px solid #334155",
          display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s",
        }}>
          <div style={{ padding: "16px 16px 8px", borderBottom: "1px solid #334155" }}>
            <h1 style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>🏫 학원 입지 분석</h1>
          </div>
          <SidebarContent />
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
              style={{ position: "absolute", top: 16, left: 16, zIndex: 10, background: "#1E293B", border: "1px solid #334155", borderRadius: 6, color: "#94A3B8", padding: "6px 10px", cursor: "pointer", fontSize: 13 }}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <div style={{ position: "absolute", top: 16, left: sidebarOpen ? 64 : 60, zIndex: 10, background: "#1E293Bdd", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#60A5FA", fontSize: 13, fontWeight: 600 }}>
              {activeColumn.label}
            </div>
            <button onClick={() => setShowRanking(!showRanking)}
              style={{ position: "absolute", top: 16, right: selectedDong ? 356 : 16, zIndex: 10, background: "#1E293B", border: "1px solid #334155", borderRadius: 6, color: "#94A3B8", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              🏆 순위표
            </button>
            {showRanking && geoData && (
              <div style={{ position: "absolute", top: 56, right: selectedDong ? 356 : 16, width: 280, background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 16, zIndex: 10, maxHeight: "70vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 700, margin: 0 }}>{activeColumn.label} 상위 20</p>
                  <button onClick={() => setShowRanking(false)} style={{ background: "#334155", border: "none", color: "#94A3B8", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 14 }}>×</button>
                </div>
                {geoData.features
                  .map(f => f.properties)
                  .filter(p => { const val = activeColumn.sourceKey ? p[activeColumn.sourceKey]?.[activeColumn.id] : p[activeColumn.id]; return val !== null && val !== undefined && !isNaN(parseFloat(val)); })
                  .sort((a, b) => { const va = activeColumn.sourceKey ? a[activeColumn.sourceKey]?.[activeColumn.id] : a[activeColumn.id]; const vb = activeColumn.sourceKey ? b[activeColumn.sourceKey]?.[activeColumn.id] : b[activeColumn.id]; return parseFloat(vb) - parseFloat(va); })
                  .slice(0, 20)
                  .map((props, i) => (
                    <button key={props.key} onClick={() => moveToDong(props)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#334155"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: i < 3 ? "#F59E0B" : "#475569", fontSize: 12, fontWeight: 700, width: 20 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#E2E8F0", fontSize: 12, margin: 0 }}>{props.dong}</p>
                        <p style={{ color: "#64748B", fontSize: 10, margin: 0 }}>{props["시도"]}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
            {selectedDong && (
              <div style={{ position: "absolute", top: 16, right: 16, width: "min(320px, calc(100vw - 32px))", background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 16, color: "#E2E8F0", maxHeight: "85vh", overflowY: "auto", zIndex: 10 }}>
                <DetailContent />
              </div>
            )}
          </>
        )}

        {isMobile && (
          <>
            <div style={{ position: "absolute", top: 16, left: 16, right: 16, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ background: "#1E293Bee", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#60A5FA", fontSize: 12, fontWeight: 600 }}>
                {activeColumn.label}
              </div>
              <button onClick={() => setShowRanking(!showRanking)}
                style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#94A3B8", padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                🏆 순위표
              </button>
            </div>

            {showRanking && geoData && (
              <div style={{ position: "absolute", top: 60, right: 16, width: "calc(100vw - 32px)", background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: 16, zIndex: 20, maxHeight: "50vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ color: "#F1F5F9", fontSize: 13, fontWeight: 700, margin: 0 }}>{activeColumn.label} 상위 20</p>
                  <button onClick={() => setShowRanking(false)} style={{ background: "#334155", border: "none", color: "#94A3B8", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
                {geoData.features
                  .map(f => f.properties)
                  .filter(p => { const val = activeColumn.sourceKey ? p[activeColumn.sourceKey]?.[activeColumn.id] : p[activeColumn.id]; return val !== null && val !== undefined && !isNaN(parseFloat(val)); })
                  .sort((a, b) => { const va = activeColumn.sourceKey ? a[activeColumn.sourceKey]?.[activeColumn.id] : a[activeColumn.id]; const vb = activeColumn.sourceKey ? b[activeColumn.sourceKey]?.[activeColumn.id] : b[activeColumn.id]; return parseFloat(vb) - parseFloat(va); })
                  .slice(0, 20)
                  .map((props, i) => (
                    <button key={props.key} onClick={() => moveToDong(props)}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#334155"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: i < 3 ? "#F59E0B" : "#475569", fontSize: 13, fontWeight: 700, width: 24 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: "#E2E8F0", fontSize: 13, margin: 0 }}>{props.dong}</p>
                        <p style={{ color: "#64748B", fontSize: 11, margin: 0 }}>{props["시도"]}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}

            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
              background: "#1E293B", borderTop: "1px solid #334155",
              borderRadius: "16px 16px 0 0",
              height: bottomSheetMode === "none" ? 64 : sheetHeight,
              transition: "height 0.35s cubic-bezier(0.4,0,0.2,1)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <div
                onClick={() => {
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
                style={{ padding: "10px 0 6px", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "#475569" }} />
                {bottomSheetMode === "none" && (
                  <div style={{ display: "flex", justifyContent: "space-around", width: "100%", marginTop: 8, paddingBottom: 4 }}>
                    <button onClick={e => { e.stopPropagation(); setBottomSheetMode("menu"); setBottomSheetHeight("half"); }}
                      style={{ background: "#334155", border: "none", color: "#E2E8F0", borderRadius: 8, padding: "6px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      📊 지표 선택
                    </button>
                    {selectedDong && (
                      <button onClick={e => { e.stopPropagation(); setBottomSheetMode("detail"); setBottomSheetHeight("half"); }}
                        style={{ background: "#3B82F6", border: "none", color: "#fff", borderRadius: 8, padding: "6px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        📍 {selectedDong.dong}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {bottomSheetMode === "menu" && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  <SidebarContent />
                </div>
              )}

              {bottomSheetMode === "detail" && selectedDong && (
                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
                  <DetailContent />
                </div>
              )}
            </div>
          </>
        )}

        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0F172Acc", zIndex: 20 }}>
            <p style={{ color: "#94A3B8", fontSize: 16 }}>데이터 로딩 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "#94A3B8" }}>{label}</span>
      <span style={{ color: "#E2E8F0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}