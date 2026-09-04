"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      console.log("⏰ AutoRefresh: Pidiendo datos nuevos...");
      // Le pide al servidor los datos nuevos de forma invisible
      router.refresh(); 
    }, interval);

    return () => clearInterval(id);
  }, [router, interval]);

  return null;
}