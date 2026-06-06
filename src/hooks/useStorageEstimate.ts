import { useState, useEffect, useCallback } from "react";
import { getStorageEstimate } from "../lib/storage-utils";
import type { StorageEstimateResult } from "../lib/storage-utils";

export function useStorageEstimate() {
  const [estimate, setEstimate] = useState<StorageEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkStorage = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStorageEstimate();
      setEstimate(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStorage();
  }, [checkStorage]);

  return {
    estimate,
    isLoading,
    checkStorage
  };
}
