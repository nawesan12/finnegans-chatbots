import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  toggleLabel?: string
  toggleAriaLabel?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      type,
      toggleLabel = "Mostrar contraseña",
      toggleAriaLabel,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false)
    const inputType = isVisible ? "text" : type ?? "password"
    const label = isVisible ? "Ocultar contraseña" : toggleLabel
    const ariaLabel = toggleAriaLabel ?? label

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={inputType}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((previous) => !previous)}
          className="absolute inset-y-0 right-2 flex items-center text-[#04102D]/60 transition hover:text-[#04102D] disabled:cursor-not-allowed"
          aria-label={ariaLabel}
          title={label}
          disabled={props.disabled}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">{label}</span>
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
