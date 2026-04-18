import { EspaceClient } from "./espace-client";

export default function MonEspacePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Mon espace</h1>
      <div className="mt-4">
        <EspaceClient />
      </div>
    </>
  );
}
