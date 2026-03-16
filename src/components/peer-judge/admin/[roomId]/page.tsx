import AdminDashboard from '@/components/peer-judge/admin-dashboard';

export default function AdminDashboardPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <AdminDashboard roomId={params.roomId} />;
}
