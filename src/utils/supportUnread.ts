const LAST_READ_KEY = 'support:last-read-map';

type LastReadMap = Record<string, string>;

const readMap = (): LastReadMap => {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? JSON.parse(raw) as LastReadMap : {};
  } catch {
    return {};
  }
};

const writeMap = (map: LastReadMap) => {
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
};

export const getTicketLastReadAt = (ticketId: string) => readMap()[ticketId] || null;

export const markTicketReadLocally = (ticketId: string, at = new Date().toISOString()) => {
  const map = readMap();
  map[ticketId] = at;
  writeMap(map);
};

export const countUnreadFromMessages = (
  ticketId: string,
  messages: Array<{ id: string; createdAt: string; senderType?: string | null }>
) => {
  const lastReadAt = getTicketLastReadAt(ticketId);
  const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;

  return messages.filter((message) => {
    const isIncoming = message.senderType === 'STORE_USER' || message.senderType === 'CUSTOMER' || message.senderType === 'USER';
    if (!isIncoming) return false;
    return new Date(message.createdAt).getTime() > lastReadTime;
  }).length;
};
