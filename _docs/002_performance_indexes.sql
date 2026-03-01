-- ============================================================
-- Performance Indexes for Yoonjaespace
-- Run this in Supabase SQL Editor
-- ============================================================

-- bookings: most queried table — date range + status filters
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_print_order_status ON bookings(print_order_status) WHERE print_order_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id) WHERE staff_id IS NOT NULL;

-- customers: phone uniqueness check on every add-customer form
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- expenses: date filter used in finance page
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_id ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(source, source_id) WHERE source_id IS NOT NULL;

-- activity_log: ordered by created_at DESC on every page load
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- booking_reminders: checked per booking in reminders page
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id ON booking_reminders(booking_id);

-- commissions: period lookup
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_commissions_staff_id ON commissions(staff_id);
