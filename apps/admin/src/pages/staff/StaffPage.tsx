import { useRef, useState } from 'react';
import {
  ProTable,
  ProForm,
  ProFormText,
  ProFormSelect,
  type ProColumns,
  type RequestData,
  type ActionType,
} from '@ant-design/pro-components';
import { Button, Tag, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface StaffListResponse {
  items: StaffUser[];
  total: number;
  page: number;
  limit: number;
}

interface StaffFormValues {
  name: string;
  email: string;
  password?: string;
  role: string;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'red',
  ADMIN: 'volcano',
  MARKETER: 'blue',
  SUPPORT: 'cyan',
  ANALYST: 'purple',
  CONTENT_MANAGER: 'green',
};

const roleOptions = [
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Marketer', value: 'MARKETER' },
  { label: 'Support', value: 'SUPPORT' },
  { label: 'Analyst', value: 'ANALYST' },
  { label: 'Content Manager', value: 'CONTENT_MANAGER' },
];

export function StaffPage() {
  const actionRef = useRef<ActionType>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async (
    params: { pageSize?: number; current?: number; [key: string]: unknown },
  ): Promise<RequestData<StaffUser>> => {
    const { data } = await apiClient.get<ApiSuccessResponse<StaffListResponse>>(
      '/admin/staff',
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

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (record: StaffUser) => {
    setEditingStaff(record);
    setModalOpen(true);
  };

  const handleSubmit = async (values: StaffFormValues) => {
    setSubmitting(true);
    try {
      if (editingStaff) {
        await apiClient.patch(`/admin/staff/${editingStaff.id}`, values);
        void message.success('Сотрудник обновлён');
      } else {
        await apiClient.post('/admin/staff', values);
        void message.success('Сотрудник создан');
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch {
      void message.error('Не удалось сохранить сотрудника');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<StaffUser>[] = [
    {
      title: 'Имя',
      dataIndex: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      copyable: true,
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      render: (_, record) => (
        <Tag color={roleColors[record.role] ?? 'default'}>{record.role}</Tag>
      ),
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
      title: 'Последний вход',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      render: (text) => text ?? '—',
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleOpenEdit(record)}
        >
          Редактировать
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<StaffUser>
        headerTitle="Сотрудники"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={fetchStaff}
        pagination={{ pageSize: 20 }}
        search={false}
        dateFormatter="string"
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Добавить сотрудника
          </Button>,
        ]}
      />

      <Modal
        title={editingStaff ? 'Редактировать сотрудника' : 'Новый сотрудник'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <ProForm<StaffFormValues>
          onFinish={handleSubmit}
          submitter={{
            submitButtonProps: { loading: submitting },
            resetButtonProps: false,
          }}
          initialValues={
            editingStaff
              ? { name: editingStaff.name, email: editingStaff.email, role: editingStaff.role }
              : undefined
          }
        >
          <ProFormText
            name="name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          />
          <ProFormText
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          />
          <ProFormText.Password
            name="password"
            label="Пароль"
            rules={editingStaff ? [] : [{ required: true, message: 'Введите пароль' }]}
            placeholder={editingStaff ? 'Оставьте пустым, чтобы не менять' : undefined}
          />
          <ProFormSelect
            name="role"
            label="Роль"
            options={roleOptions}
            rules={[{ required: true, message: 'Выберите роль' }]}
          />
        </ProForm>
      </Modal>
    </>
  );
}
