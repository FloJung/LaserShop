import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { getDb } from "./firebase";
import {
  SECURITY_ALERT_RULES,
  getSecurityEventSampleRate,
  getSecurityEventWeight,
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
const BLOCKED_IP_COLLECTION = "blockedIps";
const SECURITY_EVENT_SAMPLING_COLLECTION = "securityEventSampling";
const BLOCKED_IP_DURATION_MS = 15 * 60_000;

function getDailySalt(date = new Date()) {
  return `${process.env.SECURITY_IP_HASH_SECRET ?? "laser-shop-security"}:${date.toISOString().slice(0, 10)}`;
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${ip || "unknown"}:${getDailySalt()}`).digest("hex");
}

function getAlertDocumentId(type: SecurityAlertType, ipHash: string) {
  return `${type}_${ipHash}`;
}

async function shouldLogEvent(type: SecurityEventType) {
  const sampleRate = getSecurityEventSampleRate(type);
  if (sampleRate <= 1) {
    return true;
  }

  const counterRef = getDb().collection(SECURITY_EVENT_SAMPLING_COLLECTION).doc(type);
  return getDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const currentCount = snapshot.exists ? Number(snapshot.data()?.count ?? 0) : 0;
    const nextCount = currentCount + 1;

    transaction.set(
      counterRef,
      {
        count: nextCount,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    return nextCount % sampleRate === 0;
  });
}

async function blockIp(input: {
  ipHash: string;
  reason: string;
  baseTimestamp?: Timestamp;
}) {
  const createdAt = input.baseTimestamp ?? Timestamp.now();
  const expiresAt = Timestamp.fromMillis(createdAt.toMillis() + BLOCKED_IP_DURATION_MS);
  await getDb().collection(BLOCKED_IP_COLLECTION).doc(input.ipHash).set(
    {
      ipHash: input.ipHash,
      reason: input.reason,
      createdAt,
      expiresAt
    },
    { merge: true }
  );
}

export async function isIpBlocked(ipHash: string) {
  const snapshot = await getDb().collection(BLOCKED_IP_COLLECTION).doc(ipHash).get();
  if (!snapshot.exists) {
    return false;
  }

  const expiresAt = snapshot.data()?.expiresAt;
  return expiresAt instanceof Timestamp && expiresAt.toMillis() > Date.now();
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
      const recentEventsSnap = await db
        .collection(SECURITY_EVENT_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(500)
        .get();

      const thresholdMillis = event.createdAt.toMillis() - rule.windowMs;
      const matchingEvents = recentEventsSnap.docs
        .map((doc) => doc.data() as SecurityEventDocument)
        .filter(
          (candidate) =>
            candidate.ipHash === event.ipHash &&
            candidate.createdAt.toMillis() >= thresholdMillis &&
            rule.eventTypes.includes(candidate.type)
        );

      const weightedEventCount = matchingEvents.reduce((sum, candidate) => sum + getSecurityEventWeight(candidate.type), 0);

      if (weightedEventCount <= rule.threshold) {
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
        eventCount: weightedEventCount,
        firstSeenAt,
        lastSeenAt,
        status: "open"
      };

      await alertRef.set(nextAlert, { merge: true });
      await blockIp({
        ipHash: event.ipHash,
        reason: `Auto-blocked due to ${alertType}.`,
        baseTimestamp: event.createdAt
      });

      if (!existingAlert || existingAlert.status !== "open") {
        await sendSecurityAlertNotification(nextAlert);
      }
    })
  );
}

export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  if (!(await shouldLogEvent(event.type))) {
    return;
  }

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

export async function assertCallableIpNotBlocked(request: CallableRequest<unknown>, fallbackPath: string) {
  const context = getCallableRequestContext(request, fallbackPath);
  if (await isIpBlocked(hashIp(context.ip))) {
    throw new HttpsError("permission-denied", "Access denied.");
  }
}
