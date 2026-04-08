import { ProTable, type ProColumns, type RequestData } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface SmsLog {
  id: string;
  phone: string;
  provider: string;
  messageId: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

interface SmsLogListResponse {
  items: SmsLog[];
  total: number;
  page: number;
  limit: number;
}

const statusColors: Record<string, string> = {
  pending: 'processing',
  delivered: 'success',
  failed: 'error',
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  delivered: 'Доставлено',
  failed: 'Ошибка',
};

const columns: ProColumns<SmsLog>[] = [
  {
    title: 'Телефон',
    dataIndex: 'phone',
    copyable: true,
  },
  {
    title: 'Провайдер',
    dataIndex: 'provider',
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    render: (_, record) => (
      <Tag color={statusColors[record.status] ?? 'default'}>
        {statusLabels[record.status] ?? record.status}
      </Tag>
    ),
  },
  {
    title: 'Message ID',
    dataIndex: 'messageId',
    render: (text) => text ?? '—',
    copyable: true,
  },
  {
    title: 'Ошибка',
    dataIndex: 'error',
    render: (text) => text ?? '—',
  },
  {
    title: 'Дата',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    sorter: true,
  },
];

export function SmsLogsPage() {
  const fetchSmsLogs = async (
    params: { pageSize?: number; current?: number; [key: string]: unknown },
  ): Promise<RequestData<SmsLog>> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SmsLogListResponse>>(
      '/admin/sms-logs',
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
    <ProTable<SmsLog>
      headerTitle="SMS логи"
      rowKey="id"
      columns={columns}
      request={fetchSmsLogs}
      pagination={{ pageSize: 20 }}
      search={false}
      dateFormatter="string"
    />
  );
}
