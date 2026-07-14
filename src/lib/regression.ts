// Ordinary-least-squares linear regression, written from scratch.
// Fits y = slope·x + intercept over the historical series, reports fit
// quality (R²), and extrapolates a forecast with a ±1.96σ residual band.

export type RegressionPoint = {
  label: string; // "Jul 24"
  actual: number | null;
  fitted: number | null; // regression line over the historical window
  forecast: number | null; // extrapolated beyond the window
  lower: number | null; // forecast band
  upper: number | null;
};

export type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
  sigma: number; // residual standard deviation
  points: RegressionPoint[];
  nextYearTotal: number; // sum of the 12 forecast months
  avgMoMGrowthPct: number; // mean month-over-month growth of the actuals
};

export function linearRegressionForecast(
  labels: string[],
  values: number[],
  futureLabels: string[]
): RegressionResult {
  const n = values.length;
  const xs = values.map((_, i) => i);

  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - meanX) ** 2;
    sxy += (xs[i] - meanX) * (values[i] - meanY);
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  const fit = (x: number) => slope * x + intercept;

  // R² = 1 − SSE/SST, σ = sqrt(SSE / (n−2))
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sse += (values[i] - fit(i)) ** 2;
    sst += (values[i] - meanY) ** 2;
  }
  const r2 = sst === 0 ? 1 : 1 - sse / sst;
  const sigma = Math.sqrt(sse / Math.max(1, n - 2));
  const band = 1.96 * sigma;

  const points: RegressionPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      label: labels[i],
      actual: values[i],
      fitted: Math.round(fit(i)),
      forecast: null,
      lower: null,
      upper: null,
    });
  }
  // Bridge point so the forecast line visually continues from the fit.
  let nextYearTotal = 0;
  for (let j = 0; j < futureLabels.length; j++) {
    const x = n + j;
    const y = fit(x);
    nextYearTotal += y;
    points.push({
      label: futureLabels[j],
      actual: null,
      fitted: null,
      forecast: Math.round(y),
      lower: Math.round(y - band),
      upper: Math.round(y + band),
    });
  }
  if (points.length > n && n > 0) {
    // Anchor the forecast series at the last fitted point for a connected line.
    points[n - 1].forecast = points[n - 1].fitted;
    points[n - 1].lower = points[n - 1].fitted;
    points[n - 1].upper = points[n - 1].fitted;
  }

  let growthSum = 0;
  let growthCount = 0;
  for (let i = 1; i < n; i++) {
    if (values[i - 1] > 0) {
      growthSum += (values[i] - values[i - 1]) / values[i - 1];
      growthCount++;
    }
  }

  return {
    slope,
    intercept,
    r2,
    sigma,
    points,
    nextYearTotal,
    avgMoMGrowthPct: growthCount ? (growthSum / growthCount) * 100 : 0,
  };
}
