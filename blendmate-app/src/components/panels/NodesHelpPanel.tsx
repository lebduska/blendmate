import { PanelProps } from '../../types/panels';
import NodeHelpView from '../NodeHelpView';

export default function NodesHelpPanel(props: PanelProps) {
  // Accept optional nodeId prop, fallback to default
  const nodeId = (props as any).currentNodeId ?? 'GeometryNodeInstanceOnPoints';
  return (
    <div className="p-4">
      <NodeHelpView nodeId={nodeId} />
    </div>
  );
}
