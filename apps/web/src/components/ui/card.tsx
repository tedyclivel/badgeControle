import type { ComponentProps } from "react";

// Primitives Card de shadcn/ui adaptées au thème Passage et aux titres sémantiques.
export function Card(props: ComponentProps<"article">) {
  const { className = "", ...attributs } = props;
  return (
    <article
      data-slot="card"
      className={`rd-card rounded-md border bg-white ${className}`}
      {...attributs}
    />
  );
}
export function CardTitle(props: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className="font-semibold leading-tight"
      {...props}
    />
  );
}
