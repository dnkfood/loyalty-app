import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { UserOutlined, RocketOutlined, MessageOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  campaignsSent: number;
  pushDeliveryRate: number;
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccessResponse<DashboardMetrics>>(
        '/admin/dashboard',
      );
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1>Дашборд</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего пользователей"
              value={data?.totalUsers ?? 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Активных пользователей"
              value={data?.activeUsers ?? 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Push-кампаний отправлено"
              value={data?.campaignsSent ?? 0}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Доставляемость push"
              value={data?.pushDeliveryRate ?? 0}
              suffix="%"
              prefix={<MessageOutlined />}
              valueStyle={{ color: data && data.pushDeliveryRate >= 80 ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
