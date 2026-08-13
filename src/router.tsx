import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Cache largo para que la app siga usable sin conexión.
        gcTime: 1000 * 60 * 60 * 24 * 7,
        staleTime: 1000 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
      },
      mutations: { networkMode: "offlineFirst" },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
