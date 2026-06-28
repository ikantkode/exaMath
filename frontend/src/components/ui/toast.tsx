import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

const toast = ({ title, description, variant = "default" }: ToastProps) => {
  return sonnerToast(title, {
    description,
    className: variant === "destructive" ? "border-destructive bg-destructive text-destructive-foreground" : "",
  })
}

export { toast }
export { Toaster } from "./sonner"
