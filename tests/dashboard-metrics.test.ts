import { describe, it, expect } from "vitest";

describe("Dashboard & Delivery Rate Metrics Calculation", () => {
  function computeDeliveryMetrics(params: {
    sentRecipients: number;
    deliveredRecipients: number;
    readRecipients: number;
    failedRecipients: number;
    scheduledCampaignRecipients: number;
  }) {
    const successfulDispatches =
      params.sentRecipients + params.deliveredRecipients + params.readRecipients;
    const failedDispatches = params.failedRecipients;
    // Dispatches executed by delivery workers
    const totalExecutedDispatches = successfulDispatches + failedDispatches;

    const deliverySuccessRate =
      totalExecutedDispatches > 0
        ? Math.round((successfulDispatches / totalExecutedDispatches) * 100)
        : 100;

    return {
      successfulDispatches,
      failedDispatches,
      totalDispatches: totalExecutedDispatches,
      deliverySuccessRate,
    };
  }

  it("calculates 100% success rate when all executed recipient dispatches succeed", () => {
    const metrics = computeDeliveryMetrics({
      sentRecipients: 2,
      deliveredRecipients: 3,
      readRecipients: 1,
      failedRecipients: 0,
      scheduledCampaignRecipients: 5, // Unexecuted scheduled campaign
    });

    expect(metrics.successfulDispatches).toBe(6);
    expect(metrics.failedDispatches).toBe(0);
    expect(metrics.totalDispatches).toBe(6);
    // Success rate is 100%, NOT diluted to 60% (6/11) by unexecuted scheduled campaigns!
    expect(metrics.deliverySuccessRate).toBe(100);
  });

  it("calculates accurate proportional rate when failed recipient dispatches occur", () => {
    const metrics = computeDeliveryMetrics({
      sentRecipients: 8,
      deliveredRecipients: 0,
      readRecipients: 0,
      failedRecipients: 2,
      scheduledCampaignRecipients: 10,
    });

    expect(metrics.successfulDispatches).toBe(8);
    expect(metrics.failedDispatches).toBe(2);
    expect(metrics.totalDispatches).toBe(10);
    expect(metrics.deliverySuccessRate).toBe(80);
  });

  it("defaults to 100% when no dispatches have been executed yet", () => {
    const metrics = computeDeliveryMetrics({
      sentRecipients: 0,
      deliveredRecipients: 0,
      readRecipients: 0,
      failedRecipients: 0,
      scheduledCampaignRecipients: 5,
    });

    expect(metrics.totalDispatches).toBe(0);
    expect(metrics.deliverySuccessRate).toBe(100);
  });
});
