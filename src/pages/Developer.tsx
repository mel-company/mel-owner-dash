import React from 'react';

const SupportDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          لوحة الدعم التقني
        </h1>
        <p className="text-gray-500 mt-1">
          إدارة التذاكر، المستخدمين، والمشاكل التقنية
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="تذاكر جديدة" value="12" color="blue" />
        <StatCard title="قيد المعالجة" value="8" color="yellow" />
        <StatCard title="مغلقة" value="34" color="green" />
        <StatCard title="مستخدمين نشطين" value="120" color="purple" />
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">آخر التذاكر</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-right py-2">المستخدم</th>
              <th className="text-right">العنوان</th>
              <th className="text-right">الحالة</th>
              <th className="text-right">التاريخ</th>
              <th className="text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <TicketRow
              user="Ahmed Ali"
              title="مشكلة تسجيل الدخول"
              status="open"
              date="2026-02-10"
            />
            <TicketRow
              user="Mohammed Hassan"
              title="الدفع لا يعمل"
              status="pending"
              date="2026-02-09"
            />
            <TicketRow
              user="Sara Omar"
              title="خطأ في الطلب"
              status="closed"
              date="2026-02-08"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupportDashboard;

/* =========================
   Components
========================= */

const StatCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${colors[color]}`}>
        {value}
      </p>
    </div>
  );
};

const TicketRow = ({
  user,
  title,
  status,
  date,
}: {
  user: string;
  title: string;
  status: 'open' | 'pending' | 'closed';
  date: string;
}) => {
  const statusMap = {
    open: {
      label: 'جديدة',
      class: 'bg-blue-100 text-blue-700',
    },
    pending: {
      label: 'قيد المعالجة',
      class: 'bg-yellow-100 text-yellow-700',
    },
    closed: {
      label: 'مغلقة',
      class: 'bg-green-100 text-green-700',
    },
  };

  return (
    <tr className="border-b last:border-0">
      <td className="py-3">{user}</td>
      <td>{title}</td>
      <td>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusMap[status].class}`}
        >
          {statusMap[status].label}
        </span>
      </td>
      <td>{date}</td>
      <td>
        <button className="text-indigo-600 hover:underline">
          فتح
        </button>
      </td>
    </tr>
  );
};
