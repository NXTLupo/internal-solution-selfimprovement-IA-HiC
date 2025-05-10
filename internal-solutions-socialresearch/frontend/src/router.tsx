import { createBrowserRouter } from 'react-router-dom';
import Landing from './pages/Landing';
import SentimentAnalysis from './pages/SentimentAnalysis';
import TopicModeling from './pages/TopicModeling';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/sentiment-analysis',
    element: <SentimentAnalysis />,
  },
  {
    path: '/sentiment-analysis/:projectId',
    element: <SentimentAnalysis />,
  },
  {
    path: '/topic-modeling',
    element: <TopicModeling />,
  },
  {
    path: '/topic-modeling/:projectId',
    element: <TopicModeling />,
  },
]); 