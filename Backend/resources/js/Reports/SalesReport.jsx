import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Statistic,
  Tag,
  Tooltip,
  Divider,
  Radio,
} from "antd";
import {
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PrinterOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";
import Loading from "../components/Loading";
import { clientPagination, serverPagination } from "../components/Pagination";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

import { useAuth } from "../hooks/useAuth";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ---------- Philippine Peso formatter ----------
const peso = (v) =>
  `₱${Number(v || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ---------- Palette — light warm-cream + orange ----------
const PANEL_BG_2 = "#FFEDD5";
const BORDER = "#FFEDD5";
const TEXT = "#292524";
const MUTED = "#78716C";
const ACCENT = "#EA580C";
const AMBER = "#F59E0B";

const SalesReport = () => {
  // ---------- Auth ----------
  const { user, isAdmin } = useAuth();
  const userBranchId = user?.branch_id || null;

  // ---------- State ----------
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [branchRows, setBranchRows] = useState([]);           // ← one row per branch
  const [branchSummary, setBranchSummary] = useState(null);   // ← top branch etc.
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [groupBy, setGroupBy] = useState("daily");
  const [selectedBranch, setSelectedBranch] = useState(null); // ← null = ALL branches
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 7,
    total: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // ---------- Fetch report ----------
  const fetchSalesReport = async (page = 1) => {
    setLoading(true);
    try {
      // Params for the main /reports/sales call (grouped or detail)
      const params = {
        start_date: dateRange[0].format("YYYY-MM-DD"),
        end_date: dateRange[1].format("YYYY-MM-DD"),
        group_by: groupBy,
        page: page,
        per_page: pagination.pageSize,
      };

      if (!isAdmin) {
        params.branch_id = userBranchId;
      } else if (selectedBranch) {
        params.branch_id = selectedBranch;
      }
      // admin + selectedBranch === null → omit branch_id → all branches

      // Params for the branches summary endpoint
      const branchParams = {
        start_date: dateRange[0].format("YYYY-MM-DD"),
        end_date: dateRange[1].format("YYYY-MM-DD"),
      };
      if (!isAdmin) branchParams.branch_id = userBranchId;
      else if (selectedBranch) branchParams.branch_id = selectedBranch;

      // Params for the KPI summary endpoint
      const summaryParams = { ...branchParams };

      const [salesRes, branchesRes, branchSumRes, kpiRes] = await Promise.all([
        api.get("/reports/sales", { params }),
        api.get("/branches"),
        api
          .get("/reports/sales/branches", { params: branchParams })
          .catch((err) => {
            console.error("[SalesReport] branch comparison failed", err?.response?.status, err?.response?.data);
            return { data: { data: [], summary: null } };
          }),
        api
          .get("/reports/sales/summary", { params: summaryParams })
          .catch((err) => {
            console.error("[SalesReport] KPI summary failed", err?.response?.status, err?.response?.data);
            return { data: null };
          }),
      ]);

      // Branches list for the selector
      setBranches(
        Array.isArray(branchesRes.data)
          ? branchesRes.data
          : branchesRes.data?.data || []
      );

      // Main table data
      const data = salesRes.data || {};
      setSalesData(data.data || []);

      // All-8-branches comparison
      setBranchRows(branchSumRes.data?.data || []);
      setBranchSummary(branchSumRes.data?.summary || null);

      // KPI summary from dedicated endpoint
      if (kpiRes.data && typeof kpiRes.data === "object") {
        setSummary({
          total_revenue: kpiRes.data.net_sales || 0,
          total_sales: kpiRes.data.total_sales || 0,
          subtotal: kpiRes.data.subtotal || 0,
          total_discounts: kpiRes.data.total_discounts || 0,
          net_sales: kpiRes.data.net_sales || 0,
          total_transactions: kpiRes.data.total_transactions || 0,
          products_sold: kpiRes.data.products_sold || 0,
          avg_transaction: kpiRes.data.avg_transaction || 0,
          best_selling_product: kpiRes.data.best_selling_product || null,
          top_branch: kpiRes.data.top_branch || null,
          growth: kpiRes.data.growth ?? null,
          branch_count: kpiRes.data.branch_count || 0,
        });
      } else {
        // Fallback to whatever the grouped endpoint returned
        const summaryData = data.summary || {};
        setSummary({
          total_revenue: summaryData.total_sales || summaryData.total_revenue || 0,
          total_transactions: summaryData.total_transactions || 0,
          avg_transaction:
            (summaryData.total_transactions || 0) > 0
              ? (summaryData.total_sales || 0) / summaryData.total_transactions
              : 0,
          growth: null,
        });
      }

      // Pagination
      if (data.pagination) {
        setPagination({
          current: data.pagination.current_page,
          pageSize: data.pagination.per_page,
          total: data.pagination.total,
        });
      } else {
        setPagination({
          current: 1,
          pageSize: 7,
          total: data.data?.length || 0,
        });
      }
    } catch (err) {
      console.error("[SalesReport] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Auto-fetch on filter change ----------
  useEffect(() => {
    fetchSalesReport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, groupBy, selectedBranch, userBranchId, isAdmin]);

  // ---------- 6-month trend ----------
 // ---------- 6-month trend ----------
useEffect(() => {
  const fetchTrend = async () => {
    setTrendLoading(true);
    try {
      const end = dayjs().endOf("month");
      const start = dayjs().subtract(5, "month").startOf("month");

      const params = {
        start_date: start.format("YYYY-MM-DD"),
        end_date: end.format("YYYY-MM-DD"),
        group_by: "monthly",
      };
      if (!isAdmin) params.branch_id = userBranchId;
      else if (selectedBranch) params.branch_id = selectedBranch;

      const res = await api.get("/reports/sales", { params });
      const raw = res.data?.data || [];

      // Build a lookup of period -> total_sales from the API
      const byPeriod = {};
      raw.forEach((row) => {
        // normalize "2026-09" or "2026-09-01" to "YYYY-MM"
        const key = String(row.period || "").slice(0, 7);
        byPeriod[key] = Number(row.total_sales) || 0;
      });

      // Always generate the last 6 months (oldest → newest)
      const formatted = [];
      for (let i = 5; i >= 0; i--) {
        const d = dayjs().subtract(i, "month");
        const key = d.format("YYYY-MM");
        formatted.push({
          month: d.format("MMM YYYY"),
          sales: byPeriod[key] || 0,
        });
      }

      setTrendData(formatted);
    } catch (err) {
      console.error("[SalesReport] Trend fetch error:", err);
    } finally {
      setTrendLoading(false);
    }
  };
  fetchTrend();
}, [selectedBranch, userBranchId, isAdmin]);

  // ---------- Table pagination ----------
  const handleTableChange = (p) => {
    fetchSalesReport(p.current);
  };

  // ---------- Export CSV ----------
  const handleExport = () => {
    let csvContent = "";
    if (groupBy === "detail") {
      csvContent = [
        ["Date", "Invoice", "Customer", "Items", "Total", "Payment Method", "Branch"],
        ...salesData.map((row) => [
          dayjs(row.created_at || row.sale_date).format("YYYY-MM-DD HH:mm"),
          row.invoice_number,
          row.customer_name,
          row.items_count,
          row.total,
          row.payment_method,
          row.branch?.name || row.branch_name,
        ]),
      ]
        .map((e) => e.join(","))
        .join("\n");
    } else if (groupBy === "branch") {
      csvContent = [
        ["Branch", "Transactions", "Products Sold", "Gross Sales", "Discounts", "Net Sales"],
        ...branchRows.map((row) => [
          row.branch_name,
          row.total_transactions,
          row.products_sold,
          row.gross_sales,
          row.discounts,
          row.net_sales,
        ]),
      ]
        .map((e) => e.join(","))
        .join("\n");
    } else {
      csvContent = [
        ["Period", "Transactions", "Total Sales", "Items Sold"],
        ...salesData.map((row) => [
          row.period,
          row.transaction_count,
          row.total_sales,
          row.total_items,
        ]),
      ]
        .map((e) => e.join(","))
        .join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NewMoon_Sales_${groupBy}_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ---------- Print report ----------
  const handlePrint = () => {
    const branchLabel = selectedBranch
      ? branches.find((b) => b.id === selectedBranch)?.name
      : "All Branches";

    const branchTotalNet = branchRows.reduce(
      (sum, r) => sum + Number(r.net_sales || 0),
      0
    );
    const branchTotalGross = branchRows.reduce(
      (sum, r) => sum + Number(r.gross_sales || 0),
      0
    );
    const branchTotalDiscounts = branchRows.reduce(
      (sum, r) => sum + Number(r.discounts || 0),
      0
    );
    const branchTotalTx = branchRows.reduce(
      (sum, r) => sum + Number(r.total_transactions || 0),
      0
    );
    const branchTotalProducts = branchRows.reduce(
      (sum, r) => sum + Number(r.products_sold || 0),
      0
    );

    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>New Moon Sales Report</title>
          <style>
            body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1c1917}
            h1{color:#EA580C;margin:0}
            h2{margin:4px 0 16px;color:#78350f;font-weight:500}
            h3{margin-top:24px;color:#78350f}
            p{margin:4px 0;font-size:13px}
            .kpi{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
            .kpi div{border:1px solid #fed7aa;padding:10px 16px;border-radius:8px;background:#FFF7ED;min-width:150px}
            .kpi small{color:#78716c;display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
            .kpi b{display:block;color:#EA580C;font-size:18px;margin-top:4px}
            table{width:100%;border-collapse:collapse;margin-top:12px}
            th,td{border:1px solid #e7e5e4;padding:6px 8px;font-size:12.5px}
            th{background:#FFF1E6;text-align:left;color:#7c2d12}
            tfoot td{background:#FFF7ED;font-weight:bold}
            .footer{margin-top:32px;font-size:11px;color:#a8a29e;text-align:center}
          </style>
        </head>
        <body>
          <h1>NEW MOON LECHON MANOK &amp; LIEMPO</h1>
          <h2>SALES REPORT</h2>
          <p><b>Report Period:</b> ${dateRange[0].format("MMM DD, YYYY")} — ${dateRange[1].format("MMM DD, YYYY")}</p>
          <p><b>Branch:</b> ${branchLabel}</p>
          <p><b>Generated:</b> ${dayjs().format("MMM DD, YYYY HH:mm")}</p>

          <div class="kpi">
            <div><small>Total Transactions</small><b>${summary?.total_transactions || 0}</b></div>
            <div><small>Products Sold</small><b>${summary?.products_sold || 0}</b></div>
            <div><small>Gross Sales</small><b>${peso(summary?.total_sales || summary?.subtotal)}</b></div>
            <div><small>Discounts</small><b>${peso(summary?.total_discounts)}</b></div>
            <div><small>Net Sales</small><b>${peso(summary?.net_sales)}</b></div>
            <div><small>Avg Transaction</small><b>${peso(summary?.avg_transaction)}</b></div>
          </div>

          <h3>Branch Comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Transactions</th>
                <th>Products Sold</th>
                <th>Gross Sales</th>
                <th>Discounts</th>
                <th>Net Sales</th>
              </tr>
            </thead>
            <tbody>
              ${branchRows
                .map(
                  (r) => `
                <tr>
                  <td>${r.branch_name}</td>
                  <td align="right">${r.total_transactions}</td>
                  <td align="right">${r.products_sold}</td>
                  <td align="right">${peso(r.gross_sales)}</td>
                  <td align="right">${peso(r.discounts)}</td>
                  <td align="right">${peso(r.net_sales)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td>ALL BRANCHES</td>
                <td align="right">${branchTotalTx}</td>
                <td align="right">${branchTotalProducts}</td>
                <td align="right">${peso(branchTotalGross)}</td>
                <td align="right">${peso(branchTotalDiscounts)}</td>
                <td align="right">${peso(branchTotalNet)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            This report was generated automatically by the NewMoon Management System.
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // ---------- Table columns ----------
  const groupedColumns = [
    {
      title: "Period",
      dataIndex: "period",
      key: "period",
      render: (period) => <Text strong>{period}</Text>,
    },
    {
      title: "Transactions",
      dataIndex: "transaction_count",
      key: "transaction_count",
      align: "center",
    },
    {
      title: "Total Sales",
      dataIndex: "total_sales",
      key: "total_sales",
      render: (total) => (
        <Text strong style={{ color: "#EA580C" }}>
          {peso(total)}
        </Text>
      ),
    },
    {
      title: "Items Sold",
      dataIndex: "total_items",
      key: "total_items",
      align: "center",
    },
    {
      title: "Avg / Transaction",
      key: "avg_transaction",
      render: (_, record) => {
        const avg =
          record.transaction_count > 0
            ? record.total_sales / record.transaction_count
            : 0;
        return peso(avg);
      },
    },
  ];

  const detailColumns = [
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      sorter: (a, b) =>
        dayjs(a.created_at || a.sale_date).unix() -
        dayjs(b.created_at || b.sale_date).unix(),
      render: (date, record) =>
        dayjs(date || record.sale_date).format("MMM DD, YYYY HH:mm"),
    },
    {
      title: "Invoice",
      dataIndex: "invoice_number",
      key: "invoice_number",
      render: (invoice, record) => (
        <Text strong>{invoice || `#${record.id}`}</Text>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (v) => v || "-",
    },
    {
      title: "Items",
      dataIndex: "items",
      key: "items",
      render: (items) => {
        if (!items || items.length === 0) return "-";
        return (
          <Tooltip
            title={items
              .map((i) => `${i.product?.name || "N/A"} x${i.quantity}`)
              .join("\n")}
          >
            <Tag>
              {items.length === 1
                ? items[0].product?.name || "N/A"
                : `${items[0].product?.name || "N/A"} +${items.length - 1}`}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      sorter: (a, b) => a.total - b.total,
      render: (total) => (
        <Text strong style={{ color: "#EA580C" }}>
          {peso(total)}
        </Text>
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method) => <Tag color="orange">{method || "-"}</Tag>,
    },
    {
      title: "Branch",
      dataIndex: ["branch", "name"],
      key: "branch_name",
      render: (name, record) => name || record.branch_name || "-",
    },
  ];

  const branchColumns = [
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      render: (name, record) => (
        <Space>
          <Text strong>{name}</Text>
          {branchRows[0]?.branch_id === record.branch_id &&
            Number(record.net_sales) > 0 && (
              <Tag color="orange" icon={<TrophyOutlined />}>
                Top
              </Tag>
            )}
        </Space>
      ),
    },
    {
      title: "Transactions",
      dataIndex: "total_transactions",
      key: "total_transactions",
      align: "center",
      sorter: (a, b) => a.total_transactions - b.total_transactions,
    },
    {
      title: "Products Sold",
      dataIndex: "products_sold",
      key: "products_sold",
      align: "center",
      sorter: (a, b) => a.products_sold - b.products_sold,
    },
    {
      title: "Gross Sales",
      dataIndex: "gross_sales",
      key: "gross_sales",
      sorter: (a, b) => a.gross_sales - b.gross_sales,
      render: (v) => (
        <Text strong style={{ color: "#B45309" }}>
          {peso(v)}
        </Text>
      ),
    },
    {
      title: "Discounts",
      dataIndex: "discounts",
      key: "discounts",
      sorter: (a, b) => a.discounts - b.discounts,
      render: (v) => <Text type="danger">-{peso(v)}</Text>,
    },
    {
      title: "Net Sales",
      dataIndex: "net_sales",
      key: "net_sales",
      sorter: (a, b) => a.net_sales - b.net_sales,
      render: (v) => (
        <Text strong style={{ color: "#EA580C" }}>
          {peso(v)}
        </Text>
      ),
    },
    {
      title: "Avg / Transaction",
      key: "avg_transaction",
      render: (_, record) => {
        const tx = Number(record.total_transactions || 0);
        const net = Number(record.net_sales || 0);
        return peso(tx > 0 ? net / tx : 0);
      },
    },
  ];

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* =========================================================
          HERO HEADER
      ========================================================= */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-10 text-[180px] leading-none text-orange-500/5">
          <BarChartOutlined />
        </div>
        <div className="absolute left-0 right-0 top-0 h-1 bg-linear-to-r from-[#EA580C] via-[#F97316] to-amber" />

        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                <BarChartOutlined />
                Financial Reports · All Branches
              </div>

              <Title
                level={1}
                className="mb-0 mt-0 max-w-3xl text-3xl! font-extrabold! tracking-tight! text-white! sm:text-4xl! lg:text-5xl!"
              >
                Sales <span className="text-orange-400">Report</span>
              </Title>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Consolidated sales from all 8 branches — accurate, centralized,
                no manual computation.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  className="h-11! rounded-xl! border-white/15! bg-white/5! px-5! font-medium! text-white! backdrop-blur transition-all duration-300 hover:border-orange-300! hover:bg-white/10! hover:text-orange-300!"
                >
                  Export CSV
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  className="h-11! rounded-xl! border-white/15! bg-white/5! px-5! font-medium! text-white! backdrop-blur transition-all duration-300 hover:border-orange-300! hover:bg-white/10! hover:text-orange-300!"
                >
                  Print Report
                </Button>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={() => fetchSalesReport(1)}
                  loading={loading}
                  className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! transition-all duration-300 hover:from-orange-700! hover:to-amber-600!"
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          {summary && (
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {/* Total Sales */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Statistic
                      title="Total Sales"
                      value={summary.net_sales || 0}
                      styles={{
                        title: { color: "rgba(255,255,255,0.45)" },
                        content: { color: "#EA580C", fontSize: 22 },
                      }}
                      formatter={(value) => peso(value)}
                    />
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
                    <RiseOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Total Orders */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Statistic
                      title="Total Orders"
                      value={summary.total_transactions || 0}
                      styles={{
                        title: { color: "rgba(255,255,255,0.45)" },
                        content: { color: "#D97706", fontSize: 22 },
                      }}
                    />
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <ShoppingOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Products Sold */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Statistic
                      title="Products Sold"
                      value={summary.products_sold || 0}
                      styles={{
                        title: { color: "rgba(255,255,255,0.45)" },
                        content: { color: "#F59E0B", fontSize: 22 },
                      }}
                    />
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <ShoppingOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Avg Transaction */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Statistic
                      title="Avg Transaction"
                      value={summary.avg_transaction || 0}
                      styles={{
                        title: { color: "rgba(255,255,255,0.45)" },
                        content: { color: "#B45309", fontSize: 22 },
                      }}
                      formatter={(value) => peso(value)}
                    />
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <BarChartOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Best Seller */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 12,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Best Seller
                    </Text>
                    <Text strong style={{ color: "#FBBF24", fontSize: 16 }}>
                      {summary.best_selling_product?.name || "—"}
                    </Text>
                    {summary.best_selling_product?.qty ? (
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          display: "block",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {summary.best_selling_product.qty} pcs sold
                      </Text>
                    ) : null}
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <TrophyOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Top Branch */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between">
                  <div>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 12,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Top Branch ({summary.branch_count || 0} total)
                    </Text>
                    <Text strong style={{ color: "#EA580C", fontSize: 15 }}>
                      {summary.top_branch?.name || "—"}
                    </Text>
                    {summary.top_branch?.net_sales ? (
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          display: "block",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {peso(summary.top_branch.net_sales)}
                      </Text>
                    ) : null}
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <BarChartOutlined className="text-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Row gutter={[16, 16]}>
        {/* Filters */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
            <Space wrap>
              <Text strong className="text-sm font-semibold text-stone-700">
                Date Range:
              </Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
                allowClear={false}
                className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus-within:border-orange-500!"
              />
              <Divider orientation="vertical" className="border-orange-100!" />
              <Text strong className="text-sm font-semibold text-stone-700">
                Group By:
              </Text>
              <Radio.Group
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="[&_.ant-radio-button-wrapper]:border-orange-200! [&_.ant-radio-button-wrapper:hover]:border-orange-300! [&_.ant-radio-button-wrapper:hover]:text-orange-600! [&_.ant-radio-button-wrapper-checked]:border-orange-500! [&_.ant-radio-button-wrapper-checked]:bg-orange-500! [&_.ant-radio-button-wrapper-checked]:text-white! [&_.ant-radio-button-wrapper-checked]:shadow-sm! [&_.ant-radio-button-wrapper-checked::before]:bg-orange-500!"
              >
                <Radio.Button value="daily">Daily</Radio.Button>
                <Radio.Button value="weekly">Weekly</Radio.Button>
                <Radio.Button value="monthly">Monthly</Radio.Button>
                <Radio.Button value="branch">Branches</Radio.Button>
                <Radio.Button value="detail">Detail</Radio.Button>
              </Radio.Group>
              <Divider orientation="vertical" className="border-orange-100!" />
              <Text strong className="text-sm font-semibold text-stone-700">
                Branch:
              </Text>
              {isAdmin ? (
                <Select
                  style={{ width: 220 }}
                  placeholder="All Branches"
                  allowClear
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
                >
                  {branches.map((branch) => (
                    <Select.Option key={branch.id} value={branch.id}>
                      {branch.name}
                    </Select.Option>
                  ))}
                </Select>
              ) : (
                <Text strong className="text-sm font-semibold text-stone-700">
                  {branches.find((b) => b.id === userBranchId)?.name ||
                    "Your Branch"}
                </Text>
              )}
            </Space>
          </div>
        </Col>

        {/* 6-Month Trend Chart */}
        <Col span={24}>
          <section className="mb-6 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <BarChartOutlined />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">6-Month Sales Trend</h2>
                  <p className="text-xs text-stone-500">Track your sales over time</p>
                </div>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {trendData.length} months
              </span>
            </div>

            <div className="h-64 p-4">
              {trendLoading ? (
                <Loading text="Loading trend data..." />
              ) : trendData.every((d) => Number(d.sales) === 0) ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                    <RiseOutlined style={{ fontSize: 20 }} />
                  </div>
                  <p className="text-base font-semibold text-stone-700">
                    No sales in this period
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    Sales will appear here once recorded
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="trendSalesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: MUTED }}
                      axisLine={{ stroke: BORDER }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: MUTED }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReTooltip
                      formatter={(value) => peso(Number(value) || 0)}
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
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke={ACCENT}
                      strokeWidth={2}
                      fill="url(#trendSalesFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </Col>

        {/* Data Table */}
        <Col span={24}>
          <Card
            variant="borderless"
            className="rounded-2xl border border-orange-100 bg-white shadow-sm"
            title={
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <FileTextOutlined />
                </div>
                <span className="text-lg font-bold text-stone-900">
                  {groupBy === "detail"
                    ? "Transaction Details"
                    : groupBy === "branch"
                    ? `Branch Comparison — All ${branchRows.length} Branches`
                    : `Sales by ${groupBy}`}
                </span>
                <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                  {groupBy === "branch"
                    ? `${branchRows.length} branches`
                    : `${salesData.length} rows`}
                </span>
              </div>
            }
          >
            {groupBy === "detail" ? (
              <Table
                columns={detailColumns}
                dataSource={salesData}
                rowKey="id"
                loading={loading}
                pagination={serverPagination(pagination, { label: "sales" })}
                onChange={handleTableChange}
                scroll={{ x: true }}
                className="[&_.ant-table-container]:rounded-xl! [&_.ant-table-thead_>_tr_>_th]:bg-[#FFF1E6]! [&_.ant-table-thead_>_tr_>_th]:text-stone-700! [&_.ant-table-thead_>_tr_>_th]:font-semibold! [&_.ant-table-tbody_>_tr:hover_>_td]:bg-[#FFF8ED]!"
              />
            ) : groupBy === "branch" ? (
              <Table
                columns={branchColumns}
                dataSource={branchRows}
                rowKey="branch_id"
                loading={loading}
                pagination={false}
                scroll={{ x: true }}
                className="[&_.ant-table-container]:rounded-xl! [&_.ant-table-thead_>_tr_>_th]:bg-[#FFF1E6]! [&_.ant-table-thead_>_tr_>_th]:text-stone-700! [&_.ant-table-thead_>_tr_>_th]:font-semibold! [&_.ant-table-tbody_>_tr:hover_>_td]:bg-[#FFF8ED]!"
              />
            ) : (
              <Table
                columns={groupedColumns}
                dataSource={salesData}
                rowKey="period"
                loading={loading}
                pagination={clientPagination({ label: "days" })}
                scroll={{ x: true }}
                className="[&_.ant-table-container]:rounded-xl! [&_.ant-table-thead_>_tr_>_th]:bg-[#FFF1E6]! [&_.ant-table-thead_>_tr_>_th]:text-stone-700! [&_.ant-table-thead_>_tr_>_th]:font-semibold! [&_.ant-table-tbody_>_tr:hover_>_td]:bg-[#FFF8ED]!"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SalesReport;