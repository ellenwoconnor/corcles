
import NodeGeocoder from "node-geocoder";

const options = {
  provider: "nominatim",
  apiKey: null,
  formatter: null,
  headers: {
    'User-Agent': 'Corcles Marketplace'
  }
};

const geocoder = NodeGeocoder(options);

export async function validateAddress(address: string): Promise<boolean> {
  try {
    const results = await geocoder.geocode(address);
    return results.length > 0 && results[0].streetName !== undefined;
  } catch (error) {
    console.error('Geocoding error:', error);
    return false;
  }
}

export async function normalizeAddress(address: string): Promise<string | null> {
  try {
    const results = await geocoder.geocode(address);
    if (results.length > 0 && results[0].streetName) {
      const result = results[0];
      const parts = [
        result.streetNumber,
        result.streetName,
        result.city,
        result.state,
        result.zipcode
      ].filter(Boolean);
      return parts.join(', ');
    }
    return null;
  } catch (error) {
    console.error('Address normalization error:', error);
    return null;
  }
}
