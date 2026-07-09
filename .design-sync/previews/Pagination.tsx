import * as React from 'react';
import { Pagination } from 'nxt-proto-ds';

export const MidRange = () => (
  <Pagination pageCount={7} page={4} />
);

export const FirstPage = () => (
  <Pagination pageCount={5} page={1} />
);

export const LastPage = () => (
  <Pagination pageCount={5} page={5} />
);
