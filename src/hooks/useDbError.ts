import { useEffect, useState } from "react"

import { addDbErrorListener, getDbError } from "../lib/db"

export function useDbError() {
  const [error, setError] = useState<Error | null>(getDbError())

  useEffect(() => {
    return addDbErrorListener((err) => {
      setError(err)
    })
  }, [])

  return error
}
