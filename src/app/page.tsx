import dynamic from "next/dynamic";

// Dynamically import the RestaurantMatrix component to avoid SSR issues with
// recharts (which relies on browser-specific APIs). The component is only
// rendered on the client.
const RestaurantMatrix = dynamic(
  () => import("../components/RestaurantMatrix"),
  { ssr: false }
);

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Boston Restaurant Review Matrix</h1>
      <RestaurantMatrix />
    </main>
  );
}