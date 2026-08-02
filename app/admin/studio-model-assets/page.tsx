import { notFound } from "next/navigation"; import { requireAdmin } from "@/lib/admin"; import { StudioModelAssetAdmin } from "@/components/admin/StudioModelAssetAdmin";
export const dynamic="force-dynamic"; export default async function Page(){const auth=await requireAdmin();if(!auth.ok)notFound();return <StudioModelAssetAdmin/>;}
