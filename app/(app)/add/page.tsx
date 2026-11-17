import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";
import AddPlantFlow from "@/components/AddPlantFlow";

export default async function AddPage() {
  const t = await getTranslations("add");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <AddPlantFlow />
    </>
  );
}
