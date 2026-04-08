import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/auth.store';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form] = Form.useForm<LoginFormValues>();

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const { data } = await apiClient.post<LoginResponse>(
        '/admin/auth/login',
        values,
      );
      setAuth(data.data.accessToken, data.data.user);
      void navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        void message.error('Неверный email или пароль');
      } else {
        console.error('Login error:', err);
        void message.error('Ошибка соединения с сервером');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card title="Loyalty Admin Panel" style={{ width: 400 }}>
        <Form form={form} onFinish={handleSubmit} layout="vertical" autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
          >
            <Input placeholder="admin@company.com" />
          </Form.Item>
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
          >
            <Input.Password placeholder="Пароль" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
