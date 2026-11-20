import type { ComponentProps } from "react";
import { Button } from "./button";

type SiloButtonProps = ComponentProps<typeof Button>;

export function SiloButton({ variant = "ghost", ...props }: SiloButtonProps) {
  return <Button variant={variant} {...props} />;
}
