import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Progress,
  Input,
  Alert,
  DatePicker,
} from "antd";
import {
  InboxOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  SearchOutlined,
  StockOutlined,
  FireOutlined,
  CloseOutlined,
  ReloadOutlined,
  AccountBookOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";
import { clientPagination, serverPagination } from "../components/Pagination";
import { useLowStock } from "../context/LowStockContext";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const fmtPeso = (value) =>
  `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const InventoryReport = () => {
  const { openModal: openLowStockModal } = useLowStock();
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });
  const [summary, setSummary] = useState({ total_items: 0, total_value: 0, low_stock_items: 0, out_of_stock_items: 0, total_products: 0 });
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);

  // Delivery & Expense summary report
  const [dateRange, setDateRange] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [reportTotals, setReportTotals] = useState({ total_lechon_manok: 0, total_liempo: 0, total_expenses: 0 });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [expenseRows, setExpenseRows] = useState([]);

  const fetchDeliveryExpenseReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const params = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].format("YYYY-MM-DD");
        params.end_date = dateRange[1].format("YYYY-MM-DD");
      }
      if (selectedBranch) params.branch_id = selectedBranch;

      const [reportRes, expensesRes] = await Promise.all([
        api.get("/reports/inventory-report", { params }),
        api.get("/expenses", { params }),
      ]);

      const rawData = reportRes.data?.data || [];
      const flatRows = [];
      rawData.forEach((group) => {
        if (Array.isArray(group.products) && group.products.length > 0) {
          group.products.forEach((p, idx) => {
            flatRows.push({
              key: `${group.date}-${group.branch_id}-${p.product_id || idx}`,
              date: group.date,
              branch_id: group.branch_id,
              branch_name: group.branch_name,
              product_name: p.name,
              product_id: p.product_id,
              quantity: p.quantity,
              expense: p.expense,
              is_received: p.is_received,
            });
          });
        } else {
          flatRows.push({
            key: `${group.date}-${group.branch_id}`,
            date: group.date,
            branch_id: group.branch_id,
            branch_name: group.branch_name,
            product_name: group.product_name || "-",
            quantity: group.total_quantity || 0,
            expense: group.expenses || 0,
          });
        }
      });

      setReportRows(flatRows);
      setReportTotals(
        reportRes.data?.totals || { total_quantity: 0, total_expenses: 0 }
      );
      setExpenseRows(expensesRes.data?.data || []);
    } catch (err) {
      console.error("[InventoryReport] Delivery/Expense report error:", err);
      setReportError(err?.response?.data?.message || "Failed to load the inventory report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedBranch(null);
    setDateRange(null);
  };

  const fetchInventoryReport = async (page = 1) => {
    setLoading(true);
    try {
      const [inventoryRes, branchesRes] = await Promise.all([
        api.get("/reports/inventory", {
          params: {
            branch_id: selectedBranch,
            page: page,
            per_page: pagination.pageSize,
          },
        }),
        api.get("/branches"),
      ]);

      const inventory = inventoryRes.data || {};

      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []));
      setInventoryData(inventory.data || []);
      setMovements(inventory.movements || []);
      setLowStockItems(inventory.data?.filter(item => item.is_low_stock) || []);
      setSummary(inventory.summary || {});
      if (inventory.pagination) {
        setPagination({
          current: inventory.pagination.current_page,
          pageSize: inventory.pagination.per_page,
          total: inventory.pagination.total,
        });
      }
    } catch (err) {
      console.error("[InventoryReport] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryReport(1);
  }, [selectedCategory, selectedBranch]);

  useEffect(() => {
    fetchDeliveryExpenseReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, dateRange]);

  const handleTableChange = (pagination) => {
    fetchInventoryReport(pagination.current);
  };

  const handleExport = () => {
    const csvContent = [
      ["Item", "Category", "Branch", "Current Stock", "Reorder Level", "Unit Cost", "Total Value", "Status"],
      ...inventoryData.map(item => [
        item.name,
        item.category_name,
        item.branch_name,
        item.current_stock,
        item.reorder_level,
        item.unit_cost,
        item.total_value,
        item.status,
      ]),
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const stockColumns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()) ||
        record.sku?.toLowerCase().includes(value.toLowerCase()),
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.sku}</Text>
        </div>
      ),
    },

    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
    },
    {
      title: "Stock Level",
      dataIndex: "current_stock",
      key: "current_stock",
      sorter: (a, b) => a.current_stock - b.current_stock,
      render: (stock, record) => {
        const percentage = (stock / record.reorder_level) * 100;
        return (
          <div>
            <Progress
              percent={Math.min(100, percentage)}
              strokeColor={{ "0%": "#F97316", "100%": "#D97706" }}
              size="small"
              format={() => Number(stock || 0).toLocaleString()}
            />
          </div>
        );
      },
    },
    {
      title: "Reorder Level",
      dataIndex: "reorder_level",
      key: "reorder_level",
      align: "center",
      render: (level) => Number(level || 0).toLocaleString(),
    },
    {
      title: "Unit Cost",
      dataIndex: "unit_cost",
      key: "unit_cost",
      render: (cost) => {
        const numCost = Number(cost);
        return cost !== null && cost !== undefined && !Number.isNaN(numCost) ? `₱${fmtPeso(numCost)}` : "-";
      },
    },
    {
      title: "Total Value",
      dataIndex: "total_value",
      key: "total_value",
      sorter: (a, b) => a.total_value - b.total_value,
      render: (value) => {
        const numValue = Number(value);
        return value !== null && value !== undefined && !Number.isNaN(numValue) ? (
          <Text strong style={{ color: "#EA580C" }}>
            ₱{fmtPeso(numValue)}
          </Text>
        ) : "-";
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = {
          "In Stock": { color: "green", icon: <StockOutlined /> },
          "Low Stock": { color: "orange", icon: <WarningOutlined /> },
          "Out of Stock": { color: "red", icon: <WarningOutlined /> },
        };
        const { color, icon } = config[status] || config["In Stock"];
        return <Tag color={color} icon={icon}>{status}</Tag>;
      },
    },
  ];

  const movementColumns = [
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Item",
      dataIndex: "item_name",
      key: "item_name",
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Type",
      dataIndex: "movement_type",
      key: "movement_type",
      render: (type) => {
        const isIn = type.toLowerCase() === "in";
        return (
          <Tag color={isIn ? "green" : "red"} icon={isIn ? <RiseOutlined /> : <FallOutlined />}>
            {type.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      render: (qty, record) => (
        <Text style={{ color: record.movement_type.toLowerCase() === "in" ? "#EA580C" : "#DC2626" }}>
          {record.movement_type.toLowerCase() === "in" ? "+" : "-"}{qty}
        </Text>
      ),
    },
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
  ];

  const dateColumn = {
    title: "Date",
    dataIndex: "date",
    key: "date",
    sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    render: (date) => <Text strong>{dayjs(date).format("MMM DD, YYYY")}</Text>,
  };

  const branchColumn = {
    title: "Branch",
    dataIndex: "branch_name",
    key: "branch_name",
    render: (name) => <Text>{name}</Text>,
  };

  // Product column: shows which product was delivered
  const productColumn = {
    title: "Product",
    dataIndex: "product_name",
    key: "product_name",
    sorter: (a, b) => (a.product_name || "").localeCompare(b.product_name || ""),
    render: (name, record) => {
      if (!name || name === "-") {
        return <Text type="secondary">-</Text>;
      }
      return (
        <Tag
          color={record.is_received === false ? "gold" : "orange"}
          className="font-medium"
        >
          {name}
          {record.is_received === false && (
            <span className="ml-1 text-[11px] opacity-80 font-normal">(In Transit)</span>
          )}
        </Tag>
      );
    },
  };

  // Qty column: shows corresponding quantity for each product
  const qtyColumn = {
    title: "Qty",
    dataIndex: "quantity",
    key: "quantity",
    align: "right",
    sorter: (a, b) => Number(a.quantity || 0) - Number(b.quantity || 0),
    render: (qty) => (
      <Text strong>{Number(qty || 0).toLocaleString()} pcs</Text>
    ),
  };

  const expensesColumn = {
    title: (
      <Space size={4}>
        <span>Expenses</span>
        <Tooltip title="Computed from cost per unit: quantity x cost per unit of each delivery">
          <AccountBookOutlined className="text-orange-400" />
        </Tooltip>
      </Space>
    ),
    dataIndex: "expense",
    key: "expense",
    align: "right",
    sorter: (a, b) => Number(a.expense || 0) - Number(b.expense || 0),
    render: (expense) => (
      <Text strong style={{ color: "#EA580C" }}>
        ₱{fmtPeso(expense)}
      </Text>
    ),
  };

  const reportColumns = [
    dateColumn,
    branchColumn,
    productColumn,
    qtyColumn,
    expensesColumn,
  ];

  const expenseRecordColumns = [
    {
      title: "Date",
      dataIndex: "expense_date",
      key: "expense_date",
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Branch",
      dataIndex: ["branch", "name"],
      key: "branch_name",
      render: (name) => <Text>{name || "-"}</Text>,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category) => <Tag color="orange">{category}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => (
        <Text strong style={{ color: "#EA580C" }}>
          ₱{fmtPeso(value)}
        </Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description) => description || "-",
    },
    {
      title: "Recorded By",
      dataIndex: ["user", "full_name"],
      key: "recorded_by",
      render: (name) => <Text>{name || "-"}</Text>,
    },
  ];

  // Stats — from backend summary (all items, not just current page)
  const totalItems = summary.total_products || 0;
  const totalValue = summary.total_value || 0;
  const lowStockCount = summary.low_stock_items || 0;
  const outOfStockCount = summary.out_of_stock_items || 0;

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* =========================================================
          HERO HEADER
      ========================================================= */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        {/* Decorative glow circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />

        {/* Watermark icon */}
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
          <FireOutlined />
        </div>

        <div className="relative z-10 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            {/* Brand / Title */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                <InboxOutlined />
                Stock Management
              </div>

              <h1 className="text-2xl font-bold text-white">
                Inventory{" "}
                <span className="text-orange-400">Report</span>
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Stock levels, movements, and alerts
              </p>
            </div>

            {/* Hero Actions */}
            <div className="flex flex-wrap gap-2 xl:min-w-max">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="h-11! rounded-xl! border-white/20! bg-white/5! px-5! font-medium! text-white! hover:border-orange-300! hover:text-orange-300!"
              >
                Export CSV
              </Button>
              <Button
                type="primary"
                icon={<StockOutlined />}
                onClick={fetchInventoryReport}
                loading={loading}
                className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! hover:brightness-110!"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* KPI chips in hero */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                <InboxOutlined className="text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Total Items</p>
                <p className="text-white font-bold text-lg leading-tight">{totalItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/15">
                <StockOutlined className="text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Total Value</p>
                <p className="text-orange-300 font-bold text-lg leading-tight">
                  ₱{fmtPeso(totalValue)}
                </p>
              </div>
            </div>
            <div
              onClick={openLowStockModal}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-colors"
              title="Click to view Low Stock Alert Modal"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                <WarningOutlined className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Low Stock</p>
                <p className="text-amber-300 font-bold text-lg leading-tight">{lowStockCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15">
                <WarningOutlined className="text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white/50 text-xs">Out of Stock</p>
                <p className="text-red-400 font-bold text-lg leading-tight">{outOfStockCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Low Stock Alert */}
        {lowStockCount > 0 && showLowStockAlert && (
          <Col span={24}>
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-xs">
              <div
                className="flex items-start gap-3 cursor-pointer flex-1"
                onClick={openLowStockModal}
              >
                <WarningOutlined className="mt-1 text-amber-500 text-base" />
                <div>
                  <p className="font-semibold text-amber-800 mb-0.5">
                    {lowStockCount} items are below reorder level
                  </p>
                  <p className="text-sm text-amber-700/80 mb-0">
                    These items need to be restocked soon to avoid stockouts. Click to view modal.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  type="primary"
                  onClick={openLowStockModal}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs border-none"
                >
                  View Modal
                </Button>
                <button
                  onClick={() => setShowLowStockAlert(false)}
                  className="mt-0.5 text-amber-500 transition-colors hover:text-amber-700 p-1"
                  aria-label="Close alert"
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          </Col>
        )}

        {/* Filters */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <SearchOutlined />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Filters</h2>
                <p className="text-xs text-stone-500">Narrow down the inventory view</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-stone-700">Branch:</span>
              <Select
                style={{ width: 200 }}
                placeholder="All Branches"
                allowClear
                className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
                value={selectedBranch}
                onChange={setSelectedBranch}
              >
                {branches.map((branch) => (
                  <Select.Option key={branch.id} value={branch.id}>
                    {branch.name}
                  </Select.Option>
                ))}
              </Select>
              <span className="text-sm font-semibold text-stone-700">Dates:</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates || null)}
                className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
              />
              <Input
                placeholder="Search items..."
                prefix={<SearchOutlined />}
                style={{ width: 250 }}
                className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Button
                icon={<CloseOutlined />}
                onClick={resetFilters}
                disabled={!selectedBranch && !dateRange}
                className="h-11! rounded-xl! border-stone-200! px-4! text-stone-600! hover:border-orange-300! hover:text-orange-600!"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </Col>

        {/* Inventory Delivery & Expense Summary */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <AccountBookOutlined />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Inventory Deliveries &amp; Expenses</h2>
                  <p className="text-xs text-stone-500">
                    Products received, with expenses based on cost per unit
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {reportRows.length} item(s)
              </span>
            </div>

            <div className="p-4">
              {reportError ? (
                <Alert
                  type="error"
                  showIcon
                  message="Unable to load inventory records"
                  description={reportError}
                  action={
                    <Button
                      type="primary"
                      size="small"
                      danger
                      icon={<ReloadOutlined />}
                      onClick={fetchDeliveryExpenseReport}
                      loading={reportLoading}
                    >
                      Retry
                    </Button>
                  }
                  className="rounded-xl"
                />
              ) : (
                <Table
                  columns={reportColumns}
                  dataSource={reportRows}
                  rowKey={(record) => record.key || `${record.date}-${record.branch_id}-${record.product_id}`}
                  loading={reportLoading}
                  pagination={clientPagination({ label: "deliveries" })}
                  scroll={{ x: true }}
                  summary={() => {
                    const totalQty = Number(
                      reportTotals.total_quantity ??
                      (Number(reportTotals.total_lechon_manok || 0) + Number(reportTotals.total_liempo || 0))
                    );
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-orange-50!">
                          <Table.Summary.Cell index={0}>
                            <Text strong>TOTAL</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} />
                          <Table.Summary.Cell index={2} />
                          <Table.Summary.Cell index={3} align="right">
                            <Text strong>{totalQty.toLocaleString()} pcs</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong style={{ color: "#EA580C" }}>
                              ₱{fmtPeso(reportTotals.total_expenses)}
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                  locale={{
                    emptyText: (
                      <div className="py-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-400">
                          <InboxOutlined style={{ fontSize: 20 }} />
                        </div>
                        <p className="text-base font-semibold text-stone-700">No inventory records found</p>
                        <p className="mt-1 text-sm text-stone-400">
                          Adjust the date or branch filters and try again.
                        </p>
                      </div>
                    ),
                  }}
                />
              )}
            </div>
          </div>
        </Col>

        {/* Expense Records */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <CalendarOutlined />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Expense Records</h2>
                  <p className="text-xs text-stone-500">Expenses recorded by staff from the POS</p>
                </div>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {expenseRows.length} expense(s)
              </span>
            </div>
            <div className="p-4">
              <Table
                columns={expenseRecordColumns}
                dataSource={expenseRows}
                rowKey="id"
                loading={reportLoading}
                pagination={clientPagination({ label: "expenses" })}
                scroll={{ x: true }}
              />
            </div>
          </div>
        </Col>

        {/* Stock Level Table */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <InboxOutlined />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Current Stock Levels</h2>
                  <p className="text-xs text-stone-500">All products across selected branches</p>
                </div>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {inventoryData.length} items
              </span>
            </div>
            <div className="p-4">
              <Table
                columns={stockColumns}
                dataSource={inventoryData}
                rowKey="id"
                loading={loading}
                pagination={serverPagination(pagination, { label: "items" })}
                onChange={handleTableChange}
                scroll={{ x: true }}
              />
            </div>
          </div>
        </Col>

        {/* Stock Movements */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <RiseOutlined />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Recent Stock Movements</h2>
                  <p className="text-xs text-stone-500">Latest in/out transactions</p>
                </div>
              </div>
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                {movements.length} movements
              </span>
            </div>
            <div className="p-4">
              <Table
                columns={movementColumns}
                dataSource={movements}
                rowKey="id"
                loading={loading}
                pagination={clientPagination({ label: "movements" })}
                scroll={{ x: true }}
              />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default InventoryReport;