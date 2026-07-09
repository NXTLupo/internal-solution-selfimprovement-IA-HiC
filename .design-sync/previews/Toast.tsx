import * as React from 'react';
import { Toast } from 'nxt-proto-ds';

export const Success = () => (
  <Toast variant="success" message="Corpus synced. 214 sources indexed." />
);

export const InfoVariant = () => (
  <Toast variant="info" message="Export queued. The deck lands in your downloads." />
);

export const ErrorVariant = () => (
  <Toast variant="error" message="Upload failed. The PDF exceeds the 50 MB limit." />
);
