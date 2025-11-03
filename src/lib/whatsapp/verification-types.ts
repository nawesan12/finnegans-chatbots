export type MetaVerificationStepStatus =
  | "success"
  | "error"
  | "warning"
  | "skipped";

export type MetaVerificationStep = {
  key: string;
  label: string;
  status: MetaVerificationStepStatus;
  message: string;
};

export type MetaVerificationResult = {
  success: boolean;
  hasWarnings: boolean;
  checkedAt: string;
  steps: MetaVerificationStep[];
};
