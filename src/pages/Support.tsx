import { useState, useEffect } from 'react';
import { supportTicketsService, type SupportTicket, type CreateTicketRequest } from '../services/supportTicketsService';

const Support = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });

  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await supportTicketsService.getAllSystemTickets({ page: 1, limit: 100 });
      setTickets(response.data || []);
    } catch (err) {
      setError('فشل في جلب تذاكر الدعم. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await supportTicketsService.createSystemTicket(formData);
      setShowModal(false);
      resetForm();
      fetchTickets();
    } catch (err) {
      setError('فشل في إنشاء التذكرة. يرجى المحاولة مرة أخرى.');
      console.error('Error creating ticket:', err);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      setError('');
      await supportTicketsService.closeSystemTicket(id);
      fetchTickets();
    } catch (err) {
      setError('فشل في إغلاق التذكرة.');
      console.error('Error closing ticket:', err);
    }
  };

  const handleCancelTicket = async (id: string) => {
    try {
      setError('');
      await supportTicketsService.cancelSystemTicket(id);
      fetchTickets();
    } catch (err) {
      setError('فشل في إلغاء التذكرة.');
      console.error('Error cancelling ticket:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      category: '',
    });
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-700';
    const colors: { [key: string]: string } = {
      'URGENT': 'bg-red-100 text-red-700',
      'HIGH': 'bg-orange-100 text-orange-700',
      'MEDIUM': 'bg-yellow-100 text-yellow-700',
      'LOW': 'bg-green-100 text-green-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const colors: { [key: string]: string } = {
      'OPEN': 'bg-blue-100 text-blue-700',
      'IN_PROGRESS': 'bg-yellow-100 text-yellow-700',
      'RESOLVED': 'bg-green-100 text-green-700',
      'CLOSED': 'bg-gray-100 text-gray-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityText = (priority: string | undefined) => {
    if (!priority) return 'غير محدد';
    const priorityMap: { [key: string]: string } = {
      'URGENT': 'عاجل',
      'HIGH': 'عالية',
      'MEDIUM': 'متوسطة',
      'LOW': 'منخفضة',
    };
    return priorityMap[priority] || priority;
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return 'غير محدد';
    const statusMap: { [key: string]: string } = {
      'OPEN': 'مفتوحة',
      'IN_PROGRESS': 'قيد المعالجة',
      'RESOLVED': 'محلولة',
      'CLOSED': 'مغلقة',
      'CANCELLED': 'ملغاة',
    };
    return statusMap[status] || status;
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.category && ticket.category !== filters.category) return false;
    if (filters.search && !ticket.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    closed: tickets.filter(t => t.status === 'CLOSED' || t.status === 'RESOLVED').length,
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">داشبورد الدعم الفني</h1>
          <p className="text-gray-600">إدارة تذاكر الدعم والمستوى</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
        >
          + تذكرة جديدة
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">إجمالي التذاكر</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المفتوحة</p>
          <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">قيد المعالجة</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm mb-1">المغلقة</p>
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">جميع الحالات</option>
            <option value="OPEN">مفتوحة</option>
            <option value="IN_PROGRESS">قيد المعالجة</option>
            <option value="RESOLVED">محلولة</option>
            <option value="CLOSED">مغلقة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">جميع الأولويات</option>
            <option value="URGENT">عاجل</option>
            <option value="HIGH">عالية</option>
            <option value="MEDIUM">متوسطة</option>
            <option value="LOW">منخفضة</option>
          </select>
          <input
            type="text"
            placeholder="بحث..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none flex-1"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p className="text-lg">لا توجد تذاكر</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم التذكرة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العنوان</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الفئة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأولوية</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-blue-600">#{ticket.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{ticket.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{ticket.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                      {new Date(ticket.createdAt).toLocaleDateString('ar-IQ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="text-blue-600 hover:text-blue-800 mr-4 hover:underline"
                      >
                        عرض
                      </button>
                      {ticket.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleCloseTicket(ticket.id)}
                            className="text-green-600 hover:text-green-800 mr-4 hover:underline"
                          >
                            إغلاق
                          </button>
                          <button
                            onClick={() => handleCancelTicket(ticket.id)}
                            className="text-red-600 hover:text-red-800 hover:underline"
                          >
                            إلغاء
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">تذكرة جديدة</h2>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الأولوية</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM">متوسطة</option>
                  <option value="HIGH">عالية</option>
                  <option value="URGENT">عاجل</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الفئة</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">تفاصيل التذكرة</h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">العنوان</p>
                <p className="font-semibold text-gray-800">{selectedTicket.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">الوصف</p>
                <p className="font-semibold text-gray-800">{selectedTicket.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">الحالة</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusText(selectedTicket.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">الأولوية</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    {getPriorityText(selectedTicket.priority)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">تاريخ الإنشاء</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(selectedTicket.createdAt).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">آخر تحديث</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(selectedTicket.updatedAt).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
