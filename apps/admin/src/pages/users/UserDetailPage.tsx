import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Spin, Typography, Space, Breadcrumb } from 'antd';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

const { Title } = Typography;

interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  birthDate: string | null;
  isActive: boolean;
  consentGiven: boolean;
  consentGivenAt: string | null;
  createdAt: string;
  updatedAt: string;
  externalGuestId: string | null;
}

interface Session {
  id: string;
  deviceId: string | null;
  deviceInfo: Record<string, unknown> | null;
  ipAddress: string | null;
  expiresAt: string;
  createdAt: string;
}

interface PushTokenItem {
  id: string;
  token: string;
  platform: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pushTokens, setPushTokens] = useState<PushTokenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiClient.get<ApiSuccessResponse<UserProfile>>(`/admin/users/${id}`),
      apiClient.get<ApiSuccessResponse<{ items: Session[] }>>(`/admin/users/${id}/sessions`),
      apiClient.get<ApiSuccessResponse<{ items: PushTokenItem[] }>>(`/admin/users/${id}/push-tokens`),
    ])
      .then(([userRes, sessionsRes, pushRes]) => {
        setUser(userRes.data.data);
        setSessions(sessionsRes.data.data.items);
        setPushTokens(pushRes.data.data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  if (!user) {
    return <Title level={4}>Пользователь не найден</Title>;
  }

  const lastSession = sessions[0] ?? null;
  const deviceInfo = lastSession?.deviceInfo;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Breadcrumb items={[
        { title: <Link to="/users">Пользователи</Link> },
        { title: user.phone },
      ]} />

      <Card title="Профиль">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
          <Descriptions.Item label="Телефон">{user.phone}</Descriptions.Item>
          <Descriptions.Item label="Имя">{user.name ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Дата рождения">{user.birthDate ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="ID лояльности">{user.externalGuestId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Статус">
            <Tag color={user.isActive ? 'green' : 'red'}>
              {user.isActive ? 'Активен' : 'Заблокирован'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Согласие ПДн">
            <Tag color={user.consentGiven ? 'blue' : 'orange'}>
              {user.consentGiven ? 'Дано' : 'Не дано'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Зарегистрирован">{new Date(user.createdAt).toLocaleString('ru')}</Descriptions.Item>
          <Descriptions.Item label="Обновлён">{new Date(user.updatedAt).toLocaleString('ru')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Последнее устройство">
        {lastSession ? (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="IP">{lastSession.ipAddress ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Device ID">{lastSession.deviceId ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Платформа">{deviceInfo?.platform as string ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="ОС">{String(deviceInfo?.osVersion ?? '—')}</Descriptions.Item>
            <Descriptions.Item label="Бренд">{deviceInfo?.brand as string ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Модель">{deviceInfo?.model as string ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Версия приложения">{deviceInfo?.appVersion as string ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Последний вход">{new Date(lastSession.createdAt).toLocaleString('ru')}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">Нет данных об устройстве</Typography.Text>
        )}
      </Card>

      <Card title="Все сессии">
        <Table
          dataSource={sessions}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'IP',
              dataIndex: 'ipAddress',
              render: (v: string) => v ?? '—',
            },
            {
              title: 'Device ID',
              dataIndex: 'deviceId',
              render: (v: string) => v ?? '—',
            },
            {
              title: 'Платформа',
              dataIndex: 'deviceInfo',
              render: (v: Record<string, unknown> | null) => (v?.platform as string) ?? '—',
            },
            {
              title: 'Модель',
              dataIndex: 'deviceInfo',
              key: 'model',
              render: (v: Record<string, unknown> | null) => (v?.model as string) ?? '—',
            },
            {
              title: 'Создана',
              dataIndex: 'createdAt',
              render: (v: string) => new Date(v).toLocaleString('ru'),
            },
            {
              title: 'Истекает',
              dataIndex: 'expiresAt',
              render: (v: string) => new Date(v).toLocaleString('ru'),
            },
          ]}
        />
      </Card>

      <Card title="Push-токены">
        <Table
          dataSource={pushTokens}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Токен',
              dataIndex: 'token',
              render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
            },
            {
              title: 'Платформа',
              dataIndex: 'platform',
              render: (v: string) => <Tag>{v}</Tag>,
            },
            {
              title: 'Активен',
              dataIndex: 'isActive',
              render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Да' : 'Нет'}</Tag>,
            },
            {
              title: 'Создан',
              dataIndex: 'createdAt',
              render: (v: string) => new Date(v).toLocaleString('ru'),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
