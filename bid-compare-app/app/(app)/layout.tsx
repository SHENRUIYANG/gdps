import { AppShell } from '@/components/AppShell';
import { StageProvider } from '@/components/StageProvider';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <StageProvider>
      <AppShell>{children}</AppShell>
    </StageProvider>
  );
}
