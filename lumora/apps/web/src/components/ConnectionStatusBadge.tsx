import type { ConnectionStatus, ProfileStatus, RequestStatus } from '@/types/domain';

interface ConnectionStatusBadgeProps {
  status?: ProfileStatus | ConnectionStatus;
  requestStatus?: RequestStatus;
  visible?: boolean;
}

const STYLES: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border border-rose-100',
};

function resolveBadge(
  status?: ProfileStatus | ConnectionStatus,
  requestStatus?: RequestStatus,
  visible?: boolean
): { label: string; tone: keyof typeof STYLES } {
  if (requestStatus) {
    switch (requestStatus) {
      case 'PENDING':
        return { label: 'Request pending', tone: 'warning' };
      case 'ACCEPTED':
        return { label: 'Connected', tone: 'success' };
      case 'DECLINED':
        return { label: 'Request declined', tone: 'danger' };
      case 'EXPIRED':
        return { label: 'Request expired', tone: 'danger' };
      default:
        return { label: 'Request status', tone: 'default' };
    }
  }

  if (!status) {
    return { label: 'Status unknown', tone: 'default' };
  }

  switch (status) {
    case 'VERIFIED':
      return { label: visible ? 'Visible in directory' : 'Verified (hidden)', tone: visible ? 'success' : 'default' };
    case 'PENDING_REVIEW':
      return { label: 'Pending review', tone: 'warning' };
    case 'INCOMPLETE':
      return { label: 'Profile incomplete', tone: 'warning' };
    case 'REJECTED':
      return { label: 'Profile rejected', tone: 'danger' };
    case 'ACTIVE':
      return { label: 'Connection active', tone: 'success' };
    case 'ENDED':
      return { label: 'Connection ended', tone: 'default' };
    default:
      return { label: 'Status', tone: 'default' };
  }
}

export function ConnectionStatusBadge({ status, requestStatus, visible }: ConnectionStatusBadgeProps) {
  const { label, tone } = resolveBadge(status, requestStatus, visible);
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STYLES[tone]}`}>{label}</span>;
}
