import * as React from 'react';
import { Feed } from 'nxt-proto-ds';

export const ResearchFeed = () => (
  <Feed
    style={{ width: 480 }}
    posts={[
      {
        name: 'Priya Raman',
        handle: 'priya.research',
        time: '2h',
        body: 'New benchmark drop: high-deductible enrollment held flat year over year while employer costs kept climbing. Full brief in the workspace.',
        likes: '128',
        comments: '24',
        reposts: '31',
      },
      {
        name: 'Marcus Bell',
        handle: 'mbell.ops',
        time: '5h',
        body: 'The quarterly review template now ships with citation footers on every page. Screenshot below.',
        media: true,
        likes: '86',
        comments: '12',
        reposts: '9',
      },
    ]}
  />
);

export const SinglePost = () => (
  <Feed
    style={{ width: 480 }}
    posts={[
      {
        name: 'Dana Whitfield',
        handle: 'dana.w',
        time: '1d',
        body: 'Reminder: source triage closes Friday. Anything not tagged by then waits for the next research cycle.',
        likes: '42',
        comments: '7',
        reposts: '3',
      },
    ]}
  />
);
