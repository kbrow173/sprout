import PageHeader from "@/components/PageHeader";
import AddPlantFlow from "@/components/AddPlantFlow";

export default function AddPage() {
  return (
    <>
      <PageHeader eyebrow="New friend" title="Add a plant" />
      <AddPlantFlow />
    </>
  );
}
