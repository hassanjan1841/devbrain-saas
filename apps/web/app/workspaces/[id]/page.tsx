import WorkspaceDetailPage from '../../../components/workspace-detail-page';

export default function WorkspaceRoute({ params }: { params: { id: string } }) {
  return <WorkspaceDetailPage workspaceId={params.id} />;
}
