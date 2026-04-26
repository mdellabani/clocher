export function CrossCommuneBanner({ communeName }: { communeName: string }) {
  return (
    <div className="my-2 rounded-md bg-[#FDF0EB] px-3 py-2 text-xs text-[#5a4030]">
      Vous écrivez à un habitant de <strong>{communeName}</strong>.
    </div>
  );
}
