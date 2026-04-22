import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a storage path in the `student-files` bucket to a signed URL.
 * Passes through values that already look like a full URL (legacy rows).
 */
export const useSignedUrl = (pathOrUrl: string | null | undefined, expiresIn = 3600) => {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (!pathOrUrl) { setUrl(undefined); return; }
    if (/^https?:\/\//i.test(pathOrUrl)) { setUrl(pathOrUrl); return; }

    supabase.storage
      .from("student-files")
      .createSignedUrl(pathOrUrl, expiresIn)
      .then(({ data }) => { if (active) setUrl(data?.signedUrl); });

    return () => { active = false; };
  }, [pathOrUrl, expiresIn]);

  return url;
};
