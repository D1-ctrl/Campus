"use client";

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
};

export default function RatingStars({
  value,
  onChange,
  readOnly = false,
}: RatingStarsProps) {
  const interactive = !readOnly && !!onChange;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const className = filled
          ? "text-yellow-500"
          : "text-zinc-300 dark:text-zinc-700";

        if (!interactive) {
          return (
            <span key={star} className={className} aria-hidden>
              ★
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={className}
            aria-label={`${star} Sterne`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
