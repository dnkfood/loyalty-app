import { ProTable, type ProColumns, type RequestData } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  consentGiven: boolean;
  createdAt: string;
  externalGuestId: string | null;
}

interface UsersListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

const columns: ProColumns<AdminUser>[] = [
  {
    title: 'Телефон',
    dataIndex: 'phone',
    copyable: true,
  },
  {
    title: 'Имя',
    dataIndex: 'name',
    render: (text) => text ?? '—',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    render: (text) => text ?? '—',
  },
  {
    title: 'ID лояльности',
    dataIndex: 'externalGuestId',
    render: (text) => text ?? '—',
    copyable: true,
  },
  {
    title: 'Статус',
    dataIndex: 'isActive',
    render: (_, record) => (
      <Tag color={record.isActive ? 'green' : 'red'}>
        {record.isActive ? 'Активен' : 'Заблокирован'}
      </Tag>
    ),
  },
  {
    title: 'Согласие ПДн',
    dataIndex: 'consentGiven',
    render: (_, record) => (
      <Tag color={record.consentGiven ? 'blue' : 'orange'}>
        {record.consentGiven ? 'Дано' : 'Не дано'}
      </Tag>
    ),
  },
  {
    title: 'Дата регистрации',
    dataIndex: 'createdAt',
    valueType: 'dateTime',
    sorter: true,
  },
];

export function UsersPage() {
  const navigate = useNavigate();

  const fetchUsers = async (
    params: { pageSize?: number; current?: number; [key: string]: unknown },
  ): Promise<RequestData<AdminUser>> => {
    const { data } = await apiClient.get<ApiSuccessResponse<UsersListResponse>>('/admin/users', {
      params: {
        page: params.current ?? 1,
        limit: params.pageSize ?? 20,
        search: params.search,
      },
    });
    return {
      data: data.data.items,
      total: data.data.total,
      success: true,
    };
  };

  return (
    <ProTable<AdminUser>
      headerTitle="Пользователи"
      rowKey="id"
      columns={columns}
      request={fetchUsers}
      pagination={{ pageSize: 20 }}
      search={{ labelWidth: 'auto' }}
      dateFormatter="string"
      onRow={(record) => ({
        onClick: () => navigate(`/users/${record.id}`),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
