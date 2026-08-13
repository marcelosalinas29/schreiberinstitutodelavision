import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/types/domain";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useSession(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false });
    });

    void supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, session: data.session, loading: false });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export interface CurrentUserInfo {
  profile: Profile | null;
  roles: AppRole[];
}

export function useCurrentUser() {
  const { user, loading } = useSession();

  const query = useQuery<CurrentUserInfo>({
    queryKey: ["current-user", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return {
        profile: profile ?? null,
        roles: (roles ?? []).map((r) => r.role),
      };
    },
  });

  const roles = query.data?.roles ?? [];

  return {
    user,
    profile: query.data?.profile ?? null,
    roles,
    isMedico: roles.includes("medico"),
    isSecretaria: roles.includes("secretaria"),
    loading: loading || query.isLoading,
  };
}
