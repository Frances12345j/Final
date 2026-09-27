import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Space,
  DatePicker,
  Select,
  Tag,
  Progress,
  Alert,
} from "antd";
import {
  BarChartOutlined,
  DollarOutlined,
  InboxOutlined,
  CalendarOutlined,
  ShopOutlined,
  SwapOutlined,
  FileTextOutlined,
  TrendingUpOutlined,
  WarningOutlined,
  DownloadOutlined,
  RightOutlined,
  FireOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const ReportDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/dashboard", {
        params: {
          start_date: dateRange[0].format("YYYY-MM-DD"),
          end_date: dateRange[1].format("YYYY-MM-DD"),
        },
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error("[ReportDashboard] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const reportCards = [
    {
      title: "Sales Report",
      description: "Revenue, transactions, and trends",
      icon: <BarChartOutlined className="text-2xl" style={{ color: "#F97316" }} />,
      color: "#F97316",
      path: "/reports/sales",
      stats: dashboardData?.sales,
    },
    {
      title: "Inventory Report",
      description: "Stock levels and movements",
      icon: <InboxOutlined className="text-2xl" style={{ color: "#52c41a" }} />,
      color: "#52c41a",
      path: "/reports/inventory",
      stats: dashboardData?.inventory,
    },
    {
      title: "Attendance Report",
      description: "Staff attendance patterns",
      icon: <CalendarOutlined className="text-2xl" style={{ color: "#F59E0B" }} />,
      color: "#F59E0B",
      path: "/reports/attendance",
      stats: dashboardData?.attendance,
    },
    {
      title: "Branch Report",
      description: "Branch performance comparison",
      icon: <ShopOutlined className="text-2xl" style={{ color: "#F59E0B" }} />,
      color: "#F59E0B",
      path: "/reports/branch",
      stats: dashboardData?.branch,
    },
    {
      title: "Pull Out Report",
      description: "Item transfers between branches",
      icon: <SwapOutlined className="text-2xl" style={{ color: "#F97316" }} />,
      color: "#F97316",
      path: "/reports/pullout",
      stats: dashboardData?.pullout,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      {/* =========================================================
          HERO HEADER
      ========================================================= */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 shadow-[0_20px_50px_rgba(67,20,7,0.20)]">
        {/* Decorative background */}
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-orange-500/10 blur-2xl" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="pointer-events-none absolute right-10 top-10 text-[180px] leading-none text-orange-500/5">
          <FireOutlined />
        </div>

        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            {/* Brand / Welcome */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                <FireOutlined />
                Reports Hub
              </div>

              <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Report{" "}
                <span className="text-orange-400">
                  Dashboard
                </span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                Central hub for all management reports
              </p>

              {/* Food badges */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Sales",
                  "Inventory",
                  "Attendance",
                  "Branches",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Report Period */}
            <div className="w-full min-w-60 xl:max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-orange-300">
                <CalendarOutlined />
                Reporting Period
              </div>

              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
                allowClear={false}
                className="h-11! w-full! rounded-xl! border-white/15! hover:border-orange-300! focus:border-orange-500!"
              />

              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={fetchDashboardData}
                loading={loading}
                block
                className="mt-3! h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! font-semibold! shadow-lg! shadow-orange-500/20! transition-all duration-300 hover:from-orange-700! hover:to-amber-600!"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* =====================================================
              KEY METRICS / KPI CARDS
          ===================================================== */}
          {dashboardData && (
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {/* Total Revenue */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/45">
                      Total Revenue
                    </p>

                    <Statistic
                      value={dashboardData.total_revenue}
                      formatter={(value) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      styles={{ content: { color: "#FFFFFF", fontWeight: 700, fontSize: 22 } }}
                    />
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <DollarOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Total Transactions */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/45">
                      Total Transactions
                    </p>

                    <Statistic
                      value={dashboardData.total_transactions}
                      styles={{ content: { color: "#FFFFFF", fontWeight: 700, fontSize: 22 } }}
                    />
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                    <BarChartOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Low Stock Items */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/45">
                      Low Stock Items
                    </p>

                    <Statistic
                      value={dashboardData.low_stock_count}
                      styles={{
                        content: {
                          color: dashboardData.low_stock_count > 0 ? "#f87171" : "#4ade80",
                          fontWeight: 700,
                          fontSize: 22,
                        },
                      }}
                    />
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      dashboardData.low_stock_count > 0
                        ? "bg-red-500/15 text-red-400"
                        : "bg-green-500/15 text-green-400"
                    }`}
                  >
                    <WarningOutlined className="text-xl" />
                  </div>
                </div>
              </div>

              {/* Attendance Rate */}
              <div className="group rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/9">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/45">
                      Attendance Rate
                    </p>

                    <Statistic
                      value={dashboardData.attendance_rate}
                      suffix="%"
                      styles={{
                        content: {
                          color: dashboardData.attendance_rate >= 90 ? "#4ade80" : "#fbbf24",
                          fontWeight: 700,
                          fontSize: 22,
                        },
                      }}
                    />
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      dashboardData.attendance_rate >= 90
                        ? "bg-green-500/15 text-green-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    <CalendarOutlined className="text-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Row gutter={[18, 18]}>
        {/* Alerts */}
        {dashboardData && dashboardData.alerts && dashboardData.alerts.length > 0 && (
          <Col span={24}>
            <Alert
              message={
                <span className="font-semibold text-amber-800">
                  Attention Required
                </span>
              }
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }} className="text-amber-700">
                  {dashboardData.alerts.map((alert, index) => (
                    <li key={index}>{alert}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
              closable
              className="rounded-2xl! border-amber-200! bg-amber-50!"
            />
          </Col>
        )}

        {/* Report Cards Section Header */}
        <Col span={24}>
          <div className="mb-1 mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <FileTextOutlined />
              </div>

              <div>
                <Title level={4} className="mb-0! text-2xl! font-bold! tracking-tight! text-stone-900!">
                  Available Reports
                </Title>

                <p className="mt-1 text-sm text-stone-500">
                  Generate and manage reports from your operations.
                </p>
              </div>
            </div>
          </div>
        </Col>

        {/* Report Cards */}
        {reportCards.map((card) => (
          <Col xs={24} sm={12} md={8} key={card.path}>
            <Card
              hoverable
              bordered={false}
              className="group h-full! overflow-hidden! rounded-2xl! border! border-orange-100! shadow-sm! transition-all duration-300 hover:border-orange-200! hover:shadow-[0_18px_40px_rgba(234,88,12,0.12)]!"
              styles={{ body: { padding: 0 } }}
              onClick={() => navigate(card.path)}
            >
              {/* Report Header */}
              <div className="relative overflow-hidden bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 px-5 py-6">
                <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-orange-500/10" />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10">
                    {card.icon}
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white">
                    <RightOutlined />
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div className="p-5">
                <h3 className="truncate text-lg font-bold text-stone-900">
                  {card.title}
                </h3>

                <Text type="secondary" className="mt-1! block text-xs! text-stone-500!">
                  {card.description}
                </Text>

                {card.stats && (
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50/70 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
                      <TrendingUpOutlined className="text-orange-500" />
                      {card.stats.label}
                    </span>

                    <span
                      className="rounded-lg bg-white px-2.5 py-1 text-sm font-bold shadow-sm"
                      style={{ color: card.color }}
                    >
                      {card.stats.value}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        ))}

        {/* Quick Actions */}
        <Col span={24}>
          <Card
            bordered={false}
            className="rounded-2xl! border! border-orange-100! shadow-sm!"
            styles={{ body: { padding: "20px 24px" } }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <DownloadOutlined />
              </div>

              <Title level={5} className="mb-0! text-lg! font-bold! text-stone-900!">
                Quick Actions
              </Title>
            </div>

            <Space wrap size={[10, 10]}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => navigate("/reports/sales")}
                className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! shadow-lg! shadow-orange-500/20! transition-all duration-300 hover:from-orange-700! hover:to-amber-600!"
              >
                Download Sales Report
              </Button>

              <Button
                icon={<CalendarOutlined />}
                onClick={() => navigate("/reports/attendance")}
                className="h-11! rounded-xl! border-orange-300! px-5! font-medium! text-orange-600! hover:border-orange-500! hover:bg-orange-50! hover:text-orange-700!"
              >
                View Attendance
              </Button>

              <Button
                icon={<InboxOutlined />}
                onClick={() => navigate("/reports/inventory")}
                className="h-11! rounded-xl! border-orange-300! px-5! font-medium! text-orange-600! hover:border-orange-500! hover:bg-orange-50! hover:text-orange-700!"
              >
                Check Inventory
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Recent Activity */}
        {dashboardData && dashboardData.recent_activity && (
          <Col span={24}>
            <Card
              bordered={false}
              className="rounded-2xl! border! border-orange-100! shadow-sm!"
              styles={{ body: { padding: "20px 24px" } }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <CalendarOutlined />
                </div>

                <Title level={5} className="mb-0! text-lg! font-bold! text-stone-900!">
                  Recent Report Activity
                </Title>
              </div>

              <Space direction="vertical" style={{ width: "100%" }}>
                {dashboardData.recent_activity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-xl bg-stone-50/60 px-3 py-2.5"
                  >
                    <Text className="text-sm text-stone-700">
                      {activity.description}
                    </Text>

                    <Text type="secondary" className="shrink-0 text-xs!">
                      {dayjs(activity.timestamp).fromNow()}
                    </Text>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ReportDashboard;