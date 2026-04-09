import { getCachedStudioInfo } from "@/lib/cached-queries";
import { MuaClient } from "./_components/mua-client";

export const metadata = { title: "MUA Schedule — Yoonjaespace" };
export const dynamic = "force-dynamic";

export default async function MuaPage() {
  const studioInfo = await getCachedStudioInfo();

  return <MuaClient studioInfo={studioInfo} />;
}
