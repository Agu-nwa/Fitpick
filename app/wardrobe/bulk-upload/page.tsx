import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeBulkUploadClient } from "@/components/wardrobe/WardrobeBulkUploadClient";
import { ConsentNotice } from "@/components/privacy/ConsentNotice";

export default function WardrobeBulkUploadPage() {
  return <AppShell><PageHeader compact eyebrow="Faster closet intake" title="Add several items" subtitle="Choose one photo for each separate fashion item, then review every result before it enters your closet." /><ConsentNotice requirePhotos requireAi /><WardrobeBulkUploadClient /></AppShell>;
}
