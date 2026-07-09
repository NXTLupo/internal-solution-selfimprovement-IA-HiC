import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from 'nxt-proto-ds';

export const Info = () => (
  <Alert variant="info" style={{ maxWidth: 420 }}>
    <AlertTitle>Renewal window opens Monday</AlertTitle>
    <AlertDescription>Plan changes made before March 31 apply to the April billing cycle.</AlertDescription>
  </Alert>
);

export const Success = () => (
  <Alert variant="success" style={{ maxWidth: 420 }}>
    <AlertTitle>Enrollment submitted</AlertTitle>
    <AlertDescription>Your elections were recorded; a confirmation email is on its way.</AlertDescription>
  </Alert>
);

export const Warning = () => (
  <Alert variant="warning" style={{ maxWidth: 420 }}>
    <AlertTitle>Two dependents need verification</AlertTitle>
    <AlertDescription>Upload proof of eligibility before coverage can start.</AlertDescription>
  </Alert>
);

export const ErrorState = () => (
  <Alert variant="error" style={{ maxWidth: 420 }}>
    <AlertTitle>Payment method declined</AlertTitle>
    <AlertDescription>The card on file expired in February. Update billing to keep coverage active.</AlertDescription>
  </Alert>
);
