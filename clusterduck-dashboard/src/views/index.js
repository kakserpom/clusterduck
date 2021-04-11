import Dashboard from './pages/Dashboard';
import Cluster from './pages/Cluster';
import Logs from './pages/Logs';
import ErrorPage from './pages/404';
import Raft from "./pages/Raft";

// See React Router documentation for details: https://reacttraining.com/react-router/web/api/Route
const pageList = [
    {
        path: '/home',
        component: Dashboard,
    },
    {
        path: '/clusters/:cluster/:tab/:section',
        component: Cluster,
    },
    {
        path: '/clusters/:cluster/:tab',
        component: Cluster,
    },
    {
        path: '/clusters/:cluster',
        component: Cluster,
    },
    {
        path: '/logs/:tab',
        component: Logs,
    },
    {
        path: '/logs',
        component: Logs,
    },
    {
        path: '/raft',
        component: Raft,
    },
    {
        name: '404',
        path: '/404',
        component: ErrorPage,
    },
];

export default pageList;
