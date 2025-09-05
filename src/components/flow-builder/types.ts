import { z } from "zod";

export const waTextLimit = 4096; // WhatsApp text limit (practical safe size)

export const BaseDataSchema = z.object({
  name: z.string().min(1).max(60).default(""),
});

export const TriggerDataSchema = BaseDataSchema.extend({
  keyword: z.string().min(1).max(64),
});

export const MessageDataSchema = BaseDataSchema.extend({
  text: z.string().min(1).max(waTextLimit),
  useTemplate: z.boolean().default(false),
});

export const OptionsDataSchema = BaseDataSchema.extend({
  options: z.array(z.string().min(1).max(30)).min(2).max(10),
});

export const DelayDataSchema = BaseDataSchema.extend({
  seconds: z.number().min(1).max(3600).default(1),
});

export const ConditionDataSchema = BaseDataSchema.extend({
  expression: z.string().min(1).max(500), // JS-like expression on context vars
});

export const APICallDataSchema = BaseDataSchema.extend({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().default(""),
  assignTo: z.string().default("apiResult"),
});

export const AssignVarDataSchema = BaseDataSchema.extend({
  key: z.string().min(1).max(50),
  value: z.string().max(500),
});

export const MediaDataSchema = BaseDataSchema.extend({
  mediaType: z.enum(["image", "document", "video", "audio"]).default("image"),
  url: z.string().url(),
  caption: z.string().max(1024).optional(),
});

export const HandoffDataSchema = BaseDataSchema.extend({
  queue: z.string().min(1),
  note: z.string().max(500).optional(),
});

export const EndDataSchema = BaseDataSchema.extend({
  reason: z.string().default("end"),
});

export const GoToDataSchema = BaseDataSchema.extend({
  targetNodeId: z.string().min(1),
});
