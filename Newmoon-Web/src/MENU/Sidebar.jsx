import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tooltip } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  PullRequestOutlined,
  RiseOutlined,
  EnvironmentOutlined,
  TruckOutlined,
  TransactionOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  DollarOutlined,
  InboxOutlined,
  ExperimentOutlined,
  AuditOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import logo from "../assets/logooos.jpg";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    ],
  },
  {
    label: "Products",
    items: [
      { key: "/inventory", icon: <AppstoreOutlined />, label: "Product" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { key: "/stock-requests", icon: <InboxOutlined />, label: "Stock Requests" },
      { key: "/supply-requests", icon: <ExperimentOutlined />, label: "Supply Requests" },
      { key: "/pullout-admin", icon: <PullRequestOutlined />, label: "Pull Out" },
      { key: "/back-to-sales", icon: <ArrowLeftOutlined />, label: "Back-to-Sales" },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "/sales", icon: <TransactionOutlined />, label: "Sales" },
      { key: "/cash-advance", icon: <DollarOutlined />, label: "Cash Advance" },
      { key: "/attendance", icon: <DatabaseOutlined />, label: "Attendance" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "/customers", icon: <TeamOutlined />, label: "Customers" },
      { key: "/staff", icon: <UserOutlined />, label: "Staff Management" },
      { key: "/user-profiles", icon: <IdcardOutlined />, label: "User Profiles" },
      { key: "/staff-performance", icon: <RiseOutlined />, label: "Performance" },
      { key: "/delivery", icon: <TruckOutlined />, label: "Delivery Fleet" },
    ],
  },
  {
    label: "Branches",
    items: [
      { key: "/branch-map", icon: <EnvironmentOutlined />, label: "Branch Info" },
      { key: "/branch-assign", icon: <AuditOutlined />, label: "Assignments" },
    ],
  },
  {
    label: "Reports",
    items: [
      { key: "/reports", icon: <FileTextOutlined />, label: "Reports" },
    ],
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [logoError, setLogoError] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
  };

  const isActive = (key) => location.pathname === key;
  const sidebarW = collapsed ? 71 : 260;

  // ─── Warm palette — GRADIENT match sa Dashboard header ─────────
  const BG = "linear-gradient(180deg, #7C2D12 0%, #431407 100%)";
  const TEXT = "#FFF7ED";
  const MUTED = "#E8C4A8";
  const FAINT = "#B07A5A";
  const ACCENT = "#F97316";
  const ACCENT_SOFT = "rgba(249,115,22,0.18)";
  const BORDER = "rgba(255,247,237,0.10)";
  const HEADER_BG = "linear-gradient(135deg, #EA580C 0%, #F97316 100%)";

  return (
    <aside
      style={{
        width: sidebarW,
        minWidth: sidebarW,
        maxWidth: sidebarW,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: BG,
        transition: "width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Header — FIXED 68px height */}
      <div
        style={{
          background: HEADER_BG,
          height: 68,
          boxSizing: "border-box",
          padding: collapsed ? "0" : "0 18px",
          position: "relative",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          boxShadow: "0 4px 16px rgba(67,20,7,0.30)",
        }}
      >
        <div
          onClick={() => navigate("/dashboard")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: collapsed ? 0 : 10,
            cursor: "pointer",
            overflow: "hidden",
            maxWidth: collapsed ? "auto" : "calc(100% - 34px)",
          }}
        >
          {/* Logo image */}
          <div
            style={{
              width: collapsed ? 32 : 36,
              height: collapsed ? 32 : 36,
              borderRadius: 8,
              overflow: "hidden",
              flexShrink: 0,
              border: "1.5px solid rgba(255,247,237,0.55)",
              background: "#FFF7ED",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {!logoError ? (
              <img
                src={logo}
                alt="NewMoon"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#7C2D12",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF7ED",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                NM
              </div>
            )}
          </div>

          {/* Business name */}
          {!collapsed && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#FFF7ED",
                letterSpacing: "-0.3px",
                lineHeight: 1.15,
                whiteSpace: "normal",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                textShadow: "0 1px 2px rgba(67,20,7,0.25)",
              }}
            >
              NewMoon Lechon Manok and Liempo House
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleCollapsed}
          style={{
            background: "rgba(255,247,237,0.22)",
            border: "none",
            borderRadius: 6,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#FFF7ED",
            flexShrink: 0,
            transition: "background 0.15s",
            ...(collapsed ? { position: "absolute", top: 8, right: 6 } : {}),
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,247,237,0.35)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,247,237,0.22)"}
        >
          {collapsed ? <RightOutlined style={{ fontSize: 10 }} /> : <LeftOutlined style={{ fontSize: 10 }} />}
        </button>
      </div>

      {/* Navigation */}
      <div className="nm-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 0 8px" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: 2 }}>
            {!collapsed && (
              <div style={{ fontSize: 9, fontWeight: 700, color: FAINT, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 22px 4px" }}>
                {group.label}
              </div>
            )}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, background: BORDER, margin: "6px 14px" }} />
            )}
            {group.items.map((item) => {
              const active = isActive(item.key);
              return (
                <Tooltip key={item.key} title={collapsed ? item.label : ""} placement="right">
                  <div
                    onClick={() => navigate(item.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: collapsed ? "0 0" : "0 14px",
                      margin: collapsed ? "2px 14px" : "1px 14px",
                      height: 40, borderRadius: 8, cursor: "pointer",
                      background: active ? ACCENT_SOFT : "transparent",
                      color: active ? ACCENT : MUTED,
                      fontWeight: active ? 600 : 400,
                      fontSize: 13.5,
                      transition: "all 0.15s ease",
                      justifyContent: collapsed ? "center" : "flex-start",
                      userSelect: "none",
                      position: "relative",
                      border: active ? `1px solid rgba(249,115,22,0.25)` : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = TEXT;
                        e.currentTarget.style.background = "rgba(255,247,237,0.07)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = MUTED;
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {active && (
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 22,
                        borderRadius: "0 3px 3px 0",
                        background: ACCENT,
                        boxShadow: `0 0 8px ${ACCENT}`,
                      }} />
                    )}
                    <span style={{ fontSize: 16, flexShrink: 0, color: active ? ACCENT : MUTED, transition: "color 0.12s" }}>{item.icon}</span>
                    {!collapsed && <span style={{ fontSize: 13.5 }}>{item.label}</span>}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      <style>{`
        .nm-scroll::-webkit-scrollbar { width: 3px; }
        .nm-scroll::-webkit-scrollbar-track { background: transparent; }
        .nm-scroll::-webkit-scrollbar-thumb { background: rgba(255,247,237,0.12); border-radius: 4px; }
        .nm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,247,237,0.22); }
      `}</style>
    </aside>
  );
}

export default Sidebar;