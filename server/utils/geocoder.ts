import NodeGeocoder from "node-geocoder";

const options = {
  provider: "openstreetmap",
  formatter: null
};

const geocoder = NodeGeocoder(options);

export async function validateAddress(address: string): Promise<boolean> {
  try {
    const results = await geocoder.geocode(address);
    return results.length > 0;
  } catch (error) {
    console.error('Geocoding error:', error);
    return false;
  }
}

export async function normalizeAddress(address: string): Promise<string | null> {
  try {
    const results = await geocoder.geocode(address);
    if (results.length > 0) {
      const result = results[0];
      return `${result.streetNumber || ''} ${result.streetName || ''}, ${result.city || ''}, ${result.state || ''} ${result.zipcode || ''}`.trim();
    }
    return null;
  } catch (error) {
    console.error('Address normalization error:', error);
    return null;
  }
}
