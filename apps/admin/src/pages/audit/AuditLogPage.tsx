import { ProTable, type ProColumns, type RequestData } from '@ant-design/pro-components';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface StaffUser {
  email: string;
  name: string;
  role: string;
}

interface AuditLogEntry {
  id: string;
  staffUser: StaffUser;
  action: string;
  targetEntity: string;
  targetId: string;
  ipAddress: string;
  createdAt: string;
}

interface AuditLogListResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

const columns: ProColumns<AuditLogEntry>[] = [
  {
    title: 'Сотрудник',
    dataIndex: ['staffUser', 'name'],
    render: (_, record) =>
      `${record.staffUser.name} (${record.staffUser.email})`,
  },
  {
    title: 'Действие',
    dataIndex: 'action',
  },
  {
    title: 'Сущность',
    dataIndex: 'targetEntity',
  },
  {
    title: 'ID сущности',
    dataIndex: 'targetId',
    copyable: true,
  },
  {
    title: 'IP адрес',
    dataIndex: 'ipAddress',
  },
  {
    title: 'Дата',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    sorter: true,
  },
];

export function AuditLogPage() {
  const fetchAuditLog = async (
    params: { pageSize?: number; current?: number; [key: string]: unknown },
  ): Promise<RequestData<AuditLogEntry>> => {
    const { data } = await apiClient.get<ApiSuccessResponse<AuditLogListResponse>>(
      '/admin/audit-log',
      {
        params: {
          page: params.current ?? 1,
          limit: params.pageSize ?? 20,
        },
      },
    );
    return {
      data: data.data.items,
      total: data.data.total,
      success: true,
    };
  };

  return (
    <ProTable<AuditLogEntry>
      headerTitle="Журнал действий"
      rowKey="id"
      columns={columns}
      request={fetchAuditLog}
      pagination={{ pageSize: 20 }}
      search={false}
      dateFormatter="string"
    />
  );
}
