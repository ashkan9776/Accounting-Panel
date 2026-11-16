'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  FileBadge,
  CreditCard,
  Building2,
  Phone,
  Calendar,
  Eye,
  Edit2,
  AlertCircle,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface EmployeeItem {
  id: string;
  personnelCode: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  mobile: string;
  hireDateShamsi: string;
  insuranceNumber: string;
  jobTitle: string;
  department: string;
  bankName: string;
  bankShebaNumber: string;
  contractType: 'TEMPORARY' | 'PERMANENT' | 'HOURLY';
  monthlyBaseSalary: number;
  monthlyHousingAllowance: number;
  monthlyGroceryAllowance: number;
  monthlySeniorityBonus: number;
  childCount: number;
  isActive: boolean;
}

const INITIAL_EMPLOYEES: EmployeeItem[] = [
  {
    id: 'emp-1',
    personnelCode: 'EMP-1001',
    nationalId: '0012345678',
    firstName: 'مهدی',
    lastName: 'محمدی',
    fatherName: 'حسین',
    mobile: '09121112233',
    hireDateShamsi: '1401/01/15',
    insuranceNumber: '12345678',
    jobTitle: 'کارشناس ارشد حسابداری',
    department: 'مالی و اداری',
    bankName: 'بانک پاسارگاد',
    bankShebaNumber: 'IR120570000000001234567890',
    contractType: 'TEMPORARY',
    monthlyBaseSalary: 120000000,
    monthlyHousingAllowance: 9000000,
    monthlyGroceryAllowance: 14000000,
    monthlySeniorityBonus: 2100000,
    childCount: 1,
    isActive: true,
  },
  {
    id: 'emp-2',
    personnelCode: 'EMP-1002',
    nationalId: '0076543210',
    firstName: 'سارا',
    lastName: 'رضایی',
    fatherName: 'احمد',
    mobile: '09122223344',
    hireDateShamsi: '1402/03/01',
    insuranceNumber: '87654321',
    jobTitle: 'مسئول فروش و صندوق',
    department: 'فروشگاه و POS',
    bankName: 'بانک ملت',
    bankShebaNumber: 'IR980120000000009876543210',
    contractType: 'TEMPORARY',
    monthlyBaseSalary: 95000000,
    monthlyHousingAllowance: 9000000,
    monthlyGroceryAllowance: 14000000,
    monthlySeniorityBonus: 0,
    childCount: 0,
    isActive: true,
  },
  {
    id: 'emp-3',
    personnelCode: 'EMP-1003',
    nationalId: '0054321678',
    firstName: 'کامران',
    lastName: 'کریمی',
    fatherName: 'محسن',
    mobile: '09123334455',
    hireDateShamsi: '1400/06/10',
    insuranceNumber: '55667788',
    jobTitle: 'اپراتور ارشد ماشین‌کاری CNC',
    department: 'تولید و کارخانه',
    bankName: 'بانک صادرات',
    bankShebaNumber: 'IR450190000000005566778899',
    contractType: 'PERMANENT',
    monthlyBaseSalary: 145000000,
    monthlyHousingAllowance: 9000000,
    monthlyGroceryAllowance: 14000000,
    monthlySeniorityBonus: 4200000,
    childCount: 2,
    isActive: true,
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // فرم ایجاد پرسنل جدید
  const [pCode, setPCode] = useState('EMP-1004');
  const [nId, setNId] = useState('');
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [father, setFather] = useState('');
  const [mobile, setMobile] = useState('');
  const [hDate, setHDate] = useState('1403/01/01');
  const [insNo, setInsNo] = useState('');
  const [jTitle, setJTitle] = useState('کارشناس فروش');
  const [dept, setDept] = useState('فروش و بازاریابی');
  const [bank, setBank] = useState('بانک پاسارگاد');
  const [sheba, setSheba] = useState('IR');
  const [cType, setCType] = useState<'TEMPORARY' | 'PERMANENT' | 'HOURLY'>('TEMPORARY');
  const [baseSal, setBaseSal] = useState('100000000');
  const [housing, setHousing] = useState('9000000');
  const [grocery, setGrocery] = useState('14000000');
  const [seniority, setSeniority] = useState('0');
  const [childCount, setChildCount] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheba.startsWith('IR') || sheba.length !== 26) {
      alert('شماره شبا باید با IR شروع شده و ۲۶ رقم باشد (IR + ۲۴ رقم).');
      return;
    }
    if (nId.length !== 10) {
      alert('کد ملی باید دقیقاً ۱۰ رقم عددی باشد.');
      return;
    }

    const newEmp: EmployeeItem = {
      id: `emp-${Date.now()}`,
      personnelCode: pCode,
      nationalId: nId,
      firstName: fName,
      lastName: lName,
      fatherName: father,
      mobile: mobile,
      hireDateShamsi: hDate,
      insuranceNumber: insNo,
      jobTitle: jTitle,
      department: dept,
      bankName: bank,
      bankShebaNumber: sheba,
      contractType: cType,
      monthlyBaseSalary: Number(baseSal),
      monthlyHousingAllowance: Number(housing),
      monthlyGroceryAllowance: Number(grocery),
      monthlySeniorityBonus: Number(seniority),
      childCount: Number(childCount),
      isActive: true,
    };

    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    showToast(`پرونده پرسنلی «${fName} ${lName}» با موفقیت ایجاد گردید.`);
    // ریست فرم
    setFName('');
    setLName('');
    setNId('');
    setSheba('IR');
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.includes(searchQuery) ||
      emp.lastName.includes(searchQuery) ||
      emp.personnelCode.includes(searchQuery) ||
      emp.nationalId.includes(searchQuery);
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            احکام کارگزینی و پرونده پرسنل
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            تعریف مشخصات سجلی و بانکی پرسنل، شرایط قرارداد قانون کار، مزایای رفاهی و حق اولاد جهت صدور اتوماتیک فیش حقوق
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          ثبت پرسنل جدید
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو با نام، کد پرسنلی یا کد ملی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-3 pr-9 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">واحد سازمانی:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="ALL">همه واحدها</option>
            <option value="مالی و اداری">مالی و اداری</option>
            <option value="تولید و کارخانه">تولید و کارخانه</option>
            <option value="فروشگاه و POS">فروشگاه و POS</option>
            <option value="فروش و بازاریابی">فروش و بازاریابی</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">کد پرسنلی</th>
                <th className="py-3 px-4">نام و نام خانوادگی</th>
                <th className="py-3 px-3">کد ملی</th>
                <th className="py-3 px-3">شماره بیمه</th>
                <th className="py-3 px-3">عنوان شغلی و واحد</th>
                <th className="py-3 px-4">شماره شبا بانکی</th>
                <th className="py-3 px-3">حقوق پایه (ریال)</th>
                <th className="py-3 px-3">مزایای مصوب</th>
                <th className="py-3 px-3">وضعیت</th>
                <th className="py-3 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{emp.personnelCode}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{emp.firstName} {emp.lastName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">فرزند {emp.fatherName || '-'}</div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{emp.nationalId}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{emp.insuranceNumber || '-'}</td>
                  <td className="py-3.5 px-3">
                    <div className="font-medium text-slate-800">{emp.jobTitle}</div>
                    <div className="text-[11px] text-slate-400">{emp.department}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 direction-ltr">
                    {emp.bankShebaNumber}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-800">
                    {emp.monthlyBaseSalary.toLocaleString('fa-IR')}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500">
                    <div className="text-[11px]">مسکن: {emp.monthlyHousingAllowance.toLocaleString('fa-IR')}</div>
                    <div className="text-[11px]">بن: {emp.monthlyGroceryAllowance.toLocaleString('fa-IR')}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      شاغل فعال
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-md transition-colors"
                      title="مشاهده حکم کارگزینی"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: ثبت پرسنل جدید */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              تشکیل پرونده پرسنلی و صدور حکم کارگزینی
            </h2>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">۱. مشخصات فردی و سجلی</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">کد پرسنلی</label>
                    <input
                      type="text"
                      value={pCode}
                      onChange={(e) => setPCode(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">نام</label>
                    <input
                      type="text"
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">نام خانوادگی</label>
                    <input
                      type="text"
                      value={lName}
                      onChange={(e) => setLName(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">کد ملی (۱۰ رقم)</label>
                    <input
                      type="text"
                      value={nId}
                      maxLength={10}
                      onChange={(e) => setNId(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0012345678"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">نام پدر</label>
                    <input
                      type="text"
                      value={father}
                      onChange={(e) => setFather(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">شماره بیمه تامین اجتماعی</label>
                    <input
                      type="text"
                      value={insNo}
                      onChange={(e) => setInsNo(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="12345678"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">۲. اطلاعات شغلی و بانکی</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">واحد سازمانی</label>
                    <input
                      type="text"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">عنوان شغلی</label>
                    <input
                      type="text"
                      value={jTitle}
                      onChange={(e) => setJTitle(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">نوع قرارداد</label>
                    <select
                      value={cType}
                      onChange={(e: any) => setCType(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="TEMPORARY">قرارداد موقت قانون کار</option>
                      <option value="PERMANENT">قرارداد دائم / رسمی</option>
                      <option value="HOURLY">قرارداد ساعتی</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">نام بانک عامل</label>
                    <input
                      type="text"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">شماره شبا (۲۶ کاراکتر با IR)</label>
                    <input
                      type="text"
                      value={sheba}
                      maxLength={26}
                      onChange={(e) => setSheba(e.target.value.toUpperCase())}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none direction-ltr text-right"
                      placeholder="IR..."
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">۳. اقلام حکم کارگزینی و حقوق ماهانه (ریال)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">حقوق پایه ۳۰ روزه</label>
                    <input
                      type="text"
                      value={baseSal}
                      onChange={(e) => setBaseSal(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">حق مسکن مصوب</label>
                    <input
                      type="text"
                      value={housing}
                      onChange={(e) => setHousing(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">بن خواربار مصوب</label>
                    <input
                      type="text"
                      value={grocery}
                      onChange={(e) => setGrocery(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">پایه سنوات ماهانه</label>
                    <input
                      type="text"
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">تعداد فرزندان مشمول حق اولاد</label>
                    <input
                      type="number"
                      min={0}
                      value={childCount}
                      onChange={(e) => setChildCount(Number(e.target.value))}
                      className="w-full text-xs p-2 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  ثبت پرونده و حکم کارگزینی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: جزئیات حکم کارگزینی پرسنل */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileBadge className="w-5 h-5 text-emerald-600" />
              حکم کارگزینی: {selectedEmployee.firstName} {selectedEmployee.lastName} ({selectedEmployee.personnelCode})
            </h2>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">کد ملی:</span> <strong className="font-mono">{selectedEmployee.nationalId}</strong></div>
                <div><span className="text-slate-500">شماره بیمه:</span> <strong className="font-mono">{selectedEmployee.insuranceNumber}</strong></div>
                <div><span className="text-slate-500">واحد سازمانی:</span> <strong>{selectedEmployee.department}</strong></div>
                <div><span className="text-slate-500">عنوان شغلی:</span> <strong>{selectedEmployee.jobTitle}</strong></div>
                <div><span className="text-slate-500">تاریخ استخدام:</span> <span className="font-mono">{selectedEmployee.hireDateShamsi}</span></div>
                <div><span className="text-slate-500">نوع قرارداد:</span> <span>{selectedEmployee.contractType === 'TEMPORARY' ? 'موقت قانون کار' : 'رسمی'}</span></div>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-1.5">
                <span className="font-bold text-emerald-800 block mb-1">اقلام مستمر ماهانه حکم (ریال):</span>
                <div className="flex justify-between"><span>حقوق پایه ۳۰ روزه:</span> <strong className="font-mono">{selectedEmployee.monthlyBaseSalary.toLocaleString('fa-IR')}</strong></div>
                <div className="flex justify-between"><span>حق مسکن مصوب:</span> <strong className="font-mono">{selectedEmployee.monthlyHousingAllowance.toLocaleString('fa-IR')}</strong></div>
                <div className="flex justify-between"><span>بن خواربار کارگری:</span> <strong className="font-mono">{selectedEmployee.monthlyGroceryAllowance.toLocaleString('fa-IR')}</strong></div>
                {selectedEmployee.monthlySeniorityBonus > 0 && (
                  <div className="flex justify-between"><span>پایه سنوات:</span> <strong className="font-mono">{selectedEmployee.monthlySeniorityBonus.toLocaleString('fa-IR')}</strong></div>
                )}
                {selectedEmployee.childCount > 0 && (
                  <div className="flex justify-between"><span>حق اولاد ({selectedEmployee.childCount} فرزند):</span> <strong className="font-mono">{(selectedEmployee.childCount * 7166184).toLocaleString('fa-IR')}</strong></div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border text-[11px] font-mono text-slate-700">
                شماره شبا: {selectedEmployee.bankShebaNumber} ({selectedEmployee.bankName})
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
