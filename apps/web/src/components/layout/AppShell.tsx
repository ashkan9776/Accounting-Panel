'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthOrOnboarding = pathname.startsWith('/auth') || pathname.startsWith('/onboarding');

  if (isAuthOrOnboarding) {
    return <main className="min-h-screen bg-slate-100 flex flex-col justify-center">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* سایدبار راست */}
      <Sidebar />

      {/* ناحیه محتوای اصلی */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
