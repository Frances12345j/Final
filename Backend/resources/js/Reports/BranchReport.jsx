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
  Progress,
  Tooltip,
  Radio,
} from "antd";
import {
  ShopOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  FileTextOutlined,
  TrophyOutlined,
  TeamOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "../config/api";
import { clientPagination, serverPagination } from "../components/Pagination";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const BranchReport = () => {
  const [loading, setLoading] = useState(false);
  const [branchData, setBranchData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [viewMode, setViewMode] = useState("performance");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });

  const fetchBranchReport = async (page = 1) => {
    setLoading(true);
    try {
      const [branchRes, branchesRes] = await Promise.all([
        api.get("/reports/branches", {
          params: {
            start_date: dateRange[0].format("YYYY-MM-DD"),
            end_date: dateRange[1].format("YYYY-MM-DD"),
            branch_id: selectedBranch,
            view_mode: viewMode,
            page: page,
            per_page: pagination.pageSize,
          },
        }),
        api.get("/branches"),
      ]);

      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
      const data = branchRes.data || {};
      
      setBranchData(data.data || []);
      setSummary(data.summary || null);
      if (data.pagination) {
        setPagination({
          current: data.pagination.current_page,
          pageSize: data.pagination.per_page,
          total: data.pagination.total,
        });
      }
    } catch (err) {
      console.error("[BranchReport] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchReport(1);
  }, [dateRange, selectedBranch, viewMode]);

  const handleTableChange = (pagination) => {
    fetchBranchReport(pagination.current);
  };

  const handleExport = () => {
    const csvContent = [
      ["Branch", "Location", "Total Sales", "Transactions", "Avg Transaction", "Staff Count", "Sales/Staff", "Growth %"],
      ...branchData.map(row => [
        row.name,
        row.location,
        row.total_sales,
        row.transaction_count,
        row.avg_transaction,
        row.staff_count,
        row.sales_per_staff,
        row.growth,
      ]),
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branch_report_${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
  };

  const performanceColumns = [
    {
      title: "Branch",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text>
        </div>
      ),
    },
    {
      title: "Total Sales",
      dataIndex: "total_sales",
      key: "total_sales",
      sorter: (a, b) => a.total_sales - b.total_sales,
      render: (amount) => (
        <Text strong style={{ color: "#EA580C" }}>
          ₱{Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: "Transactions",
      dataIndex: "transaction_count",
      key: "transaction_count",
      sorter: (a, b) => a.transaction_count - b.transaction_count,
      align: "center",
    },
    {
      title: "Avg/Transaction",
      dataIndex: "avg_transaction",
      key: "avg_transaction",
      sorter: (a, b) => a.avg_transaction - b.avg_transaction,
      render: (avg) => avg !== null && avg !== undefined ? `₱${Number(avg).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "-",
    },
    {
      title: "Staff Count",
      dataIndex: "staff_count",
      key: "staff_count",
      align: "center",
      render: (count) => (
        <Space>
          <TeamOutlined />
          <Text>{count}</Text>
        </Space>
      ),
    },
    {
      title: "Sales/Staff",
      dataIndex: "sales_per_staff",
      key: "sales_per_staff",
      sorter: (a, b) => a.sales_per_staff - b.sales_per_staff,
      render: (value) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0 })}`,
    },
    {
      title: "Growth",
      dataIndex: "growth",
      key: "growth",
      render: (growth) => {
        if (growth === null || growth === undefined) return "-";
        const isPositive = growth >= 0;
        return (
          <Tag color={isPositive ? "green" : "red"} icon={isPositive ? <RiseOutlined /> : <FallOutlined />}>
            {isPositive ? "+" : ""}{growth.toFixed(1)}%
          </Tag>
        );
      },
    },
  ];

  const comparisonColumns = [
    {
      title: "Metric",
      dataIndex: "metric",
      key: "metric",
      render: (metric) => <Text strong>{metric}</Text>,
    },
  ];

  // Add dynamic columns for each branch
  if (branchData.length > 0) {
    branchData.forEach((branch, index) => {
      comparisonColumns.push({
        title: branch.name,
        dataIndex: `branch_${index}`,
        key: `branch_${index}`,
        render: (value) => <Text>{value}</Text>,
      });
    });
  }

  return (
    <div className="min-h-screen bg-[#FFF7ED] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-stone-950 via-stone-900 to-orange-950 p-6 sm:p-8 shadow-[0_20px_50px_rgba(67,20,7,0.20)] relative">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
              <ShopOutlined />
              Operations Analytics
            </span>
            <Title level={4} style={{ margin: 0 }} className="text-white!">
              Branch <span className="text-orange-400">Report</span>
            </Title>
            <Text className="text-white/60!">Branch performance analysis and comparisons</Text>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="h-11! rounded-xl! border-white/20! px-5! font-medium! text-white! hover:border-orange-400! hover:text-orange-300!"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              className="h-11! rounded-xl! border-none! bg-linear-to-r! from-orange-600! to-amber-500! px-5! font-semibold! text-white! shadow-lg! shadow-orange-500/20!"
              icon={<FileTextOutlined />}
              onClick={fetchBranchReport}
              loading={loading}
            >
              Generate Report
            </Button>
          </div>
        </div>
        {summary && (
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">Total Revenue</div>
              <div className="flex items-center gap-2">
                <DollarOutlined className="text-orange-400" />
                <span className="text-xl font-bold text-[#FDE68A]">
                  ₱{summary.total_revenue != null ? Number(summary.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "-"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">Transactions</div>
              <div className="flex items-center gap-2">
                <ShoppingOutlined className="text-orange-400" />
                <span className="text-xl font-bold text-[#FDE68A]">
                  {summary.total_transactions != null ? Number(summary.total_transactions).toLocaleString() : "-"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">Avg/Branch</div>
              <div className="flex items-center gap-2">
                <ShopOutlined className="text-orange-400" />
                <span className="text-xl font-bold text-[#FDE68A]">
                  ₱{summary.avg_branch_revenue != null ? Number(summary.avg_branch_revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "-"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">Top Branch</div>
              <div className="flex items-center gap-2">
                <TrophyOutlined className="text-orange-400" />
                <span className="truncate text-xl font-bold text-[#FDE68A]">
                  {summary.top_branch || "-"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Filters */}
        <Col span={24}>
          <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <Text strong>Date Range:</Text>
              <RangePicker
                className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
                allowClear={false}
              />
              <Text strong>Branch:</Text>
              <Select
                className="h-11!"
                popupClassName="rounded-xl!"
                style={{ width: 200 }}
                placeholder="All Branches"
                allowClear
                value={selectedBranch}
                onChange={setSelectedBranch}
              >
                {Array.isArray(branches) && branches.map((branch) => (
                  <Select.Option key={branch.id} value={branch.id}>
                    {branch.name}
                  </Select.Option>
                ))}
              </Select>
              <Text strong>View:</Text>
              <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                <Radio.Button value="performance">Performance</Radio.Button>
                <Radio.Button value="comparison">Comparison</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        </Col>

        {/* Performance Table */}
        {viewMode === "performance" && (
          <Col span={24}>
            <div className="rounded-2xl border border-orange-100 bg-white shadow-xs">
              <div className="border-b border-orange-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
                    <TrophyOutlined />
                  </div>
                  <h3 className="m-0 text-base font-bold text-stone-800">Branch Performance Rankings</h3>
                </div>
              </div>
              <div className="p-5">
                <Table
                  columns={performanceColumns}
                  dataSource={branchData}
                  rowKey="id"
                  loading={loading}
                  pagination={serverPagination(pagination, { label: "branches" })}
                  onChange={handleTableChange}
                  scroll={{ x: true }}
                />
              </div>
            </div>
          </Col>
        )}

        {/* Comparison Table */}
        {viewMode === "comparison" && summary && summary.comparison && (
          <Col span={24}>
            <div className="rounded-2xl border border-orange-100 bg-white shadow-xs">
              <div className="border-b border-orange-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
                    <ShopOutlined />
                  </div>
                  <h3 className="m-0 text-base font-bold text-stone-800">Branch Comparison</h3>
                </div>
              </div>
              <div className="p-5">
                <Table
                  columns={comparisonColumns}
                  dataSource={summary.comparison}
                  rowKey="metric"
                  loading={loading}
                  pagination={clientPagination({ label: "metrics" })}
                  scroll={{ x: true }}
                />
              </div>
            </div>
          </Col>
        )}

        {/* Performance Distribution */}
        {summary && summary.performance_distribution && (
          <Col span={24}>
            <div className="rounded-2xl border border-orange-100 bg-white shadow-xs">
              <div className="border-b border-orange-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20">
                    <DollarOutlined />
                  </div>
                  <h3 className="m-0 text-base font-bold text-stone-800">Revenue Distribution</h3>
                </div>
              </div>
              <div className="p-5">
                <Row gutter={[16, 16]}>
                  {summary.performance_distribution.map((item) => (
                    <Col xs={24} sm={12} md={8} key={item.branch_id}>
                      <div className="rounded-xl border border-orange-100 bg-[#FFFBF7] p-4">
                        <Text strong className="text-stone-800!">{item.branch_name}</Text>
                        <Progress
                          percent={item.percentage}
                          status={item.percentage >= 30 ? "success" : item.percentage >= 15 ? "normal" : "exception"}
                          strokeColor={{
                            "0%": "#F97706",
                            "50%": "#D97706",
                            "100%": "#EA580C",
                          }}
                        />
                        <Text type="secondary">
                          ₱{Number(item.revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ({item.percentage}%)
                        </Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default BranchReport;