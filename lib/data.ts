import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

export interface User {
  id: number;
  memberId: string;
  firstName: string;
  surname: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  basicSalary: number;
  allowances: number;
  cumulativeSavings: number;
  cumulativeShares: number;
  cumulativeInvestment: number;
  specialSavingsBalance: number;
  isFirstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyDeduction {
  id: number;
  userId: number;
  month: number;
  year: number;
  regularSavings: number;
  specialSavings: number;
  shares: number;
  investment: number;
  loanRepayment: number;
  overDeduction: number;
  underDeduction: number;
  ileyaLoan: number;
  business: number;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: number;
  loanId: string;
  userId: number;
  memberId: string;
  memberName: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  status: 'active' | 'completed' | 'defaulted';
  applicationId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanApplication {
  id: number;
  userId: number;
  memberId: string;
  memberName: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'declined';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: number;
  userId: number;
  memberId: string;
  memberName: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  amount: number;
  paymentDate: string;
  month: number;
  year: number;
  createdAt: string;
}

// Generic functions for reading and writing JSON data
async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(dataDir, filename);
    const data = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  try {
    const filePath = path.join(dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw new Error(`Failed to write ${filename}`);
  }
}

// User functions
export async function getUsers(): Promise<User[]> {
  return readJsonFile<User>('users.json');
}

export async function getUserById(id: number): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => user.id === id) || null;
}

export async function getUserByMemberIdOrEmail(identifier: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(user => 
    user.memberId.toLowerCase() === identifier.toLowerCase() || 
    user.email.toLowerCase() === identifier.toLowerCase()
  ) || null;
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const users = await getUsers();
  const newId = Math.max(...users.map(u => u.id), 0) + 1;
  const now = new Date().toISOString();
  
  const newUser: User = {
    ...userData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };
  
  users.push(newUser);
  await writeJsonFile('users.json', users);
  return newUser;
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  const users = await getUsers();
  const userIndex = users.findIndex(user => user.id === id);
  
  if (userIndex === -1) return null;
  
  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile('users.json', users);
  return users[userIndex];
}

export async function deleteUser(id: number): Promise<boolean> {
  const users = await getUsers();
  const initialLength = users.length;
  const filteredUsers = users.filter(user => user.id !== id);
  
  if (filteredUsers.length < initialLength) {
    await writeJsonFile('users.json', filteredUsers);
    return true;
  }
  return false;
}

// Monthly Deductions functions
export async function getMonthlyDeductions(): Promise<MonthlyDeduction[]> {
  return readJsonFile<MonthlyDeduction>('monthly-deductions.json');
}

export async function getMonthlyDeductionsByUser(userId: number): Promise<MonthlyDeduction[]> {
  const deductions = await getMonthlyDeductions();
  return deductions.filter(d => d.userId === userId);
}

export async function getMonthlyDeductionsByMonthYear(month: number, year: number): Promise<MonthlyDeduction[]> {
  const deductions = await getMonthlyDeductions();
  return deductions.filter(d => d.month === month && d.year === year);
}

export async function createOrUpdateMonthlyDeduction(
  deductionData: Omit<MonthlyDeduction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MonthlyDeduction> {
  const deductions = await getMonthlyDeductions();
  const existingIndex = deductions.findIndex(
    d => d.userId === deductionData.userId && 
         d.month === deductionData.month && 
         d.year === deductionData.year
  );
  
  const now = new Date().toISOString();
  
  if (existingIndex !== -1) {
    // Update existing
    deductions[existingIndex] = {
      ...deductions[existingIndex],
      ...deductionData,
      updatedAt: now,
    };
    await writeJsonFile('monthly-deductions.json', deductions);
    return deductions[existingIndex];
  } else {
    // Create new
    const newId = Math.max(...deductions.map(d => d.id), 0) + 1;
    const newDeduction: MonthlyDeduction = {
      ...deductionData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    
    deductions.push(newDeduction);
    await writeJsonFile('monthly-deductions.json', deductions);
    return newDeduction;
  }
}

// Loans functions
export async function getLoans(): Promise<Loan[]> {
  return readJsonFile<Loan>('loans.json');
}

export async function getLoansByUser(userId: number): Promise<Loan[]> {
  const loans = await getLoans();
  return loans.filter(loan => loan.userId === userId);
}

export async function createLoan(loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> {
  const loans = await getLoans();
  const newId = Math.max(...loans.map(l => l.id), 0) + 1;
  const now = new Date().toISOString();
  
  const newLoan: Loan = {
    ...loanData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };
  
  loans.push(newLoan);
  await writeJsonFile('loans.json', loans);
  return newLoan;
}

export async function updateLoan(id: number, updates: Partial<Loan>): Promise<Loan | null> {
  const loans = await getLoans();
  const loanIndex = loans.findIndex(loan => loan.id === id);
  
  if (loanIndex === -1) return null;
  
  loans[loanIndex] = {
    ...loans[loanIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile('loans.json', loans);
  return loans[loanIndex];
}

// Loan Applications functions
export async function getLoanApplications(): Promise<LoanApplication[]> {
  return readJsonFile<LoanApplication>('loan-applications.json');
}

export async function getLoanApplicationsByUser(userId: number): Promise<LoanApplication[]> {
  const applications = await getLoanApplications();
  return applications.filter(app => app.userId === userId);
}

export async function createLoanApplication(
  appData: Omit<LoanApplication, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LoanApplication> {
  const applications = await getLoanApplications();
  const newId = Math.max(...applications.map(app => app.id), 0) + 1;
  const now = new Date().toISOString();
  
  const newApplication: LoanApplication = {
    ...appData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };
  
  applications.push(newApplication);
  await writeJsonFile('loan-applications.json', applications);
  return newApplication;
}

export async function updateLoanApplication(
  id: number, 
  updates: Partial<LoanApplication>
): Promise<LoanApplication | null> {
  const applications = await getLoanApplications();
  const appIndex = applications.findIndex(app => app.id === id);
  
  if (appIndex === -1) return null;
  
  applications[appIndex] = {
    ...applications[appIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile('loan-applications.json', applications);
  return applications[appIndex];
}

// Withdrawal Requests functions
export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  return readJsonFile<WithdrawalRequest>('withdrawal-requests.json');
}

export async function getWithdrawalRequestsByUser(userId: number): Promise<WithdrawalRequest[]> {
  const requests = await getWithdrawalRequests();
  return requests.filter(req => req.userId === userId);
}

export async function createWithdrawalRequest(
  reqData: Omit<WithdrawalRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WithdrawalRequest> {
  const requests = await getWithdrawalRequests();
  const newId = Math.max(...requests.map(req => req.id), 0) + 1;
  const now = new Date().toISOString();
  
  const newRequest: WithdrawalRequest = {
    ...reqData,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };
  
  requests.push(newRequest);
  await writeJsonFile('withdrawal-requests.json', requests);
  return newRequest;
}

export async function updateWithdrawalRequest(
  id: number, 
  updates: Partial<WithdrawalRequest>
): Promise<WithdrawalRequest | null> {
  const requests = await getWithdrawalRequests();
  const reqIndex = requests.findIndex(req => req.id === id);
  
  if (reqIndex === -1) return null;
  
  requests[reqIndex] = {
    ...requests[reqIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await writeJsonFile('withdrawal-requests.json', requests);
  return requests[reqIndex];
}

// Loan Payments functions
export async function getLoanPayments(): Promise<LoanPayment[]> {
  return readJsonFile<LoanPayment>('loan-payments.json');
}

export async function getLoanPaymentsByLoan(loanId: number): Promise<LoanPayment[]> {
  const payments = await getLoanPayments();
  return payments.filter(payment => payment.loanId === loanId);
}

export async function createLoanPayment(
  paymentData: Omit<LoanPayment, 'id' | 'createdAt'>
): Promise<LoanPayment> {
  const payments = await getLoanPayments();
  const newId = Math.max(...payments.map(p => p.id), 0) + 1;
  const now = new Date().toISOString();
  
  const newPayment: LoanPayment = {
    ...paymentData,
    id: newId,
    createdAt: now,
  };
  
  payments.push(newPayment);
  await writeJsonFile('loan-payments.json', payments);
  return newPayment;
}