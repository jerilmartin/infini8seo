'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, TrendingUp, CreditCard, Search, Gift, 
  Loader2, ArrowLeft, DollarSign, Zap, AlertCircle 
} from 'lucide-react';
import { api } from '@/utils/api';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface PlatformStats {
  usersByTier: Record<string, number>;
  credits: {
    totalUsed: number;
    totalRemaining: number;
    totalAllocated: number;
  };
  revenue: Record<string, number>;
  activeSubscriptions: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  subscription_tier: string;
  subscription_status: string;
  credits_remaining: number;
  credits_total: number;
  created_at: string;
}

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users?limit=100')
      ]);
      
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Admin access required');
        setTimeout(() => router.push('/'), 2000);
      } else {
        setError('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount || !grantReason) {
      setError('Please fill all fields');
      return;
    }

    setGranting(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/admin/users/${selectedUser.id}/grant-credits`, {
        amount: parseInt(grantAmount),
        reason: grantReason
      });

      setSuccess(`Granted ${grantAmount} credits to ${selectedUser.email}`);
      setGrantAmount('');
      setGrantReason('');
      setSelectedUser(null);
      
      // Refresh data
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to grant credits');
    } finally {
      setGranting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Admin Panel</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Logged in as: {user?.email}
              </p>
            </div>
          </div>
        </header>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <Zap className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-emerald-500">{success}</p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {Object.values(stats.usersByTier).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
              <div className="mt-2 text-xs text-secondary-foreground">
                Free: {stats.usersByTier.free || 0} | Starter: {stats.usersByTier.starter || 0} | Pro: {stats.usersByTier.pro || 0}
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                <span className="text-2xl font-bold text-foreground">
                  {stats.activeSubscriptions}
                </span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Active Subscriptions</h3>
              <div className="mt-2 text-xs text-secondary-foreground">
                Paying customers
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold text-foreground">
                  {stats.credits.totalUsed.toLocaleString()}
                </span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Credits Used</h3>
              <div className="mt-2 text-xs text-secondary-foreground">
                {stats.credits.totalRemaining.toLocaleString()} remaining
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-yellow-500" />
                <span className="text-2xl font-bold text-foreground">
                  ${stats.revenue.USD?.toFixed(0) || 0}
                </span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Revenue (USD)</h3>
              <div className="mt-2 text-xs text-secondary-foreground">
                ₹{stats.revenue.INR?.toFixed(0) || 0} INR
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Users</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 h-9 w-64"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedUser?.id === u.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{u.email}</p>
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {u.full_name || 'No name'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {u.subscription_tier}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {u.credits_remaining} credits
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grant Credits Panel */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Grant Credits</h2>
            </div>

            {selectedUser ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Selected User</p>
                  <p className="text-sm font-medium text-foreground">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {selectedUser.credits_remaining} credits
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="50"
                    className="input h-10"
                    min="1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Reason
                  </label>
                  <textarea
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="e.g., Compensation for service outage"
                    className="input min-h-[80px] resize-none"
                  />
                </div>

                <button
                  onClick={handleGrantCredits}
                  disabled={granting || !grantAmount || !grantReason}
                  className="btn-primary w-full h-10"
                >
                  {granting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Grant Credits
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary w-full h-9 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a user to grant credits
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
