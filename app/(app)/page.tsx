import { Sprout } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ReminderCard from "@/components/ReminderCard";
import { getDueTasks } from "@/lib/care";

// Due tasks change constantly (mark-done, new plants) — always fetch live.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const tasks = await getDueTasks();

  return (
    <>
      <PageHeader eyebrow={greeting()} title="Today" />

      {tasks.length === 0 ? (
        <EmptyState
          illustration={<Sprout className="size-11 text-sprout-600" strokeWidth={2} />}
          title="Nothing due — yet"
          body="Add your first plant and Sprout will build a gentle care schedule so you never miss a watering."
          ctaHref="/add"
          ctaLabel="Add your first plant"
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <ReminderCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 🌿";
  if (h < 18) return "Good afternoon ☀️";
  return "Good evening 🌙";
}
