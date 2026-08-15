/*
  Warnings:

  - You are about to drop the `NotificationPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutboxNotification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `routeId` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceDate` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyCategory" AS ENUM ('SOS', 'MEDICAL', 'FIRE', 'ACCIDENT', 'BREAKDOWN', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GeofenceType" AS ENUM ('SCHOOL', 'STOP', 'CORRIDOR', 'RESTRICTED', 'DEPOT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('ROUTE_DEVIATION', 'SPEEDING', 'UNAUTHORIZED_AREA', 'MISSED_STOP', 'IDLE', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'WARNING', 'DEGRADED', 'CRITICAL', 'OFFLINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TripStatus" ADD VALUE 'STARTED';
ALTER TYPE "TripStatus" ADD VALUE 'EN_ROUTE';
ALTER TYPE "TripStatus" ADD VALUE 'AT_STOP';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_userId_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OutboxNotification" DROP CONSTRAINT "OutboxNotification_recipientId_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OutboxNotification" DROP CONSTRAINT "OutboxNotification_tripId_organizationId_fkey";

-- DropIndex
DROP INDEX "idx_audit_tenant_time";

-- DropIndex
DROP INDEX "idx_purge_history";

-- DropIndex
DROP INDEX "idx_incident_history";

-- DropIndex
DROP INDEX "idx_ping_latest";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "routeId" TEXT NOT NULL,
ADD COLUMN     "serviceDate" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TripPing" ADD COLUMN     "heading" DOUBLE PRECISION;

-- DropTable
DROP TABLE "NotificationPreference";

-- DropTable
DROP TABLE "OutboxNotification";

-- DropEnum
DROP TYPE "NotificationStatus";

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "emergencyOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "auditFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "correlationId" TEXT,
    "tripId" TEXT,
    "eventKey" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergency" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "tripPingId" TEXT,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" "EmergencyCategory" NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "severity" "EmergencySeverity" NOT NULL DEFAULT 'HIGH',
    "correlationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyHistory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousState" "EmergencyStatus",
    "newState" "EmergencyStatus",
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "targetEmails" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "fileSize" INTEGER,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GeofenceType" NOT NULL,
    "geometry" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tripId" TEXT,
    "geofenceId" TEXT,
    "category" "AlertCategory" NOT NULL,
    "priority" "AlertPriority" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SmartAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealthSnapshot" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "memoryUsage" DOUBLE PRECISION NOT NULL,
    "activeSockets" INTEGER NOT NULL,
    "activeTrips" INTEGER NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "metricsPayload" JSONB NOT NULL,

    CONSTRAINT "SystemHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_organizationId_key" ON "UserNotificationPreference"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_organizationId_eventKey_isActive_idx" ON "NotificationTemplate"("organizationId", "eventKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_organizationId_eventKey_channel_langua_key" ON "NotificationTemplate"("organizationId", "eventKey", "channel", "language", "version");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_idempotencyKey_key" ON "NotificationRecipient"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationRecipient_organizationId_status_idx" ON "NotificationRecipient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_status_idx" ON "NotificationRecipient"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Emergency_correlationId_key" ON "Emergency"("correlationId");

-- CreateIndex
CREATE INDEX "Emergency_organizationId_status_idx" ON "Emergency"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Emergency_tripId_status_key" ON "Emergency"("tripId", "status");

-- CreateIndex
CREATE INDEX "EmergencyHistory_emergencyId_timestamp_idx" ON "EmergencyHistory"("emergencyId", "timestamp");

-- CreateIndex
CREATE INDEX "ReportSubscription_nextRunAt_isActive_idx" ON "ReportSubscription"("nextRunAt", "isActive");

-- CreateIndex
CREATE INDEX "ReportSubscription_organizationId_idx" ON "ReportSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportExecution_tokenHash_key" ON "ReportExecution"("tokenHash");

-- CreateIndex
CREATE INDEX "ReportExecution_organizationId_createdAt_idx" ON "ReportExecution"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Geofence_organizationId_type_idx" ON "Geofence"("organizationId", "type");

-- CreateIndex
CREATE INDEX "SmartAlert_organizationId_status_idx" ON "SmartAlert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SmartAlert_tripId_idx" ON "SmartAlert"("tripId");

-- CreateIndex
CREATE INDEX "SystemHealthSnapshot_timestamp_idx" ON "SystemHealthSnapshot"("timestamp");

-- CreateIndex
CREATE INDEX "DataPurgeLog_organizationId_timestamp_idx" ON "DataPurgeLog"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "PrivacyExport_expiresAt_status_idx" ON "PrivacyExport"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "TripPing_tripId_timestamp_idx" ON "TripPing"("tripId", "timestamp");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_organizationId_fkey" FOREIGN KEY ("routeId", "organizationId") REFERENCES "Route"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tripId_organizationId_fkey" FOREIGN KEY ("tripId", "organizationId") REFERENCES "Trip"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_tripId_organizationId_fkey" FOREIGN KEY ("tripId", "organizationId") REFERENCES "Trip"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_reporterId_organizationId_fkey" FOREIGN KEY ("reporterId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_tripPingId_fkey" FOREIGN KEY ("tripPingId") REFERENCES "TripPing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyHistory" ADD CONSTRAINT "EmergencyHistory_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyHistory" ADD CONSTRAINT "EmergencyHistory_actorId_organizationId_fkey" FOREIGN KEY ("actorId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubscription" ADD CONSTRAINT "ReportSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSubscription" ADD CONSTRAINT "ReportSubscription_creatorId_organizationId_fkey" FOREIGN KEY ("creatorId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ReportSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
