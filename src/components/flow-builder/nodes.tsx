import React from "react";
import { Handle, Position } from "reactflow";
import { Badge } from "@/components/ui/badge";
import {
    FileUp,
    MessageSquare,
    Filter,
    Clock3,
    GitBranch,
    Code2,
    Variable,
    Image as ImageIcon,
    Headphones,
    Link2,
    Flag,
    Pencil,
    Copy,
    Trash2,
    Clipboard,
    Hash,
} from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

const Shell = ({
  icon: Icon,
  title,
  children,
  color,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  color: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyWebhook: () => void;
  onCopyId: () => void;
}) => (
    <ContextMenu>
        <ContextMenuTrigger>
            <div className={`w-[280px] rounded-2xl shadow-sm border ${color} bg-white`}>
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                <Icon className="h-4 w-4" />
                <h4 className="font-semibold text-sm">{title}</h4>
                </div>
                <div className="p-3 text-sm space-y-2">{children}</div>
            </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
            <ContextMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopyWebhook}>
                <Clipboard className="h-4 w-4 mr-2" />
                Copy Webhook URL
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopyId}>
                <Hash className="h-4 w-4 mr-2" />
                Copy ID
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete} className="text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
            </ContextMenuItem>
        </ContextMenuContent>
    </ContextMenu>
);

const CommonHandles = ({ top = false, bottom = true }) => (
  <>
    {top && <Handle type="target" position={Position.Top} />}
    {bottom && <Handle type="source" position={Position.Bottom} />}
  </>
);

const TriggerNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={FileUp}
            title="Trigger"
            color="border-green-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-muted-foreground">
                Keyword: <Badge variant="secondary">{data.keyword}</Badge>
            </div>
        </Shell>
        <CommonHandles top={false} bottom={true} />
    </div>
);

const MessageNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={MessageSquare}
            title="Message"
            color="border-blue-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            {data.useTemplate ? <Badge variant="outline">Template</Badge> : null}
            <div className="whitespace-pre-wrap break-words bg-muted/30 p-2 rounded-lg max-h-40 overflow-auto">
                {data.text}
            </div>
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const OptionsNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Filter}
            title="Options"
            color="border-yellow-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <ul className="space-y-1">
                {data.options?.map((opt, idx) => (
                    <li key={idx} className="border rounded px-2 py-1 text-xs">
                        {opt}
                    </li>
                ))}
            </ul>
        </Shell>
        {/* one target on top, multiple sources along bottom */}
    <Handle type="target" position={Position.Top} />
    {data.options?.map((opt, i) => (
      <Handle
        key={i}
        id={`opt-${i}`}
        type="source"
        position={Position.Bottom}
        style={{ left: 20 + i * (200 / Math.max(1, data.options.length - 1)) }}
      />
    ))}
    <Handle
      id="no-match"
      type="source"
      position={Position.Bottom}
      style={{ left: 240 }}
    />
    <div
      className="absolute text-xs text-muted-foreground"
      style={{ bottom: -20, left: 220 }}
    >
      No Match
    </div>
  </div>
);

const DelayNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Clock3}
            title="Delay"
            color="border-orange-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div>
                Wait <b>{data.seconds}</b> seconds
            </div>
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const ConditionNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={GitBranch}
            title="Condition"
            color="border-purple-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <code className="text-xs bg-muted/40 px-2 py-1 rounded block overflow-auto max-h-24">
                {data.expression}
            </code>
            <div className="text-xs text-muted-foreground">
                True → bottom-left, False → bottom-right
            </div>
        </Shell>
        <Handle type="target" position={Position.Top} />
    <Handle
      type="source"
      id="true"
      position={Position.Bottom}
      style={{ left: 80 }}
    />
    <Handle
      type="source"
      id="false"
      position={Position.Bottom}
      style={{ left: 200 }}
    />
  </div>
);

const APICallNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Code2}
            title="API Call"
            color="border-cyan-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs">
                <div className="truncate">
                    <b>{data.method}</b> {data.url}
                </div>
                <div>
                    → <Badge variant="secondary">{data.assignTo}</Badge>
                </div>
            </div>
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const AssignVarNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Variable}
            title="Set Variable"
            color="border-rose-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs">
                <b>{data.key}</b> = <code className="break-all">{data.value}</code>
            </div>
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const MediaNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={ImageIcon}
            title="Send Media"
            color="border-teal-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs">
                {data.mediaType.toUpperCase()} • {data.url}
            </div>
            {data.caption && (
                <div className="text-xs text-muted-foreground">{data.caption}</div>
            )}
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const HandoffNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Headphones}
            title="Human Handoff"
            color="border-fuchsia-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs">
                Queue: <b>{data.queue}</b>
            </div>
            {data.note && (
                <div className="text-xs text-muted-foreground">{data.note}</div>
            )}
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const GoToNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Link2}
            title="Go To"
            color="border-slate-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs">
                Jump to:{" "}
                <Badge variant="outline">{data.targetNodeId || "(select)"}</Badge>
            </div>
        </Shell>
        <CommonHandles top bottom />
    </div>
);

const EndNode = ({ data, onEdit, onDuplicate, onDelete, onCopyWebhook, onCopyId }) => (
    <div>
        <Shell
            icon={Flag}
            title="End"
            color="border-gray-300"
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCopyWebhook={onCopyWebhook}
            onCopyId={onCopyId}
        >
            <div className="text-xs text-muted-foreground">
                {data.reason || "end"}
            </div>
        </Shell>
        <Handle type="target" position={Position.Top} />
    </div>
);

export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  options: OptionsNode,
  delay: DelayNode,
  condition: ConditionNode,
  api: APICallNode,
  assign: AssignVarNode,
  media: MediaNode,
  handoff: HandoffNode,
  goto: GoToNode,
  end: EndNode,
};
