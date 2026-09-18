export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const finite = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
export const smooth = (value, target, seconds, dt) => seconds <= 0 ? target : value + (target - value) * (1 - Math.exp(-dt / seconds));
export const angleDelta = (a, b) => ((a - b + 540) % 360 + 360) % 360 - 180;
export function unit2(x, z) {
  const length = Math.hypot(x, z);
  return length > 1 ? {x:x/length, z:z/length} : {x, z};
}
export function deadZone(x, z, radius = .05) {
  const length = Math.hypot(x, z);
  if (length <= radius || length < 1e-9) return {x:0,z:0};
  const magnitude = clamp((length-radius)/(1-radius),0,1);
  return {x:x/length*magnitude,z:z/length*magnitude};
}
export const Q = {
  identity: () => [0,0,0,1],
  normalize(q) { const d=Math.hypot(...q)||1; return q.map(v=>v/d); },
  multiply(a,b) { return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]; },
  axis(x,y,z,angle) { const d=Math.hypot(x,y,z)||1,s=Math.sin(angle/2)/d; return [x*s,y*s,z*s,Math.cos(angle/2)]; }
};
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const centis=Math.floor(seconds*100+1e-7);
  return `${String(Math.floor(centis/6000)).padStart(2,'0')}:${String(Math.floor(centis/100)%60).padStart(2,'0')}.${String(centis%100).padStart(2,'0')}`;
}
