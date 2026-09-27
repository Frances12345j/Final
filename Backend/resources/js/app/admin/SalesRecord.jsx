import { useState } from "react";
import {
  Card, Table, Button, Modal, Input, InputNumber, Select, message,
  Tag, Row, Col, Space, Checkbox, Divider, Tooltip, DatePicker,
} from "antd";
import {
  ShoppingCartOutlined, TransactionOutlined, ReloadOutlined,
  PlusOutlined, DeleteOutlined, EyeOutlined, InfoCircleOutlined,
  SearchOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/config/api";
import { clientPagination, serverPagination } from "@/components/Pagination";
const PageShell = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">{children}</div>
);

const HeroPrimaryButton = ({ children, ...props }) => (
  <Button
    {...props}
    className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! hover:brightness-110!"
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

const { RangePicker } = DatePicker;

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

const fmtCurrency = (v) => `₱${Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

function SalesRecord() {
  const queryClient = useQueryClient();

  // Filters for sales history
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  // New sale form state
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleBranch, setSaleBranch] = useState(null);
  const [saleUser, setSaleUser] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [seniorDiscount, setSeniorDiscount] = useState(false);
  const [cashCollected, setCashCollected] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleItems, setSaleItems] = useState([{ product_id: null, quantity: 1, product_name: "", product_price: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [detailSale, setDetailSale] = useState(null);

  // Data fetching
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get("/branches"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("/staff"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products", { params: { per_page: 200 } }),
    staleTime: 5 * 60 * 1000,
  });

  const params = {};
  if (branchFilter !== "all") params.branch_id = branchFilter;
  if (dateRange && dateRange[0] && dateRange[1]) {
    params.start_date = dateRange[0].format("YYYY-MM-DD");
    params.end_date = dateRange[1].format("YYYY-MM-DD");
  }
  params.per_page = 50;

  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ["sales", params],
    queryFn: () => api.get("/sales", { params }),
    staleTime: 30 * 1000,
  });

  const branches = branchesData?.data?.data || [];
  const staff = staffData?.data?.data || [];
  const products = productsData?.data?.data || [];
  const sales = salesData?.data?.data || [];

  // Compute today's stats from loaded sales
  const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const today = phNow.toISOString().slice(0, 10);
  const todaySales = sales.filter((s) => String(s.sale_date).startsWith(today));
  const todayCount = todaySales.length;
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const todayItems = todaySales.reduce((sum, s) => {
    if (s.items) return sum + s.items.reduce((iSum, item) => iSum + Number(item.quantity || 0), 0);
    return sum;
  }, 0);

  // Add item row
  const addItem = () => {
    setSaleItems([...saleItems, { product_id: null, quantity: 1, product_name: "", product_price: 0 }]);
  };

  // Remove item row
  const removeItem = (idx) => {
    if (saleItems.length <= 1) return;
    setSaleItems(saleItems.filter((_, i) => i !== idx));
  };

  // Update item
  const updateItem = (idx, field, value) => {
    const updated = [...saleItems];
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      updated[idx] = {
        ...updated[idx],
        product_id: value,
        product_name: product?.name || "",
        product_price: Number(product?.price || 0),
        quantity: 1,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setSaleItems(updated);
  };

  // Calculate totals
  const subtotal = saleItems.reduce((sum, item) => {
    return sum + (item.product_price * (item.quantity || 0));
  }, 0);

  const discountAmount = seniorDiscount ? subtotal * 0.2 : 0;
  const total = Math.max(subtotal - discountAmount, 0);
  const change = cashCollected - total;

  // Submit sale
  const submitSale = async () => {
    if (!saleBranch) { message.error("Please select a branch"); return; }
    if (!saleUser) { message.error("Please select a staff member"); return; }
    if (!saleItems.length || saleItems.every((i) => !i.product_id)) { message.error("Please add at least one item"); return; }
    if (saleItems.some((i) => !i.product_id)) { message.error("Please select a product for all item rows"); return; }
    if (cashCollected < total) { message.error("Cash collected must be at least the total amount"); return; }

    setSubmitting(true);
    try {
      const payload = {
        branch_id: saleBranch,
        user_id: saleUser,
        customer_name: customerName || null,
        senior_discount: seniorDiscount,
        items: saleItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        cash_collected: cashCollected,
        payment_method: paymentMethod,
      };

      await api.post("/sales", payload);
      message.success("Sale recorded successfully!");
      setShowSaleModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to record sale";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSaleBranch(null);
    setSaleUser(null);
    setCustomerName("");
    setSeniorDiscount(false);
    setCashCollected(0);
    setPaymentMethod("cash");
    setSaleItems([{ product_id: null, quantity: 1, product_name: "", product_price: 0 }]);
  };

  const columns = [
    {
      title: "Invoice",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 160,
      render: (v) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: "Date",
      dataIndex: "sale_date",
      key: "sale_date",
      width: 120,
      render: (v) => v ? new Date(v + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "-",
    },
    {
      title: "Branch",
      key: "branch",
      width: 140,
      render: (_, r) => r.branch?.name || "-",
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 140,
      render: (v) => v || <span style={{ color: MUTED }}>Walk-in</span>,
    },
    {
      title: "Items",
      key: "items_count",
      width: 80,
      render: (_, r) => (r.items?.length || 0),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      render: (v) => <span className="font-semibold" style={{ color: ACCENT }}>{fmtCurrency(v)}</span>,
    },
    {
      title: "Payment",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 100,
      render: (v) => (
        <Tag className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-600">
          {v || "cash"}
        </Tag>
      ),
    },
    {
      title: "Cashier",
      key: "user",
      width: 140,
      render: (_, r) => r.user?.firstname ? `${r.user.firstname} ${r.user.lastname || ""}` : r.user?.username || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_, r) => (
        <Tooltip title="View Details">
          <Button type="text" icon={<EyeOutlined />} onClick={() => setDetailSale(r)} style={{ color: ACCENT }} />
        </Tooltip>
      ),
    },
  ];

  const productOptions = products
    .filter((p) => p.is_active !== false)
    .map((p) => {
      const stock = (p.stocks || []).find((s) => Number(s.branch_id) === Number(saleBranch));
      const qty = Number(stock?.quantity || 0);
      const hasBranch = !!saleBranch;
      return {
        value: p.id,
        disabled: hasBranch && qty <= 0,
        label: hasBranch
          ? `${p.name}${p.sku ? ` (${p.sku})` : ""} — ${fmtCurrency(p.price)}  [Stock: ${qty}]`
          : `${p.name}${p.sku ? ` (${p.sku})` : ""} — ${fmtCurrency(p.price)}`,
        stockQty: qty,
      };
    });

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<FireOutlined />}
        badge="Sales Management"
        title="Sales"
        accent="Record"
        subtitle="Record new sales and view sales history"
        actions={
          <HeroPrimaryButton
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => setShowSaleModal(true)}
          >
            New Sale
          </HeroPrimaryButton>
        }
        stats={[
          {
            icon: <TransactionOutlined />,
            iconBg: "bg-orange-500/15",
            iconColor: "text-orange-400",
            label: "Today's Transactions",
            value: todayCount,
          },
          {
            icon: <FireOutlined />,
            iconBg: "bg-green-500/15",
            iconColor: "text-green-400",
            label: "Today's Revenue",
            value: fmtCurrency(todayRevenue),
            valueColor: "text-orange-300",
          },
          {
            icon: <ShoppingCartOutlined />,
            iconBg: "bg-amber-500/15",
            iconColor: "text-amber-400",
            label: "Items Sold Today",
            value: todayItems,
          },
          {
            icon: <TransactionOutlined />,
            iconBg: "bg-red-500/15",
            iconColor: "text-red-400",
            label: "Total Transactions",
            value: sales.length,
          },
        ]}
      />

      <FilterBar title="Filters" subtitle="Narrow down the sales history">
        <span className="text-sm font-semibold text-stone-700">Branch:</span>
        <Select
          value={branchFilter}
          onChange={setBranchFilter}
          style={{ width: 160 }}
          className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
        >
          <Select.Option value="all">All Branches</Select.Option>
          {branches.map((b) => (
            <Select.Option key={b.id} value={String(b.id)}>{b.name}</Select.Option>
          ))}
        </Select>
        <span className="text-sm font-semibold text-stone-700">Dates:</span>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          allowClear
          className="h-11! rounded-xl! border-stone-200! hover:border-orange-300!"
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
          className="h-11! rounded-xl! border-[#EA580C]! px-4! text-[#EA580C]! hover:bg-[#FFF1E6]! hover:border-[#F97316]!"
        >
          Refresh
        </Button>
      </FilterBar>

      <SectionCard
        icon={<TransactionOutlined />}
        title="Sales History"
        subtitle="Browse and filter all recorded transactions"
        extra={<CountPill>{sales.length} sale{sales.length !== 1 ? "s" : ""}</CountPill>}
      >
        <Table
          columns={columns}
          dataSource={sales}
          rowKey="id"
          loading={isLoading}
          pagination={clientPagination({ label: "sales" })}
          locale={{
            emptyText: (
              <TableEmpty
                icon={<TransactionOutlined />}
                title="No sales recorded yet"
                description='Click "New Sale" to record your first transaction'
              />
            ),
          }}
          scroll={{ x: 1200 }}
        />
      </SectionCard>

      {/* New Sale Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ShoppingCartOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">New Sale</p>
              <p className="text-xs font-normal text-stone-500">Record a new POS transaction</p>
            </div>
          </div>
        }
        open={showSaleModal}
        onCancel={() => { setShowSaleModal(false); resetForm(); }}
        footer={null}
        width={700}
        destroyOnHidden
        className="rounded-2xl"
      >
        <div className="space-y-4">
          {/* Branch & Staff */}
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Branch *</div>
              <Select
                value={saleBranch}
                onChange={setSaleBranch}
                style={{ width: "100%" }}
                placeholder="Select branch"
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                className="rounded-xl"
              />
            </Col>
            <Col span={12}>
              <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Cashier / Staff *</div>
              <Select
                value={saleUser}
                onChange={setSaleUser}
                style={{ width: "100%" }}
                placeholder="Select staff"
                showSearch
                filterOption={(input, option) => (option?.label || "").toLowerCase().includes(input.toLowerCase())}
                options={staff.map((s) => ({
                  value: s.id,
                  label: `${s.firstname || ""} ${s.lastname || ""}${s.username ? ` (${s.username})` : ""}`,
                }))}
                className="rounded-xl"
              />
            </Col>
          </Row>

          {/* Customer Name */}
          <div>
            <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Customer Name (optional)</div>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer"
              className="rounded-xl"
            />
          </div>

          <Divider />

          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold" style={FIELD_LABEL}>Items</span>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem} className="rounded-xl" style={GHOST_BTN}>
                Add Item
              </Button>
            </div>

            {saleItems.map((item, idx) => {
              const opt = productOptions.find((o) => o.value === item.product_id);
              const maxQty = opt?.stockQty || 0;
              return (
                <Row key={idx} gutter={8} className="mb-2 items-center">
                  <Col span={10}>
                    <Select
                      value={item.product_id}
                      onChange={(v) => updateItem(idx, "product_id", v)}
                      style={{ width: "100%" }}
                      placeholder="Search product..."
                      showSearch
                      filterOption={(input, option) => (option?.label || "").toLowerCase().includes(input.toLowerCase())}
                      options={productOptions}
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      value={item.quantity}
                      onChange={(v) => updateItem(idx, "quantity", v || 0)}
                      min={0.5}
                      max={maxQty || undefined}
                      step={0.5}
                      style={{ width: "100%" }}
                      placeholder="Qty"
                    />
                  </Col>
                  <Col span={3}>
                    <div className="pt-1 text-sm" style={{ color: MUTED }}>{fmtCurrency(item.product_price)}</div>
                  </Col>
                  <Col span={3}>
                    <div className="pt-1 font-semibold" style={{ color: ACCENT }}>{fmtCurrency(item.product_price * (item.quantity || 0))}</div>
                  </Col>
                  <Col span={2}>
                    {maxQty > 0 ? (
                      <span className="text-xs whitespace-nowrap" style={{ color: AMBER }}>{maxQty} avail</span>
                    ) : item.product_id ? (
                      <span className="text-xs" style={{ color: "#DC2626" }}>out</span>
                    ) : null}
                  </Col>
                  <Col span={2}>
                    {saleItems.length > 1 && (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
                    )}
                  </Col>
                </Row>
              )
            })}
          </div>

          <Divider />

          {/* Senior Discount */}
          <Checkbox checked={seniorDiscount} onChange={(e) => setSeniorDiscount(e.target.checked)}>
            Senior Citizen Discount (20%)
          </Checkbox>

          {/* Totals */}
          <div className="space-y-1 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
            <Row justify="space-between"><Col>Subtotal:</Col><Col>{fmtCurrency(subtotal)}</Col></Row>
            {seniorDiscount && (
              <Row justify="space-between" className="text-red-600"><Col>Senior Discount (20%):</Col><Col>-{fmtCurrency(discountAmount)}</Col></Row>
            )}
            <Row justify="space-between" className="text-lg font-bold"><Col>Total:</Col><Col style={{ color: ACCENT }}>{fmtCurrency(total)}</Col></Row>
          </div>

          {/* Cash Collected & Payment */}
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Cash Collected *</div>
              <InputNumber
                value={cashCollected}
                onChange={setCashCollected}
                min={0}
                step={0.25}
                prefix="₱"
                style={{ width: "100%" }}
                placeholder="0.00"
                className="rounded-xl"
              />
            </Col>
            <Col span={6}>
              <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Payment Method</div>
              <Select value={paymentMethod} onChange={setPaymentMethod} className="rounded-xl" style={{ width: "100%" }}>
                <Select.Option value="cash">Cash</Select.Option>
                <Select.Option value="card">Card</Select.Option>
                <Select.Option value="gcash">GCash</Select.Option>
                <Select.Option value="maya">Maya</Select.Option>
              </Select>
            </Col>
            <Col span={6}>
              <div className="mb-1 text-sm font-semibold" style={FIELD_LABEL}>Change</div>
              <div
                className="pt-1 text-xl font-bold"
                style={{ color: change >= 0 ? ACCENT : "#DC2626" }}
              >
                {fmtCurrency(change)}
              </div>
            </Col>
          </Row>

          {/* Submit */}
          <Button
            type="primary"
            size="large"
            block
            icon={<ShoppingCartOutlined />}
            onClick={submitSale}
            loading={submitting}
            style={GRADIENT_BTN}
          >
            Complete Sale — {fmtCurrency(total)}
          </Button>
        </div>
      </Modal>

      {/* Sale Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <EyeOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">Sale Details — {detailSale?.invoice_number || ""}</p>
              <p className="text-xs font-normal text-stone-500">Transaction breakdown</p>
            </div>
          </div>
        }
        open={!!detailSale}
        onCancel={() => setDetailSale(null)}
        footer={<Button onClick={() => setDetailSale(null)} className="rounded-xl" style={SECONDARY_BTN}>Close</Button>}
        width={600}
        className="rounded-2xl"
      >
        {detailSale && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-sm" style={{ color: MUTED }}>Branch</div>
                <div className="font-semibold" style={{ color: TEXT }}>{detailSale.branch?.name || "-"}</div>
              </Col>
              <Col span={12}>
                <div className="text-sm" style={{ color: MUTED }}>Date</div>
                <div className="font-semibold" style={{ color: TEXT }}>{detailSale.sale_date}</div>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <div className="text-sm" style={{ color: MUTED }}>Customer</div>
                <div className="font-semibold" style={{ color: TEXT }}>{detailSale.customer_name || "Walk-in"}</div>
              </Col>
              <Col span={12}>
                <div className="text-sm" style={{ color: MUTED }}>Cashier</div>
                <div className="font-semibold" style={{ color: TEXT }}>
                  {detailSale.user?.firstname} {detailSale.user?.lastname || ""}
                </div>
              </Col>
            </Row>
            <Divider />
            <div className="mb-2 text-sm font-medium" style={{ color: TEXT }}>Items</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="py-1 text-left" style={{ color: MUTED }}>Product</th>
                  <th className="py-1 text-right" style={{ color: MUTED }}>Qty</th>
                  <th className="py-1 text-right" style={{ color: MUTED }}>Price</th>
                  <th className="py-1 text-right" style={{ color: MUTED }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(detailSale.items || []).map((item, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: BORDER }}>
                    <td className="py-1">{item.product?.name || `Product #${item.product_id}`}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{fmtCurrency(item.price)}</td>
                    <td className="py-1 text-right font-semibold">{fmtCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Divider />
            <div className="space-y-1 rounded-xl border border-orange-100 bg-[#FFF1E6] p-4">
              <Row justify="space-between"><Col>Subtotal:</Col><Col>{fmtCurrency(detailSale.subtotal)}</Col></Row>
              {Number(detailSale.discount_amount) > 0 && (
                <Row justify="space-between" className="text-red-600"><Col>Discount:</Col><Col>-{fmtCurrency(detailSale.discount_amount)}</Col></Row>
              )}
              <Row justify="space-between" className="text-lg font-bold"><Col>Total:</Col><Col style={{ color: ACCENT }}>{fmtCurrency(detailSale.total)}</Col></Row>
              <Row justify="space-between"><Col>Cash Collected:</Col><Col>{fmtCurrency(detailSale.cash_collected)}</Col></Row>
              <Row justify="space-between"><Col>Change:</Col><Col>{fmtCurrency(detailSale.change_given)}</Col></Row>
              <Row justify="space-between"><Col>Payment Method:</Col><Col><Tag className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-600">{detailSale.payment_method || "cash"}</Tag></Col></Row>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

export default SalesRecord;