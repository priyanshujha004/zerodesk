// TODO P4 — all roles
// apps/dashboard/src/app/report/[id]/page.tsx

import { notFound } from 'next/navigation';
import ReportDetail, { ReportData } from '@/components/report/ReportDetail';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function fetchReport(id: string): Promise<ReportData | null> {
  try {
    const res = await fetch(`${BACKEND}/api/reports/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<ReportData>;
  } catch {
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: PageProps) {
  const report = await fetchReport(params.id);

  if (!report) {
    notFound();
  }

  return <ReportDetail report={report} />;
}
