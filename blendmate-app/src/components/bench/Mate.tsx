/**
 * Mate - AI Assistant for Blender modeling
 * Uses Claude CLI (via Tauri backend) to understand requests and execute Blender commands
 *
 * Session-based context:
 * - Capabilities are sent once at session start (when first message is sent after connection)
 * - Scene state is sent with each message (compact format)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, Wrench, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useBlenderStore, type BlenderSceneData, type BlenderCapabilities } from '@/stores/blenderStore';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  commands?: BlenderCommand[];
  pending?: boolean;
};

type BlenderCommand = {
  type: 'operator' | 'property' | 'select';
  action: string;
  target?: string;
  params?: Record<string, unknown>;
  result?: { success: boolean; error?: string };
};

interface MateProps {
  sceneData: BlenderSceneData | null;
  selectedObjectName: string | null;
}

// Format number for display
const fmt = (v: number, decimals = 2) => v.toFixed(decimals);
const fmtDeg = (rad: number) => (rad * 180 / Math.PI).toFixed(1) + '°';

// Build context about the current scene for the AI
function buildSceneContext(
  sceneData: BlenderSceneData | null,
  selectedObjectName: string | null
): string {
  if (!sceneData) {
    return 'Scene: No scene loaded. Blender is not connected or no file is open.';
  }

  const objects = Object.values(sceneData.objects);
  const byType: Record<string, number> = {};
  for (const obj of objects) {
    byType[obj.type] = (byType[obj.type] || 0) + 1;
  }
  const typeSummary = Object.entries(byType).map(([t, n]) => `${n} ${t.toLowerCase()}`).join(', ');

  let context = `Scene: "${sceneData.scene.name}" | Frame: ${sceneData.scene.frame_current} (${sceneData.scene.frame_start}-${sceneData.scene.frame_end})
Objects: ${objects.length} (${typeSummary})
`;

  if (selectedObjectName && sceneData.objects[selectedObjectName]) {
    const obj = sceneData.objects[selectedObjectName];
    context += `
═══ SELECTED: "${obj.name}" (${obj.type}) ═══
Transform:
  Location: [${obj.location.map(v => fmt(v)).join(', ')}]
  Rotation: [${obj.rotation_euler.map(fmtDeg).join(', ')}]
  Scale: [${obj.scale.map(v => fmt(v)).join(', ')}]
  Dimensions: [${obj.dimensions.map(v => fmt(v)).join(', ')}] meters
`;

    // Hierarchy
    if (obj.parent) {
      context += `  Parent: ${obj.parent}\n`;
    }
    if (obj.children.length > 0) {
      context += `  Children: ${obj.children.join(', ')}\n`;
    }

    // Mesh data
    if (obj.mesh) {
      context += `Mesh: ${obj.mesh.vertices} verts, ${obj.mesh.edges} edges, ${obj.mesh.polygons} faces\n`;
    }

    // Modifiers with details
    if (obj.modifiers.length > 0) {
      context += `Modifiers (${obj.modifiers.length}):\n`;
      for (const mod of obj.modifiers) {
        const visibility = mod.show_viewport ? '👁' : '○';
        context += `  ${visibility} ${mod.name} (${mod.type})\n`;
      }
    }

    // Materials
    if (obj.materials.length > 0) {
      const mats = obj.materials.filter(m => m).join(', ') || 'empty slots';
      context += `Materials: ${mats}${obj.active_material ? ` [active: ${obj.active_material}]` : ''}\n`;
    }

    // Constraints
    if (obj.constraints.length > 0) {
      context += `Constraints: ${obj.constraints.map(c => `${c.name}(${c.type})`).join(', ')}\n`;
    }

    // Visibility
    const visFlags = [];
    if (obj.hide_viewport) visFlags.push('hidden in viewport');
    if (obj.hide_render) visFlags.push('hidden in render');
    if (obj.hide_select) visFlags.push('unselectable');
    if (visFlags.length > 0) {
      context += `Visibility: ${visFlags.join(', ')}\n`;
    }

    // Animation
    if (obj.has_animation && obj.action_name) {
      context += `Animation: ${obj.action_name}\n`;
    }

    // Custom properties
    if (obj.custom_properties && Object.keys(obj.custom_properties).length > 0) {
      context += `Custom props: ${Object.keys(obj.custom_properties).join(', ')}\n`;
    }
  } else {
    context += `Selected: None\n`;
  }

  // List all objects briefly
  context += `\nAll objects:\n`;
  for (const obj of objects.slice(0, 15)) {
    const mods = obj.modifiers.length > 0 ? ` [${obj.modifiers.map(m => m.type).join(', ')}]` : '';
    const sel = obj.name === selectedObjectName ? ' ◄' : '';
    context += `  ${obj.name} (${obj.type})${mods}${sel}\n`;
  }
  if (objects.length > 15) {
    context += `  ... and ${objects.length - 15} more\n`;
  }

  return context;
}

// Build capabilities context (sent once at session start)
function buildCapabilitiesContext(capabilities: BlenderCapabilities): string {
  let context = `=== BLENDER CAPABILITIES (Session Reference) ===

You have access to the following Blender operators, modifiers, and tools.
Use these EXACT names and parameters when executing commands.

--- OPERATORS ---
`;

  // Group operators by category
  const operatorsByCategory: Record<string, string[]> = {};
  for (const [opName, opInfo] of Object.entries(capabilities.operators)) {
    const category = opName.split('.')[0];
    if (!operatorsByCategory[category]) {
      operatorsByCategory[category] = [];
    }
    const params = Object.entries(opInfo.params)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    let line = `  ${opName}: ${opInfo.desc}`;
    if (params) line += ` | Params: ${params}`;
    if (opInfo.requires) line += ` | ⚠️ ${opInfo.requires}`;
    if (opInfo.note) line += ` | Note: ${opInfo.note}`;
    operatorsByCategory[category].push(line);
  }

  for (const [category, ops] of Object.entries(operatorsByCategory)) {
    context += `\n[${category}]\n`;
    context += ops.join('\n') + '\n';
  }

  context += `\n--- MODIFIERS ---
Add with: OPERATOR object.modifier_add {"type": "MODIFIER_TYPE"}
Set properties with: PROPERTY objects['Name'].modifiers['ModName'].property value

`;

  for (const [modName, modInfo] of Object.entries(capabilities.modifiers)) {
    const props = Object.entries(modInfo.props)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    context += `${modName}: ${modInfo.desc}`;
    if (props) context += `\n  Props: ${props}`;
    context += '\n';
  }

  context += `\n--- PRIMITIVES ---
${capabilities.primitive_meshes.map(p => `mesh.primitive_${p}_add`).join(', ')}

--- OBJECT TYPES ---
${capabilities.object_types.join(', ')}
`;

  return context;
}

// Base system prompt (always included)
const BASE_SYSTEM_PROMPT = `You are a Blender modeling assistant integrated into Blendmate. You help users create and modify 3D models by executing Blender commands.

COMMAND FORMAT - Use this exact syntax:
\`\`\`blender
OPERATOR mesh.primitive_cylinder_add {"radius": 1, "depth": 2, "location": [0, 0, 0]}
PROPERTY objects['Cylinder'].modifiers['Solidify'].thickness 0.1
SELECT Cube
OPERATOR object.delete {}
\`\`\`

THREE COMMAND TYPES:
1. OPERATOR <name> {params} - Call Blender operator
2. PROPERTY <path> <value> - Set object property
3. SELECT <objectName> - Select object by name

⚠️ CRITICAL RULES:
- ALWAYS use SELECT before: object.delete, object.duplicate, transform.*, object.modifier_add
- After adding primitives, they are auto-selected - use this for immediate operations
- Location in meters, rotation in radians (90° = 1.5708, 180° = 3.14159)
- Break complex tasks into clear steps
- Explain briefly what you're doing

If Blender is not connected, tell the user to connect first.`;

export default function Mate({ sceneData, selectedObjectName }: MateProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ahoj! Jsem tvůj AI asistent pro modelování v Blenderu. Řekni mi co chceš vytvořit a já to udělám za tebe.\n\nNapříklad: "Vytvoř hrnek s uchem" nebo "Přidej subdivize na vybraný objekt"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capabilitiesSent, setCapabilitiesSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendCommand = useBlenderStore((s) => s.sendCommand);
  const connectionStatus = useBlenderStore((s) => s.connectionStatus);
  const capabilities = useBlenderStore((s) => s.capabilities);
  const capabilitiesLoading = useBlenderStore((s) => s.capabilitiesLoading);

  // Reset capabilitiesSent when connection drops
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setCapabilitiesSent(false);
    }
  }, [connectionStatus]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse blender commands from AI response
  const parseCommands = useCallback((content: string): BlenderCommand[] => {
    const commands: BlenderCommand[] = [];
    const regex = /```blender\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const block = match[1];
      const lines = block.trim().split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('OPERATOR ')) {
          const rest = trimmed.slice(9);
          const spaceIdx = rest.indexOf(' ');
          if (spaceIdx > 0) {
            const action = rest.slice(0, spaceIdx);
            const paramsStr = rest.slice(spaceIdx + 1);
            try {
              const params = JSON.parse(paramsStr);
              commands.push({ type: 'operator', action, params });
            } catch {
              commands.push({ type: 'operator', action, params: {} });
            }
          } else {
            commands.push({ type: 'operator', action: rest, params: {} });
          }
        } else if (trimmed.startsWith('PROPERTY ') || trimmed.startsWith('SET ')) {
          // Handle both "PROPERTY path value" and "SET path = value" formats
          const prefix = trimmed.startsWith('SET ') ? 'SET ' : 'PROPERTY ';
          let rest = trimmed.slice(prefix.length);

          // Handle optional "=" sign: "path = value" -> "path value"
          rest = rest.replace(/\s*=\s*/, ' ');

          // Find the split point: last ']' followed by optional '.property' then space and value
          const match = rest.match(/^(.+?\][.\w]*)\s+(.+)$/);
          if (match) {
            const target = match[1];
            const valueStr = match[2];
            try {
              const value = JSON.parse(valueStr);
              commands.push({ type: 'property', action: 'set', target, params: { value } });
            } catch {
              // If not valid JSON, try to interpret as string (for enum values like 'DIFFERENCE')
              // Remove quotes if present
              const cleanValue = valueStr.replace(/^['"]|['"]$/g, '');
              commands.push({ type: 'property', action: 'set', target, params: { value: cleanValue } });
            }
          }
        } else if (trimmed.startsWith('SELECT ')) {
          const objectName = trimmed.slice(7).trim();
          if (objectName) {
            commands.push({ type: 'select', action: 'select', target: objectName, params: { mode: 'set', active: true } });
          }
        }
      }
    }

    return commands;
  }, []);

  // Execute a single command
  const executeCommand = useCallback(async (cmd: BlenderCommand): Promise<BlenderCommand> => {
    try {
      if (cmd.type === 'operator') {
        const result = await sendCommand('operator.call', cmd.action, cmd.params || {});
        return { ...cmd, result: { success: result.success, error: result.success ? undefined : (result as { error: string }).error } };
      } else if (cmd.type === 'select' && cmd.target) {
        const result = await sendCommand('object.select', cmd.target, cmd.params || {});
        return { ...cmd, result: { success: result.success, error: result.success ? undefined : (result as { error: string }).error } };
      } else if (cmd.type === 'property' && cmd.target) {
        const result = await sendCommand('property.set', cmd.target, cmd.params || {});
        return { ...cmd, result: { success: result.success, error: result.success ? undefined : (result as { error: string }).error } };
      }
      return { ...cmd, result: { success: false, error: 'Unknown command type' } };
    } catch (e) {
      return { ...cmd, result: { success: false, error: String(e) } };
    }
  }, [sendCommand]);

  // Execute all commands from AI response
  const executeCommands = useCallback(async (commands: BlenderCommand[]): Promise<BlenderCommand[]> => {
    const results: BlenderCommand[] = [];
    for (const cmd of commands) {
      const result = await executeCommand(cmd);
      results.push(result);
      // Small delay between commands
      await new Promise(r => setTimeout(r, 100));
    }
    return results;
  }, [executeCommand]);

  // Send message to Claude API
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Build conversation history
    const sceneContext = buildSceneContext(sceneData, selectedObjectName);
    const history = messages
      .filter(m => m.role !== 'system')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      // Build conversation context for Claude CLI
      const conversationContext = history
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = conversationContext
        ? `${conversationContext}\n\nUser: ${userMessage.content}`
        : userMessage.content;

      // Build system prompt - include capabilities only on first message of session
      let systemPrompt = BASE_SYSTEM_PROMPT;

      if (!capabilitiesSent && capabilities) {
        // First message with capabilities - send full context
        systemPrompt += '\n\n' + buildCapabilitiesContext(capabilities);
        setCapabilitiesSent(true);
        console.log('[ChatAssistant] Sent capabilities context (first message)');
      }

      // Always include current scene state
      systemPrompt += `\n\n--- CURRENT SCENE STATE ---\n${sceneContext}`;

      // Call Claude CLI via Tauri backend
      const assistantContent = await invoke<string>('ask_claude', {
        prompt: fullPrompt,
        systemPrompt: systemPrompt,
      });

      // Parse and execute commands
      const commands = parseCommands(assistantContent);
      let executedCommands: BlenderCommand[] = [];

      if (commands.length > 0 && connectionStatus !== 'disconnected') {
        executedCommands = await executeCommands(commands);
      }

      // Clean the content (remove command blocks for display)
      const cleanContent = assistantContent.replace(/```blender\n[\s\S]*?```/g, '').trim();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanContent || 'Příkazy provedeny.',
        commands: executedCommands.length > 0 ? executedCommands : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Chyba: ${error instanceof Error ? error.message : 'Nepodařilo se spojit s AI'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, sceneData, selectedObjectName, connectionStatus, capabilities, capabilitiesSent, parseCommands, executeCommands]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: msg.role === 'user'
                  ? 'var(--blender-blue-light)'
                  : 'var(--blender-orange-light)',
              }}
            >
              {msg.role === 'user' ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <div
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user' ? 'ml-8' : 'mr-8'
              }`}
              style={{
                background: msg.role === 'user'
                  ? 'var(--islands-color-background-elevated)'
                  : 'var(--islands-color-background-secondary)',
              }}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Show executed commands */}
              {msg.commands && msg.commands.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                  <div className="flex items-center gap-1 text-xs opacity-60">
                    <Wrench className="w-3 h-3" />
                    <span>Provedené příkazy:</span>
                  </div>
                  {msg.commands.map((cmd, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono px-2 py-1 rounded flex items-center gap-2"
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        color: cmd.result?.success ? '#28c840' : 'var(--islands-color-error)',
                      }}
                    >
                      <span className="opacity-60">{cmd.type === 'operator' ? 'OP' : cmd.type === 'select' ? 'SEL' : 'SET'}</span>
                      <span className="flex-1 truncate">
                        {cmd.type === 'operator' ? cmd.action : cmd.target}
                      </span>
                      <span>{cmd.result?.success ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--blender-orange-light)' }}
            >
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
            <div
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--islands-color-background-secondary)' }}
            >
              <span className="opacity-60">Přemýšlím...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--islands-color-border-subtle)' }}>
        {/* Capabilities status indicator */}
        {connectionStatus !== 'disconnected' && (
          <div className="flex items-center gap-2 mb-2 text-xs opacity-60">
            <Zap className="w-3 h-3" />
            {capabilitiesLoading ? (
              <span>Načítám schopnosti...</span>
            ) : capabilities ? (
              <span>
                {Object.keys(capabilities.operators).length} operátorů,{' '}
                {Object.keys(capabilities.modifiers).length} modifikátorů
                {capabilitiesSent && ' ✓'}
              </span>
            ) : (
              <span>Čekám na schopnosti...</span>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={connectionStatus === 'disconnected'
              ? 'Připoj se k Blenderu...'
              : capabilities
                ? 'Napiš co chceš vytvořit...'
                : 'Čekám na načtení schopností...'}
            disabled={isLoading || connectionStatus === 'disconnected' || !capabilities}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--islands-color-background-elevated)',
              color: 'var(--islands-color-text-primary)',
            }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || connectionStatus === 'disconnected' || !capabilities}
            className="px-3 rounded-lg transition-colors disabled:opacity-40"
            style={{
              background: 'var(--blender-orange-light)',
              color: 'white',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
