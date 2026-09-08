'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceApp } from '@/components/workspace/WorkspaceApp';

export default function AppPage() {
  const router = useRouter();

  return <WorkspaceApp onNavigateHome={() => router.push('/')} />;
}
