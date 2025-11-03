export type FlowMetaFields = {
  metaFlowId?: string | null;
  metaFlowToken?: string | null;
  metaFlowVersion?: string | null;
  metaFlowRevisionId?: string | null;
  metaFlowStatus?: string | null;
  metaFlowMetadata?: unknown;
};

const META_FIELD_KEYS: readonly (keyof FlowMetaFields)[] = [
  "metaFlowId",
  "metaFlowToken",
  "metaFlowVersion",
  "metaFlowRevisionId",
  "metaFlowStatus",
  "metaFlowMetadata",
] as const;

export const stripFlowMetaFields = <T extends FlowMetaFields>(
  flow: T,
): Omit<T, keyof FlowMetaFields> => {
  const result = { ...flow };

  for (const key of META_FIELD_KEYS) {
    if (key in result) {
      delete (result as FlowMetaFields)[key];
    }
  }

  return result as Omit<T, keyof FlowMetaFields>;
};
