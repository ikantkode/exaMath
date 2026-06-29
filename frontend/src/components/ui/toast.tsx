import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

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
export { Toaster }
