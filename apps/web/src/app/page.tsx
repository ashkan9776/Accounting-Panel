'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-slate-300">
          در حال بارگذاری سامانه حسابداری...
        </div>
      </div>
    </div>
  );
}
