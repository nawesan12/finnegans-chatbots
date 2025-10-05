"use client";
import React, { memo } from "react";
import type { NodeProps } from "reactflow";
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
  Workflow,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import type {
  TriggerNodeData,
  MessageNodeData,
  OptionsNodeData,
  DelayNodeData,
  ConditionNodeData,
  ApiNodeData,
  AssignNodeData,
  MediaNodeData,
  WhatsAppFlowNodeData,
  HandoffNodeData,
  GoToNodeData,
  EndNodeData,
} from "./types";

type NodeCommonHandlers = {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyWebhook: () => void;
  onCopyId: () => void;
};

/* =========================
   Utils
   ========================= */
const safeUpper = (v?: string) => (v ? String(v).toUpperCase() : "");
/* =========================
   Shell: contenedor visual
   ========================= */
type ShellProps = NodeCommonHandlers & {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  color: string; // ej: "border-blue-300"
  selected?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
};

const Shell = memo(function Shell({
  icon: Icon,
  title,
  children,
  color,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
  selected = false,
  readOnly = false,
  compact = false,
  className = "",
  testId,
}: ShellProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid={testId}
          aria-label={title}
          className={[
            "group relative w-[280px] rounded-[28px] border border-white/60 bg-white/90 shadow-[0_22px_60px_-35px_rgba(15,23,42,0.55)] transition-all duration-200",
            "hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-40px_rgba(14,165,233,0.55)]",
            selected
              ? "ring-2 ring-sky-300/80 shadow-[0_36px_85px_-45px_rgba(14,165,233,0.65)]"
              : "",
            className,
            color,
          ].join(" ")}
        >
          {/* Indicador superior de color sutil */}
          <div
            className={`absolute inset-x-0 top-0 h-1.5 rounded-t-[28px] ${color.replace("border-", "bg-")}`}
          />
          <div className="flex items-center gap-3 border-b border-white/60 bg-white/80 px-5 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 shadow-inner">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <h4 className="truncate text-sm font-semibold" title={title}>
              {title}
            </h4>
            {readOnly && (
              <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                read-only
              </span>
            )}
          </div>
          <div
            className={`space-y-2 px-5 text-sm ${compact ? "py-3" : "py-4"}`}
          >
            {children}
          </div>
        </div>
      </ContextMenuTrigger>

      {/* Menú contextual (se respeta 1:1 y se agregan guardas) */}
      <ContextMenuContent>
        <ContextMenuItem
          onClick={!readOnly ? onEdit : undefined}
          disabled={readOnly}
        >
          <Pencil className="h-4 w-4 mr-2" /> Edit
        </ContextMenuItem>
        <ContextMenuItem
          onClick={!readOnly ? onDuplicate : undefined}
          disabled={readOnly}
        >
          <Copy className="h-4 w-4 mr-2" /> Duplicate
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            // Permití que el caller maneje la URL, pero si hay string en data, copiá.
            onCopyWebhook?.();
          }}
        >
          <Clipboard className="h-4 w-4 mr-2" /> Copy Webhook URL
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            onCopyId?.();
          }}
        >
          <Hash className="h-4 w-4 mr-2" /> Copy ID
        </ContextMenuItem>
        <ContextMenuItem
          onClick={!readOnly ? onDelete : undefined}
          className="text-red-500"
          disabled={readOnly}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

/* =========================
   Handles comunes
   ========================= */
const accentHandleClass = "react-flow__handle--accent";

const CommonHandles = memo(function CommonHandles({
  top = false,
  bottom = true,
}: {
  top?: boolean;
  bottom?: boolean;
}) {
  return (
    <>
      {top && (
        <Handle
          type="target"
          position={Position.Top}
          className={accentHandleClass}
        />
      )}
      {bottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={accentHandleClass}
        />
      )}
    </>
  );
});

/* =========================
   Nodos
   ========================= */
const TriggerNode = memo(function TriggerNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<TriggerNodeData> & NodeCommonHandlers) {
  const keyword = data?.keyword ?? "(set keyword)";
  return (
    <div className="relative">
      <Shell
        icon={FileUp}
        title="Trigger"
        color="border-green-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-muted-foreground">
          Keyword: <Badge variant="secondary">{keyword}</Badge>
        </div>
      </Shell>
      <CommonHandles bottom />
    </div>
  );
});

const MessageNode = memo(function MessageNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<MessageNodeData> & NodeCommonHandlers) {
  const text = data?.text ?? "";
  return (
    <div className="relative">
      <Shell
        icon={MessageSquare}
        title="Message"
        color="border-blue-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        {data?.useTemplate ? (
          <div className="mb-2 space-y-1">
            <Badge variant="outline">Template</Badge>
            <p className="text-xs text-muted-foreground">
              {data?.templateName ? (
                <>
                  {data.templateName}
                  {data?.templateLanguage
                    ? ` (${data.templateLanguage})`
                    : ""}
                </>
              ) : (
                "Sin plantilla seleccionada"
              )}
            </p>
          </div>
        ) : null}
        <div
          className="whitespace-pre-wrap break-words bg-muted/30 p-2 rounded-lg max-h-40 overflow-auto"
          title={text}
        >
          {text || <span className="text-muted-foreground">Add message…</span>}
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const OptionsNode = memo(function OptionsNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<OptionsNodeData> & NodeCommonHandlers) {
  const options = data?.options ?? [];
  // porcentajes para distribuir uniformemente los handles
  const handlePercents =
    options.length <= 1
      ? [50]
      : options.map((_, i) => (i / (options.length - 1)) * 100);

  return (
    <div className="relative">
      <Shell
        icon={Filter}
        title="Options"
        color="border-yellow-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        {options.length ? (
          <ul className="space-y-1">
            {options.map((opt, idx) => (
              <li
                key={idx}
                className="truncate rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-1 text-xs text-slate-600"
                title={opt}
              >
                {opt}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted-foreground">Add options…</div>
        )}
      </Shell>

      {/* Handles: 1 target arriba, N sources abajo, + 'no-match' */}
      <Handle
        type="target"
        position={Position.Top}
        className={accentHandleClass}
      />
      {handlePercents.map((p, i) => (
        <Handle
          key={`opt-${i}`}
          id={`opt-${i}`}
          type="source"
          position={Position.Bottom}
          style={{ left: `${p}%`, transform: "translateX(-50%)" }}
          className={accentHandleClass}
        />
      ))}
      {/* No match al extremo derecho */}
      <Handle
        id="no-match"
        type="source"
        position={Position.Bottom}
        style={{ right: 8 }}
        className={accentHandleClass}
      />
      <div
        className="absolute text-[10px] text-muted-foreground"
        style={{ bottom: -18, right: 8 }}
      >
        No&nbsp;Match
      </div>
    </div>
  );
});

const DelayNode = memo(function DelayNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<DelayNodeData> & NodeCommonHandlers) {
  const seconds = data?.seconds ?? 0;
  return (
    <div className="relative">
      <Shell
        icon={Clock3}
        title="Delay"
        color="border-orange-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div>
          Wait <b>{seconds}</b> second{seconds === 1 ? "" : "s"}
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const ConditionNode = memo(function ConditionNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<ConditionNodeData> & NodeCommonHandlers) {
  const exp = data?.expression ?? "";
  return (
    <div className="relative">
      <Shell
        icon={GitBranch}
        title="Condition"
        color="border-purple-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <code className="text-xs bg-muted/40 px-2 py-1 rounded block overflow-auto max-h-24">
          {exp || "// expression"}
        </code>
        <div className="text-xs text-muted-foreground">
          True → left, False → right
        </div>
      </Shell>
      <Handle
        type="target"
        position={Position.Top}
        className={accentHandleClass}
      />
      <Handle
        type="source"
        id="true"
        position={Position.Bottom}
        style={{ left: 80 }}
        className={accentHandleClass}
      />
      <Handle
        type="source"
        id="false"
        position={Position.Bottom}
        style={{ left: 200 }}
        className={accentHandleClass}
      />
    </div>
  );
});

const APICallNode = memo(function APICallNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<ApiNodeData> & NodeCommonHandlers) {
  const method = data?.method ?? "GET";
  const url = data?.url ?? "(set URL)";
  const assignTo = data?.assignTo ?? "response";
  return (
    <div className="relative">
      <Shell
        icon={Code2}
        title="API Call"
        color="border-cyan-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs space-y-0.5">
          <div className="truncate" title={`${method} ${url}`}>
            <b>{method}</b> {url}
          </div>
          <div>
            → <Badge variant="secondary">{assignTo}</Badge>
          </div>
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const AssignVarNode = memo(function AssignVarNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<AssignNodeData> & NodeCommonHandlers) {
  const k = data?.key ?? "context.foo";
  const v = data?.value ?? "bar";
  return (
    <div className="relative">
      <Shell
        icon={Variable}
        title="Set Variable"
        color="border-rose-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs">
          <b>{k}</b> = <code className="break-all">{String(v)}</code>
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const MediaNode = memo(function MediaNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<MediaNodeData> & NodeCommonHandlers) {
  const type = safeUpper(data?.mediaType) || "MEDIA";
  const url = data?.url ?? "(set URL)";
  return (
    <div className="relative">
      <Shell
        icon={ImageIcon}
        title="Send Media"
        color="border-teal-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs">
          {type} •{" "}
          <span className="truncate inline-block align-bottom" title={url}>
            {url}
          </span>
        </div>
        {data?.caption ? (
          <div className="text-xs text-muted-foreground">{data.caption}</div>
        ) : null}
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const WhatsAppFlowNode = memo(function WhatsAppFlowNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<WhatsAppFlowNodeData> & NodeCommonHandlers) {
  const header = data?.header ?? "";
  const body = data?.body ?? "";
  const footer = data?.footer ?? "";
  const cta = data?.cta ?? "";
  return (
    <div className="relative">
      <Shell
        icon={Workflow}
        title="WhatsApp Flow"
        color="border-emerald-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="space-y-2 text-sm">
          {header ? (
            <div className="text-xs uppercase text-muted-foreground">
              Header: {header}
            </div>
          ) : null}
          <div
            className="whitespace-pre-wrap break-words bg-muted/30 p-2 rounded-lg max-h-40 overflow-auto"
            title={body}
          >
            {body || (
              <span className="text-muted-foreground">
                Describe la invitación al Flow…
              </span>
            )}
          </div>
          {footer ? (
            <div className="text-xs text-muted-foreground">Footer: {footer}</div>
          ) : null}
          {cta ? (
            <div className="text-xs text-muted-foreground">
              CTA: <Badge variant="outline">{cta}</Badge>
            </div>
          ) : null}
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const HandoffNode = memo(function HandoffNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<HandoffNodeData> & NodeCommonHandlers) {
  const queue = data?.queue ?? "default";
  const note = data?.note;
  return (
    <div className="relative">
      <Shell
        icon={Headphones}
        title="Human Handoff"
        color="border-fuchsia-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs">
          Queue: <b>{queue}</b>
        </div>
        {note ? (
          <div className="text-xs text-muted-foreground">{note}</div>
        ) : null}
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const GoToNode = memo(function GoToNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<GoToNodeData> & NodeCommonHandlers) {
  const target = data?.targetNodeId || "(select)";
  return (
    <div className="relative">
      <Shell
        icon={Link2}
        title="Go To"
        color="border-slate-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs">
          Jump to: <Badge variant="outline">{target}</Badge>
        </div>
      </Shell>
      <CommonHandles top bottom />
    </div>
  );
});

const EndNode = memo(function EndNode({
  data,
  selected,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyWebhook,
  onCopyId,
}: NodeProps<EndNodeData> & NodeCommonHandlers) {
  const reason = data?.reason || "end";
  return (
    <div className="relative">
      <Shell
        icon={Flag}
        title="End"
        color="border-gray-300"
        selected={!!selected}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyWebhook={onCopyWebhook}
        onCopyId={onCopyId}
      >
        <div className="text-xs text-muted-foreground">{reason}</div>
      </Shell>
      <Handle
        type="target"
        position={Position.Top}
        className={accentHandleClass}
      />
    </div>
  );
});

/* =========================
   Export nodeTypes
   ========================= */
export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  options: OptionsNode,
  delay: DelayNode,
  condition: ConditionNode,
  api: APICallNode,
  assign: AssignVarNode,
  media: MediaNode,
  whatsapp_flow: WhatsAppFlowNode,
  handoff: HandoffNode,
  goto: GoToNode,
  end: EndNode,
};
