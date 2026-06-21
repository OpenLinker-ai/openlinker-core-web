/**
 * Webhook 投递记录类型，前端 server / client 共用。
 *
 * 后端契约：
 *   GET /api/v1/creator/agents/:id/webhook/deliveries?limit=20
 *   Response: { items: WebhookDelivery[] }
 */

export interface WebhookDelivery {
  id: string;
  run_id: string;
  url: string;
  status: "pending" | "success" | "failed";
  response_status?: number | null;
  error_message?: string | null;
  attempt_count: number;
  next_retry_at?: string | null;
  created_at: string;
  updated_at: string;
}
