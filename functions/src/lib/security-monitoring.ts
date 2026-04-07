import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getDb } from "./firebase";
import {
  SECURITY_ALERT_RULES,
  type SecurityAlertStatus,
  type SecurityAlertType,
  type SecurityEventInput,
  type SecurityEventType
} from "../../../shared/security-monitoring";

type SecurityEventDocument = {
  type: SecurityEventType;
  ipHash: string;
  userId?: string | null;
  path?: string;
  userAgent?: string;
  reason?: string;
  severity: "low" | "medium" | "high";
  createdAt: Timestamp;
};

type SecurityAlertDocument = {
  type: SecurityAlertType;
  ipHash: string;
  eventCount: number;
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
  status: SecurityAlertStatus;
};

const SECURITY_EVENT_COLLECTION = "securityEvents";
const SECURITY_ALERT_COLLECTION = "securityAlerts";

export function hashIp(ip: string) {
  return createHash("sha256").update(ip || "unknown").digest("hex");
}

function getAlertDocumentId(type: SecurityAlertType, ipHash: string) {
  return `${type}_${ipHash}`;
}

function getCallableRequestContext(request: CallableRequest<unknown>, fallbackPath: string) {
  const rawRequest = request.rawRequest as
    | {
        ip?: string;
        headers?: Record<string, string | string[] | undefined>;
        path?: string;
        originalUrl?: string;
      }
    | undefined;
  const headers = rawRequest?.headers ?? {};
  const forwardedFor = headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const ip = forwardedValue?.split(",").map((entry) => entry.trim()).find(Boolean)
    || (Array.isArray(headers["cf-connecting-ip"]) ? headers["cf-connecting-ip"][0] : headers["cf-connecting-ip"])
    || (Array.isArray(headers["x-real-ip"]) ? headers["x-real-ip"][0] : headers["x-real-ip"])
    || rawRequest?.ip
    || "unknown";
  const userAgent = Array.isArray(headers["user-agent"]) ? headers["user-agent"][0] : headers["user-agent"];

  return {
    ip,
    userAgent,
    path: rawRequest?.originalUrl ?? rawRequest?.path ?? fallbackPath
  };
}

async function sendSecurityAlertNotification(alert: SecurityAlertDocument) {
  const webhookUrl = process.env.SECURITY_ALERT_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: `Security Alert: ${alert.type} from IP hash ${alert.ipHash}`
    })
  });
}

export async function detectSecurityIncidents(event: SecurityEventDocument): Promise<void> {
  const db = getDb();
  const relevantRules = Object.entries(SECURITY_ALERT_RULES).filter(([, rule]) => rule.eventTypes.includes(event.type)) as Array<
    [SecurityAlertType, (typeof SECURITY_ALERT_RULES)[SecurityAlertType]]
  >;

  await Promise.all(
    relevantRules.map(async ([alertType, rule]) => {
      const thresholdDate = Timestamp.fromMillis(event.createdAt.toMillis() - rule.windowMs);
      const recentEventsSnap = await db
        .collection(SECURITY_EVENT_COLLECTION)
        .where("ipHash", "==", event.ipHash)
        .where("createdAt", ">=", thresholdDate)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      const matchingEvents = recentEventsSnap.docs
        .map((doc) => doc.data() as SecurityEventDocument)
        .filter((candidate) => rule.eventTypes.includes(candidate.type));

      if (matchingEvents.length <= rule.threshold) {
        return;
      }

      const lastSeenAt = matchingEvents[0]?.createdAt ?? event.createdAt;
      const firstSeenAt = matchingEvents[matchingEvents.length - 1]?.createdAt ?? event.createdAt;
      const alertRef = db.collection(SECURITY_ALERT_COLLECTION).doc(getAlertDocumentId(alertType, event.ipHash));
      const existingAlertSnap = await alertRef.get();
      const existingAlert = existingAlertSnap.exists ? (existingAlertSnap.data() as SecurityAlertDocument) : null;
      const nextAlert: SecurityAlertDocument = {
        type: alertType,
        ipHash: event.ipHash,
        eventCount: matchingEvents.length,
        firstSeenAt,
        lastSeenAt,
        status: "open"
      };

      await alertRef.set(nextAlert, { merge: true });

      if (!existingAlert || existingAlert.status !== "open") {
        await sendSecurityAlertNotification(nextAlert);
      }
    })
  );
}

export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  const db = getDb();
  const eventDoc: SecurityEventDocument = {
    type: event.type,
    ipHash: hashIp(event.ip),
    userId: event.userId ?? null,
    path: event.path,
    userAgent: event.userAgent,
    reason: event.reason,
    severity: event.severity,
    createdAt: Timestamp.now()
  };

  await db.collection(SECURITY_EVENT_COLLECTION).add(eventDoc);
  await detectSecurityIncidents(eventDoc);
}

export async function logCallableSecurityEvents(
  request: CallableRequest<unknown>,
  events: Omit<SecurityEventInput, "ip" | "path" | "userAgent">[],
  fallbackPath: string
) {
  const context = getCallableRequestContext(request, fallbackPath);
  await Promise.all(
    events.map((event) =>
      logSecurityEvent({
        ...context,
        ...event
      })
    )
  );
}
