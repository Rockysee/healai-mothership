# NEXUS Data Ingestion Hooks API

Comprehensive single-source-of-truth for all MedPod NEXUS frontend data fetching.

## Core Features
- Auto-refresh at configurable intervals
- Manual refresh via `refresh()` callback
- Loading/error state tracking
- Structured data matching tab requirements
- Centralized API error handling

## Hooks Overview

### 1. useCommandData()
**Endpoint:** `/api/nexus/dashboard/stats`  
**Auto-refresh:** Every 15 seconds  

```javascript
const { stats, recentTrips, priorityBreakdown, loading, error, refresh } = useCommandData();
```

### 2. useDispatchData()
**Endpoint:** `/api/nexus/dispatch` (with relations)  
**Auto-refresh:** Every 10 seconds  

```javascript
const {
  trips, activeTrips, pendingTrips,
  loading, error, refresh,
  createTrip(data),
  updateTripStatus(tripId, status),
  assignAmbulance(tripId, ambulanceId)
} = useDispatchData();
```

### 3. useFleetData()
**Endpoints:** `/api/nexus/nav/active-ambulances` + `/api/nexus/dashboard/fleet-map`  
**Auto-refresh:** Every 8 seconds  

```javascript
const {
  ambulances, locations,
  onlineCount, availableCount,
  loading, error, refresh
} = useFleetData();
```

### 4. useCrewData()
**Endpoint:** `/api/nexus/crew`  
**Auto-refresh:** Every 30 seconds  

```javascript
const {
  crew, availableCount, onDutyCount,
  loading, error, refresh,
  assignToTrip(crewId, tripId, role),
  updateCertification(crewId, type, expiry)
} = useCrewData();
```

### 5. useHospitalData()
**Endpoint:** `/api/nexus/hospitals`  
**Auto-refresh:** Every 60 seconds  

```javascript
const {
  hospitals,
  totalBeds, availableBeds,
  loading, error, refresh
} = useHospitalData();
```

### 6. useStockData()
**Endpoints:** `/api/nexus/stock` + `/api/nexus/stock/expiring?days=14`  
**Auto-refresh:** Every 30 seconds  

```javascript
const {
  items, lowStockItems, expiringItems, categories,
  loading, error, refresh,
  recordConsumption(itemId, quantity, tripId)
} = useStockData();
```

### 7. useCRMData()
**Endpoints:** `/api/nexus/operators` + `/api/nexus/operators/summary`  
**Auto-refresh:** Every 60 seconds  
**Dynamic:** Fetches `/api/nexus/operators/{id}` when operator selected  

```javascript
const {
  operators, summary,
  selectedOperator, operatorDetails,
  setSelectedOperator(operatorId),
  loading, error, refresh
} = useCRMData();
```

### 8. usePCRData()
**Endpoints:** `/api/nexus/pcr?tripId={tripId}` (on-demand)  
**Auto-refresh:** None (on-demand)  

```javascript
const {
  pcrs, selectedPcr,
  loading, error,
  fetchPcr(tripId),
  updateSection(pcrId, section, data)
} = usePCRData();
```

### 9. useBrainData()
**Endpoints:** `/api/nexus/brain/*` (on-demand)  
**Auto-refresh:** None (on-demand)  

```javascript
const {
  results,
  loading, error,
  runTriage(data),
  runDispatchOptimise(data),
  runStockForecast(data),
  runPcrAnomaly(data)
} = useBrainData();
```

### 10. useBillingData()
**Endpoints:** `/api/nexus/billing/invoices` + `/api/nexus/billing/revenue-report`  
**Auto-refresh:** Every 60 seconds  

```javascript
const {
  invoices, revenueReport,
  loading, error, refresh
} = useBillingData();
```

### 11. useComplianceData()
**Endpoint:** `/api/nexus/compliance/dashboard`  
**Auto-refresh:** Every 60 seconds  

```javascript
const {
  dashboard, expiringCerts,
  loading, error, refresh
} = useComplianceData();
```

## Usage Pattern

```javascript
import {
  useCommandData,
  useDispatchData,
  useFleetData,
  // ... etc
} from "@/hooks/useNexusData";

export default function MyComponent() {
  const { stats, loading, error, refresh } = useCommandData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh Now</button>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  );
}
```

## Error Handling

All hooks include centralized error handling via `nexusFetch()`:
- Logs errors to console
- Returns `null` on failure
- Sets `error` state with user-friendly message
- Gracefully handles network failures

## File Location
`/sessions/eloquent-tender-meitner/mnt/Hemant's Stack/Healai/src/hooks/useNexusData.js`

## Statistics
- 11 hooks total
- 602 lines of code
- Follows React best practices (useState, useEffect, useCallback, useRef)
- All hooks are "use client" compatible
