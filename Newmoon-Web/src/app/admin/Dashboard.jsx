import react, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
} from "antd";
import {
  PlusOutlined,
  ShopOutlined,
  StockOutlined,
  ProductOutlined,
  TeamOutlined,
  ReloadOutlined,
  WarningOutlined,
  ShoppingCartOutlined,
  FireOutlined,
  StarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  LineChartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  BarChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPesoSign } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/config/api";
import { getCache, setCache, invalidateCache } from "@/utils/cache";
import Loading from "@/components/Loading";

const DASHBOARD_ENDPOINTS = ["branches", "staff", "sales", "products"];

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branches, setBranches] = useState(() => getCache("branches") || []);
  const [products, setProducts] = useState(() => getCache("products") || []);
  const [staff, setStaff] = useState(() => getCache("staff") || []);
  const [sales, setSales] = useState(() => getCache("sales") || []);
  const [loading, setLoading] = useState(() => {
    return !getCache("branches") && !getCache("products");
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadError, setLoadError] = useState("");

  // ─── Sales Performance state ────────────────────────────────────
  const [salesPeriod, setSalesPeriod] = useState("month");

  // ─── Online Orders / Online Sales state ─────────────────────────
  const [onlineOverview, setOnlineOverview] = useState(null);
  const [onlinePeriod, setOnlinePeriod] = useState("week");
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState("");

  const [addBranchForm] = Form.useForm();

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const userName = currentUser.name || currentUser.username || "";

  // =========================================================
  // BACK BUTTON TRAP
  // =========================================================
  useEffect(() => {
    window.history.pushState(null, document.title, window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, document.title, window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, location]);

  // Philippine Time
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

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const inFlightRef = useRef(null);

  const loadDashboardData = useCallback(
    (forceRefresh = false) => {
      if (inFlightRef.current) return inFlightRef.current;

      const run = (async () => {
        const hasExisting = Boolean(getCache("branches") || getCache("products"));
        if (!hasExisting || forceRefresh) {
          setLoading(true);
        }
        setLoadError("");

        try {
          const results = await Promise.allSettled(
            DASHBOARD_ENDPOINTS.map((key) => {
              const cached = forceRefresh ? null : getCache(key);

              if (cached !== null) {
                return Promise.resolve({ key, data: cached });
              }

              return api.get(`/${key}`).then((res) => ({
                key,
                data: res.data?.data || res.data || [],
              }));
            })
          );

          const rejectedIdx = results.findIndex(
            (r) => r.status === "rejected"
          );

          if (rejectedIdx !== -1) {
            const reason = results[rejectedIdx].reason;
            const status = reason?.response?.status;

            const backendMessage =
              reason?.response?.data?.message ||
              reason?.response?.data?.error ||
              reason?.message;

            if (status === 401 || status === 419) {
              return;
            }

            throw new Error(
              `GET /${DASHBOARD_ENDPOINTS[rejectedIdx]} failed` +
              (status ? ` (HTTP ${status})` : "") +
              (backendMessage ? `: ${backendMessage}` : "")
            );
          }

          const dataMap = {};

          results.forEach((r) => {
            dataMap[r.value.key] = r.value.data;
          });

          const staffRows = (dataMap.staff || []).map((s) => {
            const assignments = Array.isArray(s.branchAssignments)
              ? s.branchAssignments
              : Array.isArray(s.branch_assignments)
                ? s.branch_assignments
                : [];

            const branchId =
              assignments?.[0]?.branch_id ||
              s.branch_id ||
              s.branchId ||
              null;

            return { ...s, branch_id: branchId };
          });

          const branchesData = dataMap.branches || [];
          const staffData = staffRows;
          const salesData = dataMap.sales || [];
          const productsData = dataMap.products || [];

          setBranches(branchesData);
          setStaff(staffData);
          setSales(salesData);
          setProducts(productsData);

          setCache("branches", branchesData);
          setCache("staff", staffData);
          setCache("sales", salesData);
          setCache("products", productsData);
        } catch (err) {
          const msg =
            err?.message || "Failed to load dashboard data from backend.";

          setLoadError(msg);
          message.error(msg);
        } finally {
          setLoading(false);
          inFlightRef.current = null;
        }
      })();

      inFlightRef.current = run;

      return run;
    },
    []
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ─── Online orders overview (live) ──────────────────────────────
  const loadOnlineOverview = useCallback(async (silent = false) => {
    try {
      if (!silent) setOnlineLoading(true);
      setOnlineError("");

      const { data } = await api.get("/admin/orders/overview", {
        params: { period: onlinePeriod },
      });

      setOnlineOverview(data);
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401 || status === 419) {
        return;
      }

      setOnlineError(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load online orders"
      );
    } finally {
      if (!silent) setOnlineLoading(false);
    }
  }, [onlinePeriod]);

  useEffect(() => {
    loadOnlineOverview(Boolean(onlineOverview));

    const interval = setInterval(() => loadOnlineOverview(true), 30000);
    return () => clearInterval(interval);
  }, [loadOnlineOverview]);

  const parseQuantity = (value) => {
    if (value === null || value === undefined || value === "") return 0;

    const n =
      typeof value === "string"
        ? parseFloat(value.replace(/,/g, ""))
        : Number(value);

    return Number.isFinite(n) ? n : 0;
  };

  const getBranchProductsCount = (branchId) => {
    const target = String(branchId);

    const total = products.reduce((sum, product) => {
      if (!product.product_stocks) return sum;

      const stock = product.product_stocks.find(
        (s) => String(s.branch_id) === target
      );

      return sum + parseQuantity(stock?.quantity);
    }, 0);

    return Math.round(total);
  };

  const getBranchProductCount = (branchId) => {
    const target = String(branchId);

    return products.filter((product) => {
      if (!product.product_stocks) return false;

      return product.product_stocks.some(
        (s) => String(s.branch_id) === target
      );
    }).length;
  };

  const getBranchStaffCount = (branchId) => {
    const target = String(branchId);

    return staff.filter((s) => {
      const assignments = Array.isArray(s.branchAssignments)
        ? s.branchAssignments
        : Array.isArray(s.branch_assignments)
          ? s.branch_assignments
          : [];

      if (assignments.length > 0) {
        return assignments.some((a) => {
          if (!a) return false;
          if (a.is_active === false) return false;

          return a.branch_id != null && String(a.branch_id) === target;
        });
      }

      if (s.branch_id == null || s.branch_id === "") return false;

      return String(s.branch_id) === target;
    }).length;
  };

  const handleAddBranch = async (values) => {
    try {
      const { data } = await api.post("/branches", {
        name: values.name,
        code: values.code,
        address: values.address,
      });

      setBranches((prev) => [...prev, data]);

      addBranchForm.resetFields();
      setIsModalOpen(false);

      invalidateCache("branches");

      message.success("Branch created successfully!");
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Failed to create branch"
      );
    }
  };

  const totalSales = sales.reduce(
    (sum, sale) => sum + parseFloat(sale.total || 0),
    0
  );

  const phDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const phToDate = (date) => new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const saleDateKey = (sale) =>
    String(sale.sale_date || sale.created_at || "").slice(0, 10);

  const todaySales = sales
    .filter((sale) => saleDateKey(sale) === phDateKey(currentTime))
    .reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);

  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  // ─── Total This Month ───────────────────────────────────────────
  const totalThisMonth = (() => {
    const now = currentTime;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthSales = (sales || []).filter((s) => {
      const d = new Date(s.sale_date || s.created_at);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth
      );
    });

    const sum = monthSales.reduce((acc, s) => acc + parseFloat(s.total || 0), 0);
    return sum > 0 ? sum : totalSales;
  })();

  // ─── Derived salesChartData (Monthly: Jan - Dec) ────────────────
  const salesChartData = (() => {
    const now = currentTime;
    const currentYear = now.getFullYear();

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    let targetYear = currentYear;
    if (sales && sales.length > 0) {
      const hasCurrentYear = sales.some((s) => {
        const d = new Date(s.sale_date || s.created_at);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === currentYear;
      });
      if (!hasCurrentYear) {
        const latestDate = sales.reduce((latest, s) => {
          const d = new Date(s.sale_date || s.created_at);
          return !Number.isNaN(d.getTime()) && (!latest || d > latest) ? d : latest;
        }, null);
        if (latestDate) targetYear = latestDate.getFullYear();
      }
    }

    const buckets = monthNames.map((name, index) => ({
      key: index,
      label: name,
      amount: 0,
    }));

    (sales || []).forEach((s) => {
      const dateStr = s.sale_date || s.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() === targetYear) {
        const m = d.getMonth();
        if (buckets[m]) {
          buckets[m].amount += parseFloat(s.total || 0);
        }
      }
    });

    return buckets;
  })();

  // ─── Derived bestSellers ────────────────────────────────────────
  const bestSellers = (() => {
    const map = new Map();

    sales.forEach((sale) => {
      const items =
        sale.items ||
        sale.sale_items ||
        sale.order_items ||
        sale.products ||
        [];

      if (!Array.isArray(items) || items.length === 0) return;

      items.forEach((item) => {
        const name =
          item.product_name ||
          item.name ||
          item.product?.name ||
          "Unknown item";
        const qty = parseQuantity(item.quantity || item.qty || 1);
        const price = parseFloat(item.price || item.unit_price || 0);
        const revenue = parseFloat(item.subtotal || qty * price || 0);

        if (!map.has(name)) {
          map.set(name, { name, qty: 0, revenue: 0 });
        }
        const entry = map.get(name);
        entry.qty += qty;
        entry.revenue += revenue;
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  })();

  // ─── Derived recentActivity ─────────────────────────────────────
  const recentActivity = (() => {
    const events = [];

    sales.slice(0, 20).forEach((s) => {
      const branch = branches.find(
        (b) => String(b.id) === String(s.branch_id)
      );
      events.push({
        kind: "order",
        ts: new Date(s.created_at),
        text: `New sale recorded`,
        detail: formatCurrency(parseFloat(s.total || 0)),
        branch: branch?.name || null,
      });
    });

    return events
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);
  })();

  const navigateTo = (path) => navigate(path);

  // ─── Palette — light warm cream + orange ─────────────────────────
  const PAGE_BG = "#FFF7ED";
  const PANEL_BG = "#FFFFFF";
  const PANEL_BG_2 = "#FFF7ED";
  const BORDER = "rgba(234,88,12,0.10)";
  const TEXT = "#292524";
  const MUTED = "#78716C";
  const FAINT = "#A8A29E";
  const ACCENT = "#EA580C";
  const ACCENT_DEEP = "#F97316";
  const ACCENT_SOFT = "rgba(234,88,12,0.12)";
  const AMBER = "#D97706";
  const AMBER_SOFT = "rgba(217,119,6,0.12)";
  const GREEN = "#16A34A";
  const GREEN_SOFT = "rgba(22,163,74,0.12)";
  const RED = "#EF4444";
  const RED_SOFT = "rgba(239,68,68,0.15)";

  // ─── Online orders derived data ─────────────────────────────────
  const OVERVIEW_STATUS = [
    { key: "pending", label: "Pending", color: "#F59E0B" },
    { key: "confirmed", label: "Confirmed", color: "#38BDF8" },
    { key: "preparing", label: "Preparing", color: "#FB923C" },
    { key: "ready", label: "Ready", color: "#D97706" },
    { key: "picked_up", label: "Picked Up", color: "#A78BFA" },
    { key: "out_for_delivery", label: "Out for Delivery", color: "#F97316" },
    { key: "delivered", label: "Delivered", color: GREEN },
    { key: "cancelled", label: "Cancelled", color: RED },
  ];

  const overviewStatus = onlineOverview?.status_counts || {};
  const overviewSummary = onlineOverview?.summary || {};
  const recentOnlineOrders = onlineOverview?.recent_orders || [];
  const onlineChart = onlineOverview?.chart || [];

  const onlineStatusColor = (status) => {
    const meta = OVERVIEW_STATUS.find((s) => s.key === status);
    return meta ? meta.color : MUTED;
  };

  const onlineStatusLabel = (status) => {
    const meta = OVERVIEW_STATUS.find((s) => s.key === status);
    return meta ? meta.label : status;
  };

  const onlineChartHasData = onlineChart.some(
    (d) => Number(d.orders) > 0 || Number(d.revenue) > 0
  );

  // ─── Dashboard view ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* PAGE TITLE */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 px-6 py-7 shadow-[0_20px_50px_rgba(67,20,7,0.20)] sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[100px] leading-none text-white/5">
          <ShopOutlined />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}
            {userName ? <>, <span className="text-orange-400">{userName}</span></> : ""}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Welcome back to NewMoon Lechon Manok and Liempo House!
          </p>
        </div>
      </section>

      {/* KPI CARDS */}
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div
          onClick={() => navigateTo("/branch-map")}
          className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: BORDER }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ShopOutlined />
            </div>
            <div>
              <p className="text-stone-900 font-bold text-2xl">{branches.length}</p>
              <p className="text-xs text-stone-500">Total Branches</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigateTo("/staff")}
          className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: BORDER }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <TeamOutlined />
            </div>
            <div>
              <p className="text-stone-900 font-bold text-2xl">{staff.length}</p>
              <p className="text-xs text-stone-500">Total Staff</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigateTo("/sales")}
          className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: BORDER }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <FontAwesomeIcon icon={faPesoSign} />
            </div>
            <div>
              <p className="text-stone-900 font-bold text-2xl">{formatCurrency(todaySales)}</p>
              <p className="text-xs text-stone-500">Today&apos;s Sales</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigateTo("/sales")}
          className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: BORDER }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <StarOutlined />
            </div>
            <div>
              <p className="text-stone-900 font-bold text-2xl">{formatCurrency(totalSales)}</p>
              <p className="text-xs text-stone-500">Total Sales</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigateTo("/delivery")}
          className="cursor-pointer rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: BORDER }}
          onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
          onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ShoppingCartOutlined />
            </div>
            <div>
              <p className="text-stone-900 font-bold text-2xl">{overviewSummary.total_orders ?? 0}</p>
              <p className="text-xs text-stone-500">Online Orders</p>
            </div>
          </div>
        </div>
      </section>

      {/* ERROR */}
      {loadError && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <WarningOutlined className="mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* SALES PERFORMANCE */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-orange-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Sales performance</h2>
            <p className="text-xs text-stone-500">Revenue across all branches</p>
          </div>
          <button
            onClick={() => navigateTo("/sales")}
            className="flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs font-bold text-orange-600 transition-opacity hover:opacity-75"
          >
            View report <span className="text-[10px]">›</span>
          </button>
        </div>

        <div className="px-5 pt-5">
          <p className="text-xs font-medium text-stone-500">Total this month</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-3xl font-bold tracking-tight text-stone-900">
              {formatCurrency(totalThisMonth)}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
              <RiseOutlined /> 8.6%
            </span>
          </div>
        </div>

        <div className="h-72 p-5 pt-2">
          {salesChartData.every((d) => d.amount === 0) ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                <RiseOutlined style={{ fontSize: 20 }} />
              </div>
              <p className="text-base font-semibold text-stone-700">No sales in this period</p>
              <p className="mt-1 text-sm text-stone-400">Sales will appear here once recorded</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (value === 0) return "P0";
                    if (value >= 1000) return `P${value / 1000}K`;
                    return `P${value}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(234, 88, 12, 0.05)' }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]}
                  contentStyle={{
                    borderRadius: 10,
                    border: `1px solid ${BORDER}`,
                    background: PANEL_BG_2,
                    color: TEXT,
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ color: MUTED, fontWeight: 600, marginBottom: 4 }}
                />
                <Bar
                  dataKey="amount"
                  fill="#EA580C"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ONLINE ORDERS + ONLINE SALES */}
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Online Orders Tracker */}
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <TruckOutlined />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Online Orders</h2>
                <p className="text-xs text-stone-500">Live customer orders from the app</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                <SyncOutlined spin={onlineLoading} />
                Live · 30s
              </span>
              <button
                type="button"
                onClick={() => loadOnlineOverview()}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-stone-500 transition-colors hover:text-orange-600"
                onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = MUTED; }}
              >
                <ReloadOutlined />
              </button>
            </div>
          </div>

          <div className="p-4">
            {onlineError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <WarningOutlined className="mr-2" />
                {onlineError}
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OVERVIEW_STATUS.map((s) => (
                <div
                  key={s.key}
                  className="rounded-xl border border-orange-100 bg-orange-50/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold leading-none" style={{ color: s.color }}>
                      {overviewStatus[s.key] || 0}
                    </span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                    />
                  </div>
                  <p className="mt-2 truncate text-[11px] font-medium text-stone-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                <p className="text-lg font-bold leading-none text-orange-600">
                  {overviewSummary.active_orders ?? 0}
                </p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Active Orders</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-lg font-bold leading-none text-amber-700">
                  {overviewSummary.today_orders ?? 0}
                </p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Today&apos;s Orders</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-lg font-bold leading-none text-amber-700">
                  {formatCurrency(overviewSummary.today_revenue ?? 0)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Today&apos;s Revenue</p>
              </div>
              <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="text-lg font-bold leading-none text-green-600">
                  {formatCurrency(overviewSummary.delivered_revenue ?? 0)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-stone-500">Delivered Revenue</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500">
                  Recent Online Orders
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo("/delivery")}
                  className="cursor-pointer border-none bg-transparent text-xs font-semibold text-orange-600 transition-opacity"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  View All →
                </button>
              </div>

              {recentOnlineOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                    <TruckOutlined style={{ fontSize: 20 }} />
                  </div>
                  <p className="text-base font-semibold text-stone-700">No online orders yet</p>
                  <p className="mt-1 text-sm text-stone-400">
                    Customer app orders will appear here
                  </p>
                </div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-auto pr-1">
                  {recentOnlineOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/40 p-2.5"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
                        style={{ background: `${onlineStatusColor(o.status)}1a`, color: onlineStatusColor(o.status) }}
                      >
                        {o.order_number?.replace("ORD-", "").slice(-5)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-stone-700">
                          {o.customer_name}
                        </p>
                        <p className="truncate text-[11px] text-stone-500">
                          {o.branch_name} · {o.payment_method?.toUpperCase()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-amber-700">
                          {formatCurrency(o.total)}
                        </p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${onlineStatusColor(o.status)}1a`, color: onlineStatusColor(o.status) }}
                        >
                          {onlineStatusLabel(o.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Online Sales Chart */}
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <LineChartOutlined />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Online Sales</h2>
                <p className="text-xs text-stone-500">
                  Revenue and order volume from app orders
                </p>
              </div>
            </div>

            <div className="flex w-fit rounded-xl border border-orange-100 bg-orange-50 p-0.5">
              {["today", "week", "month"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setOnlinePeriod(p)}
                  className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                  style={
                    onlinePeriod === p
                      ? { background: AMBER, color: "#FFFFFF" }
                      : { color: MUTED, background: "transparent" }
                  }
                  onMouseEnter={(e) => {
                    if (onlinePeriod !== p) e.currentTarget.style.color = AMBER;
                  }}
                  onMouseLeave={(e) => {
                    if (onlinePeriod !== p) e.currentTarget.style.color = MUTED;
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 p-4">
            {!onlineChartHasData ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                  <RiseOutlined style={{ fontSize: 20 }} />
                </div>
                <p className="text-base font-semibold text-stone-700">
                  No online sales in this period
                </p>
                <p className="mt-1 text-sm text-stone-400">
                  App orders will appear here once placed
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={onlineChart}
                  margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="onlineRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: MUTED }}
                    axisLine={{ stroke: BORDER }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="revenue"
                    tick={{ fontSize: 10, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    width={30}
                    tick={{ fontSize: 10, fill: MUTED }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Revenue"
                        ? formatCurrency(Number(value) || 0)
                        : Number(value) || 0
                    }
                    contentStyle={{
                      borderRadius: 10,
                      border: `1px solid ${BORDER}`,
                      background: PANEL_BG_2,
                      color: TEXT,
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                    }}
                    labelStyle={{ color: MUTED }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: MUTED }} />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    name="Orders"
                    fill={ACCENT_DEEP}
                    radius={[3, 3, 0, 0]}
                    barSize={9}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={AMBER}
                    strokeWidth={2}
                    fill="url(#onlineRevenueFill)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* BEST SELLERS */}
      <div className="mb-6">
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <FireOutlined />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Today&apos;s Best Sellers</h2>
                <p className="text-xs text-stone-500">Most-ordered items across all sales</p>
              </div>
            </div>
            <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              {bestSellers.length} items
            </span>
          </div>

          <div className="p-4">
            {bestSellers.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                  <FireOutlined style={{ fontSize: 20 }} />
                </div>
                <p className="text-base font-semibold text-stone-700">No sales yet</p>
                <p className="mt-1 text-sm text-stone-400">Ordered items will be ranked here</p>
              </div>
            ) : (
              <div>
                {bestSellers.map((b, i) => (
                  <div
                    key={b.name}
                    className="flex items-center gap-3 py-3"
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${BORDER}` }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={
                        i === 0
                          ? { background: ACCENT, color: "#FFFFFF" }
                          : { background: ACCENT_SOFT, color: ACCENT }
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-700">{b.name}</p>
                      <p className="text-xs text-stone-500">{b.qty} sold</p>
                    </div>
                    <div className="text-sm font-bold text-orange-600">
                      {formatCurrency(b.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* RECENT ACTIVITY (full width now) */}
      <div className="mb-6">
        <section className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <ClockCircleOutlined />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Recent Activity</h2>
                <p className="text-xs text-stone-500">Latest Branches sales</p>
              </div>
            </div>
            <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              {recentActivity.length} events
            </span>
          </div>

          <div className="p-4">
            {recentActivity.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                  <ClockCircleOutlined style={{ fontSize: 20 }} />
                </div>
                <p className="text-base font-semibold text-stone-700">No recent activity</p>
              </div>
            ) : (
              <div className="relative space-y-0">
                {recentActivity.map((e, i) => (
                  <div key={i} className="relative flex gap-3 pb-4">
                    {i < recentActivity.length - 1 && (
                      <span
                        className="absolute top-5 h-full w-px"
                        style={{ left: 9, background: BORDER }}
                      />
                    )}
                    <span
                      className="mt-1.5 flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        border: `2px solid ${e.kind === "order" ? ACCENT : AMBER}`,
                        background: PANEL_BG,
                        boxShadow: `0 0 0 3px ${ACCENT_SOFT}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-stone-700">
                          {e.text}
                        </span>
                        <span className="shrink-0 text-[11px] text-stone-500">
                          {e.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-semibold text-orange-600">{e.detail}</span>
                        {e.branch ? <span>· {e.branch}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* BRANCH SECTION HEADER */}
      <section className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <ShopOutlined />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Branches</h2>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Manage and monitor each NewMoon branch&apos;s performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex w-fit items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
            </div>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                addBranchForm.resetFields();
                setIsModalOpen(true);
              }}
              className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-none! hover:brightness-110!"
            >
              Add Branch
            </Button>
          </div>
        </div>
      </section>

      {/* BRANCHES GRID */}
      {loading ? (
        <div className="rounded-2xl border border-orange-100 bg-white py-16 shadow-sm">
          <Loading text="Loading branches..." />
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
            <ShopOutlined style={{ fontSize: 20 }} />
          </div>
          <h3 className="text-base font-semibold text-stone-700">No branches yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-400">
            Start building your NewMoon operations by adding your first branch.
          </p>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              addBranchForm.resetFields();
              setIsModalOpen(true);
            }}
            className="mt-5! h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-none! hover:brightness-110!"
          >
            Add Your First Branch
          </Button>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {branches.map((branch) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={branch.id}>
              <div
                onClick={() => navigateTo(`/branch/${branch.id}`)}
                className="group h-full cursor-pointer overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: BORDER }}
                onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <div className="relative overflow-hidden border-b border-orange-100 bg-[#FFF7ED] px-5 py-5">
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                      <ShopOutlined />
                    </div>
                    <div className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                      Branch
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-5">
                    <h3 className="truncate text-lg font-bold text-stone-900">{branch.name}</h3>
                    {branch.code && (
                      <span className="mt-1 inline-flex rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                        #{branch.code}
                      </span>
                    )}
                    {branch.address && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
                        {branch.address}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-orange-50/50 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        <StockOutlined className="text-orange-600" />
                        Stock
                      </span>
                      <span className="rounded-lg border border-orange-100 bg-white px-2.5 py-1 text-xs font-bold text-stone-700">
                        {getBranchProductsCount(branch.id)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-orange-50/50 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        <TeamOutlined className="text-amber-600" />
                        Staff
                      </span>
                      <span className="rounded-lg border border-orange-100 bg-white px-2.5 py-1 text-xs font-bold text-stone-700">
                        {getBranchStaffCount(branch.id)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-orange-50/50 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-xs font-medium text-stone-500">
                        <ProductOutlined className="text-stone-400" />
                        Products
                      </span>
                      <span className="rounded-lg border border-orange-100 bg-white px-2.5 py-1 text-xs font-bold text-stone-700">
                        {getBranchProductCount(branch.id)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-right text-[11px] font-medium text-stone-400">
                    View branch →
                  </p>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {/* ADD BRANCH MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <PlusOutlined />
            </div>
            <div>
              <p className="font-bold text-stone-900">Add New Branch</p>
              <p className="text-xs font-normal text-stone-500">
                Add a NewMoon business location
              </p>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          addBranchForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <div className="mb-5 mt-2 rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="mb-0 text-xs leading-5 text-orange-700">
            <InfoCircleOutlined className="mr-2" />
            This branch information will be visible to staff members and customers.
          </p>
        </div>

        <Form form={addBranchForm} layout="vertical" onFinish={handleAddBranch}>
          <Form.Item
            label={<span className="text-sm font-semibold text-stone-700">Branch Name</span>}
            name="name"
            rules={[{ required: true, message: "Branch name is required" }]}
          >
            <Input
              placeholder="Enter branch name"
              className="h-11! rounded-xl! border-stone-300 hover:border-orange-300!"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-sm font-semibold text-stone-700">Branch Code</span>}
            name="code"
            rules={[{ required: true, message: "Branch code is required" }]}
          >
            <Input
              placeholder="Example: MAIN"
              className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-sm font-semibold text-stone-700">Branch Address</span>}
            name="address"
            rules={[{ required: true, message: "Branch address is required" }]}
          >
            <Input.TextArea
              placeholder="Enter complete branch address"
              rows={3}
              className="rounded-xl! hover:border-orange-300! focus:border-orange-500!"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  addBranchForm.resetFields();
                }}
                className="h-11! rounded-xl! px-5!"
              >
                Cancel
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! text-white! shadow-none! hover:brightness-110!"
              >
                Create Branch
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Dashboard;