'use client';

import { useSidebar } from '@/context/SidebarContext';

export default function Backdrop() {
  const { isOpen, close } = useSidebar();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
      onClick={close}
      aria-hidden="true"
    />
  );
}