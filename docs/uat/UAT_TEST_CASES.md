# UAT Test Cases & Workflows

## 1. Authentication & RBAC (UAT-AUTH)
- **UAT-AUTH-001:** Verify Super Admin can login and access the Global Dashboard.
- **UAT-AUTH-002:** Verify Organization Admin can login and is restricted to their tenant data.
- **UAT-AUTH-003:** Verify Parent can login and only view assigned students.
- **UAT-AUTH-004:** Verify Driver can login and view assigned routes.

## 2. Organization Admin Workflows (UAT-ORG)
- **UAT-ORG-001:** Create a new Route and assign a Driver.
- **UAT-ORG-002:** Bulk upload a CSV of students and verify records are created.
- **UAT-ORG-003:** Generate and download a Driver Performance Report.

## 3. Operator/Dispatcher Workflows (UAT-OPR)
- **UAT-OPR-001:** View Live KPIs (Active Trips, Incident Counts).
- **UAT-OPR-002:** Receive real-time SOS alert from a Driver and acknowledge it.
- **UAT-OPR-003:** Dispatch a manual "Trip Delayed" notification to Parents.

## 4. Driver Workflows (UAT-DRV)
- **UAT-DRV-001:** Start a scheduled trip on a mobile device.
- **UAT-DRV-002:** Mark a student as 'Boarded'.
- **UAT-DRV-003:** Trigger the Emergency SOS button.
- **UAT-DRV-004:** Complete the trip and verify status updates to 'Completed'.
- **UAT-DRV-005:** Test behavior when device enters Airplane Mode mid-trip (offline buffering).

## 5. Parent Workflows (UAT-PRT)
- **UAT-PRT-001:** View the real-time map tracking the active bus.
- **UAT-PRT-002:** Verify ETA updates dynamically on the dashboard.
- **UAT-PRT-003:** Receive push/email notification when bus enters the 500m geofence.
- **UAT-PRT-004:** Receive notification when student is marked as 'Boarded'.
