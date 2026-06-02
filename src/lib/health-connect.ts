import {
  getSdkStatus,
  initialize,
  requestPermission,
  readRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

export interface VitalsSnapshot {
  restingHR: number | null;
  hrv: number | null;
  sleepHours: number | null;
  steps: number | null;
  recoveryScore: number | null;
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function initHealthConnect(): Promise<boolean> {
  try {
    return await initialize();
  } catch {
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  try {
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'Steps' },
    ]);
    return granted.length > 0;
  } catch {
    return false;
  }
}

function todayRange() {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

function yesterdayRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export async function readVitals(): Promise<VitalsSnapshot> {
  const snapshot: VitalsSnapshot = {
    restingHR: null,
    hrv: null,
    sleepHours: null,
    steps: null,
    recoveryScore: null,
  };

  try {
    const range = todayRange();
    const sleepRange = yesterdayRange();

    const [hrResult, hrvResult, sleepResult, stepsResult] = await Promise.allSettled([
      readRecords('HeartRate', { timeRangeFilter: { operator: 'between', ...range } }),
      readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: { operator: 'between', ...range } }),
      readRecords('SleepSession', { timeRangeFilter: { operator: 'between', ...sleepRange } }),
      readRecords('Steps', { timeRangeFilter: { operator: 'between', ...range } }),
    ]);

    // Resting HR — average of today's readings
    if (hrResult.status === 'fulfilled' && hrResult.value.records.length > 0) {
      const samples = hrResult.value.records.flatMap((r: any) => r.samples ?? []);
      if (samples.length > 0) {
        const avg = samples.reduce((s: number, x: any) => s + x.beatsPerMinute, 0) / samples.length;
        snapshot.restingHR = Math.round(avg);
      }
    }

    // HRV — latest reading
    if (hrvResult.status === 'fulfilled' && hrvResult.value.records.length > 0) {
      const latest = hrvResult.value.records.at(-1) as any;
      snapshot.hrv = Math.round(latest.heartRateVariabilityMillis);
    }

    // Sleep — total hours from last night
    if (sleepResult.status === 'fulfilled' && sleepResult.value.records.length > 0) {
      const totalMs = sleepResult.value.records.reduce((sum: number, r: any) => {
        return sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime());
      }, 0);
      snapshot.sleepHours = parseFloat((totalMs / 3_600_000).toFixed(1));
    }

    // Steps — total for today
    if (stepsResult.status === 'fulfilled' && stepsResult.value.records.length > 0) {
      snapshot.steps = stepsResult.value.records.reduce((s: number, r: any) => s + (r.count ?? 0), 0);
    }

    // Recovery score — derived from HRV + sleep (simple formula)
    if (snapshot.hrv !== null || snapshot.sleepHours !== null) {
      const hrvScore = snapshot.hrv ? Math.min(100, (snapshot.hrv / 80) * 100) : 50;
      const sleepScore = snapshot.sleepHours ? Math.min(100, (snapshot.sleepHours / 8) * 100) : 50;
      snapshot.recoveryScore = Math.round((hrvScore * 0.6 + sleepScore * 0.4));
    }
  } catch {
    // return nulls — UI shows "--"
  }

  return snapshot;
}
