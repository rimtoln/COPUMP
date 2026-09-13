export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function pick(arr, n) {
  return arr[Math.floor(hash(n) * arr.length) % arr.length];
}

export function money(n) {
  const a = Math.abs(Math.round(n));
  return (n < 0 ? '-$' : '+$') + a.toLocaleString('en-US');
}

export function fmt(x, d = 2) {
  return Number(x).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}
