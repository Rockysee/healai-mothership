'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Gauge,
  Loader,
  ChevronDown,
  Eye,
} from 'lucide-react';

export default function OperatorCRM() {
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operatorDetail, setOperatorDetail] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [crewData, setCrewData] = useState([]);

  // Fetch operators list
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/nexus/operators');
        if (!res.ok) throw new Error('Failed to fetch operators');
        const data = await res.json();
        setOperators(data);
        if (data.length > 0) {
          setSelectedOperator(data[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, []);

  // Fetch operator detail when selected
  useEffect(() => {
    if (!selectedOperator) return;

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/nexus/operators/${selectedOperator}`);
        if (!res.ok) throw new Error('Failed to fetch operator detail');
        const data = await res.json();
        setOperatorDetail(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchDetail();
  }, [selectedOperator]);

  // Fetch invoices when operator changes
  useEffect(() => {
    if (!selectedOperator) return;

    const fetchInvoices = async () => {
      try {
        const res = await fetch(
          `/api/nexus/billing/invoices?operator_id=${selectedOperator}`
        );
        if (!res.ok) throw new Error('Failed to fetch invoices');
        const data = await res.json();
        setInvoices(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchInvoices();
  }, [selectedOperator]);

  // Fetch compliance data
  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const res = await fetch('/api/nexus/compliance/dashboard');
        if (!res.ok) throw new Error('Failed to fetch compliance');
        const data = await res.json();
        setCompliance(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCompliance();
  }, []);

  // Fetch crew data when operator changes
  useEffect(() => {
    if (!selectedOperator) return;

    const fetchCrew = async () => {
      try {
        const res = await fetch(`/api/nexus/compliance/crew/${selectedOperator}`);
        if (!res.ok) throw new Error('Failed to fetch crew');
        const data = await res.json();
        setCrewData(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchCrew();
  }, [selectedOperator]);

  // Filter operators based on search
  const filteredOperators = operators.filter((op) =>
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected operator data
  const currentOperator = operators.find((op) => op.id === selectedOperator);

  // Render status badge
  const StatusBadge = ({ status }) => {
    const colors = {
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
          colors[status] || colors.pending
        }`}
      >
        {status === 'active' && <CheckCircle size={12} />}
        {status === 'inactive' && <AlertCircle size={12} />}
        {status === 'pending' && <Clock size={12} />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Dashboard Tab Content
  const DashboardTab = () => {
    if (!operatorDetail)
      return (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-emerald-500" size={32} />
        </div>
      );

    const stats = operatorDetail.stats || {
      totalTrips: 0,
      activeFleet: 0,
      revenue: 0,
      complianceScore: 0,
    };

    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Trips</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.totalTrips?.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="text-emerald-500" size={28} />
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Active Fleet</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.activeFleet || 0}
                </p>
              </div>
              <Truck className="text-emerald-500" size={28} />
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${(stats.revenue || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="text-emerald-500" size={28} />
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Compliance</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {stats.complianceScore || 0}%
                </p>
              </div>
              <Gauge className="text-emerald-500" size={28} />
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-emerald-500" />
            Recent Trips
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-white/60 text-left py-3 px-4 font-medium">
                    Trip ID
                  </th>
                  <th className="text-white/60 text-left py-3 px-4 font-medium">
                    Route
                  </th>
                  <th className="text-white/60 text-left py-3 px-4 font-medium">
                    Status
                  </th>
                  <th className="text-white/60 text-left py-3 px-4 font-medium">
                    Date
                  </th>
                  <th className="text-white/60 text-left py-3 px-4 font-medium">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {operatorDetail.recentTrips && operatorDetail.recentTrips.length > 0 ? (
                  operatorDetail.recentTrips.map((trip) => (
                    <tr key={trip.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-mono text-xs">
                        {trip.id}
                      </td>
                      <td className="py-3 px-4 text-white/80">
                        {trip.startLocation} → {trip.endLocation}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={trip.status} />
                      </td>
                      <td className="py-3 px-4 text-white/60">
                        {new Date(trip.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-white/60">
                        {trip.duration} min
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-white/40">
                      No recent trips
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Crew Tab Content
  const CrewTab = () => {
    if (crewData.length === 0)
      return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
          <Users size={32} className="text-white/40 mx-auto mb-2" />
          <p className="text-white/60">No crew members found</p>
        </div>
      );

    return (
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          Crew Roster
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-white/60 text-left py-3 px-4 font-medium">
                  Name
                </th>
                <th className="text-white/60 text-left py-3 px-4 font-medium">
                  Role
                </th>
                <th className="text-white/60 text-left py-3 px-4 font-medium">
                  License Expiry
                </th>
                <th className="text-white/60 text-left py-3 px-4 font-medium">
                  Status
                </th>
                <th className="text-white/60 text-left py-3 px-4 font-medium">
                  Certifications
                </th>
              </tr>
            </thead>
            <tbody>
              {crewData.map((member) => (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 text-white font-medium">{member.name}</td>
                  <td className="py-3 px-4 text-white/80">{member.role}</td>
                  <td className="py-3 px-4 text-white/60">
                    {new Date(member.licenseExpiry).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="py-3 px-4 text-white/60">
                    {member.certificationsCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Billing Tab Content
  const BillingTab = () => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return (
      <div className="space-y-6">
        {/* Revenue Counter */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total Revenue</p>
              <p className="text-4xl font-bold text-emerald-500 mt-2">
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-emerald-500" size={48} />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText size={18} className="text-emerald-500" />
            Invoices
          </h3>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} className="text-white/40 mx-auto mb-2" />
              <p className="text-white/60">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-white/60 text-left py-3 px-4 font-medium">
                      Invoice #
                    </th>
                    <th className="text-white/60 text-left py-3 px-4 font-medium">
                      Trip ID
                    </th>
                    <th className="text-white/60 text-left py-3 px-4 font-medium">
                      Amount
                    </th>
                    <th className="text-white/60 text-left py-3 px-4 font-medium">
                      Status
                    </th>
                    <th className="text-white/60 text-left py-3 px-4 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-mono text-xs">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-white/80">{invoice.tripId}</td>
                      <td className="py-3 px-4 text-white font-semibold">
                        ${invoice.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 px-4 text-white/60">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compliance Tab Content
  const ComplianceTab = () => {
    if (!compliance)
      return (
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-emerald-500" size={32} />
        </div>
      );

    return (
      <div className="space-y-6">
        {/* Compliance Score Gauge */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Gauge size={18} className="text-emerald-500" />
            Compliance Score
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-40 h-40">
              <svg className="transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="8"
                  strokeDasharray={`${(compliance.score || 0) * 4.4} 440`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-emerald-500">
                  {compliance.score || 0}%
                </p>
                <p className="text-white/60 text-xs mt-1">Overall Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Certifications */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-500" />
            Expiring Certifications
          </h3>
          {compliance.expiringCertifications && compliance.expiringCertifications.length > 0 ? (
            <div className="space-y-2">
              {compliance.expiringCertifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{cert.name}</p>
                    <p className="text-white/60 text-xs">
                      Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <AlertTriangle size={18} className="text-yellow-500" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-white/60">No expiring certifications</p>
            </div>
          )}
        </div>

        {/* Shift Hours Summary */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-emerald-500" />
            Shift Hours Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-white/60 text-xs mb-1">This Week</p>
              <p className="text-xl font-bold text-white">
                {compliance.shiftHours?.thisWeek || 0}h
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1">This Month</p>
              <p className="text-xl font-bold text-white">
                {compliance.shiftHours?.thisMonth || 0}h
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1">Overtime</p>
              <p className="text-xl font-bold text-orange-400">
                {compliance.shiftHours?.overtime || 0}h
              </p>
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1">Annual</p>
              <p className="text-xl font-bold text-white">
                {compliance.shiftHours?.annual || 0}h
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: '#020205' }}
      >
        <Loader className="animate-spin text-emerald-500" size={48} />
      </div>
    );

  if (error)
    return (
      <div
        className="h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#020205' }}
      >
        <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-white font-semibold mb-2">Error Loading Data</h2>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#020205' }}>
      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-white/10 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-white/40" size={18} />
              <input
                type="text"
                placeholder="Search operators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Operators List */}
          <div className="flex-1 overflow-y-auto">
            {filteredOperators.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">
                No operators found
              </div>
            ) : (
              filteredOperators.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOperator(op.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                    selectedOperator === op.id
                      ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <p className="text-white font-medium text-sm">{op.name}</p>
                  <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                    <MapPin size={12} />
                    {op.city}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-white/60 text-xs">
                      <Truck size={12} />
                      {op.fleet_size} units
                    </div>
                    <StatusBadge status={op.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          {currentOperator && (
            <div className="border-b border-white/10 p-6 bg-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {currentOperator.name}
                  </h1>
                  <p className="text-white/60 mt-1 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-500" />
                    {currentOperator.city}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={currentOperator.status} />
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-white/10 px-6 bg-black/20">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Eye },
              { id: 'crew', label: 'Crew', icon: Users },
              { id: 'billing', label: 'Billing', icon: FileText },
              { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'crew' && <CrewTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'compliance' && <ComplianceTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
