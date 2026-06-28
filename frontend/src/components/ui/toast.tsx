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

toast.success = (title: string, description?: string) => {
  return sonnerToast.success(title, { description })
}

toast.error = (title: string, description?: string) => {
  return sonnerToast.error(title, { description })
}

export { toast }
export { Toaster } from "./sonner"
