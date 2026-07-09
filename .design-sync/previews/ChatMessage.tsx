import * as React from 'react';
import { ChatMessage } from 'nxt-proto-ds';

export const UserTurn = () => (
  <ChatMessage role="user" style={{ maxWidth: 480 }}>
    Which onboarding steps do churned accounts skip most often?
  </ChatMessage>
);

export const AssistantTurn = () => (
  <ChatMessage role="assistant" style={{ maxWidth: 480 }}>
    Churned accounts most often skip the data-import step and the first saved report.
    Accounts that completed both within the first week renewed at a visibly higher rate,
    and support tickets from skippers cluster around setup confusion.
  </ChatMessage>
);

export const NamedAnalyst = () => (
  <ChatMessage role="assistant" roleLabel="Research analyst" showActions={false} style={{ maxWidth: 480 }}>
    The strongest churn signal in the corpus is a silent one: accounts stop inviting
    teammates about six weeks before they cancel.
  </ChatMessage>
);
