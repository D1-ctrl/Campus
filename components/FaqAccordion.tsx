"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium">{item.question}</span>
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                {open ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
              </span>
            </button>
            {open && (
              <p className="px-5 pb-4 text-sm text-zinc-600 dark:text-zinc-400">
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
