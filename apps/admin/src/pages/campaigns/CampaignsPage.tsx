import { useRef, useState } from 'react';
import {
  ProTable,
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProFormDateTimePicker,
  type ProColumns,
  type RequestData,
  type ActionType,
} from '@ant-design/pro-components';
import { Button, Tag, Space, message, Modal } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface Campaign {
  id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'running' | 'done' | 'failed';
  sentCount: number;
  scheduledAt: string | null;
  createdAt: string;
}

interface CampaignListResponse {
  items: Campaign[];
  total: number;
  page: number;
  limit: number;
}

const statusColors: Record<string, string> = {
  draft: 'default',
  scheduled: 'blue',
  running: 'processing',
  done: 'success',
  failed: 'error',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'Запланирована',
  running: 'Выполняется',
  done: 'Завершена',
  failed: 'Ошибка',
};

interface CampaignFormValues {
  title: string;
  body: string;
  segmentIds?: string[];
  scheduledAt?: string;
}

export function CampaignsPage() {
  const actionRef = useRef<ActionType>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async (
    params: { pageSize?: number; current?: number },
  ): Promise<RequestData<Campaign>> => {
    const { data } = await apiClient.get<ApiSuccessResponse<CampaignListResponse>>(
      '/admin/campaigns',
      {
        params: { page: params.current ?? 1, limit: params.pageSize ?? 20 },
      },
    );
    return {
      data: data.data.items,
      total: data.data.total,
      success: true,
    };
  };

  const handleLaunch = async (campaignId: string) => {
    Modal.confirm({
      title: 'Запустить кампанию?',
      content: 'Уведомления будут отправлены немедленно.',
      okText: 'Запустить',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await apiClient.post(`/admin/campaigns/${campaignId}/launch`);
          void message.success('Кампания запущена');
          setRefreshKey((k) => k + 1);
        } catch {
          void message.error('Не удалось запустить кампанию');
        }
      },
    });
  };

  const handleCreateCampaign = async (values: CampaignFormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post('/admin/campaigns', values);
      void message.success('Кампания создана');
      setCreateModalOpen(false);
      setRefreshKey((k) => k + 1);
      actionRef.current?.reload();
    } catch {
      void message.error('Не удалось создать кампанию');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<Campaign>[] = [
    {
      title: 'Название',
      dataIndex: 'title',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColors[record.status]}>
          {statusLabels[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: 'Отправлено',
      dataIndex: 'sentCount',
    },
    {
      title: 'Запланирована',
      dataIndex: 'scheduledAt',
      valueType: 'dateTime',
      render: (text) => text ?? '—',
    },
    {
      title: 'Создана',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Space>
          {record.status === 'draft' && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => void handleLaunch(record.id)}
            >
              Запустить
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<Campaign>
        key={refreshKey}
        headerTitle="Push-кампании"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={fetchCampaigns}
        pagination={{ pageSize: 20 }}
        search={false}
        dateFormatter="string"
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Создать кампанию
          </Button>,
        ]}
      />

      <Modal
        title="Создать кампанию"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <ProForm<CampaignFormValues>
          onFinish={handleCreateCampaign}
          submitter={{
            submitButtonProps: { loading: submitting },
            resetButtonProps: false,
          }}
        >
          <ProFormText
            name="title"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          />
          <ProFormTextArea
            name="body"
            label="Текст"
            rules={[{ required: true, message: 'Введите текст' }]}
          />
          <ProFormSelect
            name="segmentIds"
            label="Сегменты"
            mode="tags"
            placeholder="Введите ID сегментов"
          />
          <ProFormDateTimePicker
            name="scheduledAt"
            label="Запланировать на"
            fieldProps={{ style: { width: '100%' } }}
          />
        </ProForm>
      </Modal>
    </>
  );
}
