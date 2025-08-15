import { useDevice } from './use-device';

export function useMobile() {
  const { isMobile } = useDevice();
  return isMobile;
}
