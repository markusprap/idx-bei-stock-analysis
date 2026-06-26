import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { ChatRoute } from "./routes/chat";
import { SearchRoute } from "./routes/search";

const rootRoute = createRootRoute();

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ChatRoute,
});

export const chatThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat/$threadId",
  component: ChatRoute,
});

export const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchRoute,
});

export const routeTree = rootRoute.addChildren([indexRoute, chatThreadRoute, searchRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
