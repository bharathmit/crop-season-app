import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import PlaceholderPage from '../pages/PlaceholderPage'
import LoginPage from '../pages/LoginPage'
import RequireAuth from './RequireAuth'
import FarmsPage from '../features/farms/FarmsPage'
import MachineryPage from '../features/machinery/MachineryPage'
import CropsPage from '../features/crops/CropsPage'

// Each placeholder is replaced as its feature is built (see docs/progress.md, docs/ui-plan.md).
export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <PlaceholderPage title="Dashboard" /> },
        { path: 'crops', element: <CropsPage /> },
        { path: 'crops/:cropId', element: <CropsPage /> },
        { path: 'farm', element: <FarmsPage /> },
        { path: 'machinery', element: <MachineryPage /> },
        { path: 'reports', element: <PlaceholderPage title="Reports" /> },
        { path: 'settings', element: <PlaceholderPage title="Settings" /> },
        { path: 'add/:kind', element: <PlaceholderPage title="Add" /> },
        { path: '*', element: <PlaceholderPage title="Page not found" /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
