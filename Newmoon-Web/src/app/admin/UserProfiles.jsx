import React, { useState } from "react";
import {
  Table, Tag, Modal, Input, Space, Typography, Avatar, Descriptions,
  Card, Tooltip, Button, Empty, Segmented,
} from "antd";
import {
  UserOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  EnvironmentOutlined, IdcardOutlined, TeamOutlined, TruckOutlined,
  CrownOutlined, HomeOutlined, EyeOutlined, CoffeeOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/config/api";
import Loading from "@/components/Loading";
import { clientPagination, serverPagination } from "@/components/Pagination";
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
);

const CountPill = ({ children }) => (
  <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
    {children}
  </span>
);

const SectionCard = ({ icon, title, subtitle, extra, children, className = "" }) => (
  <div className={`rounded-2xl border border-orange-100 bg-white shadow-sm ${className}`}>
    {(title || extra) && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            {subtitle && <p className="text-xs text-stone-500">{subtitle}</p>}
          </div>
        </div>
        {extra}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const TableEmpty = ({ icon, title, description }) => (
  <div className="py-10 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
      {icon}
    </div>
    <p className="text-base font-semibold text-stone-700">{title}</p>
    {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
  </div>
);

const HeroHeader = ({ badgeIcon, badge, title, accent, subtitle, actions, stats = [] }) => (
  <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
    <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
    <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />
    {badgeIcon && (
      <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
        {badgeIcon}
      </div>
    )}
    <div className="relative z-10 px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          {badge && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              {badgeIcon}
              {badge}
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">
            {title} {accent && <span className="text-orange-400">{accent}</span>}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 xl:min-w-max">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.iconBg || "bg-orange-500/15"}`}>
                <span className={stat.iconColor || "text-orange-400"}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">{stat.label}</p>
                <p className={`text-white font-bold text-lg leading-tight ${stat.valueColor || ""}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Palette — light warm-cream + orange (Inventory Report skin) ──────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFFFFF";
const BORDER = "rgba(234,88,12,0.10)";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.08)";
const AMBER = "#D97706";
const AMBER_SOFT = "rgba(245,158,11,0.12)";
const GREEN = "#16A34A";
const GREEN_SOFT = "rgba(22,163,74,0.12)";
const RED = "#DC2626";
const RED_SOFT = "rgba(220,38,38,0.12)";

// Inline style tokens
const FIELD_LABEL = { color: "#451A03", fontWeight: 500 };
const GRADIENT_BTN = {
  background: "linear-gradient(135deg, #EA580C, #F97316)",
  border: "none",
  color: "#FFFFFF",
  fontWeight: 700,
  boxShadow: "0 4px 15px rgba(234,88,12,0.35)",
};
const SECONDARY_BTN = {
  background: "#FFFFFF",
  border: "1px solid #E7E5E4",
  color: "#292524",
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};

const { Text } = Typography;

const ROLE_META = {
  staff: { label: "Staff", color: "orange", icon: <CoffeeOutlined /> },
  delivery_rider: { label: "Rider", color: "geekblue", icon: <TruckOutlined /> },
  customer: { label: "Customer", color: "green", icon: <CrownOutlined /> },
};

const ROLE_AVATAR_COLOR = {
  staff: ACCENT,
  delivery_rider: ACCENT_DEEP,
  customer: ACCENT,
};

function getInitials(u = {}) {
  const first = (u.firstname || "").trim()[0] || "";
  const last = (u.lastname || "").trim()[0] || "";
  return (first + last).toUpperCase() || (u.username || "U")[0].toUpperCase();
}

function profileAvatar(u, size, fontSize) {
  return (
    <Avatar
      size={size}
      src={u.avatar_url || undefined}
      style={{
        background: u.avatar_url ? undefined : (ROLE_AVATAR_COLOR[u.role] || ACCENT),
        color: "#FFFFFF",
        fontWeight: 700,
        fontSize: fontSize,
      }}
    >
      {!u.avatar_url && getInitials(u)}
    </Avatar>
  );
}

function roleTag(role, size = "default") {
  const meta = ROLE_META[role] || { label: role || "User", color: "default" };
  const tone = {
    staff: { background: AMBER_SOFT, color: "#B45309", border: "1px solid #F59E0B40" },
    delivery_rider: { background: ACCENT_SOFT, color: ACCENT, border: "1px solid #EA580C40" },
    customer: { background: GREEN_SOFT, color: GREEN, border: "1px solid #16A34A40" },
  }[role] || { background: "#FFF7ED", color: MUTED, border: "1px solid #EA580C30" };
  return (
    <Tag
      className="rounded-full px-2 py-0.5"
      style={{ ...tone, fontSize: size === "small" ? 11 : undefined }}
    >
      {meta.label}
    </Tag>
  );
}

function UserProfiles() {
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const queryKey = ["user-profiles", roleFilter, searchTerm];

  const { data: users, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (searchTerm) params.append("search", searchTerm);
      const { data } = await api.get(`/users?${params}`);
      return Array.isArray(data) ? data : [];
    },
  });

  const handleView = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const columns = [
    {
      title: "User",
      key: "user",
      width: 240,
      render: (_, r) => {
        const meta = ROLE_META[r.role] || {};
        return (
          <div className="flex items-center gap-3">
            {profileAvatar(r, 38)}
            <div>
              <Text strong>{r.full_name || "—"}</Text>
              <br />
              <Text style={{ color: MUTED, fontSize: 12 }}>
                {meta.icon} @{r.username}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role) => roleTag(role),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          {r.email ? <Text style={{ fontSize: 12 }}><MailOutlined className="mr-1" />{r.email}</Text> : <Text style={{ fontSize: 12, color: MUTED }}>—</Text>}
          {r.phone ? <Text style={{ fontSize: 12 }}><PhoneOutlined className="mr-1" />{r.phone}</Text> : <Text style={{ fontSize: 12, color: MUTED }}>—</Text>}
        </Space>
      ),
    },
    {
      title: "Branch / Position",
      key: "branch",
      width: 180,
      render: (_, r) => {
        if (r.role === "customer") return <Text style={{ color: MUTED }}>—</Text>;
        return (
          <Space orientation="vertical" size={0}>
            {r.position && <Text style={{ fontSize: 12 }} strong>{r.position}</Text>}
            {r.branch_name
              ? <Text style={{ fontSize: 12 }}><EnvironmentOutlined className="mr-1" style={{ color: ACCENT }} />{r.branch_name}</Text>
              : <Text style={{ fontSize: 12, color: MUTED }}>Unassigned</Text>}
          </Space>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, r) => (
        <Tag
          className="rounded-full px-3 py-1"
          style={r.is_active
            ? { background: GREEN_SOFT, color: GREEN, border: "1px solid #16A34A30" }
            : { background: RED_SOFT, color: "#DC2626", border: "1px solid #DC262630" }}
        >
          {r.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Joined",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (v) => (
        <Text style={{ fontSize: 12, color: TEXT }}>
          {v ? new Date(v).toLocaleDateString() : "-"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      className: "text-center",
      render: (_, r) => (
        <Tooltip title="View Profile">
          <Button
            shape="circle"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(r)}
            style={GRADIENT_BTN}
          />
        </Tooltip>
      ),
    },
  ];

  const filterOptions = [
    { label: "All", value: "all", icon: <UserOutlined /> },
    { label: "Staff", value: "staff", icon: <CoffeeOutlined /> },
    { label: "Rider", value: "delivery_rider", icon: <TruckOutlined /> },
    { label: "Customer", value: "customer", icon: <CrownOutlined /> },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<IdcardOutlined />}
        badge="User Account"
        title="Profiles"
        accent="Profiles"
        subtitle="View profiles of staff, riders, and registered customers"
        actions={
          <Input
            placeholder="Search by name, username, email, phone..."
            prefix={<SearchOutlined className="text-white/60" />}
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 320 }}
            className="h-11! rounded-xl! border-white/20! bg-white/10! px-4! text-white! hover:border-orange-300!"
          />
        }
      />

      <SectionCard
        icon={<TeamOutlined />}
        title="User Account"
        subtitle="Staff, riders, and registered customer accounts"
        extra={
          !isLoading && (
            <CountPill>
              <TeamOutlined className="mr-1" />
              {users.length} profile{users.length !== 1 ? "s" : ""}
            </CountPill>
          )
        }
      >
        <div className="mb-4">
          <Segmented
            options={filterOptions}
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
          />
        </div>
        {isLoading ? (
          <Loading full text="Loading profiles..." />
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={clientPagination({ label: "users" })}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<IdcardOutlined />}
                  title="No profiles found"
                  description="Try adjusting your search or filter"
                />
              ),
            }}
          />
        )}
      </SectionCard>

      <Modal
        title={
          <span>
            <UserOutlined className="mr-2 text-[#EA580C]" />
            <span className="font-bold text-[#451A03]">User Profile</span>
          </span>
        }
        open={showDetailModal}
        onCancel={() => { setShowDetailModal(false); setSelectedUser(null); }}
        footer={[
          <Button
            key="close"
            style={GRADIENT_BTN}
            onClick={() => { setShowDetailModal(false); setSelectedUser(null); }}
          >
            Close
          </Button>,
        ]}
        width={720}
        className="rounded-2xl"
      >
        {selectedUser && (
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Card
              variant="borderless"
              size="small"
              style={{ background: "#FFFFFF", border: "1px solid #E7E5E4", borderRadius: 12 }}
            >
              <div className="flex items-center gap-4 mb-4">
                {profileAvatar(selectedUser, 64, 24)}
                <div>
                  <Text strong style={{ fontSize: 18 }}>{selectedUser.full_name || "—"}</Text>
                  <br />
                  <Text style={{ color: MUTED }}>@{selectedUser.username}</Text>
                  <div className="mt-1 flex items-center gap-2">
                    {roleTag(selectedUser.role)}
                    <Tag
                      className="rounded-full px-3 py-1"
                      style={selectedUser.is_active
                        ? { background: GREEN_SOFT, color: GREEN, border: "1px solid #16A34A30" }
                        : { background: RED_SOFT, color: "#DC2626", border: "1px solid #DC262630" }}
                    >
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </Tag>
                  </div>
                </div>
              </div>

              <Descriptions column={2} bordered size="small"
                styles={{
                  label: { color: ACCENT, fontWeight: 600 },
                  content: { color: TEXT },
                }}
              >
                <Descriptions.Item label="First Name">{selectedUser.firstname || "-"}</Descriptions.Item>
                <Descriptions.Item label="Last Name">{selectedUser.lastname || "-"}</Descriptions.Item>
                <Descriptions.Item label="Middle Name">{selectedUser.middlename || "-"}</Descriptions.Item>
                <Descriptions.Item label="Username">@{selectedUser.username}</Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedUser.email ? <Text><MailOutlined className="mr-1" style={{ color: ACCENT }} />{selectedUser.email}</Text> : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedUser.phone ? <Text><PhoneOutlined className="mr-1" style={{ color: ACCENT }} />{selectedUser.phone}</Text> : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>
                  {selectedUser.address ? <Text><HomeOutlined className="mr-1" style={{ color: ACCENT }} />{selectedUser.address}</Text> : "-"}
                </Descriptions.Item>
                {selectedUser.role !== "customer" && (
                  <>
                    <Descriptions.Item label="Position">{selectedUser.position || "-"}</Descriptions.Item>
                    <Descriptions.Item label="Branch">
                      {selectedUser.branch_name
                        ? <Text><EnvironmentOutlined className="mr-1" style={{ color: ACCENT }} />{selectedUser.branch_name}</Text>
                        : <Text style={{ color: MUTED }}>Unassigned</Text>}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="Account Type">
                  <Text>{ROLE_META[selectedUser.role]?.label || selectedUser.role || "User"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Member Since">
                  {selectedUser.created_at
                    ? new Date(selectedUser.created_at).toLocaleDateString()
                    : "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div
              className="flex items-center gap-2 rounded-xl border border-orange-100 bg-[#FFF1E6] px-4 py-3"
            >
              <InfoCircleOutlined className="text-[#EA580C]" />
              <Text style={{ fontSize: 13, color: "#EA580C" }}>
                This profile is synced with what the account owner keeps updated in the mobile app.
              </Text>
            </div>
          </Space>
        )}
      </Modal>
    </PageShell>
  );
}

export default UserProfiles;