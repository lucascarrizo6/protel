export function BookingHeader({ hotelName }: { hotelName: string }) {
  return (
    <header className="flex items-center gap-3 bg-[#111] px-4 py-3 text-white sm:px-8">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-base font-bold ring-1 ring-white/15">
        P
      </div>
      <span className="text-base font-semibold tracking-tight">
        {hotelName}
      </span>
    </header>
  );
}
