// Format location response
export const formatLocationResponse = (location) => {
  const locationObj = location.toObject ? location.toObject() : location;

  return {
    _id: locationObj._id,
    name: locationObj.name,
    address: locationObj.address,
    city: locationObj.city,
    state: locationObj.state,
    zipCode: locationObj.zipCode,
    latitude: locationObj.latitude,
    longitude: locationObj.longitude,
    isPopular: locationObj.isPopular,
    isActive: locationObj.isActive,
    description: locationObj.description,
    image: locationObj.image,
    contactPhone: locationObj.contactPhone,
    facilities: locationObj.facilities
  };
};

// Format array of locations
export const formatLocationsResponse = (locations) => {
  return locations.map(location => formatLocationResponse(location));
};
