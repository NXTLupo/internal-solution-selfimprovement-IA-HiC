import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LoadingFallback } from './components/LoadingFallback';
// Import SubredditDetail directly instead of lazy loading for better UX
import SubredditDetail from './pages/RedditHub/SubredditDetail';

// Use lazy loading for route components
const Landing = lazy(() => import('./pages/Landing'));
const SentimentAnalysis = lazy(() => import('./pages/SentimentAnalysis'));
const TopicModeling = lazy(() => import('./pages/TopicModeling'));
const RedditHub = lazy(() => import('./pages/RedditHub'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Landing />
      </Suspense>
    ),
  },
  {
    path: '/reddit-browser',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <RedditHub />
      </Suspense>
    ),
  },
  {
    path: '/reddit-browser/subreddit/:subredditName',
    element: <SubredditDetail />,
  },
  {
    path: '/live-monitoring',
    element: <Navigate to="/reddit-browser" replace />,
  },
  {
    path: '/sentiment-analysis',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <SentimentAnalysis />
      </Suspense>
    ),
  },
  {
    path: '/sentiment-analysis/:projectId',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <SentimentAnalysis />
      </Suspense>
    ),
  },
  {
    path: '/topic-modeling',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <TopicModeling />
      </Suspense>
    ),
  },
  {
    path: '/topic-modeling/:projectId',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <TopicModeling />
      </Suspense>
    ),
  },
]); 