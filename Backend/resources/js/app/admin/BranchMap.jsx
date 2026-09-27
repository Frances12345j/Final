import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Table, Tag, Button, Modal, Form, Input, Space, message, Tooltip } from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, divIcon, point } from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { api } from "@/config/api";
import { getCache, setCache, invalidateCache } from "@/utils/cache";
import Loading from "@/components/Loading";
import { clientPagination, serverPagination } from "@/components/Pagination";
import "leaflet/dist/leaflet.css";

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

const style = document.createElement('style');
style.innerHTML = `
  .custom-marker-cluster {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    color: white;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  .cluster-icon {
    font-size: 14px;
    font-weight: bold;
  }
`;
document.head.appendChild(style);

const customIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
  shadowSize: [38, 38]
});

const createClusterCustomIcon = function (cluster) {
  return new divIcon({
    html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
    className: "custom-marker-cluster",
    iconSize: point(40, 40, true)
  });
};

function MapBounds({ branches }) {
  const map = useMap();
  useEffect(() => {
    if (branches.length > 0) {
      const validBranches = branches.filter(b => b.latitude && b.longitude);
      if (validBranches.length > 0) {
        const bounds = validBranches.map(b => [b.latitude, b.longitude]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [branches, map]);
  return null;
}

function MapInitializer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapFlyTo({ branch }) {
  const map = useMap();
  useEffect(() => {
    if (branch && branch.latitude && branch.longitude) {
      map.flyTo([branch.latitude, branch.longitude], 16, { duration: 1 });
    }
  }, [branch, map]);
  return null;
}

function BranchMap() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editFormInstance] = Form.useForm();
  const [flyTarget, setFlyTarget] = useState(null);
  const tableRef = useRef(null);

  const loadBranches = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const cachedBranches = forceRefresh ? null : getCache('branches');
      if (cachedBranches) {
        setBranches(cachedBranches);
        setLoading(false);
        return;
      }
      const response = await api.get("/branches");
      const branchesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setBranches(branchesData);
      setCache('branches', branchesData);
    } catch (error) {
      console.error("Failed to load branches:", error);
      message.error("Failed to load branches from backend.");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const filteredBranches = useMemo(() => {
    return branches.filter(branch =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.address && branch.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [branches, searchTerm]);

  const branchesWithLocation = useMemo(() => filteredBranches.filter(b => b.latitude && b.longitude), [filteredBranches]);
  const branchesWithoutLocation = useMemo(() => filteredBranches.filter(b => !b.latitude || !b.longitude), [filteredBranches]);

  const handleMarkerClick = useCallback((branch) => {
    setSelectedBranch(branch);
    const rowEl = tableRef.current?.querySelector(`[data-row-key="${branch.id}"]`);
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      rowEl.style.transition = "background 0.3s";
      rowEl.style.background = PANEL_BG_2;
      setTimeout(() => { rowEl.style.background = ""; }, 2000);
    }
  }, []);

  const handleRowClick = useCallback((record) => {
    setSelectedBranch(record);
    if (record.latitude && record.longitude) {
      setFlyTarget(record);
    }
  }, []);

  const handleOpenGoogleMaps = (branch) => {
    if (branch.latitude && branch.longitude) {
      window.open(`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`, '_blank');
    }
  };

  const handleOpenOpenStreetMap = (branch) => {
    if (branch.latitude && branch.longitude) {
      window.open(`https://www.openstreetmap.org/?mlat=${branch.latitude}&mlon=${branch.longitude}#map=15/${branch.latitude}/${branch.longitude}`, '_blank');
    }
  };

  const handleEditLocation = (branch) => {
    setEditingBranch(branch);
    editFormInstance.setFieldsValue({ address: branch.address || "" });
    setIsEditModalVisible(true);
  };

  const handleSaveLocation = async () => {
    if (!editingBranch) return;
    try {
      const values = await editFormInstance.validateFields();
      if (!values.address || values.address.trim() === "") {
        message.error("Please enter an address.");
        return;
      }

      setIsGeocoding(true);
      const searchQueries = [
        values.address,
        values.address.replace(/,/g, ''),
        values.address.split(',')[0],
        `${values.address}, Philippines`,
        values.address.replace(/\+/g, ' '),
      ];

      let geocodeResult = null;
      for (const query of searchQueries) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.length > 0) { geocodeResult = data[0]; break; }
        } catch (e) { continue; }
      }

      if (!geocodeResult) {
        Modal.confirm({
          title: "Geocoding Failed",
          content: "Automatic geocoding failed. Would you like to enter coordinates manually?",
          okText: "Manual Entry",
          cancelText: "Cancel",
          onOk: () => {
            Modal.confirm({
              title: "Enter Coordinates",
              content: (
                <div>
                  <p className="mb-2">Format: latitude, longitude</p>
                  <p className="text-sm text-gray-500">Example: 8.4845, 124.6522</p>
                </div>
              ),
              okText: "Save",
              onOk: async () => {
                setIsGeocoding(false);
              },
            });
          },
        });
        setIsGeocoding(false);
        return;
      }

      const lat = parseFloat(geocodeResult.lat);
      const lng = parseFloat(geocodeResult.lon);
      const { data: updatedBranch } = await api.put(`/branches/${editingBranch.id}`, {
        latitude: lat,
        longitude: lng,
        address: values.address,
      });
      setBranches(branches.map(b => b.id === editingBranch.id ? updatedBranch : b));
      invalidateCache('branches');
      message.success("Branch location updated successfully!");
      setIsEditModalVisible(false);
      setEditingBranch(null);
      editFormInstance.resetFields();
    } catch (error) {
      if (error.errorFields) return;
      message.error(error.message || error?.response?.data?.message || "Failed to update branch location");
    } finally {
      setIsGeocoding(false);
    }
  };

  const columns = [
    {
      title: "Branch",
      key: "name",
      render: (_, r) => (
        <div>
          <div className="font-semibold" style={{ color: TEXT }}>{r.name}</div>
          <div className="text-xs" style={{ color: FAINT }}>{r.code}</div>
        </div>
      ),
    },
    {
      title: "Address",
      key: "address",
      render: (_, r) => (
        <div className="flex items-center gap-1">
          <EnvironmentOutlined style={{ color: ACCENT }} />
          <span style={{ color: TEXT }}>{r.address || <span style={{ color: FAINT }}>No address</span>}</span>
        </div>
      ),
    },
    {
      title: "Location Status",
      key: "status",
      render: (_, r) =>
        r.latitude && r.longitude
          ? <Tag style={{ background: ACCENT_SOFT, color: ACCENT, border: `1px solid ${ACCENT}30` }}>Located</Tag>
          : <Tag style={{ background: AMBER_SOFT, color: AMBER, border: `1px solid ${AMBER}40` }}>No Location</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit Location">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditLocation(r)} style={GHOST_BTN}>
              Edit Location
            </Button>
          </Tooltip>
          {r.latitude && r.longitude && (
            <>
              <Button size="small" onClick={() => handleOpenGoogleMaps(r)} style={SECONDARY_BTN}>
                Google Maps
              </Button>
              <Button size="small" onClick={() => handleOpenOpenStreetMap(r)} style={SECONDARY_BTN}>
                OpenStreetMap
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageShell>
      {/* Hero Header */}
      <HeroHeader
        badgeIcon={<EnvironmentOutlined />}
        badge="Branch Network"
        title="Branch Locations"
        accent="Map"
        subtitle="View all branch locations on an interactive map"
        actions={
          <HeroButton
            icon={<ReloadOutlined />}
            onClick={() => loadBranches(true)}
            loading={loading}
          >
            Refresh
          </HeroButton>
        }
        stats={[
          { icon: <EnvironmentOutlined />, iconBg: "bg-orange-500/15", iconColor: "text-orange-400", label: "Total Branches", value: branches.length },
          { icon: <EnvironmentOutlined />, iconBg: "bg-green-500/15", iconColor: "text-green-400", label: "With Location", value: branchesWithLocation.length },
          { icon: <EnvironmentOutlined />, iconBg: "bg-amber-500/15", iconColor: "text-amber-400", label: "Missing Location", value: branchesWithoutLocation.length },
        ]}
      />

      {/* Search */}
      <div className="mb-6">
        <FilterBar title="Filters" subtitle="Search branches by name or address">
          <Input
            placeholder="Search branch name or address..."
            prefix={<SearchOutlined style={{ color: FAINT }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
            allowClear
            className="h-11! rounded-xl! border-stone-200! hover:border-orange-300! focus:border-orange-500!"
          />
        </FilterBar>
      </div>

      {/* Map Section */}
      <SectionCard
        className="mb-6"
        icon={<EnvironmentOutlined />}
        title="Interactive Map"
        subtitle="Click markers for branch details"
        extra={<CountPill>{branchesWithLocation.length} located</CountPill>}
      >
        {loading ? (
          <Loading full text="Loading map..." />
        ) : branchesWithLocation.length === 0 ? (
          <TableEmpty icon={<EnvironmentOutlined className="text-3xl" />} title="No branch locations found" description="Add latitude and longitude to branches to see them on the map" />
        ) : (
          <div className="h-125 w-full md:h-150 lg:h-175">
            <MapContainer
              key={branchesWithLocation.length}
              center={[14.5995, 120.9842]}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
            >
              <MapInitializer />
              <MapFlyTo branch={flyTarget} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBounds branches={branchesWithLocation} />
              <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon}>
                {branchesWithLocation.map((branch) => (
                  <Marker
                    key={branch.id}
                    position={[branch.latitude, branch.longitude]}
                    icon={customIcon}
                    eventHandlers={{ click: () => handleMarkerClick(branch) }}
                  >
                    <Popup>
                      <div className="p-2 min-w-50">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">{branch.name}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <EnvironmentOutlined className="text-gray-500 mt-0.5" />
                            <span className="text-gray-600">{branch.address || 'No address'}</span>
                          </div>
                          {branch.phone && (
                            <div className="flex items-start gap-2">
                              <PhoneOutlined className="text-gray-500 mt-0.5" />
                              <span className="text-gray-600">{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-start gap-2">
                              <MailOutlined className="text-gray-500 mt-0.5" />
                              <span className="text-gray-600">{branch.email}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex gap-2">
                            <Button size="small" type="link" onClick={() => handleOpenGoogleMaps(branch)}>
                              Google Maps
                            </Button>
                            <Button size="small" type="link" onClick={() => handleOpenOpenStreetMap(branch)}>
                              OpenStreetMap
                            </Button>
                            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEditLocation(branch)} />
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          </div>
        )}
      </SectionCard>

      {/* Branches Missing Location */}
      {branchesWithoutLocation.length > 0 && (
        <div className="mb-6 rounded-2xl border border-l-4 border-l-amber-300 bg-amber-50/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <EnvironmentOutlined className="text-amber-600" />
            <span className="font-semibold text-amber-800">Branches Missing Location Data ({branchesWithoutLocation.length})</span>
          </div>
          <div className="space-y-2">
            {branchesWithoutLocation.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between rounded-xl border border-orange-100 bg-white p-3"
              >
                <div>
                  <p className="font-medium" style={{ color: TEXT }}>{branch.name}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{branch.address || 'No address'}</p>
                </div>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditLocation(branch)}
                  className="rounded-xl border-[#EA580C] text-[#EA580C] hover:bg-[#FFF1E6] hover:border-[#F97316]"
                >
                  Add Location
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Branches Table Section */}
      <SectionCard
        icon={<EnvironmentOutlined />}
        title="All Branches"
        subtitle="Complete list of all registered branches"
        extra={<CountPill>{filteredBranches.length} branch{filteredBranches.length !== 1 ? 'es' : ''}</CountPill>}
      >
        <div ref={tableRef}>
          <Table
            columns={columns}
            dataSource={filteredBranches}
            rowKey="id"
            rowClassName={(record) => record.id === selectedBranch?.id ? "border-l-4 border-l-[#EA580C]" : ""}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: record.latitude && record.longitude ? "pointer" : "default" },
            })}
            pagination={clientPagination({ label: "branches" })}
            locale={{ emptyText: <TableEmpty icon={<EnvironmentOutlined className="text-3xl" />} title="No branches found" description="Try adjusting your search" /> }}
          />
        </div>
      </SectionCard>

      {/* Edit Location Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              <EditOutlined />
            </div>
            <div>
              <p className="font-bold text-[#451A03]">{editingBranch?.name} - Set Location</p>
              <p className="text-xs font-normal" style={{ color: MUTED }}>Find coordinates for this branch</p>
            </div>
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => { setIsEditModalVisible(false); setEditingBranch(null); editFormInstance.resetFields(); }}
        footer={null}
        destroyOnHidden
        className="rounded-2xl"
      >
        <Form form={editFormInstance} layout="vertical" onFinish={handleSaveLocation}>
          <Form.Item
            label={<span style={FIELD_LABEL}>Address</span>}
            name="address"
            rules={[{ required: true, message: "Please enter an address" }]}
          >
            <Input
              placeholder="e.g., 123 Main St, Manila, Philippines"
              className="rounded-xl!"
            />
          </Form.Item>
          <div
            className="mb-4 rounded-xl border border-orange-100 bg-[#FFF1E6] p-3"
          >
            <p className="mb-0 text-xs" style={{ color: "#9A3412" }}>
              <InfoCircleOutlined className="mr-1" />
              Enter a complete address including street, city, and country for accurate location detection.
            </p>
          </div>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => { setIsEditModalVisible(false); setEditingBranch(null); editFormInstance.resetFields(); }}
                disabled={isGeocoding}
                className="rounded-xl"
                style={SECONDARY_BTN}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isGeocoding}
                className="rounded-xl"
                style={GRADIENT_BTN}
              >
                Save Location
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default BranchMap;