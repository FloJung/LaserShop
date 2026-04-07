import "server-only";

import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  SECURITY_ALERT_RULES,
  type SecurityAlertStatus,
  type SecurityAlertType,
  type SecurityEventInput,
  type SecurityEventType
} from "@/shared/security-monitoring";

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

type AdminSecurityAlert = SecurityAlertDocument & {
  id: string;
};

type AdminSecurityEvent = SecurityEventDocument & {
  id: string;
};

type AdminSecurityAttacker = {
  ipHash: string;
  eventCount: number;
  topEventTypes: Array<{
    type: SecurityEventType;
    count: number;
  }>;
  lastSeenAt: string;
};

export type AdminSecurityDashboardData = {
  alerts: AdminSecurityAlert[];
  topAttackers: AdminSecurityAttacker[];
  recentEvents: AdminSecurityEvent[];
};

const SECURITY_EVENT_COLLECTION = "securityEvents";
const SECURITY_ALERT_COLLECTION = "securityAlerts";

export function hashIp(ip: string) {
  return createHash("sha256").update(ip || "unknown").digest("hex");
}

function getAlertDocumentId(type: SecurityAlertType, ipHash: string) {
  return `${type}_${ipHash}`;
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
  const db = getAdminDb();
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
  const db = getAdminDb();
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

export function getRequestSecurityContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",").map((entry) => entry.trim()).find(Boolean)
    || request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("fly-client-ip")
    || "unknown";

  return {
    ip,
    path: new URL(request.url).pathname,
    userAgent: request.headers.get("user-agent") ?? undefined
  };
}

export async function logRequestSecurityEvents(
  request: Request,
  events: Omit<SecurityEventInput, "ip" | "path" | "userAgent">[]
) {
  const context = getRequestSecurityContext(request);
  await Promise.all(
    events.map((event) =>
      logSecurityEvent({
        ...context,
        ...event
      })
    )
  );
}

function formatTimestamp(value: Timestamp) {
  return value.toDate().toISOString();
}

export async function getAdminSecurityDashboardData(): Promise<AdminSecurityDashboardData> {
  const db = getAdminDb();
  const [alertsSnap, eventsSnap] = await Promise.all([
    db.collection(SECURITY_ALERT_COLLECTION).where("status", "==", "open").get(),
    db.collection(SECURITY_EVENT_COLLECTION).orderBy("createdAt", "desc").limit(500).get()
  ]);

  const allRecentEvents = eventsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as SecurityEventDocument)
  }));
  const recentEvents = allRecentEvents.slice(0, 100);

  const attackerMap = new Map<
    string,
    {
      eventCount: number;
      eventTypes: Map<SecurityEventType, number>;
      lastSeenAt: string;
    }
  >();

  for (const event of allRecentEvents) {
    const current = attackerMap.get(event.ipHash) ?? {
      eventCount: 0,
      eventTypes: new Map<SecurityEventType, number>(),
      lastSeenAt: formatTimestamp(event.createdAt)
    };

    current.eventCount += 1;
    current.eventTypes.set(event.type, (current.eventTypes.get(event.type) ?? 0) + 1);
    current.lastSeenAt = formatTimestamp(event.createdAt);
    attackerMap.set(event.ipHash, current);
  }

  const topAttackers = [...attackerMap.entries()]
    .map(([ipHash, value]) => ({
      ipHash,
      eventCount: value.eventCount,
      topEventTypes: [...value.eventTypes.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([type, count]) => ({ type, count })),
      lastSeenAt: value.lastSeenAt
    }))
    .sort((left, right) => right.eventCount - left.eventCount)
    .slice(0, 10);

  const alerts = alertsSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as SecurityAlertDocument)
    }))
    .sort((left, right) => right.lastSeenAt.toMillis() - left.lastSeenAt.toMillis())
    .slice(0, 50);

  return {
    alerts,
    topAttackers,
    recentEvents
  };
}
