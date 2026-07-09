import * as React from 'react';
import { Spinner } from 'nxt-proto-ds';

export const Default = () => <Spinner label="Synthesizing themes..." />;

export const ArcOnly = () => <Spinner label="" size={20} />;

export const Large = () => <Spinner label="Building the evidence graph..." size={40} />;
