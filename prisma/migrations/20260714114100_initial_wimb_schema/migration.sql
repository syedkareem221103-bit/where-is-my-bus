-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('SCHOOL', 'COLLEGE', 'UNIVERSITY', 'OTHER');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AttendPolicy" AS ENUM ('AUTO_PRESENT', 'AUTO_ABSENT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR', 'DRIVER', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'ATTENDANCE_OPEN', 'ATTENDANCE_CLOSED', 'ROUTE_OPTIMIZED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'DLQ');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'COMPLETED', 'DOWNLOADED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "attendancePolicy" "AttendPolicy" NOT NULL DEFAULT 'AUTO_ABSENT',
    "routeSettings" JSONB NOT NULL,
    "notifySettings" JSONB NOT NULL,
    "operatingSchedule" JSONB NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChild" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "grade" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLicense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "licenseClass" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStop" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cutoffTime" TEXT NOT NULL,
    "operatingDays" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAttendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "speed" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxNotification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryTimestamp" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyExport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPurgeLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purgedEntity" TEXT NOT NULL,
    "purgedId" TEXT NOT NULL,
    "purgedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataPurgeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_organizationId_key" ON "Organization"("organizationId");

-- CreateIndex
CREATE INDEX "Organization_organizationId_idx" ON "Organization"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_email_idx" ON "User"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentChild_parentId_studentId_key" ON "ParentChild"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_id_organizationId_key" ON "Student"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_studentNumber_key" ON "Student"("organizationId", "studentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DriverLicense_userId_key" ON "DriverLicense"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverLicense_licenseNumber_key" ON "DriverLicense"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DriverLicense_userId_organizationId_key" ON "DriverLicense"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNo_key" ON "Vehicle"("registrationNo");

-- CreateIndex
CREATE INDEX "Vehicle_organizationId_registrationNo_idx" ON "Vehicle"("organizationId", "registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_id_organizationId_key" ON "Vehicle"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Route_organizationId_idx" ON "Route"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_id_organizationId_key" ON "Route"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Stop_routeId_sequenceOrder_idx" ON "Stop"("routeId", "sequenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_id_organizationId_key" ON "Stop"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentStop_studentId_stopId_key" ON "StudentStop"("studentId", "stopId");

-- CreateIndex
CREATE INDEX "Schedule_routeId_idx" ON "Schedule"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_id_organizationId_key" ON "Schedule"("id", "organizationId");

-- CreateIndex
CREATE INDEX "DailyAttendance_date_status_idx" ON "DailyAttendance"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_scheduleId_studentId_date_key" ON "DailyAttendance"("scheduleId", "studentId", "date");

-- CreateIndex
CREATE INDEX "Trip_status_driverId_idx" ON "Trip"("status", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_id_organizationId_key" ON "Trip"("id", "organizationId");

-- CreateIndex
CREATE INDEX "TripPing_tripId_timestamp_idx" ON "TripPing"("tripId", "timestamp");

-- CreateIndex
CREATE INDEX "Incident_organizationId_status_idx" ON "Incident"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_organizationId_idempotencyKey_key" ON "Incident"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_organizationId_key" ON "NotificationPreference"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "OutboxNotification_status_retryCount_idx" ON "OutboxNotification"("status", "retryCount");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSession_tokenHash_key" ON "DeviceSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyExport_tokenHash_key" ON "PrivacyExport"("tokenHash");

-- CreateIndex
CREATE INDEX "PrivacyExport_expiresAt_status_idx" ON "PrivacyExport"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "DataPurgeLog_organizationId_timestamp_idx" ON "DataPurgeLog"("organizationId", "timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_parentId_organizationId_fkey" FOREIGN KEY ("parentId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChild" ADD CONSTRAINT "ParentChild_studentId_organizationId_fkey" FOREIGN KEY ("studentId", "organizationId") REFERENCES "Student"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_routeId_organizationId_fkey" FOREIGN KEY ("routeId", "organizationId") REFERENCES "Route"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStop" ADD CONSTRAINT "StudentStop_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStop" ADD CONSTRAINT "StudentStop_studentId_organizationId_fkey" FOREIGN KEY ("studentId", "organizationId") REFERENCES "Student"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStop" ADD CONSTRAINT "StudentStop_stopId_organizationId_fkey" FOREIGN KEY ("stopId", "organizationId") REFERENCES "Stop"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_routeId_organizationId_fkey" FOREIGN KEY ("routeId", "organizationId") REFERENCES "Route"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "DailyAttendance_scheduleId_organizationId_fkey" FOREIGN KEY ("scheduleId", "organizationId") REFERENCES "Schedule"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "DailyAttendance_studentId_organizationId_fkey" FOREIGN KEY ("studentId", "organizationId") REFERENCES "Student"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_scheduleId_organizationId_fkey" FOREIGN KEY ("scheduleId", "organizationId") REFERENCES "Schedule"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_organizationId_fkey" FOREIGN KEY ("vehicleId", "organizationId") REFERENCES "Vehicle"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_organizationId_fkey" FOREIGN KEY ("driverId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPing" ADD CONSTRAINT "TripPing_tripId_organizationId_fkey" FOREIGN KEY ("tripId", "organizationId") REFERENCES "Trip"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tripId_organizationId_fkey" FOREIGN KEY ("tripId", "organizationId") REFERENCES "Trip"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_resolvedById_organizationId_fkey" FOREIGN KEY ("resolvedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxNotification" ADD CONSTRAINT "OutboxNotification_tripId_organizationId_fkey" FOREIGN KEY ("tripId", "organizationId") REFERENCES "Trip"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxNotification" ADD CONSTRAINT "OutboxNotification_recipientId_organizationId_fkey" FOREIGN KEY ("recipientId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyExport" ADD CONSTRAINT "PrivacyExport_parentId_organizationId_fkey" FOREIGN KEY ("parentId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyExport" ADD CONSTRAINT "PrivacyExport_studentId_organizationId_fkey" FOREIGN KEY ("studentId", "organizationId") REFERENCES "Student"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPurgeLog" ADD CONSTRAINT "DataPurgeLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =========================================================================
-- CUSTOM DATABASE SPECIFICATIONS (ADDED IN STEP 2C)
-- =========================================================================

-- 1. DROP REDUNDANT PRISMA-GENERATED INDEXES Replaced by DESC or Partial Custom Indexes
DROP INDEX IF EXISTS "TripPing_tripId_timestamp_idx";
DROP INDEX IF EXISTS "OutboxNotification_status_retryCount_idx";
DROP INDEX IF EXISTS "PrivacyExport_expiresAt_status_idx";
DROP INDEX IF EXISTS "DataPurgeLog_organizationId_timestamp_idx";

-- 2. CREATE 9 APPROVED POSTGRESQL-ONLY PARTIAL OR CONDITIONAL INDEXES
CREATE INDEX "idx_attendance_unresolved" ON "DailyAttendance"("organizationId", "date") WHERE "status" = 'PENDING';
CREATE INDEX "idx_outbox_pending" ON "OutboxNotification"("status", "retryCount") WHERE "status" = 'PENDING';
CREATE INDEX "idx_outbox_failed" ON "OutboxNotification"("status") WHERE "status" = 'FAILED';
CREATE INDEX "idx_outbox_dlq" ON "OutboxNotification"("status") WHERE "status" = 'DLQ';
CREATE INDEX "idx_export_pending" ON "PrivacyExport"("expiresAt") WHERE "status" = 'PENDING';
CREATE INDEX "idx_ping_latest" ON "TripPing"("tripId", "timestamp" DESC);
CREATE INDEX "idx_incident_history" ON "Incident"("organizationId", "resolvedAt" DESC);
CREATE INDEX "idx_audit_tenant_time" ON "AuditLog"("organizationId", "timestamp" DESC);
CREATE INDEX "idx_purge_history" ON "DataPurgeLog"("organizationId", "timestamp" DESC);

-- 3. CREATE 10 APPROVED POSTGRESQL CHECK CONSTRAINTS
ALTER TABLE "Vehicle" ADD CONSTRAINT "chk_vehicle_capacity" CHECK ("capacity" > 0);
ALTER TABLE "Stop" ADD CONSTRAINT "chk_stop_lat" CHECK ("latitude" BETWEEN -90.0 AND 90.0);
ALTER TABLE "Stop" ADD CONSTRAINT "chk_stop_lon" CHECK ("longitude" BETWEEN -180.0 AND 180.0);
ALTER TABLE "Schedule" ADD CONSTRAINT "chk_sched_cutoff" CHECK ("cutoffTime" ~ '^[0-2][0-9]:[0-5][0-9]$');
ALTER TABLE "DailyAttendance" ADD CONSTRAINT "chk_attendance_date" CHECK (LENGTH("date") = 10);
ALTER TABLE "TripPing" ADD CONSTRAINT "chk_ping_speed" CHECK ("speed" >= 0.0);
ALTER TABLE "TripPing" ADD CONSTRAINT "chk_ping_seq" CHECK ("sequence" > 0);
ALTER TABLE "Incident" ADD CONSTRAINT "chk_incident_lat" CHECK ("latitude" BETWEEN -90.0 AND 90.0);
ALTER TABLE "Incident" ADD CONSTRAINT "chk_incident_lon" CHECK ("longitude" BETWEEN -180.0 AND 180.0);
ALTER TABLE "OutboxNotification" ADD CONSTRAINT "chk_outbox_retry" CHECK ("retryCount" >= 0);
