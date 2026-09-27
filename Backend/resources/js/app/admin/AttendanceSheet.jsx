import React, { useEffect, useState } from "react";
import { Table, Tag, Button, DatePicker, Input, message } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "@/config/api";
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

const FilterBar = ({ title = "Filters", subtitle = "Narrow down the view", children }) => (
  <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
        <SearchOutlined />
      </div>
      <div>
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
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

// ─── Palette — light warm-cream + orange (matches Inventory Report) ─────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFEDD5";
const BORDER = "#FFEDD5";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.12)";
const AMBER = "#F59E0B";
const AMBER_SOFT = "rgba(245,158,11,0.15)";
const GREEN = "#16A34A";
const GREEN_SOFT = "rgba(22,163,74,0.12)";
const RED = "#EF4444";
const RED_SOFT = "rgba(239,68,68,0.15)";

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
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: "1px solid #EA580C",
  color: "#EA580C",
  fontWeight: 500,
};

function AttendanceView() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadAttendanceData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/attendance", {
        params: { date: selectedDate },
      });
      const records = response.data?.data ?? [];
      setAttendanceData(records);
    } catch (error) {
      console.error("Error loading attendance:", error);
      message.error("Failed to load attendance data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const filteredData = Array.isArray(attendanceData)
    ? attendanceData.filter((item) => {
        const firstName = item.user?.firstname || "";
        const lastName = item.user?.lastname || "";
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : [];

  const formatTime = (time) => {
    if (!time) return "-";
    try {
      if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      }
      const date = new Date(time);
      if (isNaN(date.getTime())) return time;
      return date.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return time;
    }
  };

  const statusTag = (status) => {
    const normalized = String(status).toLowerCase().trim();
    if (normalized === "present" || normalized === "completed") {
      return <Tag className="rounded-full px-3 py-1" icon={<CheckCircleOutlined />} style={{ background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` }}>Present</Tag>;
    }
    if (normalized === "completed_late") {
      return <Tag className="rounded-full px-3 py-1" icon={<CheckCircleOutlined />} style={{ background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` }}>Completed (Late)</Tag>;
    }
    if (normalized === "late") {
      return <Tag className="rounded-full px-3 py-1" icon={<ClockCircleOutlined />} style={{ background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` }}>Late</Tag>;
    }
    if (normalized === "absent") {
      return <Tag className="rounded-full px-3 py-1" icon={<CloseCircleOutlined />} style={{ background: RED_SOFT, color: "#EF4444", border: `1px solid ${RED}30` }}>Absent</Tag>;
    }
    return <Tag style={{ background: PANEL_BG_2, color: MUTED, border: "none" }}>{status || "Unknown"}</Tag>;
  };

  const getStatusStats = (data) => {
    let present = 0, late = 0, absent = 0;
    data.forEach(item => {
      const status = String(item.status).toLowerCase().trim();
      if (status === "present" || status === "completed" || status === "completed_late") present++;
      else if (status === "late") late++;
      else if (status === "absent") absent++;
    });
    return { present, late, absent };
  };

  const totalStaff = filteredData.length;
  const stats = getStatusStats(filteredData);

  const columns = [
    {
      title: "Staff Name",
      key: "name",
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: PANEL_BG_2, color: ACCENT }}
          >
            {r.user?.firstname?.charAt(0) || "?"}
          </div>
          <span className="font-medium" style={{ color: TEXT }}>
            {r.user?.firstname && r.user?.lastname
              ? `${r.user.firstname} ${r.user.lastname}`
              : r.user?.firstname || r.user?.lastname || "Unknown Staff"}
          </span>
        </div>
      ),
    },
    {
      title: "Branch",
      key: "branch",
      render: (_, r) => r.branch?.name || <span style={{ color: MUTED }}>N/A</span>,
    },
    {
      title: "Time In",
      key: "time_in",
      align: "center",
      render: (_, r) => <span className="font-mono">{formatTime(r.time_in)}</span>,
    },
    {
      title: "Time Out",
      key: "time_out",
      align: "center",
      render: (_, r) => <span className="font-mono">{formatTime(r.time_out)}</span>,
    },
    {
      title: "Status",
      key: "status",
      align: "center",
      render: (_, r) => statusTag(r.status),
    },
    {
      title: "Hours Worked",
      key: "hours_worked",
      align: "center",
      render: (_, r) => (r.hours_worked ? `${r.hours_worked}h` : "-"),
    },
    {
      title: "Daily Rate",
      key: "daily_rate",
      align: "right",
      render: (_, r) => <span className="font-medium" style={{ color: ACCENT }}>₱{r.daily_rate?.toFixed(2) || "0.00"}</span>,
    },
  ];

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<TeamOutlined />}
        badge="Staff Management"
        title="Attendance"
        accent="Records"
        subtitle={`Staff attendance for ${dayjs(selectedDate).format("MMMM D, YYYY")}`}
        stats={[
          {
            icon: <CheckCircleOutlined />,
            iconColor: "text-emerald-400",
            label: "Present",
            value: stats.present,
          },
          {
            icon: <ClockCircleOutlined />,
            iconColor: "text-amber-400",
            label: "Late",
            value: stats.late,
          },
          {
            icon: <CloseCircleOutlined />,
            iconColor: "text-red-400",
            label: "Absent",
            value: stats.absent,
          },
          {
            icon: <UserOutlined />,
            iconColor: "text-orange-400",
            label: "Total Staff",
            value: totalStaff,
          },
        ]}
      />

      <FilterBar title="Filters" subtitle="Select a date to view staff attendance">
        <DatePicker
          value={dayjs(selectedDate)}
          onChange={(date) => {
            if (date) setSelectedDate(date.format("YYYY-MM-DD"));
          }}
          allowClear={false}
          className="rounded-xl"
        />
        <Input
          placeholder="Search staff..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 220 }}
          allowClear
          className="rounded-xl"
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={loadAttendanceData}
          loading={isLoading}
          className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
        >
          Refresh
        </Button>
      </FilterBar>

      <SectionCard
        icon={<UserOutlined />}
        title="Attendance Records"
        subtitle={`Staff attendance for ${dayjs(selectedDate).format("MMMM D, YYYY")}`}
        extra={<CountPill>{filteredData.length} record{filteredData.length !== 1 ? 's' : ''}</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => record.id ?? `${record.user_id}-${selectedDate}`}
          loading={isLoading}
          pagination={clientPagination({ label: "records" })}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<UserOutlined style={{ fontSize: 20 }} />}
                title="No attendance records found"
                description="Try selecting a different date"
              />
            ),
          }}
        />
      </SectionCard>
    </PageShell>
  );
}

export default AttendanceView;