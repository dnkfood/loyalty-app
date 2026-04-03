import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout, type MenuDataItem } from '@ant-design/pro-components';
import { Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  NotificationOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/auth.store';

const menuItems: MenuDataItem[] = [
  {
    path: '/dashboard',
    name: 'Дашборд',
    icon: <DashboardOutlined />,
  },
  {
    path: '/users',
    name: 'Пользователи',
    icon: <UserOutlined />,
  },
  {
    path: '/campaigns',
    name: 'Push-кампании',
    icon: <NotificationOutlined />,
  },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    void navigate('/login');
  };

  return (
    <ProLayout
      title="Loyalty Admin"
      logo={null}
      menuDataRender={() => menuItems}
      location={{ pathname: location.pathname }}
      onMenuHeaderClick={() => void navigate('/')}
      menuItemRender={(item, dom) => (
        <div onClick={() => item.path && void navigate(item.path)}>{dom}</div>
      )}
      avatarProps={{
        title: user?.name ?? user?.email ?? 'Admin',
        size: 'small',
        render: (_props, dom) => (
          <span>
            {dom}
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ marginLeft: 8 }}
            />
          </span>
        ),
      }}
      layout="side"
      contentStyle={{ margin: 24 }}
    >
      <Outlet />
    </ProLayout>
  );
}
