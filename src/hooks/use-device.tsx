import { useState, useEffect } from 'react';

const breakpoints = {
  mobile: 768,
  tablet: 1024,
};

type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice() {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < breakpoints.mobile) {
        setDeviceType('mobile');
      } else if (window.innerWidth < breakpoints.tablet) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
  };
}
