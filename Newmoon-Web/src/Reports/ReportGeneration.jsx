import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Typography, Tag } from "antd";
import {
  BarChartOutlined,
  InboxOutlined,
  CalendarOutlined,
  ShopOutlined,
  SwapOutlined,
  TruckOutlined,
  RightOutlined,
  LineChartOutlined,
  FireOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

const reportCards = [
  {
    title: "Sales Report",
    description: "Revenue, transactions, trends, and sales performance analysis",
    icon: <BarChartOutlined style={{ fontSize: 32, color: "#F97316" }} />,
    color: "#F97316",
    bg: "from-orange-500 to-orange-600",
    path: "/reports/sales",
    tag: "Financial",
    iconTileBg: "bg-orange-500/15",
    iconTileText: "text-orange-400",
  },
  {
    title: "Inventory Report",
    description: "Stock levels, product movements, and low stock alerts",
    icon: <InboxOutlined style={{ fontSize: 32, color: "#16A34A" }} />,
    color: "#16A34A",
    bg: "from-green-500 to-green-600",
    path: "/reports/inventory",
    tag: "Stock",
    iconTileBg: "bg-green-500/15",
    iconTileText: "text-green-400",
  },
  {
    title: "Attendance Report",
    description: "Staff attendance patterns, lateness, and hours worked",
    icon: <CalendarOutlined style={{ fontSize: 32, color: "#D97706" }} />,
    color: "#D97706",
    bg: "from-amber-500 to-amber-600",
    path: "/reports/attendance",
    tag: "HR",
    iconTileBg: "bg-amber-500/15",
    iconTileText: "text-amber-400",
  },
  {
    title: "Branch Report",
    description: "Branch performance comparison, sales, and staff distribution",
    icon: <ShopOutlined style={{ fontSize: 32, color: "#F97316" }} />,
    color: "#F97316",
    bg: "from-orange-500 to-orange-600",
    path: "/reports/branch",
    tag: "Operations",
    iconTileBg: "bg-orange-500/15",
    iconTileText: "text-orange-400",
  },
  {
    title: "Pull Out Report",
    description: "Item transfers, Pull out requests",
    icon: <SwapOutlined style={{ fontSize: 32, color: "#D97706" }} />,
    color: "#D97706",
    bg: "from-amber-500 to-amber-600",
    path: "/reports/pullout",
    tag: "Stock",
    iconTileBg: "bg-amber-500/15",
    iconTileText: "text-amber-400",
  },
  {
    title: "Deliveries Report",
    description: "Delivery status, rider assignments, and order fulfillment",
    icon: <TruckOutlined style={{ fontSize: 32, color: "#16A34A" }} />,
    color: "#16A34A",
    bg: "from-green-500 to-green-600",
    path: "/delivery",
    tag: "Operations",
    iconTileBg: "bg-green-500/15",
    iconTileText: "text-green-400",
  },
];

const tagColors = {
  Financial: "orange",
  Stock: "green",
  HR: "amber",
  Operations: "orange",
};

function ReportGeneration() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* Hero Header - NewMoon Charcoal */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        {/* Decorative glow circles */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-400/6 blur-2xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-orange-400/5 blur-2xl" />

        {/* Watermark icon */}
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[120px] leading-none text-white/3">
          <FireOutlined />
        </div>

        <div className="relative z-10 px-8 py-7">
          {/* Brand badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              <FireOutlined />
              Reports Hub
            </span>
          </div>

          {/* Title */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white mb-1">
              <LineChartOutlined className="mr-2" />
              Report{" "}
              <span className="text-orange-400">Generation</span>
            </h1>
            <p className="text-white/60 text-sm">
              Central hub for all management reports — sales, inventory, and more
            </p>
          </div>

          {/* KPI Chips in Hero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
                <BarChartOutlined className="text-orange-400 text-base" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Financial</p>
                <p className="text-white font-bold text-lg leading-tight">
                  {reportCards.filter((c) => c.tag === "Financial").length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
                <InboxOutlined className="text-green-400 text-base" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Stock</p>
                <p className="text-white font-bold text-lg leading-tight">
                  {reportCards.filter((c) => c.tag === "Stock").length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
                <CalendarOutlined className="text-amber-400 text-base" />
              </div>
              <div>
                <p className="text-white/50 text-xs">HR</p>
                <p className="text-white font-bold text-lg leading-tight">
                  {reportCards.filter((c) => c.tag === "HR").length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15">
                <ShopOutlined className="text-orange-400 text-base" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Operations</p>
                <p className="text-white font-bold text-lg leading-tight">
                  {reportCards.filter((c) => c.tag === "Operations").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Header - Available Reports */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <BarChartOutlined />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">
                Available Reports
              </h2>
              <p className="text-sm text-stone-500">
                Click a report card to view details
              </p>
            </div>
          </div>
          <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
            {reportCards.length} reports
          </span>
        </div>
      </div>

      {/* Report Cards Grid */}
      <Row gutter={[20, 20]}>
        {reportCards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.path}>
            <Card
              hoverable
              className="rounded-2xl! border! border-orange-100! bg-white! shadow-sm! hover:shadow-[0_18px_40px_rgba(234,88,12,0.12)]! hover:-translate-y-1! transition-all! duration-300! overflow-hidden group"
              styles={{ body: { padding: 0 } }}
              onClick={() => navigate(card.path)}
            >
              <div className="relative">
                {/* Charcoal mini-header */}
                <div className="bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconTileBg} ${card.iconTileText} shadow-inner`}
                    >
                      {card.icon}
                    </div>
                    <Tag className="m-0! border! border-white/10! bg-white/8! px-2.5! py-1! text-xs! font-semibold! text-white/70! rounded-full!">
                      {card.tag}
                    </Tag>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Title level={5} className="mb-0! text-stone-900!">
                      {card.title}
                    </Title>
                    <RightOutlined className="text-orange-400 group-hover:text-orange-600 transition-colors text-sm" />
                  </div>
                  <Text type="secondary" className="text-sm! text-stone-500!">
                    {card.description}
                  </Text>
                </div>

                {/* Bottom accent bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                  style={{ backgroundColor: "#F97316" }}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default ReportGeneration;
