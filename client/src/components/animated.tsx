
import { motion, forwardRef } from "framer-motion";
import { ComponentType, ForwardRefExoticComponent, PropsWithoutRef, RefAttributes } from "react";

// This uses the current motion API to create animated versions of components
export function createAnimatedComponent<
  T extends ComponentType<any> | keyof JSX.IntrinsicElements
>(Component: T): ForwardRefExoticComponent<
  PropsWithoutRef<React.ComponentProps<T>> & RefAttributes<any>
> {
  return motion(Component);
}
