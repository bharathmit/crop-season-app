import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import PlaceholderPage from '../pages/PlaceholderPage'

// Routes for the first version. Each placeholder is replaced as its feature is built (see docs/progress.md).
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Dashboard" /> },
      { path: 'crop-cycles', element: <PlaceholderPage title="Crop cycles" /> },
      { path: 'expenses', element: <PlaceholderPage title="Expenses" /> },
      { path: 'income', element: <PlaceholderPage title="Harvest & income" /> },
      { path: 'checklist', element: <PlaceholderPage title="Stage checklist" /> },
      { path: 'reports', element: <PlaceholderPage title="Reports" /> },
      { path: 'masters', element: <PlaceholderPage title="Masters: plots, seasons, crops, stages" /> },
    ],
  },
], { basename: import.meta.env.BASE_URL })
