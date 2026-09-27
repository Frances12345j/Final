import { useState, useEffect, useRef } from "react";
import {
  Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Tooltip, Upload, InputNumber, DatePicker, Row, Col
} from "antd";
import {
  PlusOutlined,
  ShoppingOutlined,
  DeleteOutlined,
  BoxPlotOutlined,
  BranchesOutlined,
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  UserOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, API_BASE_URL } from "@/config/api";
import { getCache, setCache, invalidateCache } from "@/utils/cache";
import { clientPagination, serverPagination } from "@/components/Pagination";
import { getAuthUser } from "@/utils/authStorage";

function formatRestockedAtUtcClock(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hh, mm, ss = "00"] = match;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = monthNames[parseInt(month, 10) - 1] || month;
  const hour24 = parseInt(hh, 10);
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${monthName} ${parseInt(day, 10)}, ${year}, ${String(hour12).padStart(2, "0")}:${mm}:${ss} ${ampm}`;
}

function StockInForm({ form, product, branches, onSubmit, onCancel, currentUserName }) {
  const quantity = Form.useWatch("quantity", form);
  const costPerUnit = Form.useWatch("cost_per_unit", form);
  const qty = Number(quantity) || 0;
  const unitCost = Number(costPerUnit) || 0;
  const totalCost = qty * unitCost;

  const fieldLabel = (text) => <span className="text-[#451A03] font-medium">{text}</span>;

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label={fieldLabel("Product")}>
            <Input
              value={product?.name || ""}
              disabled
              prefix={<ShoppingOutlined className="text-[#F97316]" />}
              className="rounded-xl bg-[#FFFBF5]"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Branch")}
            name="branch_id"
            rules={[{ required: true, message: "Please select a branch" }]}
          >
            <Select placeholder="Select Branch" className="rounded-xl">
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Quantity Added")}
            name="quantity"
            rules={[{ required: true, message: "Please enter quantity" }]}
          >
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              placeholder="Enter quantity added"
              className="rounded-xl"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Supplier")} name="supplier">
            <Input placeholder="Enter supplier name" className="rounded-xl" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Cost per Unit (₱)")}
            name="cost_per_unit"
            rules={[{ type: "number", min: 0, message: "Cost cannot be negative" }]}
          >
            <InputNumber
              min={0}
              step={0.5}
              style={{ width: "100%" }}
              placeholder="Enter cost per unit"
              className="rounded-xl"
              prefix="₱"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Total Cost (₱)")}>
            <Input
              value={totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              disabled
              className="rounded-xl bg-[#FFFBF5] font-semibold text-green-600"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Date")} name="restocked_at">
            <DatePicker className="rounded-xl" style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Staff / Admin")}>
            <Input
              value={currentUserName}
              disabled
              prefix={<UserOutlined className="text-[#451A03]" />}
              className="rounded-xl bg-[#FFFBF5]"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Notes")} name="notes">
            <Input.TextArea rows={2} placeholder="Optional notes about this stock in" className="rounded-xl" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item className="mb-0 mt-2">
        <Space className="w-full justify-end">
          <Button onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-amber border-none shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:opacity-90 hover:brightness-110 transition-all duration-200"
          >
            Add Stock
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

const PULL_OUT_REASONS = ["Sales", "Damage", "Pull-out", "Spoilage", "Expired", "Wastage", "Breakage", "Adjustment", "Other"];

// The product families the Inventory Deliveries & Expenses report groups by.
// Keep in sync with App\Models\Product::INVENTORY_CATEGORY_*.
const PRODUCT_CATEGORIES = ["Lechon Manok", "Liempo"];

function PullOutForm({ form, product, branches, onSubmit, onCancel, currentUserName, allowedReasons }) {
  const fieldLabel = (text) => <span className="text-[#451A03] font-medium">{text}</span>;

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item label={fieldLabel("Product")}>
            <Input
              value={product?.name || ""}
              disabled
              prefix={<ShoppingOutlined className="text-[#F97316]" />}
              className="rounded-xl bg-[#FFFBF5]"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Branch")}
            name="branch_id"
            rules={[{ required: true, message: "Please select a branch" }]}
          >
            <Select placeholder="Select Branch" className="rounded-xl">
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Quantity")}
            name="quantity"
            rules={[{ required: true, message: "Please enter quantity" }]}
          >
            <InputNumber
              min={0.5}
              step={0.5}
              style={{ width: "100%" }}
              placeholder="Enter quantity out"
              className="rounded-xl"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={fieldLabel("Reason")}
            name="reason"
            rules={[{ required: true, message: "Please select a reason" }]}
          >
            <Select placeholder="Select reason" className="rounded-xl">
              {allowedReasons.map((r) => (
                <Select.Option key={r} value={r}>{r}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Date")} name="stock_out_date">
            <DatePicker className="rounded-xl" style={{ width: "100%" }} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Staff")}>
            <Input
              value={currentUserName}
              disabled
              prefix={<UserOutlined className="text-[#451A03]" />}
              className="rounded-xl bg-[#FFFBF5]"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={fieldLabel("Reference / Transaction")} name="reference">
            <Input placeholder="e.g. INV-0001, SO-2026-01" className="rounded-xl" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item className="mb-0 mt-2">
        <Space className="w-full justify-end">
          <Button onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-amber border-none shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:opacity-90 hover:brightness-110 transition-all duration-200"
          >
            Save Pull Out
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

function ProductList() {
  const [products, setProducts] = useState(() => getCache('products') || []);
  const [branches, setBranches] = useState(() => getCache('branches') || []);
  const [loading, setLoading] = useState(() => !getCache('products') || !getCache('branches'));
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRestockModalVisible, setIsRestockModalVisible] = useState(false);
  const [isPullOutModalVisible, setIsPullOutModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [hasEditImage, setHasEditImage] = useState(false);
  const [editImageFileName, setEditImageFileName] = useState('');
  const editImageFileRef = useRef(null);
  const [hasImage, setHasImage] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const imageFileRef = useRef(null);
  const [restockForm] = Form.useForm();
  const [pullOutForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Ref to prevent overlapping fetches
  const inFlightRef = useRef(false);

  const currentUser = getAuthUser() || {};
  const currentUserName =
    currentUser.name ||
    `${currentUser.firstname || ""} ${currentUser.lastname || ""}`.trim() ||
    currentUser.username ||
    "Admin";
  const allowedPullOutReasons = PULL_OUT_REASONS;

  // ─── loadData with `silent` mode for background refresh ────────────
  const loadData = async (forceRefresh = false, silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (!silent) setLoading(true);
    try {
      const cachedProducts = forceRefresh ? null : getCache('products');
      const cachedBranches = forceRefresh ? null : getCache('branches');
      if (cachedProducts && cachedBranches && !forceRefresh) {
        setProducts(cachedProducts);
        setBranches(cachedBranches);
        if (!silent) setLoading(false);
        inFlightRef.current = false;
        return;
      }
      const [productsRes, branchesRes] = await Promise.all([
        api.get("/products", { params: { include_inactive: true } }),
        api.get("/branches"),
      ]);
      const productsData = productsRes.data.data || [];
      const branchesData = branchesRes.data.data || [];
      setProducts(productsData);
      setBranches(branchesData);
      setCache('products', productsData);
      setCache('branches', branchesData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load products:", error);
      if (!silent) {
        message.error("Failed to load products from backend.");
        setProducts([]);
        setBranches([]);
      }
    } finally {
      if (!silent) setLoading(false);
      inFlightRef.current = false;
    }
  };

  // ─── Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    const hasCache = Boolean(getCache('products') && getCache('branches'));
    loadData(false, hasCache);
  }, []);

  // ─── AUTO-REFRESH #1: Poll every 10 seconds (silent) ───────────────
  useEffect(() => {
    const POLL_INTERVAL = 10000; // 10 seconds

    const interval = setInterval(() => {
      // Skip when tab is hidden — saves bandwidth
      if (typeof document !== "undefined" && document.hidden) return;
      loadData(true, true);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // ─── AUTO-REFRESH #2: When user returns to the tab ─────────────────
  useEffect(() => {
    const onFocus = () => loadData(true, true);
    const onVisibilityChange = () => {
      if (!document.hidden) loadData(true, true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, []);

  // ─── AUTO-REFRESH #3: When network reconnects ──────────────────────
  useEffect(() => {
    const onOnline = () => loadData(true, true);
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    };
  }, []);

  useEffect(() => {
    if (isCreateModalVisible) {
      setHasImage(false);
      setImageFileName('');
      imageFileRef.current = null;
    }
  }, [isCreateModalVisible]);

  const handleCreateProduct = async () => {
    try {
      const values = await createForm.validateFields();
      const file = imageFileRef.current;
      let payload;

      if (file && file instanceof File) {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('price', values.price);
        formData.append('category', values.category || '');
        formData.append('image', file);
        values.branches?.forEach((b) => formData.append('branches[]', b));
        payload = formData;
      } else {
        payload = {
          name: values.name,
          price: values.price,
          category: values.category || null,
          branches: values.branches,
        };
      }

      const { data } = await api.post("/products", payload);
      setProducts([data, ...products]);
      invalidateCache('products');
      message.success(`${values.name} has been created successfully.`);
      setIsCreateModalVisible(false);
      createForm.resetFields();
      setHasImage(false);
      setImageFileName('');
      imageFileRef.current = null;
      // Immediate refresh so all branches reflect
      loadData(true, true);
    } catch (error) {
      if (error.errorFields) return;
      const errData = error?.response?.data;
      const errMsg = errData?.error || errData?.message || "Failed to create product";
      if (errData?.errors) {
        const details = Object.entries(errData.errors).map(([k, v]) => `${k}: ${v.join?.('; ') || v}`).join(' | ');
        message.error(`${errMsg} (${details})`);
      } else {
        message.error(errMsg);
      }
    }
  };

  const handleRestock = async () => {
    try {
      const values = await restockForm.validateFields();
      await api.post(`/products/${selectedProduct.id}/restock`, {
        branch_id: values.branch_id,
        quantity: values.quantity,
        supplier: values.supplier || null,
        cost_per_unit: values.cost_per_unit ?? null,
        notes: values.notes || null,
        restocked_at: values.restocked_at ? values.restocked_at.format("YYYY-MM-DD") : null,
      });
      message.success(`Stock added for ${selectedProduct.name}`);
      setIsRestockModalVisible(false);
      restockForm.resetFields();
      setSelectedProduct(null);
      invalidateCache('products');
      await loadData(true, true);
    } catch (error) {
      if (error.errorFields) return;
      message.error(error?.response?.data?.message || "Failed to restock product");
    }
  };

  const handlePullOut = async () => {
    try {
      const values = await pullOutForm.validateFields();
      await api.post(`/products/${selectedProduct.id}/pull-out`, {
        branch_id: values.branch_id,
        quantity: values.quantity,
        reason: values.reason,
        stock_out_date: values.stock_out_date ? values.stock_out_date.format("YYYY-MM-DD") : null,
        reference: values.reference || null,
      });
      message.success(`Pull Out recorded for ${selectedProduct.name}`);
      setIsPullOutModalVisible(false);
      pullOutForm.resetFields();
      setSelectedProduct(null);
      invalidateCache('products');
      await loadData(true, true);
    } catch (error) {
      if (error.errorFields) return;
      message.error(error?.response?.data?.message || error?.response?.data?.error || "Failed to record Pull Out");
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setProducts(products.filter(p => p.id !== deleteTarget.id));
      invalidateCache('products');
      message.success(`${deleteTarget.name} has been deleted`);
      setIsDeleteModalVisible(false);
      setDeleteTarget(null);
      loadData(true, true);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to delete product");
    }
  };

  const isProductActive = (value) => value === true || value === 1 || value === "1";

  const toggleProductActive = async () => {
    if (!statusTarget) return;
    const nextActive = !isProductActive(statusTarget?.is_active);
    try {
      await api.put(`/products/${statusTarget.id}`, { is_active: nextActive });
      invalidateCache("products");
      await loadData(true, true);
      message.success(nextActive ? "Product enabled." : "Product disabled.");
      setIsStatusModalVisible(false);
      setStatusTarget(null);
      setStatusAction(null);
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update product status");
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const values = await editForm.validateFields();
      const file = editImageFileRef.current;
      const productId = editTarget?.id;

      if (file && file instanceof File) {
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('name', values.name);
        formData.append('price', values.price);
        formData.append('category', values.category || '');
        formData.append('image', file);
        await api.post(`/products/${productId}`, formData);
      } else {
        await api.put(`/products/${productId}`, {
          name: values.name,
          price: values.price,
          category: values.category || null,
        });
      }

      invalidateCache('products');
      await loadData(true, true);
      message.success(`${values.name} has been updated.`);
      setIsEditModalVisible(false);
      setEditTarget(null);
      editImageFileRef.current = null;
      setHasEditImage(false);
      setEditImageFileName('');
    } catch (error) {
      if (error.errorFields) return;
      const errData = error?.response?.data;
      const errMsg = errData?.error || errData?.message || "Failed to update product";
      if (errData?.errors) {
        const details = Object.entries(errData.errors).map(([k, v]) => `${k}: ${v.join?.('; ') || v}`).join(' | ');
        message.error(`${errMsg} (${details})`);
      } else {
        message.error(errMsg);
      }
    }
  };

  const getTotalStock = (product) => {
    if (!product.product_stocks) return 0;
    return product.product_stocks.reduce((sum, stock) => sum + (stock.received ? stock.quantity : 0), 0);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getBranchProductStocks = () => {
    const branchMap = new Map();
    branches.forEach(branch => {
      branchMap.set(branch.id, { branch, stocks: [] });
    });

    filteredProducts.forEach(product => {
      const perBranch = new Map();

      (product.product_stocks || []).forEach(stock => {
        if (!branchMap.has(stock.branch_id)) return;
        const key = `${stock.branch_id}:${product.id}`;
        const current = perBranch.get(key) || {
          id: key, branch_id: stock.branch_id, product, receivedQty: 0, minimum_stock: 0,
          pendingQty: 0, notReceivedQty: 0, lastRestockedAt: null, deliveries: [],
        };
        current.receivedQty = Number(stock.quantity || 0);
        current.minimum_stock = stock.minimum_stock || 0;
        if (stock.restocked_at) current.lastRestockedAt = stock.restocked_at;
        perBranch.set(key, current);
      });

      (product.ongoing_stocks || []).forEach(delivery => {
        if (!branchMap.has(delivery.branch_id)) return;
        const key = `${delivery.branch_id}:${product.id}`;
        const current = perBranch.get(key);
        if (!current) return;

        const qty = Number(delivery.quantity || 0);
        if (delivery.marked_as_not_received && !delivery.received_at) {
          current.notReceivedQty += qty;
        } else if (!delivery.received_at) {
          current.pendingQty += qty;
        }
        current.deliveries.push({
          id: delivery.id, quantity: qty, restocked_at: delivery.restocked_at,
          received_at: delivery.received_at, marked_as_not_received: !!delivery.marked_as_not_received,
          not_received_at: delivery.not_received_at,
        });
        if (delivery.restocked_at) {
          const prevMs = current.lastRestockedAt ? new Date(current.lastRestockedAt).getTime() : NaN;
          const nextMs = new Date(delivery.restocked_at).getTime();
          if (!Number.isNaN(nextMs) && (Number.isNaN(prevMs) || nextMs > prevMs)) {
            current.lastRestockedAt = delivery.restocked_at;
          }
        }
        perBranch.set(key, current);
      });

      perBranch.forEach((row) => {
        if (branchMap.has(row.branch_id)) {
          branchMap.get(row.branch_id).stocks.push(row);
        }
      });
    });

    return Array.from(branchMap.values());
  };

  const branchProductStocks = getBranchProductStocks();

  const tableData = [];
  branchProductStocks.forEach(({ branch, stocks }) => {
    stocks.forEach((stock) => {
      tableData.push({ ...stock, branchName: branch.name, branchId: branch.id });
    });
  });

  const filteredTableData = branchFilter === "all"
    ? tableData
    : tableData.filter((d) => String(d.branchId) === branchFilter);

  const totalProducts = products.length;
  const parseProductPrice = (p) => { const n = Number(p?.price); return Number.isFinite(n) ? n : NaN; };
  const totalStockValue = products.reduce((sum, product) => {
    const price = parseProductPrice(product);
    const qty = getTotalStock(product);
    return sum + (Number.isFinite(price) ? qty * price : 0);
  }, 0);
  const validPrices = products.map(parseProductPrice).filter((n) => Number.isFinite(n));
  const avgPrice = validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;

  const formatCurrency = (amount) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const columns = [
    {
      title: "Branch",
      key: "branch",
      render: (_, r) => (
        <span><BranchesOutlined className="mr-1 text-orange-500" />{r.branchName}</span>
      ),
    },
    {
      title: "Product",
      key: "product",
      render: (_, r) => (
        <div className="flex items-center gap-3">
          {r.product.image ? (
            <img
              src={`${API_BASE_URL.replace('/api', '')}/storage/${r.product.image}`}
              alt={r.product.name}
              className="w-11 h-11 object-cover rounded-xl border border-[#F5EDE0] shadow-sm bg-white"
            />
          ) : (
            <div className="w-11 h-11 bg-linear-to-br from-[#FFF1E6] to-[#FFE3C9] rounded-xl flex items-center justify-center text-[#F97316] text-sm shadow-sm">
              <ShoppingOutlined />
            </div>
          )}
          <span className="font-semibold text-[#292524]">{r.product.name}</span>
        </div>
      ),
    },
    {
      title: "Price",
      key: "price",
      render: (_, r) => <span className="text-[#EA580C] font-bold">{formatCurrency(r.product.price)}</span>,
    },
    {
      title: "Stock Level",
      key: "stock",
      render: (_, r) => {
        const receivedQty = Number(r.receivedQty || 0);
        const minStock = Number(r.minimum_stock || 0);
        const isLowStock = minStock > 0 && receivedQty < minStock;
        const stockPercentage = Math.min((receivedQty / 100) * 100, 100);
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isLowStock ? 'text-[#EA580C]' : 'text-[#275E3A]'}`}>{receivedQty}</span>
              <span className="text-xs text-gray-500">Stock</span>
            </div>
            <div className="w-32 bg-[#F5EDE0] rounded-full h-1.5 mt-1">
              <div className={`h-1.5 rounded-full ${isLowStock ? 'bg-linear-to-r from-[#EA580C] to-amber' : 'bg-linear-to-r from-[#22C55E] to-[#16A34A]'}`} style={{ width: `${stockPercentage}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      title: "Ongoing",
      key: "ongoing",
      render: (_, r) => {
        const pendingQty = Number(r.pendingQty || 0);
        const notReceivedQty = Number(r.notReceivedQty || 0);
        if (pendingQty > 0) return <Tag color="orange">{pendingQty} pending</Tag>;
        if (notReceivedQty > 0) return <Tag color="red">{notReceivedQty} not received</Tag>;
        return <span className="text-gray-400">—</span>;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) => {
        const minStock = Number(r.minimum_stock || 0);
        const receivedQty = Number(r.receivedQty || 0);
        const isLowStock = minStock > 0 && receivedQty < minStock;
        return isLowStock
          ? <Tag color="orange" icon={<WarningOutlined />}>Low Stock</Tag>
          : <Tag color="green">In Stock</Tag>;
      },
    },
    {
      title: "Last Restocked",
      key: "lastRestocked",
      render: (_, r) => {
        const formatted = formatRestockedAtUtcClock(r.lastRestockedAt);
        return formatted ? <span className="text-xs">{formatted}</span> : <span className="text-gray-400 text-xs">Never</span>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <div className="flex flex-wrap gap-1.5 w-42.5">
          <Tooltip title="Restock">
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedProduct(r.product);
                restockForm.setFieldsValue({
                  branch_id: r.branchId,
                  quantity: 1,
                  supplier: "",
                  cost_per_unit: undefined,
                  notes: "",
                  restocked_at: dayjs(),
                });
                setIsRestockModalVisible(true);
              }}
              className="rounded-full bg-linear-to-br from-[#EA580C] to-amber text-white border-none text-[11px] hover:brightness-110 transition-all duration-200 shadow-[0_2px_8px_rgba(234,88,12,0.3)]"
            >
              Restock
            </Button>
          </Tooltip>
          <Tooltip title="Pull Out">
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={() => {
                setSelectedProduct(r.product);
                pullOutForm.setFieldsValue({
                  branch_id: r.branchId,
                  quantity: 1,
                  reason: "Sales",
                  stock_out_date: dayjs(),
                  reference: "",
                });
                setIsPullOutModalVisible(true);
              }}
              className="rounded-full border-[#F97316] text-[#EA580C] text-[11px] hover:bg-[#FFF1E6] hover:border-[#F97316] transition-all duration-200"
            >
              Pull Out
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<ShoppingOutlined />}
              onClick={() => {
                setEditTarget(r.product);
                editForm.setFieldsValue({
                  name: r.product.name,
                  price: r.product.price,
                  category: r.product.category || undefined,
                });
                editImageFileRef.current = null;
                setHasEditImage(false);
                setEditImageFileName('');
                setIsEditModalVisible(true);
              }}
              className="rounded-full border border-stone-300 text-stone-600 text-[11px] hover:bg-stone-100 transition-all duration-200"
            >
              Edit
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setDeleteTarget(r.product);
                setIsDeleteModalVisible(true);
              }}
              className="rounded-full text-[11px] transition-all duration-200"
            >
              Delete
            </Button>
          </Tooltip>
          <Tooltip title={isProductActive(r.product?.is_active) ? "Disable" : "Enable"}>
            <Button
              size="small"
              type={isProductActive(r.product?.is_active) ? "default" : "primary"}
              onClick={() => {
                setStatusTarget(r.product);
                setStatusAction(!isProductActive(r.product?.is_active));
                setIsStatusModalVisible(true);
              }}
              className={`rounded-full text-[11px] transition-all duration-200 ${isProductActive(r.product?.is_active)
                ? "border border-stone-300 text-stone-500 hover:bg-stone-100"
                : "bg-linear-to-br from-[#EA580C] to-amber border-none text-white hover:brightness-110"
                }`}
            >
              {isProductActive(r.product?.is_active) ? "Disable" : "Enable"}
            </Button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-linear-to-br from-[#FFF8ED]/80 via-[#FFFDF9] to-[#FFF1E6]/80 min-h-screen">
      {/* Header - NewMoon Roasted Style */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-[0_12px_35px_rgba(69,26,3,0.25)] bg-linear-to-br from-[#171717] via-[#3B2418] to-[#451A03]">
        <div className="px-8 py-6 relative">
          {/* Decorative circles */}
          <div className="absolute right-0 top-0 opacity-10">
            <div className="w-64 h-64 rounded-full bg-[#F97316] -mr-32 -mt-32"></div>
          </div>
          <div className="absolute bottom-0 left-1/3 opacity-5">
            <div className="w-48 h-48 rounded-full bg-amber"></div>
          </div>

          {/* Flame accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-[#EA580C] via-[#F97316] to-amber" />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                <ShoppingOutlined className="mr-2 text-[#F97316]" />
                Products Management
              </h1>
              <p className="text-white/80 text-sm">Manage your product inventory and stock levels across all branches</p>
              <p className="text-white/50 text-[11px] mt-1 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {lastUpdated
                  ? `Live · Updated ${lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Connecting…'}
              </p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5 relative z-10">
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-white/70 text-xs flex items-center gap-1.5">
                <ShoppingOutlined className="text-[#F97316]" /> Total Products
              </p>
              <p className="text-white font-bold text-xl mt-1">{totalProducts}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-white/70 text-xs flex items-center gap-1.5">
                <BoxPlotOutlined className="text-[#F97316]" /> Total Stock Value
              </p>
              <p className="font-bold text-xl mt-1 text-[#FDE68A]">{formatCurrency(totalStockValue)}</p>
            </div>
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 col-span-2 md:col-span-1 border border-white/10">
              <p className="text-white/70 text-xs flex items-center gap-1.5">
                <InfoCircleOutlined className="text-[#F97316]" /> Average Price
              </p>
              <p className="font-bold text-xl mt-1 text-[#FDE68A]">{formatCurrency(avgPrice)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - NewMoon Style */}
      <Card className="mb-6 rounded-xl border border-[#F5EDE0] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Space wrap>
            <Input
              placeholder="Search product..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 250 }}
              allowClear
              className="rounded-xl"
            />
            <Select
              value={branchFilter}
              onChange={setBranchFilter}
              style={{ width: 180 }}
              placeholder="Filter by branch"
              className="rounded-xl"
            >
              <Select.Option value="all">All Branches</Select.Option>
              {branches.map((b) => (
                <Select.Option key={b.id} value={String(b.id)}>{b.name}</Select.Option>
              ))}
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadData(true)}
              loading={loading}
              className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316] transition-all duration-200"
            >
              Refresh
            </Button>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
            className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-amber border-none shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:opacity-90 hover:brightness-110 transition-all duration-200"
          >
            Create New Product
          </Button>
        </div>
      </Card>

      {/* Product Inventory Section - NewMoon Style */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#451A03]">
              <ShoppingOutlined className="mr-2 text-[#F97316]" />
              Product Inventory
            </h2>
            <p className="text-sm text-gray-500 mt-1">Track stock levels across all branches</p>
          </div>
          <Tag className="text-sm px-3 py-1 rounded-full bg-linear-to-br from-[#EA580C] to-amber text-white border-none">
            {filteredTableData.length} stock entries
          </Tag>
        </div>
      </div>

      <Card
        className="rounded-xl border border-[#F5EDE0] shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={filteredTableData}
          rowKey="id"
          loading={loading}
          pagination={clientPagination({ label: "products" })}
          locale={{ emptyText: <div className="py-10 text-center"><div className="w-16 h-16 mx-auto bg-linear-to-br from-[#FFF1E6] to-[#FFE3C9] rounded-2xl flex items-center justify-center mb-3"><BoxPlotOutlined className="text-3xl text-[#F97316]" /></div><p className="text-[#451A03] font-semibold">No products found</p><p className="text-gray-400 text-sm">Try adjusting your search or filter</p></div> }}
        />
      </Card>

      {/* Create Product Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <PlusOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">Create New Product</span>
          </span>
        }
        open={isCreateModalVisible}
        onCancel={() => { setIsCreateModalVisible(false); createForm.resetFields(); setHasImage(false); setImageFileName(''); imageFileRef.current = null; }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateProduct}>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Product Name</span>}
            name="name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input
              placeholder="Enter product name"
              className="rounded-xl border-[#F5EDE0]"
            />
          </Form.Item>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Price (₱)</span>}
            name="price"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <Input
              type="number"
              min={0}
              step={10}
              placeholder="Enter price"
              className="rounded-xl border border-[#F5EDE0]"
            />
          </Form.Item>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Category</span>}
            name="category"
            extra="Decides which column this product appears under in the Inventory Deliveries &amp; Expenses report."
          >
            <Select allowClear placeholder="Select category" className="rounded-xl border border-[#F5EDE0]">
              {PRODUCT_CATEGORIES.map((category) => (
                <Select.Option key={category} value={category}>{category}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="mb-4">
            <div className="font-medium text-[#451A03] mb-1">Product Image (optional)</div>

            <Upload
              listType="picture-card"
              showUploadList={{ showPreviewIcon: false }}
              beforeUpload={(file) => { imageFileRef.current = file; setHasImage(true); setImageFileName(file.name); return false; }}
              onRemove={() => { imageFileRef.current = null; setHasImage(false); setImageFileName(''); return true; }}
              maxCount={1}
              fileList={hasImage ? [{ uid: '-1', name: imageFileName, status: 'done' }] : []}
            >
              {!hasImage && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </div>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Select Branches</span>}
            name="branches"
            rules={[{ required: true, message: "Please select at least one branch", type: "array", min: 1 }]}
          >
            <Select mode="multiple" placeholder="Select branches" className="rounded-xl">
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="p-3 mb-4 rounded-xl bg-[#FFF1E6]">
            <p className="text-xs text-[#451A03] mb-0">
              <InfoCircleOutlined className="mr-1" />
              Product will be created with 0 stock for selected branches. You can add stock later using the "Restock" button.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setIsCreateModalVisible(false); createForm.resetFields(); setHasImage(false); setImageFileName(''); imageFileRef.current = null; }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-amber border-none shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:opacity-90 hover:brightness-110 transition-all duration-200"
              >
                Create Product
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Product Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <ShoppingOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">Edit Product</span>
          </span>
        }
        open={isEditModalVisible}
        onCancel={() => { setIsEditModalVisible(false); setEditTarget(null); editImageFileRef.current = null; setHasEditImage(false); setEditImageFileName(''); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateProduct}>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Product Name</span>}
            name="name"
            rules={[{ required: true, message: "Please enter product name" }]}
          >
            <Input
              placeholder="Enter product name"
              className="rounded-xl border-[#F5EDE0]"
            />
          </Form.Item>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Price (₱)</span>}
            name="price"
            rules={[{ required: true, message: "Please enter price" }]}
          >
            <Input
              type="number"
              min={0}
              step={10}
              placeholder="Enter price"
              className="rounded-xl border border-[#F5EDE0]"
            />
          </Form.Item>
          <Form.Item
            label={<span className="text-[#451A03] font-medium">Category</span>}
            name="category"
            extra="Decides which column this product appears under in the Inventory Deliveries &amp; Expenses report."
          >
            <Select allowClear placeholder="Select category" className="rounded-xl border border-[#F5EDE0]">
              {PRODUCT_CATEGORIES.map((category) => (
                <Select.Option key={category} value={category}>{category}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editTarget?.image && (

            <div className="mb-4">
              <div className="font-medium text-[#451A03] mb-1">Current Image</div>
              <img
                src={`${API_BASE_URL.replace('/api', '')}/storage/${editTarget.image}`}
                alt={editTarget.name}
                className="w-20 h-20 object-cover rounded-xl"
              />
            </div>
          )}
          <div className="mb-4">
            <div className="font-medium text-[#451A03] mb-1">New Image (optional)</div>
            <Upload
              listType="picture-card"
              showUploadList={{ showPreviewIcon: false }}
              beforeUpload={(file) => { editImageFileRef.current = file; setHasEditImage(true); setEditImageFileName(file.name); return false; }}
              onRemove={() => { editImageFileRef.current = null; setHasEditImage(false); setEditImageFileName(''); return true; }}
              maxCount={1}
              fileList={hasEditImage ? [{ uid: '-1', name: editImageFileName, status: 'done' }] : []}
            >
              {!hasEditImage && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setIsEditModalVisible(false); setEditTarget(null); editImageFileRef.current = null; setHasEditImage(false); setEditImageFileName(''); }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="rounded-xl bg-linear-to-br from-[#EA580C] via-[#F97316] to-amber border-none shadow-[0_4px_15px_rgba(234,88,12,0.35)] hover:opacity-90 hover:brightness-110 transition-all duration-200"
              >
                Update Product
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Stock In / Restocking Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <PlusOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">Stock In / Restocking</span>
          </span>
        }
        open={isRestockModalVisible}
        onCancel={() => { setIsRestockModalVisible(false); restockForm.resetFields(); setSelectedProduct(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
        width={560}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <StockInForm
          form={restockForm}
          product={selectedProduct}
          branches={branches}
          onSubmit={handleRestock}
          onCancel={() => { setIsRestockModalVisible(false); restockForm.resetFields(); setSelectedProduct(null); }}
          currentUserName={currentUserName}
        />
      </Modal>

      {/* Pull Out Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <ExportOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">Pull Out</span>
          </span>
        }
        open={isPullOutModalVisible}
        onCancel={() => { setIsPullOutModalVisible(false); pullOutForm.resetFields(); setSelectedProduct(null); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
        width={560}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <PullOutForm
          form={pullOutForm}
          product={selectedProduct}
          branches={branches}
          onSubmit={handlePullOut}
          onCancel={() => { setIsPullOutModalVisible(false); pullOutForm.resetFields(); setSelectedProduct(null); }}
          currentUserName={currentUserName}
          allowedReasons={allowedPullOutReasons}
        />
      </Modal>

      {/* Delete Confirmation Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <DeleteOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">Delete Product</span>
          </span>
        }
        open={isDeleteModalVisible}
        onCancel={() => { setIsDeleteModalVisible(false); setDeleteTarget(null); }}
        onOk={handleDeleteProduct}
        okText="Delete"
        okButtonProps={{ danger: true, className: "rounded-xl" }}
        cancelText="Cancel"
        confirmLoading={false}
        className="rounded-2xl"
      >
        <p>Are you sure you want to delete <strong className="text-[#F97316]">"{deleteTarget?.name}"</strong>?</p>
        <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
      </Modal>

      {/* Status Toggle Modal - NewMoon Style */}
      <Modal
        title={
          <span>
            <WarningOutlined className="mr-2 text-[#F97316]" />
            <span className="text-[#451A03] font-bold">{statusAction ? "Enable Product" : "Disable Product"}</span>
          </span>
        }
        open={isStatusModalVisible}
        onCancel={() => { setIsStatusModalVisible(false); setStatusTarget(null); setStatusAction(null); }}
        onOk={toggleProductActive}
        okText={statusAction ? "Enable" : "Disable"}
        okButtonProps={{ danger: !statusAction, className: "rounded-xl" }}
        cancelText="Cancel"
        className="rounded-2xl"
      >
        <p>
          {statusAction
            ? `Enable "${statusTarget?.name}" so it appears in active product lists again?`
            : `Disable "${statusTarget?.name}"? This will hide it from active lists but keep sales records.`}
        </p>
      </Modal>
    </div>
  );
}

export default ProductList;