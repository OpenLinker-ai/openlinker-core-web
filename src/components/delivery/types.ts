export interface DeliveryTarget {
  id: string;
  name: string;
  type: "webhook" | "slack";
  url: string;
  event_types: string[];
  secret?: string;
  is_default: boolean;
  created_at: string;
}

export interface DeliveryItem {
  id: string;
  run_id: string;
  target_id: string;
  target_type: "webhook" | "slack";
  target_url: string;
  status: "pending" | "success" | "failed";
  response_status?: number;
  error_message?: string;
  attempt_count: number;
  next_retry_at?: string;
  created_at: string;
  updated_at: string;
}
