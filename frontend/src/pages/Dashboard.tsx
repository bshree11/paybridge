import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  source_currency: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  balance: number;
  currency: string;
  totalTransactions: number;
  recentTransactions: Transaction[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Fetch recent transactions
      const txRes = await api.get('/payments/my');

      const transactions: Transaction[] = txRes.data.data || txRes.data || [];

      // Calculate total from confirmed transactions
      const totalBalance = transactions
        .filter((tx) => tx.status === 'confirmed')
        .reduce((sum, tx) => sum + tx.amount, 0);

      setData({
        balance: totalBalance,
        currency: 'GBP',
        totalTransactions: transactions.length,
        recentTransactions: transactions.slice(0, 5),
      });
    } catch (err: any) {
      setError('Failed to load dashboard data');
      // Set empty data so page still renders
      setData({
        balance: 0,
        currency: 'GBP',
        totalTransactions: 0,
        recentTransactions: [],
      });
    } finally {
      setLoading(false);
    }
  }

  // Status badge colors
  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">
            <Clock size={12} /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
            <XCircle size={12} /> Failed
          </span>
        );
      case 'disputed':
        return (
          <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-full text-xs font-medium">
            <AlertTriangle size={12} /> Disputed
          </span>
        );
      default:
        return (
          <span className="text-gray-700 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Here's your account overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Balance</p>
            <CreditCard size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            £{data?.balance.toFixed(2) || '0.00'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{data?.currency}</p>
        </div>

        {/* Transactions Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Transactions</p>
            <ArrowUpRight size={20} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {data?.totalTransactions || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>

        {/* KYC Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">KYC Status</p>
            {user?.kycStatus === 'verified' ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <AlertTriangle size={20} className="text-yellow-500" />
            )}
          </div>
          <p className="text-2xl font-bold text-gray-800 capitalize">
            {user?.kycStatus || 'Unverified'}
          </p>
          {user?.kycStatus !== 'verified' && (
            <Link to="/kyc" className="text-xs text-blue-600 hover:underline mt-1 block">
              Complete KYC →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          to="/payments"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <ArrowUpRight size={16} /> Send Payment
        </Link>
        <Link
          to="/transactions"
          className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <ArrowDownLeft size={16} /> View All Transactions
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
          <Link to="/transactions" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {data?.recentTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No transactions yet</p>
            <Link to="/payments" className="text-sm text-blue-600 hover:underline mt-1 block">
              Make your first payment →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data?.recentTransactions.map((tx) => (
              <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Payment #{tx.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(tx.status)}
                  <p className="text-sm font-semibold text-gray-800">
                    £{tx.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}