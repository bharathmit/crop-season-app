import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import PlaceholderPage from '../pages/PlaceholderPage'
import LoginPage from '../pages/LoginPage'
import RequireAuth from './RequireAuth'
import FarmsPage from '../features/farms/FarmsPage'
import MachineryPage from '../features/machinery/MachineryPage'
import CropsPage from '../features/crops/CropsPage'
import AddEntryPage from '../features/transactions/AddEntryPage'
import EntriesPage from '../features/transactions/EntriesPage'
import HomePage from '../features/dashboard/HomePage'
import TasksPage from '../features/tasks/TasksPage'
import ReportsPage from '../features/reports/ReportsPage'
import SettingsPage from '../features/settings/SettingsPage'

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
        { index: true, element: <HomePage /> },
        { path: 'tasks', element: <TasksPage /> },
        { path: 'crops', element: <CropsPage /> },
        { path: 'crops/:cropId', element: <CropsPage /> },
        { path: 'crops/:cropId/entries', element: <EntriesPage scope="crop" /> },
        { path: 'farm', element: <FarmsPage /> },
        { path: 'farm/:farmId/entries', element: <EntriesPage scope="farm" /> },
        { path: 'machinery', element: <MachineryPage /> },
        { path: 'machinery/:machineId/entries', element: <EntriesPage scope="machinery" /> },
        { path: 'reports', element: <ReportsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'add/:kind', element: <AddEntryPage /> },
        { path: '*', element: <PlaceholderPage title="Page not found" /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
