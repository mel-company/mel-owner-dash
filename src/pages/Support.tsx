import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Headphones,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  supportTicketsService,
  type SupportTicket,
  type CreateTicketRequest,
  type SupportTicketStoreOption,
  type SupportTicketAttachment,
  TicketPriorityEnum,
  TicketStatusEnum,
  TicketTypeEnum,
  DepartmentEnum,
} from '../services/supportTicketsService';
import { supportMessagesService, type SupportMessage } from '../services/supportMessagesService';
import { useSupportUnread } from '../contexts/SupportUnreadContext';
import { markTicketReadLocally } from '../utils/supportUnread';
import { cn } from '@/lib/utils';

type TicketFilters = {
  status: string;
  priority: string;
  department: string;
  search: string;
};

type ModalMode = 'create' | 'details' | null;

const defaultTicketForm: CreateTicketRequest = {
  title: '',
  description: '',
  priority: TicketPriorityEnum.HIGH,
  type: TicketTypeEnum.SUPPORT,
  department: DepartmentEnum.IT,
};

const fallbackTickets: SupportTicket[] = [
  {
    id: '4322A2A',
    title: 'ستور اوريوس للتجهيز الالكتروني',
    description: 'اشرح هنا تفاصيل المشكلة بصورة مختصرة حتى يتمكن فريق الدعم من المتابعة.',
    status: TicketStatusEnum.CANCELLED,
    priority: TicketPriorityEnum.HIGH,
    type: TicketTypeEnum.SUPPORT,
    department: DepartmentEnum.CUSTOMER_SERVICE,
    createdAt: '2026-10-14T15:52:00.000Z',
    updatedAt: '2026-10-14T15:52:00.000Z',
  },
  {
    id: '4322A3',
    title: 'سنتر ماي مارت',
    description: 'مشكلة اتصال في المتجر وتحتاج متابعة من فريق الدعم الفني.',
    status: TicketStatusEnum.ON_HOLD,
    priority: TicketPriorityEnum.MEDIUM,
    type: TicketTypeEnum.BUG,
    department: DepartmentEnum.CUSTOMER_SERVICE,
    createdAt: '2026-10-14T15:52:00.000Z',
    updatedAt: '2026-10-14T15:52:00.000Z',
  },
  {
    id: '4322A4',
    title: 'الجواهر للاكسسوارات النسائية',
    description: 'طلب دعم متعلق بإعدادات المتجر وربط المنتجات.',
    status: TicketStatusEnum.RESOLVED,
    priority: TicketPriorityEnum.LOW,
    type: TicketTypeEnum.QUESTION,
    department: DepartmentEnum.CUSTOMER_SERVICE,
    createdAt: '2026-10-14T15:52:00.000Z',
    updatedAt: '2026-10-14T15:52:00.000Z',
  },
  {
    id: '4322A5',
    title: 'عين الصقر للموبايلات',
    description: 'طلب تغيير بيانات واحتياج لإجراء مراجعة.',
    status: TicketStatusEnum.OPEN,
    priority: TicketPriorityEnum.MEDIUM,
    type: TicketTypeEnum.SUPPORT,
    department: DepartmentEnum.OTHER,
    createdAt: '2026-10-14T15:52:00.000Z',
    updatedAt: '2026-10-14T15:52:00.000Z',
  },
  {
    id: '4322A6',
    title: 'بوينت أي كيو',
    description: 'ملاحظات على لوحة التحكم وتحتاج متابعة.',
    status: TicketStatusEnum.CANCELLED,
    priority: TicketPriorityEnum.MEDIUM,
    type: TicketTypeEnum.FEEDBACK,
    department: DepartmentEnum.OTHER,
    createdAt: '2026-10-14T15:52:00.000Z',
    updatedAt: '2026-10-14T15:52:00.000Z',
  },
];

const pageSizeOptions = [10, 20, 50];

const Support = () => {
  const { setUnreadTotal, refreshUnreadTotal } = useSupportUnread();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [attachments, setAttachments] = useState<SupportTicketAttachment[]>([]);
  const [ticketStores, setTicketStores] = useState<SupportTicketStoreOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reply, setReply] = useState('');
  const [ticketUnreadMap, setTicketUnreadMap] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<TicketFilters>({
    status: '',
    priority: '',
    department: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState<CreateTicketRequest>(defaultTicketForm);
  const selectedTicketIdRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchTickets();
    fetchTicketStores();
  }, []);

  useEffect(() => {
    selectedTicketIdRef.current = selectedTicket?.id || null;
  }, [selectedTicket?.id]);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const response = await supportTicketsService.getAllSystemTickets({
        page: 1,
        limit: 100,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      const list = response.data || [];
      setTickets(list);

      const nextMap: Record<string, number> = {};
      list.forEach((ticket) => {
        nextMap[ticket.id] = getTicketUnreadCount(ticket);
      });
      setTicketUnreadMap(nextMap);

      const apiUnread = await supportMessagesService.getSystemUnreadCount();
      setUnreadTotal(apiUnread);
    } catch (err) {
      setError('فشل في جلب تذاكر الدعم. يرجى المحاولة مرة أخرى.');
      console.error('Error fetching tickets:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters.search, filters.status, setUnreadTotal]);

  const fetchTicketStores = useCallback(async () => {
    try {
      const response = await supportTicketsService.getSystemTicketStores({ page: 1, limit: 20 });
      setTicketStores(response.data || []);
    } catch (err) {
      console.error('Error fetching ticket stores:', err);
    }
  }, []);

  const clearTicketUnread = useCallback((ticketId: string) => {
    setTicketUnreadMap((current) => ({ ...current, [ticketId]: 0 }));
    setTickets((current) => current.map((ticket) => (
      ticket.id === ticketId
        ? { ...ticket, unreadCount: 0, unreadMessages: 0, unread_count: 0 }
        : ticket
    )));
  }, []);

  const markTicketRead = useCallback(async (ticketId: string) => {
    markTicketReadLocally(ticketId);
    clearTicketUnread(ticketId);
    try {
      const remaining = await supportMessagesService.markSystemTicketRead(ticketId);
      setUnreadTotal(remaining);
      await refreshUnreadTotal();
    } catch (err) {
      console.error('Error marking ticket as read:', err);
      refreshUnreadTotal();
    }
  }, [clearTicketUnread, refreshUnreadTotal, setUnreadTotal]);

  const loadTicketMessages = useCallback(async (ticketId: string) => {
    const messagesResponse = await supportMessagesService.getSystemTicketMessages(ticketId, { limit: 100 });
    const nextMessages = messagesResponse.data || [];
    setMessages(nextMessages);
    lastMessageIdRef.current = nextMessages[nextMessages.length - 1]?.id || null;
    return nextMessages;
  }, []);

  const pollTicketMessages = useCallback(async (ticketId: string) => {
    const afterId = lastMessageIdRef.current || undefined;
    const messagesResponse = await supportMessagesService.getSystemTicketMessages(ticketId, {
      afterId,
      limit: 50,
    });
    const incoming = messagesResponse.data || [];
    if (incoming.length === 0) return [];

    setMessages((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const unique = incoming.filter((item) => !existingIds.has(item.id));
      if (unique.length === 0) return current;
      const merged = [...current, ...unique];
      lastMessageIdRef.current = merged[merged.length - 1]?.id || lastMessageIdRef.current;
      return merged;
    });

    const hasIncomingStoreMessage = incoming.some((message) => (
      message.senderType === 'STORE_USER' || message.senderType === 'CUSTOMER' || message.senderType === 'USER'
    ));
    if (hasIncomingStoreMessage) {
      await markTicketRead(ticketId);
    }

    return incoming;
  }, [markTicketRead]);

  useEffect(() => {
    if (modalMode !== 'details' || !selectedTicket) return;

    const timer = window.setInterval(async () => {
      try {
        await pollTicketMessages(selectedTicket.id);
      } catch (err) {
        console.error('Error polling ticket messages:', err);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [modalMode, selectedTicket, pollTicketMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (selectedTicketIdRef.current) return;
      fetchTickets(true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [fetchTickets]);

  const openCreateModal = () => {
    resetForm();
    setSelectedFiles([]);
    setModalMode('create');
  };

  const openTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setModalMode('details');
    setMessages([]);
    setAttachments([]);
    lastMessageIdRef.current = null;

    try {
      await loadTicketMessages(ticket.id);
      await markTicketRead(ticket.id);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
    }

    try {
      const attachmentsResponse = await supportTicketsService.getTicketAttachments(ticket.id);
      setAttachments(attachmentsResponse || []);
    } catch (err) {
      console.error('Error fetching ticket attachments:', err);
      setAttachments([]);
    }
  };

  const closeDrawer = () => {
    setModalMode(null);
    setSelectedTicket(null);
    setMessages([]);
    setAttachments([]);
    setSelectedFiles([]);
    setReply('');
    lastMessageIdRef.current = null;
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const ticket = await supportTicketsService.createSystemTicket(formData);
      if (selectedFiles.length > 0) {
        await supportTicketsService.uploadTicketAttachments(ticket.id, selectedFiles);
      }
      setModalMode(null);
      setSelectedFiles([]);
      resetForm();
      fetchTickets();
    } catch (err) {
      setError('فشل في إنشاء التذكرة. يرجى المحاولة مرة أخرى.');
      console.error('Error creating ticket:', err);
    }
  };

  const handleUploadAttachments = async (files: FileList | File[]) => {
    if (!selectedTicket || files.length === 0) return;
    try {
      const uploaded = await supportTicketsService.uploadTicketAttachments(selectedTicket.id, files);
      setAttachments((current) => [...current, ...uploaded]);
    } catch (err) {
      setError('فشل في رفع المرفقات.');
      console.error('Error uploading attachments:', err);
    }
  };

  const handleRepairAttachments = async () => {
    if (!selectedTicket) return;
    try {
      setError('');
      await supportTicketsService.repairTicketAttachments(selectedTicket.id);
      const attachmentsResponse = await supportTicketsService.getTicketAttachments(selectedTicket.id);
      setAttachments(attachmentsResponse || []);
    } catch (err) {
      setError('فشل في إصلاح المرفقات. قد تحتاج إعادة رفع الملف.');
      console.error('Error repairing attachments:', err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedTicket) return;
    try {
      await supportTicketsService.deleteTicketAttachment(selectedTicket.id, attachmentId);
      setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
    } catch (err) {
      setError('فشل في حذف المرفق.');
      console.error('Error deleting attachment:', err);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;

    try {
      setError('');
      await supportTicketsService.deleteSystemTicket(ticketToDelete.id);
      setTicketToDelete(null);
      fetchTickets();
    } catch (err) {
      setError('فشل في حذف التذكرة.');
      console.error('Error deleting ticket:', err);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;

    try {
      const message = await supportMessagesService.replySystemTicket({
        ticketId: selectedTicket.id,
        message: reply.trim(),
        content: reply.trim(),
      });
      setMessages((current) => [...current, message]);
      lastMessageIdRef.current = message.id;
      setReply('');
      // Backend auto-marks ticket read for this agent on system reply
      clearTicketUnread(selectedTicket.id);
      markTicketReadLocally(selectedTicket.id);
      refreshUnreadTotal();
    } catch (err) {
      setError('فشل في إرسال الرد.');
      console.error('Error sending reply:', err);
    }
  };

  const resetForm = () => {
    setFormData(defaultTicketForm);
  };

  const sourceTickets = tickets.length > 0 ? tickets : fallbackTickets;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredTickets = useMemo(() => sourceTickets.filter(ticket => {
    const searchable = [
      ticket.id,
      ticket.title,
      ticket.description,
      ticket.lastMessagePreview || '',
    ].join(' ').toLowerCase();
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.department && ticket.department !== filters.department) return false;
    if (filters.search && !searchable.includes(filters.search.toLowerCase())) return false;
    return true;
  }), [filters, sourceTickets]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => ({
    total: sourceTickets.length,
    open: sourceTickets.filter(t => t.status === TicketStatusEnum.OPEN).length,
    closed: sourceTickets.filter(t => t.status === TicketStatusEnum.CLOSED || t.status === TicketStatusEnum.RESOLVED || t.status === TicketStatusEnum.CANCELLED).length,
  }), [sourceTickets]);

  if (loading && tickets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 bg-[#f8fafc] text-right" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageIcon>
            <Headphones className="h-6 w-6" />
          </PageIcon>
          <div className="text-right">
            <h1 className="text-2xl font-black text-slate-950">الدعم الفني</h1>
            <p className="text-sm font-medium text-slate-500">
              هناك <span className="font-black text-violet-600">{filteredTickets.length} بطاقة</span> في قائمة الدعم الفني
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 px-5 text-sm font-bold text-white shadow-lg shadow-violet-200"
        >
          إضافة تذكرة جديدة
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="إجمالي التذاكر" value={stats.total} tone="cyan" icon={<MessageCircle className="h-6 w-6" />} />
        <StatCard title="عدد التذاكر المفتوح" value={stats.open} tone="amber" icon={<Headphones className="h-6 w-6" />} />
        <StatCard title="عدد التذاكر المغلقة" value={stats.closed} tone="rose" icon={<X className="h-6 w-6" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters({ status: '', priority: '', department: '', search: '' })}
            className={cn(
              'inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-100 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm',
              activeFilterCount > 0 && 'border-violet-300 bg-violet-600 text-white'
            )}
          >
            الفلاتر
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">+{activeFilterCount}</span>
            )}
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button className="h-12 rounded-2xl bg-cyan-50 px-6 text-sm font-bold text-cyan-500">البحث</button>
          <div className="relative min-w-[280px] max-w-md flex-1">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, search: event.target.value }));
              }}
              placeholder="ابحث عن التذاكر"
              className="h-12 w-full rounded-2xl border border-slate-100 bg-white pr-11 pl-4 text-sm font-semibold outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            />
          </div>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <h2 className="text-2xl font-black text-slate-900">نتائج البحث والفلاتر</h2>
      )}

      <TicketTable
        tickets={paginatedTickets}
        unreadMap={ticketUnreadMap}
        page={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        onView={openTicketDetails}
        onDelete={setTicketToDelete}
      />

      {modalMode === 'create' && (
        <CreateTicketDrawer
          formData={formData}
          setFormData={setFormData}
          stores={ticketStores}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onSubmit={handleCreateTicket}
          onClose={closeDrawer}
        />
      )}

      {modalMode === 'details' && selectedTicket && (
        <TicketDetailsDrawer
          ticket={selectedTicket}
          messages={messages}
          attachments={attachments}
          stores={ticketStores}
          reply={reply}
          setReply={setReply}
          onSendReply={handleSendReply}
          onUploadAttachments={handleUploadAttachments}
          onDeleteAttachment={handleDeleteAttachment}
          onRepairAttachments={handleRepairAttachments}
          onClose={closeDrawer}
        />
      )}

      {ticketToDelete && (
        <DeleteTicketModal
          ticket={ticketToDelete}
          onClose={() => setTicketToDelete(null)}
          onConfirm={handleDeleteTicket}
        />
      )}
    </div>
  );
};

const PageIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
    {children}
    <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-violet-200" />
  </div>
);

const StatCard = ({ title, value, tone, icon }: { title: string; value: number; tone: 'cyan' | 'amber' | 'rose'; icon: React.ReactNode }) => {
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-500',
    amber: 'bg-amber-50 text-amber-500',
    rose: 'bg-red-50 text-red-500',
  };

  return (
    <div className="flex min-h-[78px] items-center justify-between rounded-[1.45rem] bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100">
      <div className={cn('grid h-12 w-12 place-items-center rounded-2xl', tones[tone])}>{icon}</div>
      <div>
        <p className="text-sm font-black text-slate-700">{title}</p>
        <div className="mt-1 flex items-center gap-2" dir="ltr">
          <span className="text-xs font-bold text-emerald-500">12.6% ↗</span>
          <span className="text-2xl font-black text-slate-950">{value.toLocaleString('en-US')}</span>
        </div>
      </div>
    </div>
  );
};

const TicketTable = ({
  tickets,
  unreadMap,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onView,
  onDelete,
}: {
  tickets: SupportTicket[];
  unreadMap: Record<string, number>;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (ticket: SupportTicket) => void;
  onDelete: (ticket: SupportTicket) => void;
}) => {
  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-sm text-slate-700">
              <th className="px-5 py-5 text-right">رقم التذكرة</th>
              <th className="px-5 py-5 text-right">المتجر</th>
              <th className="px-5 py-5 text-right">آخر رسالة</th>
              <th className="px-5 py-5 text-right">القسم</th>
              <th className="px-5 py-5 text-right">آخر نشاط</th>
              <th className="px-5 py-5 text-right">غير مقروء</th>
              <th className="px-5 py-5 text-right">الأولوية</th>
              <th className="px-5 py-5 text-right">الحالة</th>
              <th className="px-5 py-5 text-right">العمليات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket, index) => {
              const unread = unreadMap[ticket.id] ?? getTicketUnreadCount(ticket);
              return (
              <tr key={ticket.id} className="text-sm text-slate-700 transition hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    <span className="font-black text-indigo-900">#{ticket.id.slice(0, 7)}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-bold text-slate-900">{ticket.title}</span>
                    <TicketLogo index={index} />
                  </div>
                </td>
                <td className="max-w-[280px] px-5 py-4">
                  <p className="font-bold text-slate-900">{ticket.title}</p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-400">
                    {ticket.lastMessagePreview || ticket.description || '—'}
                  </p>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-700">{getDepartmentText(ticket.department)}</td>
                <td className="px-5 py-4 text-slate-600">
                  <p className="font-bold">{formatDate(ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt)}</p>
                  <p className="text-xs text-slate-400">{formatTime(ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt)}</p>
                </td>
                <td className="px-5 py-4">
                  {unread > 0 ? (
                    <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-300">0</span>
                  )}
                </td>
                <td className="px-5 py-4"><PriorityMeter priority={ticket.priority} /></td>
                <td className="px-5 py-4"><StatusBadge status={ticket.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onDelete(ticket)} className="text-red-400 transition hover:text-red-600" aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="text-slate-400 transition hover:text-blue-500" aria-label="تعديل">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onView(ticket)} className="relative text-slate-400 transition hover:text-violet-600" aria-label="تفاصيل">
                      <MessageCircle className="h-4 w-4" />
                      {unread > 0 && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />}
                    </button>
                    <button className="text-slate-400 transition hover:text-amber-500" aria-label="مرفقات">
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-sm font-bold text-slate-400">لا توجد تذاكر</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-row-reverse items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        <label className="flex items-center gap-2 font-bold text-slate-600">
          العناصر لكل صفحة
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-xl border border-violet-200 bg-white px-3 font-bold text-violet-600 outline-none"
          >
            {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <div className="flex flex-row-reverse items-center gap-2">
          {totalPages > 1 && (
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {pages.map((item) => item === 'ellipsis' ? (
            <span key={item} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50">...</span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={cn('grid h-8 w-8 place-items-center rounded-xl font-bold', item === page ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-500')}
            >
              {item}
            </button>
          ))}
          {totalPages > 1 && (
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateTicketDrawer = ({
  formData,
  setFormData,
  stores,
  selectedFiles,
  setSelectedFiles,
  onSubmit,
  onClose,
}: {
  formData: CreateTicketRequest;
  setFormData: React.Dispatch<React.SetStateAction<CreateTicketRequest>>;
  stores: SupportTicketStoreOption[];
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-9999 bg-black/35" dir="rtl" onMouseDown={onClose}>
    <form onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()} className="fixed inset-y-0 left-0 z-10000 flex h-dvh w-full max-w-3xl flex-col overflow-hidden bg-white px-6 py-8 shadow-2xl sm:px-8">
      <DrawerHeader title="إضافة تذكرة جديدة" onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            label="اسم المتجر"
            value={formData.storeId || ''}
            placeholder="اختيار المتجر"
            options={stores.map((store) => ({ value: store.id, label: store.name }))}
            onChange={(value) => setFormData((current) => ({ ...current, storeId: value }))}
          />
          <SelectField
            label="الأولوية"
            value={formData.priority || TicketPriorityEnum.HIGH}
            options={priorityOptions}
            onChange={(value) => setFormData((current) => ({ ...current, priority: value as TicketPriorityEnum }))}
          />
          <SelectField
            label="القسم"
            value={formData.department || DepartmentEnum.IT}
            options={departmentOptions}
            onChange={(value) => setFormData((current) => ({ ...current, department: value as DepartmentEnum }))}
          />
          <SelectField
            label="الحالة"
            value={formData.type || TicketTypeEnum.SUPPORT}
            options={typeOptions}
            onChange={(value) => setFormData((current) => ({ ...current, type: value as TicketTypeEnum }))}
          />
        </div>
        <TextField
          label="عنوان التذكرة"
          value={formData.title}
          placeholder="اكتب عنوان موضح ابرز التفاصيل للتذكرة"
          onChange={(value) => setFormData((current) => ({ ...current, title: value }))}
        />
        <TextAreaField
          label="تفاصيل الوصف"
          value={formData.description}
          placeholder="اكتب وصف مفصل لكل تفاصيل التذكرة"
          onChange={(value) => setFormData((current) => ({ ...current, description: value }))}
        />
        <AttachmentBox
          selectedFiles={selectedFiles}
          onFilesChange={(files) => setSelectedFiles(Array.from(files))}
        />
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-4 pt-7">
        <button type="button" onClick={onClose} className="h-14 rounded-2xl bg-slate-100 font-black text-slate-600">إلغاء</button>
        <button type="submit" className="h-14 rounded-2xl bg-linear-to-l from-violet-700 to-fuchsia-500 font-black text-white shadow-lg shadow-violet-200">إضافة التذكرة</button>
      </div>
    </form>
  </div>
);

const TicketDetailsDrawer = ({
  ticket,
  messages,
  attachments,
  stores,
  reply,
  setReply,
  onSendReply,
  onUploadAttachments,
  onDeleteAttachment,
  onRepairAttachments,
  onClose,
}: {
  ticket: SupportTicket;
  messages: SupportMessage[];
  attachments: SupportTicketAttachment[];
  stores: SupportTicketStoreOption[];
  reply: string;
  setReply: (value: string) => void;
  onSendReply: () => void;
  onUploadAttachments: (files: FileList | File[]) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onRepairAttachments: () => void;
  onClose: () => void;
}) => {
  const storeName = stores.find((store) => store.id === ticket.storeId)?.name || ticket.title;
  const hasUnavailableAttachments = attachments.some((attachment) => !isAttachmentAvailable(attachment));

  return (
    <div className="fixed inset-0 z-9999 bg-black/35" dir="rtl" onMouseDown={onClose}>
      <div onMouseDown={(event) => event.stopPropagation()} className="fixed inset-y-0 left-0 z-10000 flex h-dvh w-full max-w-5xl flex-col overflow-hidden bg-white px-6 py-8 shadow-2xl sm:px-8">
        <DrawerHeader title="تفاصيل التذكرة" subtitle={`#${ticket.id.slice(0, 8)}`} onClose={onClose} />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[360px_1fr]">
          <div className="flex min-h-0 flex-col">
            <div className="grid grid-cols-1 gap-4">
              <SelectField label="الأولوية" value={ticket.priority || ''} options={priorityOptions} disabled />
              <SelectField label="اسم المتجر" value={ticket.storeId || ''} placeholder={storeName} options={stores.map((store) => ({ value: store.id, label: store.name }))} disabled />
              <SelectField label="الحالة" value={ticket.status} options={statusOptions} disabled />
              <SelectField label="القسم" value={ticket.department || ''} options={departmentOptions} disabled />
            </div>
            <div className="mb-3 mt-8 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-800">المرفقات</h3>
              {hasUnavailableAttachments && (
                <button
                  type="button"
                  onClick={onRepairAttachments}
                  className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-600"
                >
                  إصلاح المرفقات
                </button>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-3xl bg-slate-50 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {attachments.map((attachment) => {
                const available = isAttachmentAvailable(attachment);
                const fileUrl = getAttachmentUrl(attachment);
                const fileName = decodeAttachmentName(attachment.fileName || attachment.name || 'Attachment');
                const isImage = isImageAttachment(attachment);

                return (
                  <div key={attachment.id} className="rounded-2xl bg-white p-3 shadow-sm">
                    {!available ? (
                      <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-red-50 px-4 text-center">
                        <p className="text-sm font-black text-red-500">الملف غير متوفر في التخزين</p>
                        <p className="mt-1 text-xs font-semibold text-red-400">جرّب إصلاح المرفقات أو أعد رفع الملف</p>
                      </div>
                    ) : isImage && fileUrl ? (
                      <AttachmentImagePreview url={fileUrl} alt={fileName} />
                    ) : null}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => onDeleteAttachment(attachment.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                        {available && fileUrl ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="text-slate-400"><Download className="h-4 w-4" /></a>
                        ) : (
                          <span className="text-slate-300"><Download className="h-4 w-4" /></span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="truncate font-black text-slate-800">{fileName}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {formatFileSize(attachment.size)} . {attachment.createdAt ? formatDate(attachment.createdAt) : '-'}
                          {!available ? ' . غير متوفر' : ''}
                        </p>
                      </div>
                      <span className={cn('rounded px-2 py-1 text-[10px] font-black', available ? 'bg-violet-50 text-violet-600' : 'bg-red-50 text-red-500')}>
                        {available ? getAttachmentType(attachment) : 'MISSING'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {attachments.length === 0 && (
                <p className="py-8 text-center text-sm font-bold text-slate-400">لا توجد مرفقات</p>
              )}
            </div>
            <label className="mt-5 grid h-14 cursor-pointer place-items-center rounded-2xl bg-violet-600 font-black text-white">
              رفع مرفقات
              <input type="file" multiple className="hidden" onChange={(event) => event.target.files && onUploadAttachments(event.target.files)} />
            </label>
            <button onClick={onClose} className="mt-3 h-14 rounded-2xl bg-slate-100 font-black text-slate-600">إلغاء</button>
          </div>

          <div className="flex min-h-0 flex-col">
            <h3 className="mb-3 text-lg font-black text-slate-800">المحادثة</h3>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl bg-slate-50 p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {messages.map((message) => {
                const isStoreSide = message.senderType === 'STORE_USER' || message.senderType === 'CUSTOMER' || message.senderType === 'USER';
                const senderName = getMessageSenderName(message);
                const text = message.content || message.message || '';
                const messageAttachments = message.attachments || [];

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[80%] rounded-3xl px-5 py-4 text-sm font-semibold shadow-sm',
                      isStoreSide ? 'mr-auto bg-white text-slate-700' : 'ml-auto bg-violet-600 text-white'
                    )}
                  >
                    {senderName && (
                      <p className={cn('mb-2 text-[11px] font-black', isStoreSide ? 'text-violet-600' : 'text-white/80')}>
                        {senderName}
                      </p>
                    )}
                    {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
                    {messageAttachments.length > 0 && (
                      <div className={cn('space-y-2', text && 'mt-3')}>
                        {messageAttachments.map((attachment) => {
                          const url = getAttachmentUrl(attachment);
                          const name = decodeAttachmentName(attachment.fileName || attachment.name || 'Attachment');
                          const available = isAttachmentAvailable(attachment);

                          if (!available || !url) {
                            return (
                              <div key={attachment.id} className={cn('rounded-2xl px-3 py-2 text-xs font-bold', isStoreSide ? 'bg-red-50 text-red-500' : 'bg-white/15 text-white')}>
                                مرفق غير متوفر: {name}
                              </div>
                            );
                          }

                          if (isImageAttachment(attachment)) {
                            return (
                              <a key={attachment.id} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl">
                                <img src={url} alt={name} className="max-h-56 w-full object-cover" />
                              </a>
                            );
                          }

                          return (
                            <a
                              key={attachment.id}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn('inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black', isStoreSide ? 'bg-slate-100 text-slate-700' : 'bg-white/15 text-white')}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {name}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <p className={cn('mt-2 text-[10px]', isStoreSide ? 'text-slate-300' : 'text-white/70')}>{formatTime(message.createdAt)}</p>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="py-10 text-center text-sm font-bold text-slate-400">لا توجد رسائل بعد</p>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2">
              <button onClick={onSendReply} className="h-10 rounded-xl bg-cyan-50 px-5 text-sm font-bold text-cyan-500">إرسال</button>
              <input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="كتابة الرسالة" className="h-10 flex-1 bg-transparent px-3 text-sm outline-none" />
              <Send className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteTicketModal = ({ ticket, onClose, onConfirm }: { ticket: SupportTicket; onClose: () => void; onConfirm: () => void }) => (
  <div className="fixed inset-0 z-9999 grid place-items-center bg-black/70 p-6" dir="rtl">
    <div className="w-full max-w-4xl rounded-[2rem] bg-white p-8 text-center shadow-2xl">
      <div className="mx-auto mb-8 flex min-h-72 max-w-3xl items-center justify-center rounded-[2rem] bg-red-50">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-4">
            <TicketLogo index={2} />
            <div>
              <p className="text-sm text-slate-500">تاريخ الإنشاء {formatDate(ticket.createdAt)}</p>
              <h3 className="text-xl font-black text-slate-950">{ticket.title}</h3>
            </div>
          </div>
          <PriorityMeter priority={ticket.priority} />
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-900">{ticket.title}</p>
            <p className="mt-1 text-sm text-slate-500">{ticket.description}</p>
          </div>
        </div>
      </div>
      <h2 className="text-4xl font-black text-red-600">هل انت متأكد من حذف طلب الدعم</h2>
      <p className="mx-auto mt-6 max-w-3xl text-xl font-semibold leading-9 text-slate-600">
        سوف تقوم بحذف طلب الدعم من النظام ولن تستطيع إعادته مرة أخرى؛ لتأكيد العملية يرجى التأكد من التذكرة قبل الحذف.
      </p>
      <div className="mt-8 grid grid-cols-[1fr_2fr] gap-6">
        <button onClick={onClose} className="h-16 rounded-2xl bg-slate-100 text-xl font-black text-slate-600">إلغاء</button>
        <button onClick={onConfirm} className="h-16 rounded-2xl bg-red-600 text-xl font-black text-white">حذف التذكرة</button>
      </div>
    </div>
  </div>
);

const DrawerHeader = ({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) => (
  <div className="mb-8 flex shrink-0 items-start justify-between">
    <div className="flex items-center gap-4">
      <div className="text-right">
        <h2 className="text-3xl font-black text-violet-700">{title}</h2>
        {subtitle && <p className="mt-1 text-xl font-black text-violet-600">{subtitle}</p>}
      </div>
      <PageIcon>
        <MessageCircle className="h-6 w-6" />
      </PageIcon>
    </div>
    <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-400">
      <X className="h-5 w-5" />
    </button>
  </div>
);

const TextField = ({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) => (
  <div className="mt-5">
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
    />
  </div>
);

const TextAreaField = ({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) => (
  <div className="mt-5">
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      rows={6}
      className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
    />
  </div>
);

const SelectField = ({ label, value, options, placeholder, onChange, disabled }: { label: string; value: string; options: Array<{ value: string; label: string }>; placeholder?: string; onChange?: (value: string) => void; disabled?: boolean }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none disabled:bg-slate-50 disabled:text-slate-500"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  </div>
);

const AttachmentBox = ({ selectedFiles, onFilesChange }: { selectedFiles: File[]; onFilesChange: (files: FileList) => void }) => (
  <div className="mt-8">
    <h3 className="mb-3 text-lg font-black text-slate-800">أضافة مرفقات للدعم</h3>
    <div className="grid min-h-72 place-items-center rounded-3xl bg-slate-50">
      <label className="grid h-40 w-64 cursor-pointer place-items-center rounded-3xl border-2 border-dashed border-teal-300 bg-white/50 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-sky-700">
            <Plus className="h-6 w-6" />
          </div>
          <p className="font-black text-sky-700">أضافة صورة للغة</p>
          <span className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-500">PNG, JPG, PDF</span>
          {selectedFiles.length > 0 && (
            <p className="mt-3 text-xs font-black text-emerald-500">{selectedFiles.length} مرفق محدد</p>
          )}
        </div>
        <input type="file" multiple className="hidden" onChange={(event) => event.target.files && onFilesChange(event.target.files)} />
      </label>
    </div>
  </div>
);

const TicketLogo = ({ index }: { index: number }) => {
  const colors = ['bg-blue-50 text-blue-600', 'bg-slate-50 text-slate-700', 'bg-violet-600 text-white', 'bg-emerald-400 text-white', 'bg-pink-500 text-white', 'bg-orange-400 text-white'];
  return (
    <div className={cn('grid h-11 w-11 place-items-center rounded-2xl text-sm font-black', colors[index % colors.length])}>
      {index % 3 === 1 ? 'Logo' : <MessageCircle className="h-5 w-5" />}
    </div>
  );
};

const StatusBadge = ({ status }: { status?: TicketStatusEnum }) => (
  <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black', getStatusColor(status))}>
    {getStatusText(status)}
  </span>
);

const PriorityMeter = ({ priority }: { priority?: TicketPriorityEnum }) => {
  const active = priority === TicketPriorityEnum.HIGH || priority === TicketPriorityEnum.CRITICAL ? 4 : priority === TicketPriorityEnum.MEDIUM ? 3 : 1;
  const color = priority === TicketPriorityEnum.LOW ? 'bg-red-500' : priority === TicketPriorityEnum.MEDIUM ? 'bg-orange-400' : 'bg-teal-500';
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="font-semibold text-slate-700">{getPriorityText(priority)}</span>
      <div className="flex gap-1" dir="ltr">
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className={cn('h-1.5 w-8 rounded-full', index < active ? color : 'bg-red-50')} />
        ))}
      </div>
    </div>
  );
};

const priorityOptions = [
  { value: TicketPriorityEnum.LOW, label: 'ضعيفة' },
  { value: TicketPriorityEnum.MEDIUM, label: 'متوسطة' },
  { value: TicketPriorityEnum.HIGH, label: 'أولوية عالية' },
  { value: TicketPriorityEnum.CRITICAL, label: 'حرجة' },
];

const statusOptions = [
  { value: TicketStatusEnum.OPEN, label: 'مفتوح' },
  { value: TicketStatusEnum.IN_PROGRESS, label: 'قيد المعالجة' },
  { value: TicketStatusEnum.ON_HOLD, label: 'تمت الإحالة' },
  { value: TicketStatusEnum.RESOLVED, label: 'تم حل التذكرة' },
  { value: TicketStatusEnum.CLOSED, label: 'تم الغلق' },
  { value: TicketStatusEnum.CANCELLED, label: 'تم إلغاء' },
];

const departmentOptions = [
  { value: DepartmentEnum.IT, label: 'البرمجيات' },
  { value: DepartmentEnum.CUSTOMER_SERVICE, label: 'خدمة العملاء' },
  { value: DepartmentEnum.FINANCE, label: 'المالية' },
  { value: DepartmentEnum.MARKETING, label: 'التسويق' },
  { value: DepartmentEnum.SALES, label: 'المبيعات' },
  { value: DepartmentEnum.OTHER, label: 'ملاحظات' },
];

const typeOptions = [
  { value: TicketTypeEnum.SUPPORT, label: 'أولوية عالية' },
  { value: TicketTypeEnum.BUG, label: 'مشكلة تقنية' },
  { value: TicketTypeEnum.QUESTION, label: 'استفسار' },
  { value: TicketTypeEnum.FEEDBACK, label: 'ملاحظات' },
  { value: TicketTypeEnum.OTHER, label: 'أخرى' },
];

const getVisiblePages = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.max(2, Math.min(page - 1, totalPages - 3));
  const middle = Array.from({ length: 3 }, (_, index) => start + index);

  return [1, ...(start > 2 ? ['ellipsis' as const] : []), ...middle, ...(start + 2 < totalPages - 1 ? ['ellipsis' as const] : []), totalPages];
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');
const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const getTicketUnreadCount = (ticket: SupportTicket) => (
  ticket.unreadCount ?? ticket.unreadMessages ?? ticket.unread_count ?? 0
);
const formatFileSize = (size?: number) => {
  if (!size) return '-';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentImagePreview = ({ url, alt }: { url: string; alt: string }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="mb-3 grid h-28 place-items-center rounded-2xl bg-red-50 px-4 text-center">
        <p className="text-sm font-black text-red-500">تعذر تحميل الملف من التخزين</p>
        <p className="mt-1 text-xs font-semibold text-red-400">المفتاح غير موجود أو رابط التوقيع غير صحيح</p>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="mb-3 block overflow-hidden rounded-2xl bg-slate-50">
      <img src={url} alt={alt} className="h-40 w-full object-cover" onError={() => setFailed(true)} />
    </a>
  );
};

const getAttachmentUrl = (attachment: SupportTicketAttachment) => attachment.url || attachment.fileUrl || null;
const isAttachmentAvailable = (attachment: SupportTicketAttachment) => {
  if (attachment.available === false) return false;
  return Boolean(attachment.url || attachment.fileUrl);
};
const getMessageSenderName = (message: SupportMessage) => {
  if (message.storeUser?.user?.name) return message.storeUser.user.name;
  if (message.sender?.name) return message.sender.name;
  if (message.senderType === 'SYSTEM_USER') return 'فريق الدعم';
  if (message.senderType === 'STORE_USER') return 'مستخدم المتجر';
  return '';
};
const getAttachmentType = (attachment: SupportTicketAttachment) => {
  if (attachment.mimeType?.includes('/')) return attachment.mimeType.split('/')[1].toUpperCase();
  const source = attachment.fileName || attachment.name || '';
  const type = source.split('.').pop();
  return type ? type.toUpperCase() : 'FILE';
};
const isImageAttachment = (attachment: SupportTicketAttachment) => {
  if (attachment.mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName || attachment.name || '');
};
const decodeAttachmentName = (value: string) => {
  try {
    if (/[ØÙÃÂ]/.test(value)) {
      return decodeURIComponent(escape(value));
    }
  } catch {
    // keep original name if decoding fails
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getPriorityText = (priority: string | undefined) => {
  const priorityMap: { [key: string]: string } = {
    [TicketPriorityEnum.CRITICAL]: 'أولوية عالية',
    [TicketPriorityEnum.HIGH]: 'أولوية عالية',
    [TicketPriorityEnum.MEDIUM]: 'متوسطة',
    [TicketPriorityEnum.LOW]: 'ضعيفة',
  };
  return priority ? priorityMap[priority] || priority : 'غير محدد';
};

const getStatusText = (status: string | undefined) => {
  const statusMap: { [key: string]: string } = {
    [TicketStatusEnum.OPEN]: 'مفتوح',
    [TicketStatusEnum.IN_PROGRESS]: 'قيد المعالجة',
    [TicketStatusEnum.ON_HOLD]: 'تمت الإحالة',
    [TicketStatusEnum.RESOLVED]: 'تم حل التذكرة',
    [TicketStatusEnum.CLOSED]: 'تم الغلق',
    [TicketStatusEnum.CANCELLED]: 'تم إلغاء',
  };
  return status ? statusMap[status] || status : 'غير محدد';
};

const getStatusColor = (status: string | undefined) => {
  const colors: { [key: string]: string } = {
    [TicketStatusEnum.OPEN]: 'bg-violet-50 text-violet-700',
    [TicketStatusEnum.IN_PROGRESS]: 'bg-cyan-50 text-cyan-600',
    [TicketStatusEnum.ON_HOLD]: 'bg-orange-50 text-orange-500',
    [TicketStatusEnum.RESOLVED]: 'bg-emerald-50 text-emerald-500',
    [TicketStatusEnum.CLOSED]: 'bg-slate-100 text-slate-600',
    [TicketStatusEnum.CANCELLED]: 'bg-red-50 text-red-500',
  };
  return status ? colors[status] || 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600';
};

const getDepartmentText = (department: string | undefined) => {
  const deptMap: { [key: string]: string } = {
    [DepartmentEnum.FINANCE]: 'المالية',
    [DepartmentEnum.MARKETING]: 'التسويق',
    [DepartmentEnum.SALES]: 'المبيعات',
    [DepartmentEnum.CUSTOMER_SERVICE]: 'خدمة العملاء',
    [DepartmentEnum.IT]: 'البرمجيات',
    [DepartmentEnum.OTHER]: 'ملاحظات',
  };
  return department ? deptMap[department] || department : 'غير محدد';
};

export default Support;
