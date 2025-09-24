import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

import { 
  LogOut, 
  User, 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Download,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  // Helper function to get month name
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loanApplications, setLoanApplications] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [cumulativeReports, setCumulativeReports] = useState(null);

  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [loanForm, setLoanForm] = useState({ amount: '', duration: 12, purpose: '' });
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: '', reason: '' });
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [withdrawalValidation, setWithdrawalValidation] = useState({ isValid: true, message: '' });
  // Month/Year selection for member dashboard
  const [memberMonthYear, setMemberMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });






  // Define fetchDashboardData before using it in useEffect
  const fetchDashboardData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (memberMonthYear.month) params.append('month', memberMonthYear.month);
      if (memberMonthYear.year) params.append('year', memberMonthYear.year);
      
      const response = await axios.get(`/user/dashboard?${params}`);
      setDashboardData(response.data?.data?.dashboard || response.data?.dashboard || null);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [memberMonthYear.month, memberMonthYear.year]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refetch dashboard data when month/year changes
  useEffect(() => {
    fetchDashboardData();
  }, [memberMonthYear, fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchLoanApplications();
    } else if (activeTab === 'withdrawals') {
      fetchWithdrawalRequests();
    } else if (activeTab === 'reports') {
      fetchCumulativeReports();
    }
  }, [activeTab]);

  useEffect(() => {

  }, [showLoanForm]);



  const fetchLoanApplications = async () => {
    try {
      const response = await axios.get('/user/loans/applications');
      setLoanApplications(response.data.data?.applications || []);
    } catch (error) {
      toast.error('Failed to load loan applications');
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await axios.get('/user/special-savings/withdrawal-requests');
      setWithdrawalRequests(response.data.data?.requests || []);
    } catch (error) {
      toast.error('Failed to load withdrawal requests');
    }
  };

  const fetchCumulativeReports = async () => {
    try {
      const params = new URLSearchParams();
      if (memberMonthYear.month) params.append('month', memberMonthYear.month);
      if (memberMonthYear.year) params.append('year', memberMonthYear.year);
      const response = await axios.get(`/user/cumulative-reports?${params}`);
      setCumulativeReports(response.data.data?.reports || response.data.reports || {});
    } catch (error) {
      toast.error('Failed to load cumulative reports');
    }
  };

  const fetchBalanceInfo = async () => {
    try {
      const response = await axios.get('/user/special-savings/balance');
      setBalanceInfo(response.data.data || response.data);
    } catch (error) {
      toast.error('Failed to load balance information');
    }
  };

  // Report filters actions
  const applyReportFilters = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchDashboardData(),
      fetchCumulativeReports()
    ]);
    setLoading(false);
    toast.success(`Filters applied for ${getMonthName(memberMonthYear.month)} ${memberMonthYear.year}`);
  };

  const resetReportFilters = () => {
    const now = new Date();
    setMemberMonthYear({ month: now.getMonth() + 1, year: now.getFullYear() });
    // Fetch will run due to state change
    toast.success('Report filters reset to current month');
  };







  const handleLogout = () => {
    logout();
  };



  const handleLoanApplication = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!loanForm.amount || !loanForm.duration || !loanForm.purpose || !loanForm.loanCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const applicationData = {
        amount: parseFloat(loanForm.amount),
        duration: parseInt(loanForm.duration),
        purpose: loanForm.purpose,
        loanCategory: loanForm.loanCategory
      };

      const response = await axios.post('/user/loans/apply', applicationData);
      
      toast.success(response.data.message || 'Loan application submitted successfully!');
      setShowLoanForm(false);
      setLoanForm({ 
        amount: '', 
        duration: 12, 
        purpose: '', 
        loanCategory: 'standard'
      });

      fetchLoanApplications();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to submit loan application';
      toast.error(errorMessage);
    }
  };

  const validateWithdrawalAmount = (amount) => {
    if (!balanceInfo) return { isValid: true, message: '' };
    
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, message: 'Please enter a valid amount' };
    }
    
    if (numAmount < balanceInfo.minimumWithdrawal) {
      return { 
        isValid: false, 
        message: `Minimum withdrawal amount is ₦${balanceInfo.minimumWithdrawal.toLocaleString()}` 
      };
    }
    
    if (numAmount > balanceInfo.specialSavingsBalance) {
      return { 
        isValid: false, 
        message: `Insufficient balance. Available: ₦${balanceInfo.specialSavingsBalance.toLocaleString()}` 
      };
    }
    
    return { isValid: true, message: '' };
  };

  const handleWithdrawalAmountChange = (e) => {
    const amount = e.target.value;
    setWithdrawalForm({...withdrawalForm, amount});
    
    if (amount) {
      const validation = validateWithdrawalAmount(amount);
      setWithdrawalValidation(validation);
    } else {
      setWithdrawalValidation({ isValid: true, message: '' });
    }
  };

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    
    // Final validation before submission
    const validation = validateWithdrawalAmount(withdrawalForm.amount);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }
    
    try {
      await axios.post('/user/special-savings/withdraw-request', withdrawalForm);
      toast.success('Withdrawal request submitted successfully!');
      setShowWithdrawalForm(false);
      setWithdrawalForm({ amount: '', reason: '' });
      setWithdrawalValidation({ isValid: true, message: '' });
      fetchWithdrawalRequests();
      fetchBalanceInfo(); // Refresh balance after submission
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.details && errorData?.suggestion) {
        toast.error(`${errorData.message} ${errorData.suggestion}`);
      } else {
        toast.error(errorData?.error || 'Failed to submit withdrawal request');
      }
    }
  };

  const downloadMonthlySlip = async () => {
    try {
      const params = new URLSearchParams();
      if (memberMonthYear.month) params.append('month', memberMonthYear.month);
      if (memberMonthYear.year) params.append('year', memberMonthYear.year);
      
      const response = await axios.get(`/user/monthly-slip/pdf?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with selected month/year
      const dateString = memberMonthYear.month && memberMonthYear.year 
        ? `${memberMonthYear.year}-${memberMonthYear.month.toString().padStart(2, '0')}`
        : new Date().toISOString().split('T')[0];
      
      link.setAttribute('download', `monthly_slip_${user.memberId}_${dateString}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Monthly slip downloaded for ${getMonthName(memberMonthYear.month)} ${memberMonthYear.year}`);
    } catch (error) {
      toast.error('Failed to download monthly slip');
    }
  };

    const downloadCumulativeReport = async (type, format) => {
    try {
      const params = new URLSearchParams();
      if (memberMonthYear.month) params.append('month', memberMonthYear.month);
      if (memberMonthYear.year) params.append('year', memberMonthYear.year);
      const response = await axios.get(`/user/cumulative-reports/${type}/${format}?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_cumulative_report_${user.memberId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} report downloaded successfully`);
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome, {user.firstName} {user.surname}
                </h1>
                <p className="text-sm text-gray-500">Member ID: {user.memberId}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mt-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', name: 'Overview', icon: TrendingUp },
              { id: 'savings', name: 'Savings', icon: DollarSign },
              { id: 'loans', name: 'Loans', icon: CreditCard },
              { id: 'applications', name: 'Loan Applications', icon: Plus },
              { id: 'withdrawals', name: 'Withdrawals', icon: Plus },
              { id: 'reports', name: 'Reports', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Monthly Deduction</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ₦{dashboardData.deductions.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Cumulative Savings</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ₦{dashboardData.savings.cumulativeSavings.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Loans</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.loans.totalActiveLoans}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Special Savings</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      ₦{dashboardData.savings.specialSavingsBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <Plus className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Apply for Loan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <DollarSign className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Request Withdrawal</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <Download className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Download Reports</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'savings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Savings Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Regular Savings</h3>
                    <p className="text-sm text-gray-500">Monthly and cumulative savings</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Contribution:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.savings?.monthlySavings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cumulative Total:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.savings?.cumulativeSavings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Saved:</span>
                    <span>₦{(dashboardData.savings?.cumulativeSavings || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Special Savings</h3>
                    <p className="text-sm text-gray-500">Additional savings balance</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Current Balance:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.savings?.specialSavingsBalance?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Contribution:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.savings?.monthlySpecialSavings?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Available:</span>
                    <span>₦{(dashboardData.savings?.specialSavingsBalance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Shares & Investment</h3>
                    <p className="text-sm text-gray-500">Shares and investment summary</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cumulative Shares:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.shares?.cumulativeShares?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cumulative Investment:</span>
                    <span className="text-sm font-semibold">₦{dashboardData.investment?.cumulativeInvestment?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>₦{((dashboardData.shares?.cumulativeShares || 0) + (dashboardData.investment?.cumulativeInvestment || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Savings Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Savings Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ₦{(dashboardData.savings?.cumulativeSavings || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Regular Savings</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ₦{(dashboardData.savings?.specialSavingsBalance || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Special Savings</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    ₦{(dashboardData.shares?.cumulativeShares || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Shares</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    ₦{(dashboardData.investment?.cumulativeInvestment || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Investment</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    ₦{(
                      (dashboardData.savings?.cumulativeSavings || 0) +
                      (dashboardData.savings?.specialSavingsBalance || 0) +
                      (dashboardData.shares?.cumulativeShares || 0) +
                      (dashboardData.investment?.cumulativeInvestment || 0)
                    ).toLocaleString()}
                  </div>
                  <div className="text-lg text-gray-600">Total Amount Saved</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Loan Overview</h2>
            
            {dashboardData.loans?.activeLoans?.length > 0 ? (
              <div className="space-y-6">
                {dashboardData.loans.activeLoans.map((loan, index) => (
                  <div key={index} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Active Loan #{index + 1}</h3>
                          <p className="text-sm text-gray-500">{loan.loanType || 'Regular Loan'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {loan.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          ₦{loan.amount?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600">Original Amount</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          ₦{(loan.amount - (loan.remainingBalance || 0))?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600">Amount Repaid</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          ₦{loan.remainingBalance?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600">Outstanding Balance</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          ₦{loan.monthlyPayment?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-600">Monthly Payment</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm font-semibold text-gray-900">
                          {loan.duration || 12} months
                        </div>
                        <div className="text-xs text-gray-600">Duration</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm font-semibold text-gray-900">
                          {loan.startDate ? new Date(loan.startDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Start Date</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm font-semibold text-gray-900">
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">Due Date</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Loans</h3>
                <p className="text-gray-500">You currently have no active loans.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Loan Applications</h2>
              <button
                onClick={() => setShowLoanForm(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply for Loan
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loan Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loanApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.purpose}
                            </div>
                            <div className="text-sm text-gray-500">ID: {application.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₦{application.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {application.duration} months
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {application.loanType || 'Regular Loan'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            <span className="ml-1">{application.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(application.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h2>
              <button
                onClick={() => {
                  setShowWithdrawalForm(true);
                  fetchBalanceInfo();
                }}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Withdrawal
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {withdrawalRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.reason}
                            </div>
                            <div className="text-sm text-gray-500">ID: {request.id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₦{request.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Reports & Downloads</h2>
            </div>

            {/* Report Filters (global for all reports below) */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Report Filters</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={memberMonthYear.month}
                      onChange={(e) => setMemberMonthYear({ ...memberMonthYear, month: parseInt(e.target.value) })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={memberMonthYear.year}
                      onChange={(e) => setMemberMonthYear({ ...memberMonthYear, year: parseInt(e.target.value) })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      min="2020"
                      max="2035"
                    />
                  </div>
                  <div className="md:col-span-1 lg:col-span-2 flex gap-3 md:justify-end">
                    <button
                      onClick={applyReportFilters}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Apply Filters
                    </button>
                    <button
                      onClick={resetReportFilters}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Slip Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Monthly Deduction Slip</h3>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">Selected period: {getMonthName(memberMonthYear.month)} {memberMonthYear.year}</p>
                  <button
                    onClick={downloadMonthlySlip}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Slip
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Current Month Deductions</h4>
                    <div className="space-y-2">
                      {Object.entries(dashboardData.deductions).map(([key, value]) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                            <span className="font-medium">₦{value.toLocaleString()}</span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>₦{dashboardData.deductions.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Cumulative Balances</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cumulative Savings:</span>
                        <span className="font-medium">₦{dashboardData.savings.cumulativeSavings.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cumulative Shares:</span>
                        <span className="font-medium">₦{dashboardData.shares.cumulativeShares.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cumulative Investment:</span>
                        <span className="font-medium">₦{dashboardData.investment.cumulativeInvestment.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cumulative Reports Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Cumulative Reports</h3>
              </div>
              <div className="p-6">

            {cumulativeReports && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cumulative Savings Report */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Cumulative Savings</h3>
                      <p className="text-sm text-gray-500">Total savings over time</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Savings:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.savings?.total?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Regular Savings:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.savings?.regular?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Special Savings:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.savings?.special?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => downloadCumulativeReport('savings', 'pdf')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => downloadCumulativeReport('savings', 'xlsx')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Excel
                    </button>
                  </div>
                </div>

                {/* Cumulative Loans Report */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Cumulative Loans</h3>
                      <p className="text-sm text-gray-500">Loan history and balances</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Borrowed:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.loans?.totalBorrowed?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Repaid:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.loans?.totalRepaid?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Outstanding:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.loans?.outstanding?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => downloadCumulativeReport('loans', 'pdf')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => downloadCumulativeReport('loans', 'xlsx')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Excel
                    </button>
                  </div>
                </div>

                {/* Cumulative Special Savings Report */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Special Savings</h3>
                      <p className="text-sm text-gray-500">Special savings summary</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Current Balance:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.specialSavings?.currentBalance?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Deposits:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.specialSavings?.totalDeposits?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Withdrawals:</span>
                      <span className="text-sm font-semibold">₦{cumulativeReports.specialSavings?.totalWithdrawals?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => downloadCumulativeReport('special-savings', 'pdf')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => downloadCumulativeReport('special-savings', 'xlsx')}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Excel
                    </button>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        )}



        {/* Enhanced Loan Application Form Modal */}
        {showLoanForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Apply for Loan</h3>
                


                <form onSubmit={handleLoanApplication} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        step="1000"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        value={loanForm.amount}
                        onChange={(e) => setLoanForm({...loanForm, amount: e.target.value})}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration (months)</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        value={loanForm.duration}
                        onChange={(e) => setLoanForm({...loanForm, duration: parseInt(e.target.value)})}
                      >
                        <option value={6}>6 months</option>
                        <option value={12}>12 months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Category</label>
                    <select
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={loanForm.loanCategory}
                      onChange={(e) => setLoanForm({...loanForm, loanCategory: e.target.value})}
                    >
                      <option value="ileya">Ileya Loan</option>
                      <option value="regular">Regular Loan</option>
                      <option value="business">Business Loan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <textarea
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      rows={3}
                      value={loanForm.purpose}
                      onChange={(e) => setLoanForm({...loanForm, purpose: e.target.value})}
                      placeholder="Please describe the purpose of this loan"
                    />
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                    <p className="font-medium mb-1">Note:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Please ensure all information is accurate before submitting</li>
                      <li>Payment schedules vary by loan category</li>
                      <li>Your application will be reviewed by the admin team</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoanForm(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Submit Application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Request Form Modal */}
        {showWithdrawalForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Request Special Savings Withdrawal</h3>
                
                {/* Balance Information */}
                {balanceInfo && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Your Balance Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Available Balance:</span>
                        <span className="font-semibold text-blue-900">₦{balanceInfo.specialSavingsBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Minimum Withdrawal:</span>
                        <span className="font-semibold text-blue-900">₦{balanceInfo.minimumWithdrawal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Maximum Withdrawal:</span>
                        <span className="font-semibold text-blue-900">₦{balanceInfo.maxWithdrawable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      required
                      min={balanceInfo?.minimumWithdrawal || 100}
                      max={balanceInfo?.maxWithdrawable || undefined}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                        !withdrawalValidation.isValid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      value={withdrawalForm.amount}
                      onChange={handleWithdrawalAmountChange}
                      placeholder={balanceInfo ? `Min: ₦${balanceInfo.minimumWithdrawal.toLocaleString()}` : 'Enter amount'}
                    />
                    {!withdrawalValidation.isValid && (
                      <p className="mt-1 text-sm text-red-600">{withdrawalValidation.message}</p>
                    )}
                    {withdrawalValidation.isValid && withdrawalForm.amount && (
                      <p className="mt-1 text-sm text-green-600">
                        ✓ Valid amount. Remaining balance: ₦{(balanceInfo?.specialSavingsBalance - parseFloat(withdrawalForm.amount)).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <textarea
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      rows={3}
                      value={withdrawalForm.reason}
                      onChange={(e) => setWithdrawalForm({...withdrawalForm, reason: e.target.value})}
                      placeholder="Please provide a reason for this withdrawal"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWithdrawalForm(false);
                        setWithdrawalForm({ amount: '', reason: '' });
                        setWithdrawalValidation({ isValid: true, message: '' });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!withdrawalValidation.isValid || !withdrawalForm.amount || !withdrawalForm.reason}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                        withdrawalValidation.isValid && withdrawalForm.amount && withdrawalForm.reason
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


      </main>
    </div>
  );
};

export default Dashboard; 