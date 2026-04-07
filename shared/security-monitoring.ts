export const SECURITY_EVENT_TYPES = [
  "rate_limit_hit",
  "checkout_security_error",
  "upload_rejected",
  "svg_upload_attempt",
  "invalid_product_attempt",
  "invalid_variant_attempt",
  "duplicate_upload_use"
] as const;

export const SECURITY_ALERT_TYPES = ["bruteforce_checkout", "upload_abuse", "rate_limit_attack"] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];
export type SecurityAlertType = (typeof SECURITY_ALERT_TYPES)[number];
export type SecuritySeverity = "low" | "medium" | "high";
export type SecurityAlertStatus = "open" | "resolved";

export type SecurityEventInput = {
  type: SecurityEventType;
  ip: string;
  userId?: string | null;
  path?: string;
  userAgent?: string;
  reason?: string;
  severity: SecuritySeverity;
};

export type DerivedSecurityEventInput = Omit<SecurityEventInput, "ip" | "userId" | "path" | "userAgent">;

export const SECURITY_ALERT_RULES: Record<
  SecurityAlertType,
  {
    threshold: number;
    windowMs: number;
    eventTypes: SecurityEventType[];
  }
> = {
  bruteforce_checkout: {
    threshold: 10,
    windowMs: 5 * 60_000,
    eventTypes: ["checkout_security_error"]
  },
  upload_abuse: {
    threshold: 15,
    windowMs: 10 * 60_000,
    eventTypes: ["upload_rejected", "svg_upload_attempt"]
  },
  rate_limit_attack: {
    threshold: 20,
    windowMs: 2 * 60_000,
    eventTypes: ["rate_limit_hit"]
  }
};

export function getDefaultSecuritySeverity(type: SecurityEventType): SecuritySeverity {
  switch (type) {
    case "svg_upload_attempt":
    case "duplicate_upload_use":
      return "high";
    case "rate_limit_hit":
    case "checkout_security_error":
    case "upload_rejected":
    case "invalid_product_attempt":
    case "invalid_variant_attempt":
    default:
      return "medium";
  }
}

function includesReason(reason: string, fragments: string[]) {
  return fragments.some((fragment) => reason.includes(fragment));
}

export function getDerivedSecurityEventsForReason(reason?: string) {
  if (!reason) {
    return [] as DerivedSecurityEventInput[];
  }

  const normalizedReason = reason.toLowerCase();
  const events: DerivedSecurityEventInput[] = [];

  if (normalizedReason.startsWith("unknown product:")) {
    events.push({
      type: "invalid_product_attempt",
      severity: getDefaultSecuritySeverity("invalid_product_attempt"),
      reason
    });
  }

  if (normalizedReason.startsWith("unknown variant for product")) {
    events.push({
      type: "invalid_variant_attempt",
      severity: getDefaultSecuritySeverity("invalid_variant_attempt"),
      reason
    });
  }

  if (
    includesReason(normalizedReason, [
      "inconsistent content type metadata",
      "failed server-side mime validation",
      "has an invalid file type"
    ])
  ) {
    events.push({
      type: "upload_rejected",
      severity: getDefaultSecuritySeverity("upload_rejected"),
      reason
    });
  }

  if (normalizedReason === "svg uploads are not allowed for security reasons.") {
    events.push({
      type: "svg_upload_attempt",
      severity: getDefaultSecuritySeverity("svg_upload_attempt"),
      reason
    });
  }

  if (normalizedReason === "upload has already been used.") {
    events.push({
      type: "duplicate_upload_use",
      severity: getDefaultSecuritySeverity("duplicate_upload_use"),
      reason
    });
  }

  return events.filter(
    (event, index, allEvents) => allEvents.findIndex((candidate) => candidate.type === event.type) === index
  );
}

export function getCheckoutSecurityEvents(reason?: string) {
  return [
    {
      type: "checkout_security_error" as const,
      severity: getDefaultSecuritySeverity("checkout_security_error"),
      reason
    },
    ...getDerivedSecurityEventsForReason(reason)
  ];
}
