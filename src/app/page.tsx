'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';

export default function Home() {
  const router = useRouter();

  const handleOpenStudio = () => {
    router.push('/login');
  };

  return (
    <main className="relative min-h-screen bg-[#fafaf9]">
      <LandingPage onOpenStudio={handleOpenStudio} />
    </main>
  );
}
