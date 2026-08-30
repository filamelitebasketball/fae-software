import type { Database } from "@/integrations/supabase/types";

export type MemberRow = Database["public"]["Tables"]["members"]["Row"];
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
export type InventoryRow = Database["public"]["Tables"]["inventory"]["Row"];
export type TabRow = Database["public"]["Tables"]["tabs"]["Row"];
export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

export interface TabItem {
  name: string;
  qty: number;
  price: number;
  amount: number;
}

export interface BookingResult {
  ref: string;
  courtId: string;
  date: string;
  startHour: number;
  hours: number;
  amount: number;
}

export interface AdminData {
  inventory: InventoryRow[];
  members: MemberRow[];
  openTabs: TabRow[];
  todaySales: SaleRow[];
  activity: ActivityRow[];
}
