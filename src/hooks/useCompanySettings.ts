import { useState, useEffect } from 'react';
import { getCompanySettings, getCompanyBranding } from '@/lib/companyRepo';
import { CompanySettings } from '@/lib/types/company';

interface CompanyBranding {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  company_name_en: string;
  company_name_ar?: string;
  tagline_en?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [settingsData, brandingData] = await Promise.all([
        getCompanySettings(),
        getCompanyBranding()
      ]);
      
      setSettings(settingsData);
      setBranding(brandingData);
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetch = () => {
    fetchSettings();
  };

  return {
    settings,
    branding,
    loading,
    error,
    refetch
  };
}