"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getWardrobeUploadBatch, removeWardrobeUploadBatchItem, type WardrobeUploadBatchData } from "@/lib/api-client";

export function WardrobeBatchReviewClient({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<WardrobeUploadBatchData["batch"] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => { const result = await getWardrobeUploadBatch(batchId); if (result.ok) { setBatch(result.data.batch); setError(""); } else setError(result.error.message); }, [batchId]);
  const removeItem = useCallback(async (uploadId: string) => { const result = await removeWardrobeUploadBatchItem(batchId, uploadId); if (result.ok) await load(); else setError(result.error.message); }, [batchId, load]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [load]);
  if (!batch) return <Card className="mt-7"><p className="text-sm text-muted">{error || "Preparing your items…"}</p></Card>;
  return <div className="mt-7 space-y-5">
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink">{batch.completedCount || 0} of {batch.itemCount} saved</p><p className="mt-1 text-xs text-muted">Review each result. Only saved items become available to your stylist.</p></div><Badge tone={batch.status === "completed" ? "success" : "neutral"}>{batch.status === "completed" ? "Complete" : "Review required"}</Badge></div></Card>
    <div className="grid gap-4 sm:grid-cols-2">
      {batch.uploads.map((upload, index) => { const ready = ["suggested", "needs-review", "failed", "not_started"].includes(upload.aiTagStatus); const multipleStatus = upload.aiAnalysis?.uploadIntelligence?.multipleGarments?.status; const multiple = multipleStatus === "multiple" || multipleStatus === "accessories_mixed"; return <Card key={upload.id} className="overflow-hidden p-0"><div className="relative aspect-[4/3] bg-canvasSubtle"><Image src={upload.thumbnailUrl || upload.imageUrl || ""} alt={`Closet item ${index + 1}`} fill unoptimized className="object-cover" /></div><div className="space-y-3 p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">Item {index + 1}</p>{upload.createdItemId ? <CheckCircle2 size={18} className="text-success" /> : ready ? <Badge tone="warning">Review</Badge> : <Clock3 size={18} className="text-muted" />}</div>{multiple ? <><p className="flex gap-2 text-xs leading-5 text-warning"><TriangleAlert size={15} className="shrink-0" />More than one item is visible. This photo cannot be confirmed.</p><Button type="button" variant="secondary" className="w-full" onClick={() => void removeItem(upload.id)}>Remove photo</Button></> : upload.createdItemId ? <Button type="button" variant="secondary" className="w-full" disabled>Saved to closet</Button> : ready ? <Link href={`/wardrobe/${upload.id}/confirm?batchId=${encodeURIComponent(batchId)}`}><Button className="w-full">Review item</Button></Link> : <Button type="button" className="w-full" disabled>Analysis in progress</Button>}</div></Card>; })}
    </div>
    {batch.status === "completed" ? <Link href="/wardrobe"><Button className="w-full">View closet</Button></Link> : null}
  </div>;
}
