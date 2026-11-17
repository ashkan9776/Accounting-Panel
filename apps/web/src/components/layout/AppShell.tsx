'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isAuthOrOnboarding = pathname.startsWith('/auth') || pathname.startsWith('/onboarding');

  useEffect(() => {
    setMounted(true);
    if (!isAuthOrOnboarding) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/auth/login');
      }
    }
  }, [isAuthOrOnboarding, router]);

  if (isAuthOrOnboarding) {
    return <main className="min-h-screen bg-slate-100 flex flex-col justify-center">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* سایدبار راست */}
      <Sidebar />

      {/* ناحیه محتوای اصلی */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:h-auto print:overflow-visible print:w-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 print:p-0 print:m-0 print:overflow-visible print:bg-white print:w-full">
          <div className="max-w-7xl mx-auto print:max-w-none print:w-full print:m-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
