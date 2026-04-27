"use client";

import { useTransition } from "react";
import { becomePro } from "@/app/actions/orders";

export function BecomeProButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => becomePro())}
      disabled={pending}
      className="btn-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Upgrading..." : "Become a Pro"}
    </button>
  );
}
