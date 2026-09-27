import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge, Modal, Tooltip } from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
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
  BellOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  LeftOutlined,
  RightOutlined,
  IdcardOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { api } from "../config/api";
import { getAuthUser, getAuthRole, clearAuthSession } from "../utils/authStorage";
import { useLowStock } from "../context/LowStockContext";
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

function tagStyle(color) {
  const map = {
    green: { bg: "#F0FDF4", text: "#15803D" },
    orange: { bg: "#FFF7ED", text: "#C2410C" },
    amber: { bg: "#FFFBEB", text: "#B45309" },
    red: { bg: "#FEF2F2", text: "#B91C1C" },
  };
  const c = map[color] || map.orange;
  return { fontSize: 9, padding: "2px 6px", borderRadius: 4, background: c.bg, color: c.text, fontWeight: 600, flexShrink: 0, alignSelf: "flex-start", marginTop: 2 };
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const user = getAuthUser() || {};
  const userRole = getAuthRole() || "admin";
  const { lowStockCount, openModal: openLowStockModal } = useLowStock();

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(next));
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
    setLogoutModalVisible(false);
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.unread_count);
    } catch { }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { params: { per_page: 10 } });
      setNotifications(res.data.data || []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { }
  };

  const isActive = (key) => location.pathname === key;
    const sidebarW = collapsed ? 71 : 260;

  // ─── Warm palette — GRADIENT match sa Dashboard header ─────────
  const BG = "linear-gradient(180deg, #7C2D12 0%, #431407 100%)";
  const TEXT = "#FFF7ED";
  const MUTED = "#E8C4A8";
  const FAINT = "#B07A5A";
  const ACCENT = "#F97316";
  const ACCENT_DEEP = "#EA580C";
  const ACCENT_SOFT = "rgba(249,115,22,0.18)";
  const BORDER = "rgba(255,247,237,0.10)";
  const HEADER_BG = "linear-gradient(135deg, #EA580C 0%, #F97316 100%)";
  const PANEL_BG = "linear-gradient(180deg, #7C2D12 0%, #5C1E0A 100%)";

  return (
    <>
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
        {/* Brand Header — orange gradient with logo + name + toggle */}
        <div
          style={{
            background: HEADER_BG,
            padding: collapsed ? "14px 0 14px" : "16px 18px 16px",
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

          {/* Single toggle button */}
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

        {/* User name block (expanded only) */}
        {!collapsed && (
          <div style={{ textAlign: "center", padding: "16px 16px 8px", flexShrink: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name || user.username || "Admin"}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 3, fontWeight: 400 }}>
              {userRole === "admin" ? "Administrator" : "Staff"}
            </div>
          </div>
        )}
        {collapsed && <div style={{ height: 8, flexShrink: 0 }} />}

        {/* Global Low Stock Alert Pill */}
        {lowStockCount > 0 && (
          <div style={{ padding: collapsed ? "2px 8px 8px" : "2px 14px 8px", flexShrink: 0 }}>
            <Tooltip title={`${lowStockCount} items below reorder level - Click to view details`} placement="right">
              <button
                onClick={openLowStockModal}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  gap: 8,
                  background: "linear-gradient(135deg, rgba(234, 88, 12, 0.28) 0%, rgba(245, 158, 11, 0.38) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.65)",
                  borderRadius: 10,
                  padding: collapsed ? "8px 0" : "8px 12px",
                  color: "#FFF",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(234, 88, 12, 0.25)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <WarningOutlined style={{ color: "#FBBF24", fontSize: 15 }} />
                  {!collapsed && (
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.2px", color: "#FFF" }}>
                      Low Stock Alert
                    </span>
                  )}
                </span>
                <span
                  style={{
                    background: "#EA580C",
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 800,
                    borderRadius: 999,
                    padding: "1px 7px",
                    minWidth: 20,
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  {lowStockCount}
                </span>
              </button>
            </Tooltip>
          </div>
        )}

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

        {/* User + Bell (expanded) */}
{!collapsed && (
  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "relative", borderTop: `1px solid ${BORDER}` }}>
    <button
      onClick={() => { setNotificationPanelVisible(!notificationPanelVisible); if (!notificationPanelVisible) fetchNotifications(); }}
      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", gap: 8, color: "#FFF7ED", transition: "opacity 0.15s", fontSize: 13 }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      <Badge count={unreadCount} size="small" offset={[2, -2]}>
        <BellOutlined style={{ fontSize: 16, color: "#FFF7ED" }} />
      </Badge>
      <span>Notifications</span>
    </button>

    <button
      onClick={() => setLogoutModalVisible(true)}
      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: MUTED, display: "flex", alignItems: "center", transition: "color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.color = "#F97316"}
      onMouseLeave={e => e.currentTarget.style.color = MUTED}
    >
      <LogoutOutlined style={{ fontSize: 16 }} />
    </button>

    {notificationPanelVisible && (
      <>
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotificationPanelVisible(false)} />
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: "100%",
            marginBottom: 8,
            zIndex: 50,
            background: "#5C1E0A",
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            border: `1px solid ${BORDER}`,
            maxHeight: 340,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: "rgba(67,20,7,0.4)" }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: ACCENT, fontWeight: 600, padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: FAINT }}>No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  style={{
                    padding: "9px 14px",
                    cursor: "pointer",
                    background: !n.is_read ? ACCENT_SOFT : "transparent",
                    borderBottom: `1px solid ${BORDER}`,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: !n.is_read ? ACCENT : "transparent", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: TEXT, lineHeight: 1.4, wordBreak: "break-word" }}>{n.message}</div>
                    {n.data?.branch_name && <div style={{ fontSize: 10, color: ACCENT, marginTop: 2, fontWeight: 600 }}>{n.data.branch_name}</div>}
                    <div style={{ fontSize: 10, color: FAINT, marginTop: 2 }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                    {n.type === "Stock_Received" && <span style={tagStyle("green")}>Received</span>}
                    {n.type === "Cash_Advance_Request" && <span style={tagStyle("orange")}>Cash Adv</span>}
                    {n.type === "Stock_Request" && <span style={tagStyle("amber")}>Request</span>}
                    {n.type === "Low_Stock" && <span style={tagStyle("red")}>Low Stock</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    )}
  </div>
)}

        {/* Collapsed: bell + signout stacked */}
        {collapsed && (
          <div style={{ padding: "8px 0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
            <Tooltip title="Notifications" placement="right">
              <button onClick={() => { setNotificationPanelVisible(!notificationPanelVisible); if (!notificationPanelVisible) fetchNotifications(); }} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#FFF7ED" }}>
                <Badge count={unreadCount} size="small">
                  <BellOutlined style={{ fontSize: 16, color: "#FFF7ED" }} />
                </Badge>
              </button>
            </Tooltip>
            <Tooltip title="Sign out" placement="right">
              <button onClick={() => setLogoutModalVisible(true)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: MUTED }}>
                <LogoutOutlined style={{ fontSize: 16 }} />
              </button>
            </Tooltip>
          </div>
        )}
      </aside>

      <Modal
        title="Sign Out"
        open={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        onOk={handleLogout}
        okText="Yes, Sign Out"
        okButtonProps={{ danger: true, className: "rounded-lg" }}
        cancelButtonProps={{ className: "rounded-lg" }}
      >
        <p style={{ color: "#7C2D12" }}>Are you sure you want to sign out?</p>
        <p style={{ fontSize: 12, color: "#B07A5A", marginTop: 4 }}>You will need to sign in again to access the dashboard.</p>
      </Modal>

      <style>{`
        .nm-scroll::-webkit-scrollbar { width: 3px; }
        .nm-scroll::-webkit-scrollbar-track { background: transparent; }
        .nm-scroll::-webkit-scrollbar-thumb { background: rgba(255,247,237,0.12); border-radius: 4px; }
        .nm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,247,237,0.22); }
      `}</style>
    </>
  );
}

export default Sidebar;