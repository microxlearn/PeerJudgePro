import AdminDashboard from '@/components/peer-judge/admin-dashboard';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  
  return <AdminDashboard roomId={roomId} />;
}
