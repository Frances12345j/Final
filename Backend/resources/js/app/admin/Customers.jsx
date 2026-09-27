import React, { useState } from "react";
import {
  Tag, Modal, message, Button, Input, Card, Space, Typography,
  Badge, Empty, Descriptions, Table, Tooltip, Avatar,
} from "antd";
import {
  UserOutlined, SearchOutlined, MailOutlined, PhoneOutlined,
  ShoppingCartOutlined, DollarOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  CreditCardOutlined, HomeOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/config/api";
import Loading from "@/components/Loading";
import { clientPagination, useServerPagination } from "@/components/Pagination";
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

const { Text } = Typography;

const itemColumns = [
  {
    title: "Product",
    dataIndex: "product_name",
    key: "product_name",
    render: (val) => <Text strong>{val}</Text>,
  },
  {
    title: "Qty",
    dataIndex: "quantity",
    key: "quantity",
    width: 60,
    className: "text-center",
    render: (val) => Number(val),
  },
  {
    title: "Price",
    dataIndex: "price",
    key: "price",
    width: 100,
    className: "text-right",
    render: (val) => `₱${Number(val).toFixed(2)}`,
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: 100,
    className: "text-right",
    render: (val) => <Text strong>₱${Number(val).toFixed(2)}</Text>,
  },
];

const paymentMethodTag = (method) => {
  const tone = {
    cash: { background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` },
    cod: { background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` },
    gcash: { background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` },
    card: { background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` },
  }[method] || { background: PANEL_BG_2, color: MUTED, border: `1px solid ${BORDER}` };
  return (
    <Tag className="rounded-full px-2 py-0.5" style={tone}>
      {method?.toUpperCase() || "-"}
    </Tag>
  );
};

const statusColorMap = {
  pending: { background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` },
  confirmed: { background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` },
  preparing: { background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` },
  out_for_delivery: { background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` },
  delivered: { background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` },
  cancelled: { background: RED_SOFT, color: "#EF4444", border: `1px solid ${RED}30` },
};

function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const {
    data: customers,
    total,
    isLoading,
    pagination,
    setCurrentPage,
  } = useServerPagination({
    queryKey: ["customers", searchTerm],
    url: "/customers",
    params: { search: searchTerm || undefined },
    label: "customers",
    placeholderData: (prev) => prev,
  });

  const { data: customerDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["customer", selectedCustomer?.id],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${selectedCustomer.id}`);
      return data;
    },
    enabled: !!selectedCustomer && showDetailModal,
  });

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleToggleActive = async (customer) => {
    try {
      await api.post(`/customers/${customer.id}/toggle-active`);
      message.success(`Customer ${customer.is_active ? "deactivated" : "activated"} successfully`);
      setShowDetailModal(false);
      setSelectedCustomer(null);
    } catch {
      message.error("Failed to update customer status");
    }
  };

  const listColumns = [
    {
      title: "Customer",
      key: "customer",
      width: 220,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <Avatar size={36} icon={<UserOutlined />} style={{ backgroundColor: ACCENT, color: "#FFFFFF" }} />
          <div>
            <Text strong>{r.full_name}</Text>
            <br />
            <Text style={{ fontSize: 12, color: MUTED }}>@{r.username}</Text>
          </div>
        </div>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          {r.email && <Text style={{ fontSize: 12, color: TEXT }}><MailOutlined className="mr-1" />{r.email}</Text>}
          {r.phone && <Text style={{ fontSize: 12, color: TEXT }}><PhoneOutlined className="mr-1" />{r.phone}</Text>}
        </Space>
      ),
    },
    {
      title: "Orders",
      dataIndex: "total_orders",
      key: "total_orders",
      width: 80,
      className: "text-center",
      render: (v) => <Badge count={v} showZero style={{ backgroundColor: ACCENT }} />,
    },
    {
      title: "Total Spent",
      dataIndex: "total_spent",
      key: "total_spent",
      width: 140,
      className: "text-right",
      render: (v) => (
        <Text strong style={{ color: ACCENT }}>
          ₱{Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: "Joined",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (v) => (
        <Text style={{ fontSize: 12, color: TEXT }}>
          {v ? new Date(v).toLocaleDateString() : "-"}
        </Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      render: (_, r) => (
        <Tag
          className="rounded-full px-3 py-1"
          style={r.is_active
            ? { background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` }
            : { background: RED_SOFT, color: "#EF4444", border: `1px solid ${RED}30` }}
        >
          {r.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      className: "text-center",
      render: (_, r) => (
        <Tooltip title="View Details">
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

  const saleColumns = [
    { title: "Invoice", dataIndex: "invoice_number", key: "invoice_number", render: (v) => <Text code style={{ color: TEXT }}>{v || "-"}</Text> },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v) => v || "-" },
    { title: "Date", dataIndex: "sale_date", key: "sale_date", render: (v) => v || "-" },
    { title: "Payment", dataIndex: "payment_method", key: "payment_method", render: (v) => paymentMethodTag(v) },
    {
      title: "Amount",
      key: "amount",
      width: 160,
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Text style={{ fontSize: 12, color: TEXT }}>
            Cash: ₱{Number(r.cash_collected || 0).toFixed(2)}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT }}>
            Change: ₱{Number(r.change_given || 0).toFixed(2)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 100,
      className: "text-right",
      sorter: (a, b) => a.total - b.total,
      render: (v) => <Text strong style={{ color: ACCENT }}>₱{Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    },
  ];

  const orderColumns = [
    { title: "Order #", dataIndex: "order_number", key: "order_number", render: (v) => <Text code style={{ color: TEXT }}>{v || "-"}</Text> },
    { title: "Branch", dataIndex: "branch", key: "branch", render: (v) => v || "-" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Tag
          className="rounded-full px-2 py-0.5"
          style={statusColorMap[v] || { background: PANEL_BG_2, color: MUTED, border: `1px solid ${BORDER}` }}
        >
          {v || "-"}
        </Tag>
      ),
    },
    { title: "Payment", dataIndex: "payment_method", key: "payment_method", render: (v) => paymentMethodTag(v) },
    {
      title: "Payment Status",
      dataIndex: "payment_status",
      key: "payment_status",
      render: (v) => (
        <Tag
          className="rounded-full px-2 py-0.5"
          style={v === "paid"
            ? { background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` }
            : { background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}30` }}
        >
          {v || "-"}
        </Tag>
      ),
    },
    {
      title: "GCash Ref",
      dataIndex: "gcash_reference",
      key: "gcash_reference",
      render: (v) => (v ? <Text code style={{ fontSize: 11, color: TEXT }}>{v}</Text> : <Text style={{ color: MUTED }}>-</Text>),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 100,
      className: "text-right",
      sorter: (a, b) => a.total - b.total,
      render: (v) => <Text strong style={{ color: ACCENT }}>₱{Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 90,
      render: (v) => (
        <Text style={{ fontSize: 12, color: TEXT }}>
          {v ? new Date(v).toLocaleDateString() : "-"}
        </Text>
      ),
    },
  ];

  const expandedRowRender = (record, type) => {
    const items = record.items || [];
    if (!items.length) return <Text italic>No items</Text>;
    return (
      <Table
        columns={itemColumns}
        dataSource={items}
        rowKey={(_, i) => i}
        pagination={clientPagination({ label: "items" })}
        size="small"
        bordered
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3} className="text-right">
                <Text strong>{type === "sale" ? "Sale Total" : "Order Total"}:</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} className="text-right">
                <Text strong>₱{Number(record.total).toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    );
  };

  return (
    <PageShell>
      <HeroHeader
        badgeIcon={<TeamOutlined />}
        badge="Customer Management"
        title="Customer"
        accent="Data"
        subtitle="View and manage registered customers"
        stats={[
          {
            icon: <TeamOutlined />,
            iconColor: "text-orange-400",
            label: "Total Customers",
            value: total || 0,
          },
        ]}
      />

      <FilterBar title="Filters" subtitle="Search registered customers">
        <span className="text-sm font-semibold text-stone-700">Search:</span>
        <Input
          placeholder="Search customers..."
          prefix={<SearchOutlined style={{ color: MUTED }} />}
          allowClear
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={{ width: 300 }}
          className="rounded-xl"
        />
      </FilterBar>

      <SectionCard
        icon={<TeamOutlined />}
        title="Customer Directory"
        subtitle="All registered customers"
        extra={<CountPill>{total || 0} customer(s)</CountPill>}
      >
        {isLoading ? (
          <Loading full text="Loading customers..." />
        ) : (
          <Table
            columns={listColumns}
            dataSource={customers}
            rowKey="id"
            loading={false}
            pagination={pagination}
            scroll={{ x: 800 }}
            locale={{
              emptyText: (
                <TableEmpty
                  icon={<TeamOutlined style={{ fontSize: 20 }} />}
                  title="No customers found"
                  description="Try adjusting your search"
                />
              ),
            }}
          />
        )}
      </SectionCard>

      <Modal
        title={<span><UserOutlined className="mr-2" style={{ color: ACCENT }} /><span style={{ color: "#451A03", fontWeight: 700 }}>Customer Details</span></span>}
        open={showDetailModal}
        onCancel={() => { setShowDetailModal(false); setSelectedCustomer(null); }}
        footer={null}
        width={1000}
        className="rounded-2xl"
      >
        {detailLoading ? (
          <Loading text="Loading customer details..." />
        ) : customerDetail ? (
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Card
              variant="borderless"
              size="small"
              className="rounded-xl"
              style={{ background: PANEL_BG, border: `1px solid ${BORDER}` }}
            >
              <Descriptions column={2} bordered size="small"
                styles={{
                  label: { color: ACCENT, fontWeight: 600 },
                  content: { color: TEXT },
                }}>
                <Descriptions.Item label="Name" span={2}>{customerDetail.customer.full_name}</Descriptions.Item>
                <Descriptions.Item label="Username">@{customerDetail.customer.username}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag
                    className="rounded-full px-3 py-1"
                    style={customerDetail.customer.is_active
                      ? { background: GREEN_SOFT, color: GREEN, border: `1px solid ${GREEN}30` }
                      : { background: RED_SOFT, color: "#EF4444", border: `1px solid ${RED}30` }}
                  >
                    {customerDetail.customer.is_active ? "Active" : "Inactive"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{customerDetail.customer.email || "-"}</Descriptions.Item>
                <Descriptions.Item label="Phone">{customerDetail.customer.phone || "-"}</Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>{customerDetail.customer.address || "-"}</Descriptions.Item>
                <Descriptions.Item label="Total Spent">
                  <Text strong style={{ color: ACCENT }}>
                    ₱{Number(customerDetail.customer.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Orders / Sales">
                  {customerDetail.customer.total_orders} online • {customerDetail.customer.total_sales} in-store
                </Descriptions.Item>
                <Descriptions.Item label="Member Since">
                  {customerDetail.customer.created_at
                    ? new Date(customerDetail.customer.created_at).toLocaleDateString()
                    : "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {customerDetail.sales?.length > 0 && (
              <SectionCard
                icon={<DollarOutlined />}
                title="In-Store Sales"
                subtitle="Transactions recorded in the POS"
                extra={<CountPill>{customerDetail.sales.length} transaction{customerDetail.sales.length > 1 ? "s" : ""}</CountPill>}
              >
                <Table
                  columns={saleColumns}
                  dataSource={customerDetail.sales}
                  rowKey="id"
                  pagination={clientPagination({ label: "sales" })}
                  size="small"
                  scroll={{ x: 800 }}
                  expandable={{
                    expandedRowRender: (r) => expandedRowRender(r, "sale"),
                    rowExpandable: (r) => (r.items || []).length > 0,
                  }}
                />
              </SectionCard>
            )}

            {customerDetail.orders?.length > 0 && (
              <SectionCard
                icon={<ShoppingCartOutlined />}
                title="Online Orders"
                subtitle="Orders placed by this customer"
                extra={<CountPill>{customerDetail.orders.length} order{customerDetail.orders.length > 1 ? "s" : ""}</CountPill>}
              >
                <Table
                  columns={orderColumns}
                  dataSource={customerDetail.orders}
                  rowKey="id"
                  pagination={clientPagination({ label: "orders" })}
                  size="small"
                  scroll={{ x: 900 }}
                  expandable={{
                    expandedRowRender: (r) => (
                      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                        {r.delivery_address && (
                          <Text style={{ fontSize: 12, color: TEXT }}>
                            <HomeOutlined className="mr-1" style={{ color: ACCENT }} />Deliver to: {r.delivery_address}
                          </Text>
                        )}
                        {r.gcash_reference && (
                          <Text style={{ fontSize: 12, color: TEXT }}>
                            <CreditCardOutlined className="mr-1" style={{ color: ACCENT }} />GCash Ref: {r.gcash_reference}
                          </Text>
                        )}
                        {r.notes && <Text style={{ fontSize: 12, color: TEXT }}>Notes: {r.notes}</Text>}
                        <Text style={{ fontSize: 12, color: TEXT }}>
                          Subtotal: ₱{Number(r.subtotal || 0).toFixed(2)}
                          {Number(r.delivery_fee || 0) > 0 && ` • Delivery Fee: ₱${Number(r.delivery_fee).toFixed(2)}`}
                        </Text>
                        {expandedRowRender(r, "order")}
                      </Space>
                    ),
                    rowExpandable: (r) => (r.items || []).length > 0 || !!r.delivery_address || !!r.gcash_reference,
                  }}
                />
              </SectionCard>
            )}

            {!customerDetail.sales?.length && !customerDetail.orders?.length && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: MUTED }}>No sales or orders found for this customer</span>} />
            )}

            <Button
              type={customerDetail.customer.is_active ? "primary" : "default"}
              danger={customerDetail.customer.is_active}
              icon={customerDetail.customer.is_active ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleActive(customerDetail.customer)}
              style={customerDetail.customer.is_active
                ? { background: "transparent", border: `1px solid ${RED}40`, color: "#EF4444", fontWeight: 500 }
                : { ...GRADIENT_BTN, borderRadius: 10 }}
            >
              {customerDetail.customer.is_active ? "Deactivate Customer" : "Activate Customer"}
            </Button>
          </Space>
        ) : null}
      </Modal>
    </PageShell>
  );
}

export default Customers;