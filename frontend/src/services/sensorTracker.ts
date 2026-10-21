/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Abhinav's Sensor-Tracking Service
 * Primitive: raw sensors -> position (metres, x = east, y = north)
 *
 * Features:
 * - Accelerometer magnitude filtering & peak step detection (stepLen = 0.7m)
 * - Tilt-compensated compass heading calculation & gyro yaw integration
 * - DeviceMotionEvent / DeviceOrientationEvent permission handling
 * - setPosition(x, y) for QR checkpoint and manual position corrections
 * - Clean event listener cleanup on stop()
 */

export interface TrackingData {
  x: number;
  y: number;
  heading: number | null;
  steps: number;
}

export interface TrackingSession {
  setPosition: (x: number, y: number) => void;
  stop: () => void;
}

export interface TrackingOptions {
  stepLen?: number;
}

/**
 * Primitive: raw sensors -> position (metres, x = east, y = north)
 * Integrates Abhinav's exact dead-reckoning and orientation fusion algorithm.
 */
export async function startTracking(
  onUpdate: (data: TrackingData) => void,
  { stepLen = 0.7 }: TrackingOptions = {}
): Promise<TrackingSession> {
  const R = Math.PI / 180;
  const wrap = (a: number) => ((a % 360) + 360) % 360;
  const diff = (a: number, b: number) => ((a - b + 540) % 360) - 180;

  const s: TrackingData = { x: 0, y: 0, heading: null, steps: 0 };
  let g = 9.8, sm = 0, prev = 0, rising = false;
  let lastStep = 0, lastT: number | null = null;
  let isStopped = false;

  // iOS 13+ motion and orientation permission request
  const motionCtor = typeof window !== 'undefined'
    ? (window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> })
    : undefined;
  const orientationCtor = typeof window !== 'undefined'
    ? (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> })
    : undefined;

  if (typeof motionCtor?.requestPermission === 'function' || typeof orientationCtor?.requestPermission === 'function') {
    const promises: Promise<'granted' | 'denied'>[] = [];
    if (typeof motionCtor?.requestPermission === 'function') {
      promises.push(motionCtor.requestPermission());
    }
    if (typeof orientationCtor?.requestPermission === 'function') {
      promises.push(orientationCtor.requestPermission());
    }

    const r = await Promise.all(promises);
    if (r.some(v => v !== 'granted')) {
      throw new Error('permission denied');
    }
  }

  // Compass heading (absolute, tilt-compensated)
  const onOri = (e: DeviceOrientationEvent) => {
    if (isStopped) return;
    let c: number;

    const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
      c = webkitHeading;
    } else if (e.alpha != null && !isNaN(e.alpha)) {
      const a = e.alpha * R;
      const b = (e.beta ?? 0) * R;
      const k = (e.gamma ?? 0) * R;

      c = wrap(Math.atan2(
        -Math.cos(a) * Math.sin(k) - Math.sin(a) * Math.sin(b) * Math.cos(k),
        -Math.sin(a) * Math.sin(k) + Math.cos(a) * Math.sin(b) * Math.cos(k)
      ) / R);
    } else {
      return;
    }

    const prevHeading = s.heading;
    s.heading = s.heading == null
      ? c
      : wrap(s.heading + 0.01 * diff(c, s.heading));

    if (prevHeading == null || Math.abs(diff(s.heading, prevHeading)) > 1.0) {
      onUpdate({ ...s });
    }
  };

  // Gyro integration + step detection
  const onMotion = (e: DeviceMotionEvent) => {
    if (isStopped) return;
    const a = e.accelerationIncludingGravity;
    const w = e.rotationRate;
    const t = e.timeStamp;

    if (!a || a.x == null || a.y == null || a.z == null) return;

    const dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;

    const mag = Math.hypot(a.x, a.y, a.z);

    if (w && s.heading != null && dt > 0 && dt < 0.2 && mag > 1) {
      const yaw = (
        (w.beta ?? 0) * a.x +
        (w.gamma ?? 0) * a.y +
        (w.alpha ?? 0) * a.z
      ) / mag;

      s.heading = wrap(s.heading - yaw * dt);
    }

    g += 0.02 * (mag - g);
    sm += 0.3 * ((mag - g) - sm);

    if (sm > prev) {
      rising = true;
    } else if (rising && sm < prev) {
      rising = false;

      if (prev > 1.2 && t - lastStep > 300) {
        // Compute displacement: use compass heading if available, or default east (90 deg)
        const h = (s.heading != null ? s.heading : 90) * R;

        s.x += stepLen * Math.sin(h);
        s.y += stepLen * Math.cos(h);
        s.steps++;

        lastStep = t;
        onUpdate({ ...s });
      }
    }

    prev = sm;
  };

  window.addEventListener('devicemotion', onMotion as EventListener);

  const orientationEvent = typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window
    ? 'deviceorientationabsolute'
    : 'deviceorientation';

  window.addEventListener(orientationEvent, onOri as EventListener);
  if (orientationEvent !== 'deviceorientation') {
    window.addEventListener('deviceorientation', onOri as EventListener);
  }

  // Initial update with initial state
  onUpdate({ ...s });

  return {
    setPosition(x: number, y: number) {
      s.x = x;
      s.y = y;
      onUpdate({ ...s });
    },

    stop() {
      isStopped = true;
      window.removeEventListener('devicemotion', onMotion as EventListener);
      window.removeEventListener(orientationEvent, onOri as EventListener);
      window.removeEventListener('deviceorientation', onOri as EventListener);
    }
  };
}
