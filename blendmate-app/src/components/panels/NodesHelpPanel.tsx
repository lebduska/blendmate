import { PanelProps } from '../../types/panels';
import NodeHelpView from '../NodeHelpView';

interface NodesHelpPanelProps extends PanelProps {
  currentNodeId: string;
  onNodeIdChange: (nodeId: string) => void;
}

export default function NodesHelpPanel({ currentNodeId, onNodeIdChange }: NodesHelpPanelProps) {
  return (
    <div className="space-y-4">
      {/* Node switcher pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {['GeometryNodeInstanceOnPoints', 'GeometryNodeCombineXYZ', 'GeometryNodeSeparateXYZ', 'Unknown'].map(id => (
          <button 
            key={id}
            onClick={() => onNodeIdChange(id)}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase whitespace-nowrap transition-all ${
              currentNodeId === id ? 'bg-blendmate-orange text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {id.replace('GeometryNode', '')}
          </button>
        ))}
      </div>

      {/* Node help content */}
      <NodeHelpView nodeId={currentNodeId} />
    </div>
  );
}
