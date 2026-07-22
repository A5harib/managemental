import { clerkMiddleware } from "@clerk/nextjs/server";

const clerkMiddlewareHandler = clerkMiddleware();

export { clerkMiddlewareHandler as proxy };
export default clerkMiddlewareHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
