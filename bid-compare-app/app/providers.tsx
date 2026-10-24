'use client';

import React from 'react';
import { GlobalMessage, OrbisModeProvider } from 'orbcafe-ui';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrbisModeProvider mode="system">
      <GlobalMessage />
      {children}
    </OrbisModeProvider>
  );
}
