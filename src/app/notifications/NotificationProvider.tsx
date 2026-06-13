import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function NotificationProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme="system"
        expand={false}
        richColors={false}
        closeButton
        toastOptions={{
          classNames: {
            toast: "app-notification-toast",
            title: "app-notification-toast__title",
            description: "app-notification-toast__description",
            closeButton: "app-notification-toast__close",
          },
        }}
      />
    </>
  );
}
