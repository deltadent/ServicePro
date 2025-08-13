export const geocodeAddress = async (address: string) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key is missing.");
    return null;
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { address_components } = data.results[0];
      const getComponent = (type: string) => {
        const component = address_components.find((c: any) => c.types.includes(type));
        return component ? component.long_name : '';
      };

      return {
        address: data.results[0].formatted_address,
        city: getComponent('locality'),
        state: getComponent('administrative_area_level_1'),
        zip_code: getComponent('postal_code'),
      };
    }
    console.error("Geocoding API error:", data.status, data.error_message);
    return null;
  } catch (error) {
    console.error("Geocoding fetch error:", error);
    return null;
  }
};
