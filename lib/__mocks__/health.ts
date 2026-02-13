export interface MetricDataPoint {
  date: string;
  value: number;
}

export const isHealthKitAvailable = jest.fn().mockReturnValue(false);
export const getCurrentMetricValue = jest.fn().mockResolvedValue(null);
