import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Tag, Typography, Button, Modal, DatePicker as AntDatePicker } from "antd";
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  SearchOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  RiseOutlined,
  DollarOutlined,
  ArrowLeftOutlined,
  FireOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Avatar } from 'antd';
import { api } from "@/config/api";
import Loading from "@/components/Loading";
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
);

const HeroButton = ({ children, ...props }) => (
  <Button
    {...props}
    className="h-11! rounded-xl! border-white/20! bg-white/5! px-5! font-medium! text-white! hover:border-orange-300! hover:text-orange-300!"
  >
    {children}
  </Button>
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

const { Title, Text } = Typography;

// ─── Palette — matches Inventory Report (warm cream + orange) ─────
const PANEL_BG = "#FFFFFF";
const PANEL_BG_2 = "#FFF7ED";
const BORDER = "#FFEDD5";
const TEXT = "#292524";
const MUTED = "#78716C";
const FAINT = "#A8A29E";
const ACCENT = "#EA580C";
const ACCENT_DEEP = "#F97316";
const ACCENT_SOFT = "rgba(234,88,12,0.10)";
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
  boxShadow: "none",
};
const SECONDARY_BTN = {
  background: PANEL_BG,
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontWeight: 500,
};
const GHOST_BTN = {
  background: "transparent",
  border: `1px solid ${ACCENT}40`,
  color: ACCENT,
  fontWeight: 500,
};

const formatStatus = (status, timeIn, timeOut) => {
  if (timeIn && timeOut) return "Completed";
  if (timeIn) return status?.includes("late") ? "Late" : "Present";
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ") : "Unknown";
};

const isPresentForDay = (staff) => Boolean(staff.time_in_raw);

const extractTimeParts = (timeValue) => {
  if (!timeValue) return null;

  try {
    // Full ISO string like "2026-04-25T01:43:00.000000Z"
    // Use UTC getters to avoid browser timezone shifting display.
    if (typeof timeValue === "string" && timeValue.includes("T")) {
      const d = new Date(timeValue);
      return { hours: d.getUTCHours(), minutes: d.getUTCMinutes() };
    }

    // Plain time string like "19:41:05" or "19:41"
    if (typeof timeValue === "string" && /^\d{2}:\d{2}/.test(timeValue)) {
      const [hh, mm] = timeValue.split(":");
      return { hours: parseInt(hh, 10), minutes: parseInt(mm, 10) };
    }

    return null;
  } catch (error) {
    console.error("[BranchDetails] Error extracting time:", error);
    return null;
  }
};

const formatTime = (timeValue) => {
  if (!timeValue) return "-";

  const extracted = extractTimeParts(timeValue);
  if (!extracted) return "-";

  let { hours, minutes } = extracted;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes.toString().padStart(2, "0");
  return `${hours}:${minutesStr} ${ampm}`;
};

function BranchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [sales, setSales] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);


  // Update current time
  useEffect(() => {
    const updatePHTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const phTime = new Date(utc + 8 * 60 * 60 * 1000);
      setCurrentTime(phTime);
    };

    updatePHTime();
    const timer = setInterval(updatePHTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadBranchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [branchRes, salesRes, attendanceRes] = await Promise.all([
          api.get(`/branches/${id}`),
          api.get(`/branches/${id}/sales`, { params: { date: selectedDate } }),
          api.get(`/branches/${id}/attendance`, { params: { date: selectedDate } }),
        ]);

        setBranch(branchRes.data);
        setSales(
          (salesRes.data || []).flatMap((sale) =>
            (sale.items || []).map((item) => ({
              id: `${sale.id}-${item.id}`,
              date: (sale.sale_date || "").slice(0, 10),
              product: item.product,
              quantity: item.quantity,
              total: item.total,
            }))
          )
        );
        setAttendance(
          (attendanceRes.data || []).map((a) => {
            const timeIn = a.time_in || null;
            const timeOut = a.time_out || null;

            return {
              id: a.id,
              name: `${a.user?.firstname || ""} ${a.user?.lastname || ""}`.trim(),
              position: a.user?.role || "Staff",
              status: formatStatus(a.status, timeIn, timeOut),
              time_in_raw: timeIn,
              time_out_raw: timeOut,
              time_in: formatTime(timeIn),
              time_out: formatTime(timeOut),
              hours_worked: a.hours_worked,
            };
          })
        );
        console.log("[BranchDetails] attendance loaded", {
          date: selectedDate,
          rows: (attendanceRes.data || []).length,
          sample: (attendanceRes.data || []).slice(0, 3).map((r) => ({
            id: r?.id,
            time_in: r?.time_in,
            time_out: r?.time_out,
          })),
        });
      } catch (err) {
        setError("Failed to load branch details");
        setBranch(null);
        setSales([]);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    loadBranchDetails();
  }, [id, selectedDate]);

  // Sales are already filtered by date by the API — no need to re-filter on the frontend.
  const filteredSales = useMemo(() => sales, [sales]);

  // Filter attendance by search term
  const filteredAttendance = useMemo(() => {
    if (!searchTerm) return attendance;
    return attendance.filter(staff => 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendance, searchTerm]);

  // Filter to get only present staff
  const presentStaff = useMemo(() => {
    return filteredAttendance.filter(isPresentForDay);
  }, [filteredAttendance]);

  /** API may return quantity as string; + with string concatenates (0 + "1.00" → "01.00"). */
  const parseQuantity = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const n = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const totalSales = useMemo(
    () => filteredSales.reduce((sum, item) => {
      const t = parseFloat(String(item.total ?? "").replace(/,/g, "")) || 0;
      return sum + (Number.isFinite(t) ? t : 0);
    }, 0),
    [filteredSales]
  );

  const totalItems = useMemo(
    () => filteredSales.reduce((sum, item) => sum + parseQuantity(item.quantity), 0),
    [filteredSales]
  );

  const averageSale = useMemo(
    () => filteredSales.length > 0 ? totalSales / filteredSales.length : 0,
    [totalSales, filteredSales.length]
  );

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₱0.00';
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusTag = (status) => {
    switch(status) {
      case "Present":
        return <Tag className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700" icon={<CheckCircleOutlined />}>Present</Tag>;
      case "Completed":
        return <Tag className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700" icon={<CheckCircleOutlined />}>Completed</Tag>;
      case "Absent":
        return <Tag className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700" icon={<CloseCircleOutlined />}>Absent</Tag>;
      case "Late":
        return <Tag className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700" icon={<ClockCircleOutlined />}>Late</Tag>;
      default:
        return <Tag className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">{status}</Tag>;
    }
  };

  // Sales table columns
  const salesColumns = [
    {
      title: "NO.",
      key: "no",
      width: 60,
      render: (_, __, index) => <span style={{ color: MUTED }}>{index + 1}</span>,
    },
    {
      title: "DATE",
      dataIndex: "date",
      key: "date",
      render: (date) => (
        <div className="flex items-center gap-2">
          <CalendarOutlined style={{ color: ACCENT }} />
          <span className="font-medium" style={{ color: TEXT }}>{date}</span>
        </div>
      ),
    },
    {
      title: "PRODUCT",
      dataIndex: "product",
      key: "product",
      render: (product) => (
        <Tag className="rounded-full px-3 py-1" style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
          {product?.name || 'N/A'}
        </Tag>
      ),
    },
    {
      title: "QUANTITY",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity) => (
        <div className="flex items-center gap-2">
          <ShoppingCartOutlined style={{ color: FAINT }} />
          <span className="font-semibold" style={{ color: TEXT }}>{quantity}</span>
        </div>
      ),
    },
    {
      title: "TOTAL",
      dataIndex: "total",
      key: "total",
      render: (total) => (
        <span className="font-semibold" style={{ color: ACCENT }}>
          {formatCurrency(total)}
        </span>
      ),
    },
  ];

  // Attendance table columns
  const attendanceColumns = [
    {
      title: "NO.",
      key: "no",
      width: 60,
      render: (_, __, index) => <span style={{ color: MUTED }}>{index + 1}</span>,
    },
    {
      title: "STAFF NAME",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <div className="flex items-center gap-2">
          <UserOutlined style={{ color: ACCENT }} />
          <span className="font-medium" style={{ color: TEXT }}>{name}</span>
        </div>
      ),
    },
    {
      title: "POSITION",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "TIME IN",
      dataIndex: "time_in",
      key: "timeIn",
      render: (time) => time || '-',
    },
    {
      title: "TIME OUT",
      dataIndex: "time_out",
      key: "timeOut",
      render: (time) => time || '-',
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
  ];

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${branch?.name} - Sales Report</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            @page { size: portrait; margin: 1cm; }
          }
          body {
            font-family: 'Times New Roman', Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .company-name { font-size: 20px; font-weight: bold; }
          .report-title { font-size: 16px; margin-top: 5px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f5f5f5;
            font-weight: bold;
          }
          .summary {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">NEW MOON</div>
          <div class="report-title">${branch?.name} - SALES REPORT</div>
          <div>Date: ${new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No.</th><th>Date</th><th>Product</th><th>Quantity</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map((sale, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${sale.date}</td>
                <td>${sale.product.name}</td>
                <td>${sale.quantity}</td>
                <td>${formatCurrency(sale.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f0f0f0; font-weight: bold;">
              <td colspan="4" style="text-align: right;">TOTAL:</td>
              <td>${formatCurrency(totalSales)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="summary">
          <div><strong>Total Items Sold:</strong> ${totalItems}</div>
          <div><strong>Average Sale:</strong> ${formatCurrency(averageSale)}</div>
          <div><strong>Staff Present:</strong> ${presentStaff.length} / ${attendance.length}</div>
        </div>
        
        <div class="footer">
          <p>Generated on ${currentTime.toLocaleString()} | This is a computer-generated document</p>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrintModalVisible(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF7ED]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative h-12 w-12">
            <div
              className="h-12 w-12 rounded-full animate-spin"
              style={{ border: "4px solid rgba(234,88,12,0.2)", borderTopColor: ACCENT }}
            />
          </div>
          <p className="mt-4 text-sm" style={{ color: MUTED }}>Loading branch details...</p>
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF7ED] p-6">
        <Card
          className="max-w-md w-full rounded-2xl"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="text-center">
            <div className="mb-4 text-5xl" style={{ color: RED }}>!</div>
            <Title level={4} style={{ color: RED }}>Error</Title>
            <Text style={{ color: MUTED }}>{error || "Branch not found"}</Text>
            <div className="mt-4">
              <Button onClick={() => navigate('/Dashboard')} style={GHOST_BTN} className="rounded-xl">Back to Branches</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PageShell>
      {/* Hero Header */}
      <HeroHeader
        badgeIcon={<FireOutlined />}
        badge="Branch Report"
        title={branch.name}
        accent=""
        subtitle="Sales Report &amp; Staff Attendance"
        actions={
          <>
            <HeroButton
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/Dashboard')}
            >
              Back
            </HeroButton>
            <div className="text-right">
              <p className="text-sm text-white/60">Current Philippines Time</p>
              <p className="text-lg font-semibold text-white">
                {currentTime.toLocaleTimeString('en-PH', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs text-white/40">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </>
        }
        stats={[
          { icon: <DollarOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Sales Revenue", value: formatCurrency(totalSales), valueColor: "text-orange-300" },
          { icon: <RiseOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Average Sale Value", value: formatCurrency(averageSale) },
          { icon: <ShoppingOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "Total Items Sold", value: totalItems },
        ]}
      />

      {/* Filters */}
      <div className="mb-6">
        <FilterBar title="Filters" subtitle="Narrow down the sales and attendance view">
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs font-semibold" style={FIELD_LABEL}>Select Date</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700 transition-all duration-200 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 sm:w-auto"
                aria-label="Select date"
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarOutlined style={{ color: ACCENT }} />
                  <span className="font-medium" style={{ color: TEXT }}>{selectedDate}</span>
                </span>
                <span className="text-xs" style={{ color: MUTED }}>Tap to change</span>
              </button>

              {/* Hidden DatePicker used only for the calendar popup */}
              <AntDatePicker
                value={dayjs(selectedDate)}
                open={datePickerOpen}
                onOpenChange={(open) => setDatePickerOpen(open)}
                onChange={(date) => {
                  if (date) {
                    setSelectedDate(date.format("YYYY-MM-DD"));
                  }
                  setDatePickerOpen(false);
                }}
                format="YYYY-MM-DD"
                inputReadOnly
                size="middle"
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs font-semibold" style={FIELD_LABEL}>Search Staff</label>
            <div className="flex items-center rounded-xl border border-orange-200 bg-white px-3 py-1.5 transition-all duration-200 focus-within:border-orange-400">
              <SearchOutlined className="mr-2 text-sm" style={{ color: ACCENT }} />
              <input
                type="text"
                placeholder="Enter name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-sm outline-none sm:w-48"
                style={{ background: "transparent", color: TEXT }}
              />
            </div>
          </div>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => setIsPrintModalVisible(true)}
            className="h-11! rounded-xl! border-none! bg-linear-to-br! from-[#EA580C]! via-[#F97316]! to-[#F59E0B]! text-white! shadow-[0_4px_15px_rgba(234,88,12,0.35)]!"
          >
            Print Report
          </Button>
        </FilterBar>
      </div>

      {/* Present Staff Section */}
      <SectionCard
        className="mb-6"
        icon={<TeamOutlined />}
        title="Present Staff"
        subtitle="Staff currently on duty for the selected date"
        extra={<CountPill>{presentStaff.length} / {filteredAttendance.length}</CountPill>}
      >
        {presentStaff.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {presentStaff.map((staff) => (
              <div
                key={staff.id}
                className="rounded-xl border border-orange-100 bg-white p-3 transition-colors hover:bg-orange-50"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ background: "linear-gradient(135deg, #EA580C, #F97316)" }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: TEXT }}>{staff.name}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{staff.position}</div>
                  </div>
                  {getStatusTag(staff.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TableEmpty icon={<UserOutlined className="text-3xl" />} title="No staff present" description="No staff present for the selected date." />
        )}
      </SectionCard>

      {/* Attendance Table */}
      <SectionCard
        className="mb-6"
        icon={<UserOutlined />}
        title="Staff Attendance"
        subtitle="Daily attendance records for the selected date"
        extra={<CountPill>{filteredAttendance.length} Staff</CountPill>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: PANEL_BG_2 }}>
                {attendanceColumns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={attendanceColumns.length} className="py-12 text-center" style={{ color: MUTED }}>
                    No staff records found.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((staff, idx) => (
                  <tr key={staff.id} className="hover:bg-orange-50">
                    <td className="px-4 py-3" style={{ color: MUTED }}>{idx + 1}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>{staff.name}</td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>{staff.position}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: TEXT }}>{staff.time_in || '-'}</td>
                    <td className="px-4 py-3 font-mono text-sm" style={{ color: TEXT }}>{staff.time_out || '-'}</td>
                    <td className="px-4 py-3">{getStatusTag(staff.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Transaction History Table */}
      <SectionCard
        icon={<ShoppingCartOutlined />}
        title="Transaction History"
        subtitle="Sales transactions for the selected date"
        extra={<CountPill>{filteredSales.length} Transactions</CountPill>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: PANEL_BG_2 }}>
                {salesColumns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={salesColumns.length} className="py-12 text-center" style={{ color: MUTED }}>
                    No sales records found for this date.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => (
                  <tr key={sale.id} className="hover:bg-orange-50">
                    <td className="px-4 py-3" style={{ color: MUTED }}>{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CalendarOutlined style={{ color: ACCENT }} />
                        <span className="font-medium" style={{ color: TEXT }}>{sale.date}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Tag
                        className="rounded-full px-3 py-1"
                        style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                      >
                        {sale.product?.name || 'N/A'}
                      </Tag>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingCartOutlined style={{ color: FAINT }} />
                        <span className="font-semibold" style={{ color: TEXT }}>{sale.quantity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: ACCENT }}>
                        {formatCurrency(sale.total)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot>
                <tr style={{ background: PANEL_BG_2 }}>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold" style={{ color: TEXT }}>TOTAL:</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: ACCENT }}>{formatCurrency(totalSales)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionCard>

      {/* Footer */}
      <div className="mt-6 border-t border-orange-100 pt-4 text-center text-xs" style={{ color: MUTED }}>
        <p>Generated on {currentTime.toLocaleString()} | New Moon POS System</p>
      </div>

      {/* Print Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              <PrinterOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Print Sales Report</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Generate a printable report</p>
            </div>
          </div>
        }
        open={isPrintModalVisible}
        onOk={handlePrintReport}
        onCancel={() => setIsPrintModalVisible(false)}
        okText="Print"
        okButtonProps={{ className: "rounded-xl border-none bg-linear-to-br from-[#EA580C] via-[#F97316] to-[#F59E0B] text-white" }}
        cancelButtonProps={{ className: "rounded-xl" }}
        width={400}
        className="rounded-2xl"
      >
        <div className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
          <p className="mb-0 text-sm" style={{ color: "#9A3412" }}>
            <PrinterOutlined className="mr-2" />
            Print sales report for <strong>{branch?.name}</strong>?
          </p>
        </div>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          Date: {new Date(selectedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm" style={{ color: MUTED }}>
          Transactions: {filteredSales.length} | Total Sales: {formatCurrency(totalSales)}
        </p>
      </Modal>
    </PageShell>
  );
}

export default BranchDetails;