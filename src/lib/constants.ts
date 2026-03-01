export const BOOKING_STATUS = {
  BOOKED: "BOOKED",
  PAID: "PAID",
  SHOOT_DONE: "SHOOT_DONE",
  PHOTOS_DELIVERED: "PHOTOS_DELIVERED",
  ADDON_UNPAID: "ADDON_UNPAID",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS;

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  BOOKED: "Booked",
  PAID: "Paid",
  SHOOT_DONE: "Shoot Done",
  PHOTOS_DELIVERED: "Photos Delivered",
  ADDON_UNPAID: "Addon Unpaid",
  CLOSED: "Closed",
  CANCELED: "Canceled",
};

export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  SHOOT_DONE: "bg-purple-100 text-purple-800",
  PHOTOS_DELIVERED: "bg-indigo-100 text-indigo-800",
  ADDON_UNPAID: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-800",
  CANCELED: "bg-red-100 text-red-800",
};

export const PRINT_ORDER_STATUS = {
  SELECTION: "SELECTION",
  VENDOR: "VENDOR",
  PRINTING: "PRINTING",
  RECEIVE: "RECEIVE",
  PACKING: "PACKING",
  SHIPPED: "SHIPPED",
  DONE: "DONE",
} as const;

export type PrintOrderStatus = keyof typeof PRINT_ORDER_STATUS;

export const PRINT_ORDER_STATUS_LABEL: Record<PrintOrderStatus, string> = {
  SELECTION: "Selection",
  VENDOR: "Vendor",
  PRINTING: "Printing",
  RECEIVE: "Receive",
  PACKING: "Packing",
  SHIPPED: "Shipped",
  DONE: "Done",
};

export const MENU_ITEMS = [
  { slug: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { slug: "bookings", label: "Bookings", href: "/bookings", icon: "CalendarCheck" },
  { slug: "calendar", label: "Calendar", href: "/calendar", icon: "Calendar" },
  { slug: "customers", label: "Customers", href: "/customers", icon: "Users" },
  { slug: "reminders", label: "Reminders", href: "/reminders", icon: "Bell" },
  { slug: "finance", label: "Finance", href: "/finance", icon: "TrendingUp" },
  { slug: "vendors", label: "Vendors", href: "/vendors", icon: "Store" },
  { slug: "commissions", label: "Commissions", href: "/commissions", icon: "Percent" },
  { slug: "activities", label: "Activities", href: "/activities", icon: "Activity" },
  { slug: "user-management", label: "User Management", href: "/user-management", icon: "UserCog" },
  { slug: "role-management", label: "Role Management", href: "/role-management", icon: "Shield" },
  { slug: "settings", label: "Settings", href: "/settings", icon: "Settings" },
] as const;
