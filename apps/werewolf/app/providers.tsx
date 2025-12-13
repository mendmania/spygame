'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@vbz/firebase/auth';

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
