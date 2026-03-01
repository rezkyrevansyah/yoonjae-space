import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { BookingsClient } from "./_components/bookings-client";

export const metadata = { title: "Bookings — Yoonjaespace" };

export default async function BookingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return <BookingsClient currentUser={currentUser} />;
}
