import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000000' }}>
      <Sidebar />
      <main style={{
        marginLeft: '200px', flex: 1, padding: '32px 36px',
        minHeight: '100vh', background: '#000000',
        fontFamily: 'Inter, sans-serif',
      }}>
        {children}
      </main>
    </div>
  );
}