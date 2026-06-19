import { cva } from "class-variance-authority"

export const opfsImageVariants = cva("", {
  variants: {
    loading: {
      true: "animate-pulse",
      false: ""
    }
  },
  defaultVariants: {
    loading: false
  }
})
