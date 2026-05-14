import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch, getResponseErrorMessage } from "../lib/api";
import { useUser } from "../context/UserContext";

export function useRegenerateStudyingPlan() {
  const { refreshProfile } = useUser();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerate = useCallback(async (): Promise<boolean> => {
    setIsRegenerating(true);
    try {
      const res = await apiFetch("/auth/profile/regenerate-studying-plan", {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        return false;
      }
      await refreshProfile();
      toast.success("Studying plan updated.");
      return true;
    } catch {
      toast.error("Could not regenerate your plan. Try again.");
      return false;
    } finally {
      setIsRegenerating(false);
    }
  }, [refreshProfile]);

  return { regenerate, isRegenerating };
}
