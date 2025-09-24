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
  FileText,
  AlertCircle,
  Users,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Minus
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  // Helper function to get month name
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1];
  };
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState([]);
  const [loanApplications, setLoanApplications] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);

  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [memberForm, setMemberForm] = useState({
    memberId: '',
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: ''
  });

  const [deductionSummary, setDeductionSummary] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [showEditMember, setShowEditMember] = useState(false);
  const [editMemberForm, setEditMemberForm] = useState({
    memberId: '',
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: ''
  });
  const [bookDeductions, setBookDeductions] = useState({
    regularSavings: 0,
    shares: 0,
    investment: 0
  });
  const [specialSavingsUpdates, setSpecialSavingsUpdates] = useState([]);
  const [deductionAnomalies, setDeductionAnomalies] = useState([]);
  // Global month/year selector for all admin operations
  const [globalMonthYear, setGlobalMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [membersWithActiveLoans, setMembersWithActiveLoans] = useState([]);
  const [selectedLoanMember, setSelectedLoanMember] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');

  // Additional state variables to fix compilation errors
  const [adminNotes, setAdminNotes] = useState('');
  const [activeLoans, setActiveLoans] = useState([]);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);



  // Define all fetch functions before using them in useEffect
  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (globalMonthYear.month) params.append('month', globalMonthYear.month);
      if (globalMonthYear.year) params.append('year', globalMonthYear.year);
      
      const response = await axios.get(`/admin/members?${params}`);
      setMembers(response.data.data?.members || response.data.members || []);
    } catch (error) {
      toast.error('Failed to load members');
    }
  }, [globalMonthYear.month, globalMonthYear.year]);



  const fetchDeductionSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (globalMonthYear.month) params.append('month', globalMonthYear.month);
      if (globalMonthYear.year) params.append('year', globalMonthYear.year);
      
      const response = await axios.get(`/admin/deduction-summary?${params}`);
      setDeductionSummary(response.data.data?.summary || response.data.summary || {});
    } catch (error) {
      toast.error('Failed to load deduction summary');
    }
  }, [globalMonthYear.month, globalMonthYear.year]);

  const fetchMembersWithActiveLoans = useCallback(async () => {
    try {
      const response = await axios.get('/admin/members-with-active-loans');
      setMembersWithActiveLoans(response.data.data?.members || response.data.members || []);
    } catch (error) {
      toast.error('Failed to load members with active loans');
    }
  }, []);

  const fetchActiveLoans = useCallback(async () => {
    try {
      const response = await axios.get('/admin/members-with-active-loans');
      const allActiveLoans = response.data.members.flatMap(member => 
        member.activeLoans.map(loan => ({
          ...loan,
          memberName: member.memberName,
          memberId: member.memberId
        }))
      );
      setActiveLoans(allActiveLoans);
    } catch (error) {
      toast.error('Failed to load active loans');
    }
  }, []);

  const fetchLoanApplications = useCallback(async () => {
    try {
      const response = await axios.get('/admin/loan-applications');
      setLoanApplications(response.data.data?.applications || response.data.applications || []);
    } catch (error) {
      toast.error('Failed to load loan applications');
    }
  }, []);

  const fetchWithdrawalRequests = useCallback(async () => {
    try {
      const response = await axios.get('/admin/withdrawal-requests');
      setWithdrawalRequests(response.data.data?.requests || response.data.requests || []);
    } catch (error) {
      toast.error('Failed to load withdrawal requests');
    }
  }, []);



  useEffect(() => {
    if (activeTab === 'overview') {
      fetchMembers();
      fetchLoanApplications();
      fetchWithdrawalRequests();
      fetchMembersWithActiveLoans();
      fetchActiveLoans();
    } else if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'applications') {
      fetchLoanApplications();
    } else if (activeTab === 'withdrawals') {
      fetchWithdrawalRequests();
    } else if (activeTab === 'deductions') {
      fetchDeductionSummary();
      fetchMembersWithActiveLoans();
    } else if (activeTab === 'loans') {
      fetchActiveLoans();
    }
  }, [activeTab, fetchMembers, fetchLoanApplications, fetchWithdrawalRequests, fetchDeductionSummary, fetchMembersWithActiveLoans, fetchActiveLoans]);

  // Refetch data when global month/year changes
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchMembers();
      fetchLoanApplications();
      fetchWithdrawalRequests();
      fetchMembersWithActiveLoans();
    } else if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'deductions') {
      fetchDeductionSummary();
      fetchMembersWithActiveLoans();
    }
  }, [globalMonthYear, activeTab, fetchMembers, fetchLoanApplications, fetchWithdrawalRequests, fetchDeductionSummary, fetchMembersWithActiveLoans, fetchActiveLoans]);



  // Functions moved up above useEffect hooks

  const handleLogout = () => {
    logout();
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
          console.log('[INFO] Creating member with form data:', memberForm);
    
    try {
      const response = await axios.post('/admin/members', memberForm);
              console.log('[INFO] Member creation response:', {
        status: response.status,
        success: response.data?.success,
        message: response.data?.message,
        data: response.data
      });
      
      if (response.data?.success) {
        toast.success(response.data.message || 'Member created successfully!');
      } else {
        toast.success('Member created successfully!');
      }
      
      setShowCreateMember(false);
      setMemberForm({
        memberId: '',
        firstName: '',
        surname: '',
        email: '',
        phone: '',
        bankName: '',
        accountNumber: '',
        accountHolderName: ''
      });
      fetchMembers();
    } catch (error) {
      console.error('[ERROR] Member creation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const errorMessage = error.response?.data?.error || 'Failed to create member';
      toast.error(errorMessage);
    }
  };

  const handleLoanApplication = async (status) => {
    try {
              await axios.put(`/admin/loan-applications/${selectedApplication.id}`, {
        status,
                        adminNotes: `Application ${status} by admin`
      });
      toast.success(`Loan application ${status} successfully!`);
      setShowLoanModal(false);
      setSelectedApplication(null);
      fetchLoanApplications();
    } catch (error) {
      toast.error('Failed to update loan application');
    }
  };

  const handleLoanRepayment = async () => {
    try {
      if (!selectedLoan || !repaymentAmount) {
        toast.error('Please enter repayment amount');
        return;
      }

              await axios.post('/admin/loan-repayment', {
        loanId: selectedLoan.id,
        amount: parseFloat(repaymentAmount),
        notes: adminNotes
      });
      
      toast.success('Loan repayment recorded successfully!');
      setShowRepaymentModal(false);
      setSelectedLoan(null);
      setRepaymentAmount('');
      setAdminNotes('');
      // Refresh data
      fetchMembersWithActiveLoans();
    } catch (error) {
      toast.error('Failed to record loan repayment');
    }
  };

  const handleWithdrawalRequest = async (status) => {
    try {
              await axios.put(`/admin/withdrawal-requests/${selectedRequest.id}`, {
        status,
        adminNotes: `Withdrawal request ${status} by admin`
      });
      toast.success(`Withdrawal request ${status} successfully!`);
      setSelectedRequest(null);
      fetchWithdrawalRequests();
    } catch (error) {
      toast.error('Failed to update withdrawal request');
    }
  };



  const handleEditMember = (member) => {
    setEditingMember(member);
    setEditMemberForm({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      email: member.email,
      phone: member.phone,
      bankName: member.bankName || '',
      accountNumber: member.accountNumber || '',
      accountHolderName: member.accountHolderName || ''
    });
    setShowEditMember(true);
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      try {
        await axios.delete(`/admin/members/${memberId}`);
        toast.success('Member deleted successfully!');
        fetchMembers();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete member');
      }
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
              await axios.put(`/admin/members/${editMemberForm.memberId}`, editMemberForm);
      toast.success('Member updated successfully!');
      setShowEditMember(false);
      setEditingMember(null);
      setEditMemberForm({
        memberId: '',
        firstName: '',
        surname: '',
        email: '',
        phone: '',
        bankName: '',
        accountNumber: '',
        accountHolderName: ''
      });
      fetchMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update member');
    }
  };

  const handleBookDeductionsUpdate = async (e) => {
    e.preventDefault();
    try {
              await axios.post('/admin/book-deductions', {
        ...bookDeductions,
        month: globalMonthYear.month,
        year: globalMonthYear.year
      });
      toast.success(`Book deductions updated successfully for ${getMonthName(globalMonthYear.month)} ${globalMonthYear.year}!`);
      setBookDeductions({ regularSavings: 0, shares: 0, investment: 0 });
      fetchDeductionSummary();
    } catch (error) {
      toast.error('Failed to update book deductions');
    }
  };

  const handleSpecialSavingsUpdate = async (e) => {
    e.preventDefault();
    try {
              await axios.post('/admin/special-savings/update', { 
        memberUpdates: specialSavingsUpdates,
        month: globalMonthYear.month,
        year: globalMonthYear.year
      });
      toast.success(`Special savings updated successfully for ${getMonthName(globalMonthYear.month)} ${globalMonthYear.year}!`);
      setSpecialSavingsUpdates([]);
      fetchDeductionSummary();
    } catch (error) {
      toast.error('Failed to update special savings');
    }
  };

  const handleDeductionAnomaliesUpdate = async (e) => {
    e.preventDefault();
    try {
              await axios.post('/admin/deduction-anomalies/update', { 
        memberUpdates: deductionAnomalies,
        month: globalMonthYear.month,
        year: globalMonthYear.year
      });
      toast.success(`Deduction anomalies updated successfully for ${getMonthName(globalMonthYear.month)} ${globalMonthYear.year}!`);
      setDeductionAnomalies([]);
      fetchDeductionSummary();
    } catch (error) {
      toast.error('Failed to update deduction anomalies');
    }
  };

  const handleLoanRepaymentUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!selectedLoanMember || !repaymentAmount) {
        toast.error('Please select a member and enter repayment amount');
        return;
      }

              await axios.post('/admin/loan-repayment/update', {
        memberId: selectedLoanMember,
        repaymentAmount: parseFloat(repaymentAmount),
        month: globalMonthYear.month,
        year: globalMonthYear.year
      });
      
      toast.success('Loan repayment updated successfully!');
      setSelectedLoanMember('');
      setSelectedLoan(null);
      setRepaymentAmount('');
      fetchMembersWithActiveLoans();
      fetchDeductionSummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update loan repayment');
    }
  };

  const downloadReportWithFilters = async (endpoint, filename) => {
    try {
      const params = new URLSearchParams();
      if (globalMonthYear.month) params.append('month', globalMonthYear.month);
      if (globalMonthYear.year) params.append('year', globalMonthYear.year);
      
      const response = await axios.get(`${endpoint}?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded');
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
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">Welcome, {user.firstName} {user.surname}</p>
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
              { id: 'members', name: 'Members', icon: Users },
              { id: 'applications', name: 'Loan Applications', icon: CreditCard },
              { id: 'withdrawals', name: 'Withdrawal Requests', icon: DollarSign },
              { id: 'loans', name: 'Loan Management', icon: Plus },
              { id: 'deductions', name: 'Monthly Deductions', icon: Minus },
              { id: 'reports', name: 'Reports', icon: FileText }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Members</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {members.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Applications</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loanApplications.filter(app => app.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Withdrawals</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {withdrawalRequests.filter(req => req.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Loans</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {activeLoans.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowCreateMember(true)}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <Plus className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Add New Member</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <CreditCard className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Review Applications</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50"
                  >
                    <DollarSign className="h-6 w-6 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Process Withdrawals</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Members Management</h2>
              <button
                onClick={() => setShowCreateMember(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.surname}
                            </div>
                            <div className="text-sm text-gray-500">ID: {member.memberId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.email}</div>
                          <div className="text-sm text-gray-500">{member.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.bankName}</div>
                          <div className="text-sm text-gray-500">{member.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-green-600 hover:text-green-900">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.memberId)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Loan Applications</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loanApplications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {application.memberName}
                          </div>
                          <div className="text-sm text-gray-500">{application.memberId}</div>
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {application.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setShowLoanModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Review
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Active Loans</h2>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Borrower
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loan Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount / Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {loan.memberName}
                            </div>
                            <div className="text-sm text-gray-500">ID: {loan.memberId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {loan.id}
                            </div>
                            <div className="text-sm text-gray-500">
                              {loan.duration} months • {loan.loanType}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              ₦{loan.amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Balance: ₦{loan.remainingBalance.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                    {activeLoans.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          No active loans found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
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
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {withdrawalRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.memberName}
                          </div>
                          <div className="text-sm text-gray-500">{request.memberId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ID: {request.id}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  handleWithdrawalRequest('approved');
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  handleWithdrawalRequest('declined');
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Loan Management</h2>
            </div>
          </div>
        )}

        {activeTab === 'deductions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Monthly Deductions Summary</h2>
            
            {/* Month/Year Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Month/Year Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={globalMonthYear.month}
                    onChange={(e) => setGlobalMonthYear({...globalMonthYear, month: parseInt(e.target.value)})}
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
                  <label className="block text-sm font-medium text-gray-700">Year</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={globalMonthYear.year}
                    onChange={(e) => setGlobalMonthYear({...globalMonthYear, year: parseInt(e.target.value)})}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
            </div>
            {deductionSummary && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Deduction Totals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(deductionSummary.deductionTypes).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-semibold text-gray-900">₦{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Monthly Deduction</span>
                  <span className="text-lg font-semibold text-gray-900">₦{deductionSummary.totalMonthlyDeduction.toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Book Deductions (All Members)</h3>
              <form onSubmit={handleBookDeductionsUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Regular Savings</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={bookDeductions.regularSavings}
                    onChange={e => setBookDeductions({ ...bookDeductions, regularSavings: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount for all members"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shares</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={bookDeductions.shares}
                    onChange={e => setBookDeductions({ ...bookDeductions, shares: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount for all members"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Investment</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={bookDeductions.investment}
                    onChange={e => setBookDeductions({ ...bookDeductions, investment: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount for all members"
                  />
                </div>
                <div className="col-span-full flex justify-end mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Update Book Deductions
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Special Savings (Individual Members)</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Add special savings for specific members:</p>
              </div>
              <div className="space-y-4">
                {specialSavingsUpdates.map((update, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <select
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={update.memberId}
                      onChange={(e) => {
                        const newUpdates = [...specialSavingsUpdates];
                        newUpdates[index].memberId = e.target.value;
                        setSpecialSavingsUpdates(newUpdates);
                      }}
                    >
                      <option value="">Select Member</option>
                      {members.map((member) => (
                        <option key={member.memberId} value={member.memberId}>
                          {member.firstName} {member.surname} ({member.memberId})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Amount"
                      value={update.amount}
                      onChange={(e) => {
                        const newUpdates = [...specialSavingsUpdates];
                        newUpdates[index].amount = parseFloat(e.target.value) || 0;
                        setSpecialSavingsUpdates(newUpdates);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newUpdates = specialSavingsUpdates.filter((_, i) => i !== index);
                        setSpecialSavingsUpdates(newUpdates);
                      }}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSpecialSavingsUpdates([...specialSavingsUpdates, { memberId: '', amount: 0 }])}
                  className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  Add Member
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSpecialSavingsUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Update Special Savings
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deduction Anomalies (Over/Under Deductions)</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Set over/under deductions for specific members:</p>
              </div>
              <div className="space-y-4">
                {deductionAnomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <select
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={anomaly.memberId}
                      onChange={(e) => {
                        const newAnomalies = [...deductionAnomalies];
                        newAnomalies[index].memberId = e.target.value;
                        setDeductionAnomalies(newAnomalies);
                      }}
                    >
                      <option value="">Select Member</option>
                      {members.map((member) => (
                        <option key={member.memberId} value={member.memberId}>
                          {member.firstName} {member.surname} ({member.memberId})
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={anomaly.type}
                      onChange={(e) => {
                        const newAnomalies = [...deductionAnomalies];
                        newAnomalies[index].type = e.target.value;
                        setDeductionAnomalies(newAnomalies);
                      }}
                    >
                      <option value="over">Over Deduction</option>
                      <option value="under">Under Deduction</option>
                    </select>
                    <input
                      type="number"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Amount"
                      value={anomaly.amount}
                      onChange={(e) => {
                        const newAnomalies = [...deductionAnomalies];
                        newAnomalies[index].amount = parseFloat(e.target.value) || 0;
                        setDeductionAnomalies(newAnomalies);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newAnomalies = deductionAnomalies.filter((_, i) => i !== index);
                        setDeductionAnomalies(newAnomalies);
                      }}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDeductionAnomalies([...deductionAnomalies, { memberId: '', type: 'over', amount: 0 }])}
                  className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  Add Anomaly
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleDeductionAnomaliesUpdate}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Update Anomalies
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Repayment</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">Update loan repayments for members with active loans:</p>
              </div>
              <form onSubmit={handleLoanRepaymentUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Member</label>
                    <select
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={selectedLoanMember}
                      onChange={(e) => {
                        setSelectedLoanMember(e.target.value);
                        if (e.target.value) {
                          const member = membersWithActiveLoans.find(m => m.memberId === e.target.value);
                          if (member && member.activeLoans.length > 0) {
                            setSelectedLoan(member.activeLoans[0]);
                          }
                        } else {
                          setSelectedLoan(null);
                        }
                      }}
                    >
                      <option value="">Select Member with Active Loan</option>
                      {membersWithActiveLoans.map((member) => (
                        <option key={member.memberId} value={member.memberId}>
                          {member.memberName} ({member.memberId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Repayment Amount</label>
                    <input
                      type="number"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={repaymentAmount}
                      onChange={(e) => setRepaymentAmount(e.target.value)}
                      placeholder="Enter repayment amount"
                    />
                  </div>
                </div>

                {selectedLoan && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Loan Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Loan Amount:</span>
                        <span className="ml-2 font-medium">₦{selectedLoan.amount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining Balance:</span>
                        <span className="ml-2 font-medium">₦{selectedLoan.remainingBalance.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span className="ml-2 font-medium">₦{selectedLoan.monthlyPayment.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-2 font-medium">{selectedLoan.duration} months</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Loan Type:</span>
                        <span className="ml-2 font-medium">{selectedLoan.loanType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Purpose:</span>
                        <span className="ml-2 font-medium">{selectedLoan.purpose}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Update Loan Repayment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Reports & Payroll</h2>
            
            {/* Report Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={globalMonthYear.month}
                    onChange={(e) => setGlobalMonthYear({...globalMonthYear, month: parseInt(e.target.value)})}
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
                  <label className="block text-sm font-medium text-gray-700">Year</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={globalMonthYear.year}
                    onChange={(e) => setGlobalMonthYear({...globalMonthYear, year: parseInt(e.target.value)})}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
            </div>

            {/* Monthly Reports Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">📅 Monthly Reports</h3>
              <p className="text-sm text-gray-600 mb-4">Reports based on selected month and year. If no data exists for the selected period, reports will return blank records.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Deduction Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Tracks deductions per member for the selected month</p>
                  <div className="space-y-2">
                                                        <button onClick={() => downloadReportWithFilters('/reports/monthly-deduction/excel', 'monthly_deduction_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-deduction/pdf', 'monthly_deduction_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Payroll Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Shows payroll details processed in the selected month</p>
                  <div className="space-y-2">
                                        <button onClick={() => downloadReportWithFilters('/reports/monthly-payroll/excel', 'monthly_payroll_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-payroll/pdf', 'monthly_payroll_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Savings Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Tracks savings contributions for the selected month</p>
                  <div className="space-y-2">
                                                        <button onClick={() => downloadReportWithFilters('/reports/monthly-savings/excel', 'monthly_savings_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-savings/pdf', 'monthly_savings_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Loan Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Details loans given or repaid in the selected month</p>
                  <div className="space-y-2">
                                                        <button onClick={() => downloadReportWithFilters('/reports/monthly-loan/excel', 'monthly_loan_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-loan/pdf', 'monthly_loan_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Monthly Withdrawal Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Records withdrawals made in the selected month</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-withdrawal/excel', 'monthly_withdrawal_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/monthly-withdrawal/pdf', 'monthly_withdrawal_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">General System Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Combines all reports for the selected month</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/general-system/excel', 'general_system_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/general-system/pdf', 'general_system_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cumulative Reports Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">📈 Cumulative Reports (Year-Based Aggregation)</h3>
              <p className="text-sm text-gray-600 mb-4">Cumulative reports aggregate monthly data into yearly summaries. These reports update automatically as new data is added throughout the year.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cumulative Deduction Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Yearly total of all monthly deductions</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-deduction/excel', 'cumulative_deduction_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-deduction/pdf', 'cumulative_deduction_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cumulative Payroll Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Yearly total of all payroll disbursements</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-payroll/excel', 'cumulative_payroll_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-payroll/pdf', 'cumulative_payroll_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cumulative Savings Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Total savings across the year</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-savings/excel', 'cumulative_savings_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-savings/pdf', 'cumulative_savings_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cumulative Loan Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Total loans issued or repaid in the year</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-loan/excel', 'cumulative_loan_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-loan/pdf', 'cumulative_loan_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cumulative Withdrawal Report</h4>
                  <p className="text-xs text-gray-600 mb-3">Total withdrawals across the year</p>
                  <div className="space-y-2">
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-withdrawal/excel', 'cumulative_withdrawal_report.xlsx')} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Download Excel</button>
                    <button onClick={() => downloadReportWithFilters('/reports/cumulative-withdrawal/pdf', 'cumulative_withdrawal_report.pdf')} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Download PDF</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </main>

      {/* Create Member Modal */}
      {showCreateMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Member</h3>
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member ID</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={memberForm.memberId}
                    onChange={(e) => setMemberForm({...memberForm, memberId: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={memberForm.firstName}
                      onChange={(e) => setMemberForm({...memberForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Surname</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={memberForm.surname}
                      onChange={(e) => setMemberForm({...memberForm, surname: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={memberForm.bankName}
                    onChange={(e) => setMemberForm({...memberForm, bankName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={memberForm.accountNumber}
                      onChange={(e) => setMemberForm({...memberForm, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={memberForm.accountHolderName}
                      onChange={(e) => setMemberForm({...memberForm, accountHolderName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateMember(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Create Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMember && editingMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Member</h3>
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member ID</label>
                  <input
                    type="text"
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                    value={editMemberForm.memberId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={editMemberForm.firstName}
                      onChange={(e) => setEditMemberForm({...editMemberForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Surname</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={editMemberForm.surname}
                      onChange={(e) => setEditMemberForm({...editMemberForm, surname: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editMemberForm.email}
                    onChange={(e) => setEditMemberForm({...editMemberForm, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editMemberForm.phone}
                    onChange={(e) => setEditMemberForm({...editMemberForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editMemberForm.bankName}
                    onChange={(e) => setEditMemberForm({...editMemberForm, bankName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={editMemberForm.accountNumber}
                      onChange={(e) => setEditMemberForm({...editMemberForm, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={editMemberForm.accountHolderName}
                      onChange={(e) => setEditMemberForm({...editMemberForm, accountHolderName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditMember(false);
                      setEditingMember(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Update Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Loan Application Review Modal */}
      {showLoanModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Loan Application</h3>
              
              {/* Application Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Member</label>
                    <p className="text-sm text-gray-900 font-medium">{selectedApplication.memberName}</p>
                    <p className="text-xs text-gray-500">ID: {selectedApplication.memberId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requested Amount</label>
                    <p className="text-lg text-gray-900 font-bold">₦{selectedApplication.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-sm text-gray-900">{selectedApplication.duration} months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Category</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedApplication.loanCategory || 'standard'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="text-sm text-gray-900">{new Date(selectedApplication.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Status</label>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedApplication.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedApplication.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedApplication.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <p className="text-sm text-gray-900 font-medium">₦{selectedApplication.monthlyPayment?.toLocaleString() || 'Calculating...'}</p>
                  </div>
                  <div>
                    
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm text-gray-900">{selectedApplication.purpose}</p>
                </div>
              </div>



              {/* Eligibility Information */}
              {selectedApplication.eligibilityNotes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Eligibility Assessment</label>
                  <div className={`p-3 rounded border ${
                    selectedApplication.eligibilityChecked && selectedApplication.eligibilityNotes.includes('eligible')
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}>
                    <p className="text-sm">{selectedApplication.eligibilityNotes}</p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Add notes about this application decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowLoanModal(false);
                    setAdminNotes('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLoanApplication('declined')}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Decline Application
                </button>
                <button
                  onClick={() => handleLoanApplication('approved')}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Approve & Create Loan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Repayment Modal */}
      {showRepaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Record Loan Repayment</h3>
              
              {/* Loan Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Borrower</label>
                    <p className="text-sm text-gray-900">{selectedLoan.memberName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan ID</label>
                    <p className="text-sm text-gray-900">{selectedLoan.loanId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Original Amount</label>
                    <p className="text-sm text-gray-900">₦{selectedLoan.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                    <p className="text-sm font-bold text-red-600">₦{selectedLoan.remainingBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <p className="text-sm text-gray-900">₦{selectedLoan.monthlyPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLoan.status}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleLoanRepayment(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Repayment Amount (₦)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedLoan.remainingBalance}
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={repaymentAmount}
                    onChange={(e) => setRepaymentAmount(e.target.value)}
                    placeholder="Enter repayment amount"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maximum: ₦{selectedLoan.remainingBalance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
                  <textarea
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this payment..."
                  />
                </div>

                {repaymentAmount && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>After this payment:</strong>
                    </p>
                    <p className="text-sm text-blue-700">
                      Remaining Balance: ₦{(selectedLoan.remainingBalance - parseFloat(repaymentAmount || 0)).toLocaleString()}
                    </p>
                    {(selectedLoan.remainingBalance - parseFloat(repaymentAmount || 0)) <= 0 && (
                      <p className="text-sm font-medium text-green-700">
                        ✅ This payment will complete the loan!
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRepaymentModal(false);
                      setSelectedLoan(null);
                      setRepaymentAmount('');
                      setAdminNotes('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!repaymentAmount || parseFloat(repaymentAmount) <= 0}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                      repaymentAmount && parseFloat(repaymentAmount) > 0
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 