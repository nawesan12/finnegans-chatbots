import type { Edge, Node } from "reactflow";
import { z } from "zod";
import {
  APICallDataSchema,
  AssignVarDataSchema,
  BaseDataSchema,
  ConditionDataSchema,
  DelayDataSchema,
  EndDataSchema,
  FlowDefinition,
  FlowNodeType,
  GoToDataSchema,
  HandoffDataSchema,
  WhatsAppFlowDataSchema,
  MediaDataSchema,
  MessageDataSchema,
  OptionsDataSchema,
  TriggerDataSchema,
  flowNodeTypes,
  waTextLimit,
} from "@/lib/flow-schema";

export {
  waTextLimit,
  BaseDataSchema,
  TriggerDataSchema,
  MessageDataSchema,
  OptionsDataSchema,
  DelayDataSchema,
  ConditionDataSchema,
  APICallDataSchema,
  AssignVarDataSchema,
  MediaDataSchema,
  HandoffDataSchema,
  WhatsAppFlowDataSchema,
  EndDataSchema,
  GoToDataSchema,
  flowNodeTypes,
};

export type { FlowNodeType };

export type TriggerNodeData = z.infer<typeof TriggerDataSchema>;
export type MessageNodeData = z.infer<typeof MessageDataSchema>;
export type OptionsNodeData = z.infer<typeof OptionsDataSchema>;
export type DelayNodeData = z.infer<typeof DelayDataSchema>;
export type ConditionNodeData = z.infer<typeof ConditionDataSchema>;
export type ApiNodeData = z.infer<typeof APICallDataSchema>;
export type AssignNodeData = z.infer<typeof AssignVarDataSchema>;
export type MediaNodeData = z.infer<typeof MediaDataSchema>;
export type WhatsAppFlowNodeData = z.infer<typeof WhatsAppFlowDataSchema>;
export type HandoffNodeData = z.infer<typeof HandoffDataSchema>;
export type EndNodeData = z.infer<typeof EndDataSchema>;
export type GoToNodeData = z.infer<typeof GoToDataSchema>;

export type FlowNodeDataMap = {
  trigger: TriggerNodeData;
  message: MessageNodeData;
  options: OptionsNodeData;
  delay: DelayNodeData;
  condition: ConditionNodeData;
  api: ApiNodeData;
  assign: AssignNodeData;
  media: MediaNodeData;
  whatsapp_flow: WhatsAppFlowNodeData;
  handoff: HandoffNodeData;
  goto: GoToNodeData;
  end: EndNodeData;
};

export type FlowNode<T extends FlowNodeType = FlowNodeType> = Node<
  Partial<FlowNodeDataMap[T]>,
  T
> & {
  type: T;
  data: Partial<FlowNodeDataMap[T]>;
};

export type FlowEdge = Edge;

export type FlowData = FlowDefinition;

export type FlowBuilderHandle = { getFlowData: () => FlowData };

export const isFlowNodeType = (value: string): value is FlowNodeType =>
  (flowNodeTypes as readonly string[]).includes(value);

export const isNodeOfType = <T extends FlowNodeType>(
  node: FlowNode | null | undefined,
  type: T,
): node is FlowNode<T> => node?.type === type;
