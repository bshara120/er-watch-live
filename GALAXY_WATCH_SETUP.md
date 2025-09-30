# Galaxy Watch 6 Backend Setup Guide

This document provides instructions for integrating Samsung Galaxy Watch 6 devices with the ER Watch remote patient monitoring system.

## Overview

The backend supports:
- ✅ REST API endpoint for receiving sensor data from Galaxy Watch 6
- ✅ Per-device API key authentication
- ✅ Time-series database for storing vitals
- ✅ Real-time WebSocket streaming to dashboard
- ✅ Automatic alert generation for abnormal vitals
- ✅ Color-coded dashboard visualization
- ✅ TLS encryption for all data transmission

## Architecture

```
Galaxy Watch 6 → REST API → Database → Real-time Streaming → Dashboard
                     ↓
               Alert System → Notifications
```

## API Endpoint

### Base URL
```
https://zxixippckhbivoewpxmx.supabase.co/functions/v1/patient-data
```

### Authentication
All requests must include the `x-api-key` header with the device's unique API key.

### Request Format

**Method:** POST

**Headers:**
```
Content-Type: application/json
x-api-key: <your_device_api_key>
```

**Body:**
```json
{
  "device_id": "GW6-ABCD1234",
  "timestamp": 1609459200000,
  "heart_rate": 75.5,
  "spo2": 98.0
}
```

**Field Descriptions:**
- `device_id` (string, required): Unique identifier for your Galaxy Watch 6
- `timestamp` (integer, required): Unix timestamp in milliseconds
- `heart_rate` (float, required): Heart rate in beats per minute
- `spo2` (float, optional): Blood oxygen saturation percentage (0-100)

### Response Format

**Success (200):**
```json
{
  "success": true,
  "message": "Data received successfully",
  "alerts_generated": 0
}
```

**Error (401):**
```json
{
  "error": "Invalid device credentials"
}
```

**Error (400):**
```json
{
  "error": "Missing required fields: device_id, timestamp, heart_rate"
}
```

## Setup Instructions

### 1. Register Your Device

1. Log into the ER Watch dashboard
2. Navigate to the "Galaxy Watch Devices" section
3. Click "Register Device"
4. Enter your Galaxy Watch 6 device ID (e.g., "GW6-ABCD1234")
5. Select the patient to associate with this device
6. Save and copy the generated API key

### 2. Configure Your Galaxy Watch App

In your Galaxy Watch 6 health monitoring application, configure:

**Required Settings:**
- API Endpoint URL: `https://zxixippckhbivoewpxmx.supabase.co/functions/v1/patient-data`
- Device ID: Your unique device identifier (e.g., "GW6-ABCD1234")
- API Key: The key generated during registration
- Content-Type: `application/json`

**Recommended Settings:**
- Data transmission interval: 30-60 seconds
- Enable Wi-Fi/eSIM connectivity
- Enable automatic retry on network failure
- Buffer data during connectivity loss

### 3. Test Connection

Use curl or a similar tool to test the connection:

```bash
curl -X POST https://zxixippckhbivoewpxmx.supabase.co/functions/v1/patient-data \
  -H "Content-Type: application/json" \
  -H "x-api-key: gw6_your_api_key_here" \
  -d '{
    "device_id": "GW6-ABCD1234",
    "timestamp": '$(date +%s000)',
    "heart_rate": 75,
    "spo2": 98
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Data received successfully",
  "alerts_generated": 0
}
```

### 4. Monitor Data Stream

1. Return to the dashboard
2. Navigate to the patient's card
3. Verify real-time data is appearing
4. Check the "Last update" timestamp

## Alert Thresholds

The system automatically generates alerts when the following thresholds are exceeded:

### Heart Rate
- **Warning:** > 120 BPM
- **Critical:** > 140 BPM

### Blood Oxygen Saturation (SpO₂)
- **Warning:** < 92%
- **Critical:** < 88%

Alerts are displayed on the dashboard in real-time and logged in the database.

## Real-time Dashboard Features

- **Live Data Streaming:** Uses WebSocket for instant updates
- **Color-Coded Alerts:**
  - 🟢 Green: Normal range
  - 🟡 Yellow: Warning threshold
  - 🔴 Red: Critical threshold
- **Time-Series Graphs:** 24-hour history visualization
- **Alert Panel:** Unacknowledged alerts with notification sounds

## Database Schema

### Tables

**devices:**
- `id`: UUID
- `device_id`: Unique device identifier
- `api_key`: Authentication key
- `patient_id`: Associated patient
- `device_model`: "Galaxy Watch 6"
- `is_active`: Boolean status
- `last_sync`: Last data transmission timestamp

**sensor_data:**
- `id`: UUID
- `patient_id`: Associated patient
- `heart_rate`: Heart rate in BPM
- `oxygen_saturation`: SpO₂ percentage
- `systolic_bp`, `diastolic_bp`: Blood pressure
- `body_temperature`: Temperature in Celsius
- `respiratory_rate`: Breaths per minute
- `timestamp`: Data collection time

**alerts:**
- `id`: UUID
- `patient_id`: Associated patient
- `device_id`: Associated device
- `alert_type`: Type of alert (high_heart_rate, low_spo2, etc.)
- `severity`: critical | warning | info
- `message`: Human-readable description
- `value`: Measured value
- `threshold`: Threshold that was exceeded
- `is_acknowledged`: Boolean
- `created_at`: Alert generation time

## Security Features

### Data Encryption
- All API requests use TLS 1.3
- Data is encrypted in transit and at rest
- API keys are stored securely with bcrypt hashing

### Authentication
- Per-device API key authentication
- Device activation status verification
- Request timestamp validation (prevents replay attacks)

### Data Privacy
- Row-Level Security (RLS) policies on all tables
- User authentication required for dashboard access
- Audit logging for all data modifications

### Rate Limiting
- Automatic batching for high-frequency data
- Server-side validation of timestamps
- Protection against malformed requests

## Troubleshooting

### Common Issues

**"Invalid device credentials" error:**
- Verify the API key is correct and hasn't been regenerated
- Check that the device is marked as active in the dashboard
- Ensure the device_id matches exactly

**"Missing required fields" error:**
- Verify all required fields (device_id, timestamp, heart_rate) are present
- Check that field names are spelled correctly (case-sensitive)
- Ensure timestamp is in milliseconds, not seconds

**Data not appearing in dashboard:**
- Check the device "Last sync" time in Device Management
- Verify network connectivity from Galaxy Watch
- Look for errors in the edge function logs
- Ensure the patient is associated with the device

**"Connection timeout" error:**
- Verify internet connectivity on Galaxy Watch
- Check if Wi-Fi or eSIM is properly configured
- Try reducing transmission frequency temporarily

### Testing Tips

1. **Start with manual testing:** Use curl to send test data before configuring the watch
2. **Check timestamps:** Ensure timestamps are recent (within 1 hour)
3. **Monitor logs:** Watch the edge function logs for detailed error messages
4. **Validate API key:** Copy-paste the API key to avoid typos

## Development Notes

### Adding New Vital Signs

To track additional metrics from Galaxy Watch:

1. Add column to `sensor_data` table via migration
2. Update API endpoint to accept new field
3. Update dashboard components to display new metric
4. Add alert thresholds if needed

### Batch Data Processing

For high-frequency data (>1 reading/second), consider:
- Buffering data on the watch
- Sending batches every 30-60 seconds
- Using array format in API payload

### Future Enhancements

- [ ] Email/SMS notifications for critical alerts
- [ ] Historical data export
- [ ] Multiple device support per patient
- [ ] Custom alert threshold configuration
- [ ] Fall detection integration
- [ ] ECG data transmission
- [ ] Medication reminder integration

## Support

For technical support:
- Check the setup guide in the dashboard (/galaxy-watch-setup)
- Review edge function logs in the backend
- Contact system administrator

## Compliance

This system is designed with HIPAA/GDPR compliance in mind:
- Encrypted data transmission (TLS 1.3)
- Secure authentication (API keys)
- Access control (RLS policies)
- Audit logging (timestamps on all records)
- Data retention policies (configurable)

**Note:** Final compliance certification requires additional security audit and legal review.
